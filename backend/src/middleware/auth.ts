import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../config/auth.js";
import { User } from "../models/User.js";
export type UserRole = "faculty" | "student" | "admin";
export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole; email: string; username: string };
}
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Authentication required. No token provided." });
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
  try {
    if (!mongoose.isValidObjectId(decoded.id))
      return res.status(403).json({ message: "Invalid account." });
    const user = await User.findById(decoded.id).select(
      "role active authVersion email username",
    );
    if (
      !user ||
      user.active === false ||
      (decoded.authVersion ?? 0) !== user.authVersion
    )
      return res
        .status(403)
        .json({
          message: "Account disabled or session expired. Please sign in again.",
        });
    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      username: user.username,
    };
    next();
  } catch (err) {
    next(err);
  }
};
export const requireRole =
  (role: UserRole) => (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role)
      return res
        .status(403)
        .json({ message: `Access denied. Requires ${role} privileges.` });
    next();
  };
