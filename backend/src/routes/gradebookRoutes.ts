import { Router } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import { buildGradebook, queryText } from "../services/gradebook.js";
import { excelReport, pdfReport } from "../services/reportExport.js";
import { InputError } from "../services/questionBank.js";
import { AuditEvent } from "../models/AuditEvent.js";
const router = Router();
router.use(authenticateToken);
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const requestedPage = Number(queryText(req.query.page, "page") || "1");
    if (
      !Number.isInteger(requestedPage) ||
      requestedPage < 1 ||
      requestedPage > 100000
    )
      throw new InputError("Invalid report page.");
    const report = await buildGradebook(req);
    const pages = Math.max(
      1,
      ...report.groups.map((group) => Math.ceil(group.rows.length / 25)),
    );
    const page = Math.min(requestedPage, pages);
    res.json({
      ...report,
      pagination: { page, pages, pageSize: 25 },
      groups: report.groups.map((group) => ({
        ...group,
        rows: group.rows.slice((page - 1) * 25, page * 25),
      })),
    });
  } catch (err) {
    next(err);
  }
});
router.get("/export/:format", async (req: AuthRequest, res, next) => {
  try {
    const started = performance.now();
    if (!["xlsx", "pdf"].includes(req.params.format))
      throw new InputError("Export format must be pdf or xlsx.");
    const report = await buildGradebook(req);
    const bytes =
      req.params.format === "xlsx"
        ? await excelReport(report)
        : pdfReport(report);
    await AuditEvent.create({
      action: "gradebook.exported",
      actorId: req.user!.id,
      actorRole: req.user!.role,
      subjectId: report.filters.subjectId || undefined,
      resourceId: req.params.format,
      statusCode: 200,
      outcome: "success",
      durationMs: Math.round(performance.now() - started),
      details: { attempts: report.summary.attempts, format: req.params.format },
    });
    res.setHeader("Cache-Control", "no-store");
    res.type(
      req.params.format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
    );
    res
      .attachment(
        `quikz-${report.viewer.role}-${report.generatedAt.slice(0, 10)}.${req.params.format}`,
      )
      .send(bytes);
  } catch (err) {
    next(err);
  }
});
export default router;
