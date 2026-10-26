import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { verifiedCourseCompletionIds } from "./progression.js";
import { readableModules, hiddenSubjectIds } from "./connections.js";

export async function courseOverview(user: { id: string; role: "student" | "faculty" }) {
  const identity = { ...user, email: "", username: "" };
  const subjects = await Subject.find({ ...(user.role === "faculty" ? { facultyId: user.id } : {}), _id: { $nin: await hiddenSubjectIds(identity) } })
    .select("_id").lean();
  const modules = await Module.find({ $and: [{ subjectId: { $in: subjects.map((s) => s._id) } }, await readableModules({ ...user, email: "", username: "" })] })
    .select("subjectId title orderIndex quizId")
    .sort({ orderIndex: 1, _id: 1 })
    .populate("quizId", "subjectId moduleId")
    .lean();
  const completed = user.role === "student"
    ? await verifiedCourseCompletionIds(user.id, modules)
    : new Set<string>();
  const bySubject = new Map<string, typeof modules>();
  for (const module of modules) {
    const key = String(module.subjectId);
    const group = bySubject.get(key) || [];
    group.push(module);
    bySubject.set(key, group);
  }
  return subjects.map((subject) => {
    const courseModules = bySubject.get(String(subject._id)) || [];
    const base = { subjectId: String(subject._id), totalModules: courseModules.length };
    if (user.role === "student") {
      const completedCount = courseModules.filter((m) => completed.has(String(m._id))).length;
      const next = courseModules.find((m) => !completed.has(String(m._id)));
      return {
        ...base,
        completedCount,
        status: !courseModules.length ? "empty" : completedCount === courseModules.length
          ? "completed" : completedCount ? "in-progress" : "not-started",
        nextModule: next ? { id: String(next._id), title: next.title } : null,
      };
    }
    const missing = courseModules.filter((module) => {
      const quiz = module.quizId as unknown as { subjectId: unknown; moduleId?: unknown } | null;
      return !quiz || String(quiz.subjectId) !== String(subject._id) ||
        String(quiz.moduleId) !== String(module._id);
    });
    return {
      ...base,
      readyQuizCount: courseModules.length - missing.length,
      missingQuizCount: missing.length,
      status: !courseModules.length ? "empty" : missing.length ? "needs-quizzes" : "ready",
      nextModule: missing[0] ? { id: String(missing[0]._id), title: missing[0].title } : null,
    };
  });
}
