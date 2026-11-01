import { Router } from "express";
import mongoose from "mongoose";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { Quiz } from "../models/Quiz.js";
import { EditorDraft } from "../models/EditorDraft.js";
import { InputError } from "../services/questionBank.js";

const router = Router();
const run = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);
router.use(authenticateToken, requireRole("faculty"));
router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

async function authorize(req: AuthRequest) {
  const scope = req.params.scope;
  const parts = scope.split(":");
  if (scope.length > 150 || !["module", "quiz"].includes(parts[0]) || !mongoose.isValidObjectId(parts[1]))
    throw new InputError("Invalid draft scope.");
  if (parts[0] === "module") {
    if (parts.length !== 3 || (parts[2] !== "new" && !mongoose.isValidObjectId(parts[2]))) throw new InputError("Invalid module draft.");
    const subject = await Subject.findById(parts[1]);
    if (!subject) throw new InputError("Subject not found.", 404);
    if (parts[2] === "new") {
      if (String(subject.facultyId) !== req.user!.id) throw new InputError("Only the subject owner can draft modules.", 403);
    } else {
      const module = await Module.findOne({ _id: parts[2], subjectId: parts[1] });
      if (!module) throw new InputError("Module not found.", 404);
      if (String(module.createdBy || subject.facultyId) !== req.user!.id) throw new InputError("Only the module creator can access this draft.", 403);
    }
  } else {
    if (parts.length !== 2) throw new InputError("Invalid quiz draft.");
    const module = await Module.findById(parts[1]);
    if (!module) throw new InputError("Module not found.", 404);
    if (module.quizId) {
      const quiz = await Quiz.findById(module.quizId);
      if (!quiz || String(quiz.createdBy) !== req.user!.id) throw new InputError("Only the quiz creator can access this draft.", 403);
    } else {
      const subject = await Subject.findById(module.subjectId);
      if (String(subject?.facultyId) !== req.user!.id || (module.createdBy && String(module.createdBy) !== req.user!.id))
        throw new InputError("Only the module owner can draft its quiz.", 403);
    }
  }
  return { ownerId: req.user!.id, scope };
}

const object = (value: any) => value && typeof value === "object" && !Array.isArray(value);
function draftData(scope: string, value: any) {
  if (!object(value) || Buffer.byteLength(JSON.stringify(value)) > 1024 * 1024) throw new InputError("Drafts must contain at most 1 MB of text and settings.");
  const module = scope.startsWith("module:");
  const stringFields = module ? ["title", "summary", "contentType", "textContent", "audience", "attachmentName"] : ["title", "timeUnit", "mode", "content", "questionStyle", "lectureSource", "attachmentName"];
  const numberFields = module ? [] : ["duration", "passingPercentage", "questionCount", "draftLimit"];
  const boolFields = module ? ["removeFile"] : ["legacyTotal"];
  const allowed = [...stringFields, ...numberFields, ...boolFields, ...(module ? [] : ["questions"])];
  if (Object.keys(value).some(key => !allowed.includes(key)) || stringFields.some(key => typeof value[key] !== "string") || numberFields.some(key => typeof value[key] !== "number" || !Number.isFinite(value[key])) || boolFields.some(key => typeof value[key] !== "boolean"))
    throw new InputError("Invalid draft fields.");
  if (module && (!["text", "file", "presentation"].includes(value.contentType) || !["public", "connected", "both"].includes(value.audience))) throw new InputError("Invalid module draft settings.");
  if (!module) {
    if (!["seconds", "minutes"].includes(value.timeUnit) || !["manual", "import", "lecture"].includes(value.mode) || !["mixed", "definitions", "terms"].includes(value.questionStyle) || !["module", "other"].includes(value.lectureSource) || !Array.isArray(value.questions) || value.questions.length > 100)
      throw new InputError("Invalid quiz draft settings.");
    // Empty/incomplete text is allowed in drafts. Never publish or validate grading here.
    if (value.questions.some((q: any) => !object(q) || typeof q.questionText !== "string" || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o: any) => typeof o !== "string") || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || (q.explanation !== undefined && typeof q.explanation !== "string")))
      throw new InputError("Invalid draft question structure.");
    value = { ...value, questions: value.questions.map((q: any) => ({ questionText: q.questionText, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation || "" })) };
  }
  return value;
}
const dto = (draft: any) => ({ version: draft?.version ?? 0, draft: draft && !draft.deleted ? { format: 1, revision: draft.revision, savedAt: new Date(draft.savedAt).getTime(), data: draft.data } : null });

router.get("/:scope", run(async (req: AuthRequest, res: any) => {
  res.json(dto(await EditorDraft.findOne(await authorize(req))));
}));
async function write(req: AuthRequest, res: any, deleted: boolean) {
  const filter = await authorize(req);
  const version = req.body?.version;
  if (!Number.isSafeInteger(version) || version < 0) throw new InputError("Provide the current draft version.");
  const revision = deleted ? "" : req.body.revision;
  if (typeof revision !== "string" || revision.length > 200) throw new InputError("Invalid source revision.");
  const data = deleted ? undefined : draftData(filter.scope, req.body.data);
  let saved;
  if (version === 0) {
    try { saved = await EditorDraft.create({ ...filter, revision, data, deleted, version: 1, savedAt: new Date() }); }
    catch (error: any) { if (error.code !== 11000) throw error; }
  } else {
    saved = await EditorDraft.findOneAndUpdate({ ...filter, version }, {
      $set: { revision, deleted, savedAt: new Date(), ...(!deleted ? { data } : {}) },
      ...(deleted ? { $unset: { data: 1 } } : {}), $inc: { version: 1 },
    }, { new: true });
  }
  if (!saved) throw new InputError("This draft changed on another device. Reload its latest copy before saving.", 409);
  // Keep deletion versions so delayed requests cannot resurrect a cleared draft.
  res.json(dto(saved));
}
router.put("/:scope", run((req: AuthRequest, res: any) => write(req, res, false)));
router.delete("/:scope", run((req: AuthRequest, res: any) => write(req, res, true)));
export default router;
