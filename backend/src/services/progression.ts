import { Module } from "../models/Module.js";
import { StudentProgress } from "../models/StudentProgress.js";
import { InputError } from "./questionBank.js";
import { QuizSubmission } from "../models/QuizSubmission.js";

export async function verifiedCompletionIds(
  studentId: string,
  subjectId: unknown,
  modules: { _id: unknown; quizId?: any }[],
) {
  const progress = await StudentProgress.findOne({ studentId, subjectId });
  const recorded = new Set(progress?.completedModuleIds.map(String) || []);
  const designated = new Map(
    modules
      .filter((m) => m.quizId)
      .map((m) => [String(m._id), String(m.quizId._id || m.quizId)]),
  );
  const passes = await QuizSubmission.find({
    studentId,
    subjectId,
    passed: true,
  }).select("moduleId quizId");
  // Legacy completion flags from the old bypass never grant access on their own.
  return new Set(
    passes
      .filter(
        (s) =>
          recorded.has(String(s.moduleId)) &&
          designated.get(String(s.moduleId)) === String(s.quizId),
      )
      .map((s) => String(s.moduleId)),
  );
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
