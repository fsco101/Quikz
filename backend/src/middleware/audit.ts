import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { telemetry } from "../services/telemetry.js";
import mongoose from "mongoose";
import { Quiz } from "../models/Quiz.js";
export function auditRequests(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const start = performance.now();
  const route = req.path;
  let action = "";
  if (req.method === "POST" && route === "/api/auth/login")
    action = "auth.login";
  else if (req.method === "POST" && route === "/api/auth/register")
    action = "auth.register";
  else if (req.method === "POST" && route === "/api/subjects")
    action = "curriculum.subject_published";
  else if (
    req.method === "POST" &&
    /^\/api\/subjects\/[^/]+\/modules$/.test(route)
  )
    action = "curriculum.module_published";
  else if (req.method === "POST" && route === "/api/quizzes")
    action = "quiz.published";
  else if (req.method === "POST" && /\/attempts\/[^/]+\/submit$/.test(route))
    action = "quiz.submitted";
  else if (req.method === "POST" && /\/attempts$/.test(route))
    action = "quiz.session_opened";
  else if (
    req.method === "PATCH" &&
    /\/attempts\//.test(route) &&
    req.body?.blur === true
  )
    action = "quiz.focus_warning";
  else if (req.method === "GET" && route.startsWith("/api/gradebook/export/"))
    action = "gradebook.exported";
  if (!action || action === "gradebook.exported") {
    next();
    return;
  }
  const json = res.json.bind(res);
  let sent = false;
  res.json = ((body: any) => {
    if (sent) return res;
    sent = true;
    const resource =
      body?.submission || body?.quiz || body?.module || body?.subject;
    const actorId = req.user?.id || body?.user?.id || res.locals.auditActorId;
    let subjectId =
      resource?.subjectId || (body?.subject ? body.subject._id : undefined);
    const details: Record<string, unknown> = {};
    if (action === "auth.register")
      details.termsAccepted = req.body?.termsAccepted === true;
    if (body?.submission) {
      details.percentage = body.submission.percentage;
      details.passed = body.submission.passed;
    }
    if (action === "quiz.focus_warning") details.blurCount = body?.blurCount;
    // Whitelist metadata: credentials, tokens, answers and lecture text are never logged.
    void (async () => {
      if (
        !subjectId &&
        action.startsWith("quiz.") &&
        mongoose.isValidObjectId(req.params.id)
      )
        subjectId = (await Quiz.findById(req.params.id).select("subjectId"))
          ?.subjectId;
      await AuditEvent.create({
        action,
        actorId: mongoose.isValidObjectId(actorId) ? actorId : undefined,
        actorRole:
          req.user?.role || body?.user?.role || res.locals.auditActorRole,
        subjectId: mongoose.isValidObjectId(subjectId) ? subjectId : undefined,
        resourceId: String(
          resource?._id ||
            body?.attempt?.id ||
            body?.user?.id ||
            req.params.attemptId ||
            "",
        ),
        statusCode: res.statusCode,
        outcome: res.statusCode < 400 ? "success" : "failure",
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        details,
      });
    })()
      .then(() => {
        telemetry.auditWriteHealthy = true;
        json(body);
      })
      .catch(() => {
        telemetry.auditFailures++;
        telemetry.auditWriteHealthy = false;
        res.status(503);
        json({
          message:
            "The request was processed but its audit record could not be saved. Check the result before retrying.",
        });
      });
    return res;
  }) as Response["json"];
  next();
}
