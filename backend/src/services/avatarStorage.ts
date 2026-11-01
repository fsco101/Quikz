import { v2 as cloudinary } from "cloudinary";
import { InputError } from "./questionBank.js";

function credentials() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name && !api_key && !api_secret) return undefined;
  if (!cloud_name || !api_key || !api_secret)
    throw new InputError("Avatar storage is not fully configured. Contact your administrator.", 503);
  return { cloud_name, api_key, api_secret, secure: true, timeout: 30000 };
}

// Only pixels already decoded and re-encoded by the avatar route reach storage.
export async function uploadAvatar(data: Buffer) {
  const config = credentials();
  if (!config) return undefined;
  try {
    return await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { ...config, resource_type: "image", folder: "quikz/avatars", format: "webp" },
        (error, result) => {
          if (error || !result?.secure_url?.startsWith("https://") || !result.public_id)
            return reject(error || new Error("Invalid avatar storage response"));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.on("error", reject);
      stream.end(data);
    });
  } catch {
    throw new InputError("Avatar storage is unavailable. Please retry your upload.", 503);
  }
}

export async function deleteCloudAvatar(publicId?: string) {
  if (!publicId) return;
  const config = credentials();
  if (!config)
    throw new InputError("Avatar storage is not configured. Contact your administrator.", 503);
  const result = await cloudinary.uploader.destroy(publicId, {
    ...config, resource_type: "image", invalidate: true,
  });
  if (!["ok", "not found"].includes(result.result))
    throw new Error("Avatar deletion failed");
}

// A cleanup outage must not undo a profile update already saved to MongoDB.
export async function cleanupCloudAvatar(publicId?: string) {
  try {
    await deleteCloudAvatar(publicId);
  } catch {
    console.error("Cloudinary avatar cleanup failed; an unused asset may remain.");
  }
}
