import { withAdminWriteLock } from "../services/adminAccess.js";
import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import {
  authenticateToken,
  requireRole,
  AuthRequest,
} from "../middleware/auth.js";
import { profileFields, userDTO, validatePassword } from "../services/users.js";
import { InputError } from "../services/questionBank.js";
import { queryText } from "../services/gradebook.js";
const router = Router();
const run = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);
router.use(authenticateToken, requireRole("admin"));
router.get(
  "/users",
  run(async (req: AuthRequest, res: any) => {
    const search = queryText(req.query.search, "search", 120);
    const role = queryText(req.query.role, "role");
    const status = queryText(req.query.status, "status");
    const page = Number(queryText(req.query.page, "page") || "1");
    if (
      (role && !["admin", "faculty", "student"].includes(role)) ||
      (status && !["active", "disabled"].includes(status)) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000
    )
      throw new InputError("Invalid user filter.");
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.active = status === "active" ? { $ne: false } : false;
    if (search) {
      const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["username", "email", "fullName"].map((key) => ({
        [key]: { $regex: literal, $options: "i" },
      }));
    }
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-passwordHash")
        .sort({ fullName: 1, _id: 1 })
        .skip((page - 1) * 25)
        .limit(25),
    ]);
    res.json({
      users: users.map(userDTO),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / 25)),
    });
  }),
);
router.post(
  "/users",
  run(async (req: AuthRequest, res: any) => {
    const fields = profileFields(req.body);
    if (
      !["username", "email", "fullName", "surname"].every((key) => fields[key])
    )
      throw new InputError(
        "Username, email, full name and surname are required.",
      );
    if (!["admin", "faculty", "student"].includes(req.body.role))
      throw new InputError("Choose a valid role.");
    if (req.body.termsAccepted !== true)
      throw new InputError(
        "Confirm that the user has accepted the Terms and Honor Code.",
      );
    validatePassword(req.body.password);
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await withAdminWriteLock(req.user!.id, () =>
      User.create({
        ...fields,
        role: req.body.role,
        passwordHash,
        termsAccepted: true,
      }),
    );
    res.status(201).json({ user: userDTO(user) });
  }),
);
router.patch(
  "/users/:id",
  run(async (req: AuthRequest, res: any) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new InputError("Invalid user ID.");
    const fields = profileFields(req.body);
    if (req.body.role !== undefined) {
      if (!["admin", "faculty", "student"].includes(req.body.role))
        throw new InputError("Choose a valid role.");
      fields.role = req.body.role;
    }
    if (req.body.active !== undefined) {
      if (typeof req.body.active !== "boolean")
        throw new InputError("Account status must be active or disabled.");
      fields.active = req.body.active;
    }
    // Administrators cannot remove their own access, including simultaneous demotions.
    if (
      req.params.id === req.user!.id &&
      (fields.active === false || (fields.role && fields.role !== "admin"))
    )
      throw new InputError(
        "You cannot disable or demote your own administrator account.",
        409,
      );
    if (req.body.password !== undefined) {
      validatePassword(req.body.password);
      fields.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    const user = await withAdminWriteLock(req.user!.id, async () => {
      return await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: fields,
          ...(fields.passwordHash || fields.active === false
            ? { $inc: { authVersion: 1 } }
            : {}),
        },
        { new: true, runValidators: true },
      );
    });
    if (!user) throw new InputError("User not found.", 404);
    await Subject.updateMany(
      { facultyId: user._id },
      { facultyName: user.fullName },
    );
    res.json({ user: userDTO(user) });
  }),
);
export default router;
