import { Module } from "../models/Module.js";
import { StudentProgress } from "../models/StudentProgress.js";
import { InputError } from "./questionBank.js";
import { QuizSubmission } from "../models/QuizSubmission.js";

export async function verifiedCompletionIds(
  studentId: string,
  subjectId: unknown,
  modules: { _id: unknown; quizId?: any }[],
) {
  return verifiedCourseCompletionIds(
    studentId,
    modules.map((m) => ({ _id: m._id, quizId: m.quizId, subjectId })),
  );
}

// Shared by course access and the catalog. Batch evidence across courses instead
// of issuing progress and submission queries separately for every catalog card.
export async function verifiedCourseCompletionIds(
  studentId: string,
  modules: { _id: unknown; subjectId: unknown; quizId?: any }[],
) {
  if (!modules.length) return new Set<string>();
  const subjectIds = [...new Set(modules.map((m) => String(m.subjectId)))];
  const [progress, passes] = await Promise.all([
    StudentProgress.find({ studentId, subjectId: { $in: subjectIds } })
      .select("subjectId completedModuleIds").lean(),
    QuizSubmission.find({ studentId, subjectId: { $in: subjectIds }, passed: true })
      .select("subjectId moduleId quizId").lean(),
  ]);
  const recorded = new Map(progress.map((p) => [
    String(p.subjectId), new Set(p.completedModuleIds.map(String)),
  ]));
  const designated = new Map(modules.filter((m) => m.quizId).map((m) => [
    String(m._id), { subjectId: String(m.subjectId), quizId: String(m.quizId._id || m.quizId) },
  ]));
  // Legacy completion flags never count without a pass on the designated quiz.
  return new Set(passes.filter((s) => {
    const module = designated.get(String(s.moduleId));
    return module?.subjectId === String(s.subjectId) &&
      module.quizId === String(s.quizId) &&
      recorded.get(String(s.subjectId))?.has(String(s.moduleId));
  }).map((s) => String(s.moduleId)));
}
export async function requireModuleAccess(studentId: string, moduleId: string) {
  const module = await Module.findById(moduleId);
  if (!module) throw new InputError("Module not found.", 404);
  const previous = await Module.find({
    subjectId: module.subjectId,
    orderIndex: { $lt: module.orderIndex },
  }).select("_id quizId");
  const completed = await verifiedCompletionIds(
    studentId,
    module.subjectId,
    previous,
  );
  if (previous.some((m) => !completed.has(String(m._id))))
    throw new InputError(
      "Pass all previous module quizzes before accessing this module.",
      403,
    );
  return module;
}
export async function recordCompletion(
  studentId: string,
  subjectId: unknown,
  moduleId: unknown,
) {
  await StudentProgress.updateOne(
    { studentId, subjectId },
    {
      $addToSet: { completedModuleIds: moduleId },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );
}
