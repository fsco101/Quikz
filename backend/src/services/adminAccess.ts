import { randomUUID } from "node:crypto";
import { Schema, model } from "mongoose";
import { User } from "../models/User.js";
import { InputError } from "./questionBank.js";
const AdminWriteLock = model(
  "AdminWriteLock",
  new Schema({ _id: String, owner: String, lockedUntil: Date }),
);
// Serialize role/status writes across server processes. Recheck the actor inside
// the lease so two administrators cannot simultaneously remove each other's access.
export async function withAdminWriteLock<T>(
  actorId: string,
  work: () => Promise<T>,
): Promise<T> {
  const owner = randomUUID(),
    now = new Date();
  try {
    await AdminWriteLock.findOneAndUpdate(
      { _id: "user-management", lockedUntil: { $lte: now } },
      { $set: { owner, lockedUntil: new Date(now.getTime() + 15000) } },
      { upsert: true, new: true },
    );
  } catch (err: any) {
    if (err.code === 11000)
      throw new InputError(
        "Another account update is in progress. Retry shortly.",
        409,
      );
    throw err;
  }
  try {
    if (
      !(await User.exists({
        _id: actorId,
        role: "admin",
        active: { $ne: false },
      }))
    )
      throw new InputError("Administrator access is no longer available.", 403);
    return await work();
  } finally {
    await AdminWriteLock.deleteOne({ _id: "user-management", owner });
  }
}
