import { Router } from "express";
import {
  authenticateToken,
  requireRole,
  AuthRequest,
} from "../middleware/auth.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { databaseHealth } from "../services/telemetry.js";
import { queryText } from "../services/gradebook.js";
import { InputError } from "../services/questionBank.js";
const router = Router();
router.use(authenticateToken, requireRole("admin"));
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
    const scope = {};
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
      scope: "system",
    });
  } catch (err) {
    next(err);
  }
});
export default router;
