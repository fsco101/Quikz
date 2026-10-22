import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { InputError } from "./questionBank.js";
export const userDTO = (u: any) => ({
  id: String(u._id),
  username: u.username,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  surname: u.surname,
  yearLevel: u.yearLevel,
  section: u.section,
  bio: u.bio || "",
  active: u.active !== false,
  termsAccepted: u.termsAccepted,
  avatarUrl: u.avatarUpdatedAt
    ? `/api/users/${u._id}/avatar?v=${new Date(u.avatarUpdatedAt).getTime()}`
    : undefined,
});
export function profileFields(body: any) {
  const fields: any = {};
  for (const [key, max] of [
    ["username", 40],
    ["email", 254],
    ["fullName", 120],
    ["surname", 120],
  ] as const) {
    if (body[key] === undefined) continue;
    if (
      typeof body[key] !== "string" ||
      !body[key].trim() ||
      body[key].length > max
    )
      throw new InputError(`Provide a valid ${key} (up to ${max} characters).`);
    fields[key] = body[key].trim();
  }
  if (fields.email) fields.email = fields.email.toLowerCase();
  if (fields.email && !/^\S+@\S+\.\S+$/.test(fields.email))
    throw new InputError("Provide a valid email.");
  if (fields.username && !/^[a-zA-Z0-9_.-]{3,40}$/.test(fields.username))
    throw new InputError(
      "Username must be 3–40 letters, numbers, dots, underscores or hyphens.",
    );
  for (const [key, allowed] of [
    ["yearLevel", ["1st Year", "2nd Year", "3rd Year", "4th Year"]],
    ["section", ["Section A", "Section B", "Section C", "Section D"]],
  ] as const) {
    if (body[key] !== undefined) {
      if (!(allowed as readonly unknown[]).includes(body[key]))
        throw new InputError(`Choose a valid ${key}.`);
      fields[key] = body[key];
    }
  }
  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > 500)
      throw new InputError("Bio must be at most 500 characters.");
    fields.bio = body.bio.trim();
  }
  return fields;
}
export function validatePassword(
  password: unknown,
): asserts password is string {
  if (
    typeof password !== "string" ||
    password.length < 6 ||
    Buffer.byteLength(password) > 72
  )
    throw new InputError(
      "Password must be at least 6 characters and at most 72 bytes.",
    );
}
export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password)
    throw new Error(
      "Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision the first administrator.",
    );
  validatePassword(password);
  if (await User.exists({ role: "admin" })) return;
  if (await User.exists({ email }))
    throw new Error(
      "ADMIN_EMAIL is already assigned to an existing account. Use a new email for the initial administrator.",
    );
  const fields = profileFields({
    email,
    username: process.env.ADMIN_USERNAME || "administrator",
    fullName: process.env.ADMIN_FULL_NAME || "System Administrator",
    surname: "Administrator",
  });
  await User.create({
    ...fields,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 10),
    termsAccepted: true,
  });
}
