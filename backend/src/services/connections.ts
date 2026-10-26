import { FacultyConnection } from "../models/FacultyConnection.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { AuthRequest } from "../middleware/auth.js";
import { InputError } from "./questionBank.js";

export const AUDIENCES = ["connected", "public", "both"] as const;
export function moduleAudience(value: unknown) {
  if (typeof value !== "string" || !AUDIENCES.includes(value as any))
    throw new InputError("Choose Connected students, Public, or Both for the module audience.");
  return value;
}
// Legacy lessons keep their previous public discovery behavior. New API uploads
// explicitly default to connected, so existing data needs no destructive migration.
export const publicModules = { audience: { $ne: "connected" } };
export async function connectedUserIds(user: { id: string; role: string }) {
  const faculty = user.role === "faculty";
  const links = await FacultyConnection.find({
    [faculty ? "facultyId" : "studentId"]: user.id, status: "accepted",
  }).select(faculty ? "studentId" : "facultyId").lean();
  const ids = links.map((link) => faculty ? link.studentId : link.facultyId);
  const users = await User.find({ _id: { $in: ids }, role: faculty ? "student" : "faculty", active: { $ne: false } }).select("_id").lean();
  return users.map((user) => user._id);
}
export async function readableModules(user?: AuthRequest["user"]): Promise<any> {
  if (user?.role === "admin") return {};
  const facultyIds = user?.role === "faculty" ? [user.id] : user?.role === "student" ? await connectedUserIds(user) : [];
  if (!facultyIds.length) return publicModules;
  const subjects = await Subject.find({ facultyId: { $in: facultyIds } }).select("_id").lean();
  return { $or: [publicModules, { subjectId: { $in: subjects.map((s) => s._id) } }] };
}
export async function hiddenSubjectIds(user?: AuthRequest["user"]) {
  const [all, visible] = await Promise.all([
    Module.distinct("subjectId"), Module.distinct("subjectId", await readableModules(user)),
  ]);
  const visibleIds = new Set(visible.map(String));
  return all.filter((id) => !visibleIds.has(String(id)));
}
export async function requireAudienceAccess(user: NonNullable<AuthRequest["user"]>, module: { subjectId: unknown; audience?: string }) {
  if (module.audience !== "connected" || user.role === "admin") return;
  const subject = await Subject.findById(module.subjectId).select("facultyId");
  if (subject && user.role === "faculty" && String(subject.facultyId) === user.id) return;
  if (subject && user.role === "student" && (await connectedUserIds(user)).some((id) => String(id) === String(subject.facultyId))) return;
  throw new InputError("Connect with this professor and have your request accepted to access this lesson.", 403);
}
