import { Router } from "express";
import mongoose from "mongoose";
import {
  authenticateToken,
  requireRole,
  AuthRequest,
} from "../middleware/auth.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { Subject } from "../models/Subject.js";
import { databaseHealth } from "../services/telemetry.js";
import { queryText } from "../services/gradebook.js";
import { InputError } from "../services/questionBank.js";
const router = Router();
router.use(authenticateToken, requireRole("faculty"));
router.get("/health", async (req, res, next) => {
  try {
    const health = await databaseHealth();
    res.status(health.status === "unavailable" ? 503 : 200).json(health);
  } catch (err) {
    next(err);
  }
});
router.get("/audit", async (req: AuthRequest, res, next) => {
  try {
    const page = Number(queryText(req.query.page, "page") || "1");
    const action = queryText(req.query.action, "action");
    const outcome = queryText(req.query.outcome, "outcome");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      (outcome && !["success", "failure"].includes(outcome))
    )
      throw new InputError("Invalid audit filter.");
    const subjects = await Subject.find({ facultyId: req.user!.id }).select(
      "_id",
    );
    const operator = (process.env.SYSTEM_ADMIN_USER_IDS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .includes(req.user!.id.toLowerCase());
    const scope = operator
      ? {}
      : {
          $or: [
            { actorId: new mongoose.Types.ObjectId(req.user!.id) },
            { subjectId: { $in: subjects.map((s) => s._id) } },
          ],
        };
    const filter: any = { ...scope };
    if (action) filter.action = action;
    if (outcome) filter.outcome = outcome;
    const [total, events, stats] = await Promise.all([
      AuditEvent.countDocuments(filter),
      AuditEvent.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 25)
        .limit(25)
        .lean(),
      AuditEvent.aggregate([
        { $match: scope },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
            averageMs: { $avg: "$durationMs" },
            failures: {
              $sum: { $cond: [{ $eq: ["$outcome", "failure"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);
    res.json({
      total,
      page,
      pages: Math.ceil(total / 25),
      events,
      stats,
      scope: operator ? "system" : "own-subjects",
    });
  } catch (err) {
    next(err);
  }
});
export default router;
