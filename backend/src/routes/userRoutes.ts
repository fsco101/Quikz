import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { InputError } from "../services/questionBank.js";
import { profileFields, userDTO, validatePassword } from "../services/users.js";
const router = Router();
const run = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);
// Only sanitized avatar pixels are public; account details require authentication.
router.get(
  "/:id/avatar",
  run(async (req: any, res: any) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new InputError("Invalid user ID.");
    const user = await User.findById(req.params.id).select(
      "+avatarData active",
    );
    if (!user?.avatarData || user.active === false)
      throw new InputError("Avatar not found.", 404);
    res
      .set({
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      })
      .send(user.avatarData);
  }),
);
router.use(authenticateToken);
router.get(
  "/",
  run(async (req: AuthRequest, res: any) => {
    const search = req.query.search ?? "";
    const page = Number(req.query.page ?? 1);
    if (
      typeof search !== "string" ||
      search.length > 120 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000
    )
      throw new InputError("Invalid people search.");
    const filter: any = { active: { $ne: false } };
    if (search.trim()) {
      const literal = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["fullName", "username"].map((key) => ({
        [key]: { $regex: literal, $options: "i" },
      }));
    }
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("fullName username role bio avatarUpdatedAt")
        .sort({ fullName: 1, _id: 1 })
        .skip((page - 1) * 25)
        .limit(25),
    ]);
    res.json({
      users: users.map((u) => ({
        id: String(u._id),
        fullName: u.fullName,
        username: u.username,
        role: u.role,
        bio: u.bio || "",
        avatarUrl: userDTO(u).avatarUrl,
      })),
      pages: Math.max(1, Math.ceil(total / 25)),
      page,
      total,
    });
  }),
);
router.patch(
  "/me",
  run(async (req: AuthRequest, res: any) => {
    if (
      [
        "role",
        "active",
        "passwordHash",
        "authVersion",
        "avatarData",
        "termsAccepted",
      ].some((key) => key in req.body)
    )
      throw new InputError(
        "Role and account permissions can only be changed by an administrator.",
      );
    const changes = profileFields(req.body);
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: changes },
      { new: true, runValidators: true },
    );
    if (!user) throw new InputError("User not found.", 404);
    await Subject.updateMany(
      { facultyId: user._id },
      { facultyName: user.fullName },
    );
    res.json({ user: userDTO(user) });
  }),
);
router.post(
  "/me/password",
  run(async (req: AuthRequest, res: any) => {
    validatePassword(req.body.newPassword);
    const user = await User.findById(req.user!.id);
    if (
      !user ||
      typeof req.body.currentPassword !== "string" ||
      !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))
    )
      throw new InputError("Current password is incorrect.", 403);
    const changed = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { authVersion: user.authVersion },
          { authVersion: { $exists: false } },
        ],
      },
      {
        $set: { passwordHash: await bcrypt.hash(req.body.newPassword, 10) },
        $inc: { authVersion: 1 },
      },
    );
    if (!changed.modifiedCount)
      throw new InputError("Password changed elsewhere. Sign in again.", 409);
    res.json({
      message: "Password updated. Sign in again with your new password.",
    });
  }),
);
const avatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
router.post(
  "/me/avatar",
  avatar.single("avatar"),
  run(async (req: AuthRequest, res: any) => {
    if (!req.file)
      throw new InputError("Choose a PNG, JPEG or WebP image up to 5 MB.");
    let data: Buffer;
    try {
      const input = sharp(req.file.buffer, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const metadata = await input.metadata();
      if (!["png", "jpeg", "webp"].includes(metadata.format || ""))
        throw new Error("Unsupported image format");
      data = await input
        .rotate()
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new InputError(
        "Upload a valid PNG, JPEG or WebP image (up to 25 megapixels).",
      );
    }
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { avatarData: data, avatarUpdatedAt: new Date() },
      { new: true },
    );
    res.json({ user: userDTO(user) });
  }),
);
router.delete(
  "/me/avatar",
  run(async (req: AuthRequest, res: any) => {
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $unset: { avatarData: 1, avatarUpdatedAt: 1 } },
      { new: true },
    );
    res.json({ user: userDTO(user) });
  }),
);
export default router;
