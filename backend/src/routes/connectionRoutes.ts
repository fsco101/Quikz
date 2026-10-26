import { Router } from "express";
import mongoose from "mongoose";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import { FacultyConnection } from "../models/FacultyConnection.js";
import { User } from "../models/User.js";
import { InputError } from "../services/questionBank.js";
import { queryText } from "../services/gradebook.js";
import { userDTO } from "../services/users.js";

const router = Router();
const run = (fn: (req: AuthRequest, res: any) => Promise<any>) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);
router.use(authenticateToken, (req: AuthRequest, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.user!.role === "admin") return res.status(403).json({ message: "Connections are for students and faculty." });
  next();
});
router.get("/", run(async (req, res) => {
  const user = req.user!;
  const faculty = user.role === "faculty";
  const view = queryText(req.query.view, "connection view") || "accepted";
  const search = queryText(req.query.search, "connection search", 120);
  const page = Number(queryText(req.query.page, "page") || 1);
  if (!["accepted", "incoming", "outgoing"].includes(view) || !Number.isInteger(page) || page < 1 || page > 100000)
    throw new InputError("Invalid connection filters.");
  const party = faculty ? "studentId" : "facultyId";
  const base = { [faculty ? "facultyId" : "studentId"]: new mongoose.Types.ObjectId(user.id) };
  const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pipeline: any[] = [
    { $match: { ...base, status: view === "accepted" ? "accepted" : "pending", ...(view === "accepted" ? {} : { requestedBy: view === "incoming" ? { $ne: new mongoose.Types.ObjectId(user.id) } : new mongoose.Types.ObjectId(user.id) }) } },
    { $lookup: { from: "users", localField: party, foreignField: "_id", as: "person" } },
    { $unwind: "$person" },
    { $match: { "person.active": { $ne: false }, "person.role": faculty ? "student" : "faculty", ...(search ? { $or: ["fullName", "email"].map((key) => ({ [`person.${key}`]: { $regex: literal, $options: "i" } })) } : {}) } },
    { $sort: { "person.fullName": 1, _id: 1 } },
    { $facet: { count: [{ $count: "total" }], records: [{ $skip: (page - 1) * 25 }, { $limit: 25 }, { $project: { status: 1, requestedBy: 1, createdAt: 1, acceptedAt: 1, "person._id": 1, "person.fullName": 1, "person.email": 1, "person.role": 1, "person.avatarUpdatedAt": 1, ...(view === "accepted" && faculty ? { "person.yearLevel": 1, "person.section": 1 } : {}) } }] } },
  ];
  const [result] = await FacultyConnection.aggregate(pipeline);
  const total = result.count[0]?.total || 0;
  res.json({ page, total, pages: Math.max(1, Math.ceil(total / 25)), connections: result.records.map((link: any) => ({
    id: String(link._id), status: link.status, incoming: String(link.requestedBy) !== user.id,
    createdAt: link.createdAt, acceptedAt: link.acceptedAt,
    person: { id: String(link.person._id), fullName: link.person.fullName, email: link.person.email, role: link.person.role, avatarUrl: userDTO(link.person).avatarUrl, yearLevel: link.person.yearLevel, section: link.person.section },
  })) });
}));
router.post("/", run(async (req, res) => {
  const email = queryText(req.body.email, "email", 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new InputError("Enter the registered email address.");
  const user = req.user!;
  const person = await User.findOne({ email, role: user.role === "faculty" ? "student" : "faculty", active: { $ne: false } }).select("_id");
  if (!person) throw new InputError("No eligible account with that email. Ask them to register or check the address.", 404);
  const pair = user.role === "faculty" ? { facultyId: user.id, studentId: person._id } : { studentId: user.id, facultyId: person._id };
  try {
    await FacultyConnection.create({ ...pair, requestedBy: user.id });
  } catch (err: any) {
    if (err.code === 11000) throw new InputError("A connection or pending request already exists. Check your request tabs.", 409);
    throw err;
  }
  res.status(201).json({ message: "Request sent. Access begins when the other person accepts it in Connections." });
}));
async function participant(req: AuthRequest) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new InputError("Invalid connection ID.");
  const link = await FacultyConnection.findOne({ _id: req.params.id, $or: [{ facultyId: req.user!.id }, { studentId: req.user!.id }] });
  if (!link) throw new InputError("Connection not found.", 404);
  return link;
}
router.post("/:id/accept", run(async (req, res) => {
  const link = await participant(req);
  if (String(link.requestedBy) === req.user!.id) throw new InputError("Only the recipient can accept this request.", 403);
  const [faculty, student] = await Promise.all([
    User.exists({ _id: link.facultyId, role: "faculty", active: { $ne: false } }),
    User.exists({ _id: link.studentId, role: "student", active: { $ne: false } }),
  ]);
  if (!faculty || !student) throw new InputError("This request is no longer available.", 409);
  const updated = await FacultyConnection.updateOne({ _id: link._id, status: "pending", requestedBy: { $ne: req.user!.id } }, { $set: { status: "accepted", acceptedAt: new Date() } });
  if (!updated.modifiedCount) throw new InputError("Request changed elsewhere. Refresh Connections.", 409);
  res.json({ message: "Connected. Private lessons and course-specific faculty reports are now available." });
}));
router.delete("/:id", run(async (req, res) => {
  const link = await participant(req);
  await FacultyConnection.deleteOne({ _id: link._id });
  res.json({ message: "Connection removed. Private lesson and faculty report access has ended. Saved results are retained." });
}));
export default router;
