import mongoose from "mongoose";
import { Subject } from "../models/Subject.js";
import { User } from "../models/User.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { AuthRequest } from "../middleware/auth.js";
import { InputError } from "./questionBank.js";

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SECTIONS = ["Section A", "Section B", "Section C", "Section D"];
export function queryText(value: unknown, name: string, max = 200): string {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > max)
    throw new InputError(`Invalid ${name}.`);
  return value.trim();
}
export interface GradeRow {
  id: string;
  studentId: string;
  studentName: string;
  surname: string;
  yearLevel: string;
  section: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  term: string;
  facultyName: string;
  quizId: string;
  quizTitle: string;
  attempt: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  blurCount: number;
  timeSpentSeconds: number;
}
export function metrics(rows: GradeRow[]) {
  const passed = rows.filter((r) => r.passed).length;
  return {
    attempts: rows.length,
    students: new Set(rows.map((r) => r.studentId)).size,
    passed,
    passRate: rows.length ? (passed / rows.length) * 100 : 0,
    average: rows.length
      ? rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length
      : 0,
    distribution: [0, 50, 75, 90].map((min, i) => ({
      label: ["0–49%", "50–74%", "75–89%", "90–100%"][i],
      count: rows.filter(
        (r) => r.percentage >= min && r.percentage < [50, 75, 90, 101][i],
      ).length,
    })),
  };
}
export async function buildGradebook(req: AuthRequest) {
  const subjectId = queryText(req.query.subjectId, "subject ID");
  if (subjectId && !mongoose.isValidObjectId(subjectId))
    throw new InputError("Invalid subject ID.");
  const yearLevel = queryText(req.query.yearLevel, "year level");
  const section = queryText(req.query.section, "section");
  if (yearLevel && !YEARS.includes(yearLevel))
    throw new InputError("Invalid year level.");
  if (section && !SECTIONS.includes(section))
    throw new InputError("Invalid section.");
  const status = queryText(req.query.status, "status") || "all";
  const sort = queryText(req.query.sort, "sort") || "surname";
  const direction =
    queryText(req.query.direction, "direction") ||
    (sort === "surname" ? "asc" : "desc");
  if (
    !["all", "passed", "needs-review"].includes(status) ||
    !["surname", "score", "date"].includes(sort) ||
    !["asc", "desc"].includes(direction)
  )
    throw new InputError("Invalid gradebook filter or sort.");
  const minScore =
    req.query.minScore === undefined || req.query.minScore === ""
      ? 0
      : Number(queryText(req.query.minScore, "minimum score"));
  const maxScore =
    req.query.maxScore === undefined || req.query.maxScore === ""
      ? 100
      : Number(queryText(req.query.maxScore, "maximum score"));
  if (
    !Number.isFinite(minScore) ||
    !Number.isFinite(maxScore) ||
    minScore < 0 ||
    maxScore > 100 ||
    minScore > maxScore
  )
    throw new InputError("Score range must be between 0 and 100.");
  const search = queryText(req.query.search, "search");
  const subjects = await Subject.find(
    req.user!.role === "faculty" ? { facultyId: req.user!.id } : {},
  )
    .select("name code term yearLevel facultyName")
    .sort({ code: 1 })
    .lean();
  if (subjectId && !subjects.some((s) => String(s._id) === subjectId))
    throw new InputError("Subject is not available to this gradebook.", 403);
  const base: any =
    req.user!.role === "faculty"
      ? { subjectId: { $in: subjects.map((s) => s._id) } }
      : { studentId: req.user!.id };
  if (subjectId) base.subjectId = subjectId;
  // Keep cohort navigation available even when a score/search filter has no matches.
  const cohorts = await QuizSubmission.aggregate([
    {
      $match: {
        ...(req.user!.role === "faculty"
          ? {
              subjectId: {
                $in: subjects
                  .filter((s) => !subjectId || String(s._id) === subjectId)
                  .map((s) => s._id),
              },
            }
          : {
              studentId: new mongoose.Types.ObjectId(req.user!.id),
              ...(subjectId
                ? { subjectId: new mongoose.Types.ObjectId(subjectId) }
                : {}),
            }),
      },
    },
    {
      $group: {
        _id: { yearLevel: "$studentYearLevel", section: "$studentSection" },
      },
    },
  ]);
  const submissions = await QuizSubmission.find(base)
    .select("-answers")
    .populate("quizId", "title")
    .sort({ submittedAt: 1, _id: 1 })
    .limit(10001)
    .lean();
  if (submissions.length > 10000)
    throw new InputError(
      "Select a subject to reduce the report to 10,000 attempts or fewer.",
      413,
    );
  const subjectMap = new Map(subjects.map((s) => [String(s._id), s]));
  const attemptCounts = new Map<string, number>();
  let rows: GradeRow[] = submissions.map((s) => {
    const subject = subjectMap.get(String(s.subjectId));
    const quiz = s.quizId as any;
    const key = `${s.studentId}:${quiz?._id || quiz}`;
    const attempt = (attemptCounts.get(key) || 0) + 1;
    attemptCounts.set(key, attempt);
    return {
      id: String(s._id),
      studentId: String(s.studentId),
      studentName: s.studentName,
      surname: s.studentSurname,
      yearLevel: s.studentYearLevel,
      section: s.studentSection,
      subjectId: String(s.subjectId),
      subjectCode: subject?.code || "Archived",
      subjectName: subject?.name || "Archived subject",
      term: subject?.term || "",
      facultyName: subject?.facultyName || "",
      quizId: String(quiz?._id || ""),
      quizTitle: quiz?.title || "Archived quiz",
      attempt,
      score: s.score,
      totalQuestions: s.totalQuestions,
      percentage: s.percentage,
      passed: s.passed,
      submittedAt: s.submittedAt.toISOString(),
      blurCount: s.blurCount,
      timeSpentSeconds: s.timeSpentSeconds,
    };
  });
  const needle = search.toLocaleLowerCase();
  rows = rows.filter(
    (r) =>
      (!yearLevel || r.yearLevel === yearLevel) &&
      (!section || r.section === section) &&
      r.percentage >= minScore &&
      r.percentage <= maxScore &&
      (status === "all" || r.passed === (status === "passed")) &&
      (!needle ||
        [
          r.studentName,
          r.surname,
          r.studentId,
          r.quizTitle,
          r.subjectCode,
        ].some((v) => v.toLocaleLowerCase().includes(needle))),
  );
  rows.sort((a, b) => {
    const primary =
      sort === "score"
        ? a.percentage - b.percentage
        : sort === "date"
          ? a.submittedAt.localeCompare(b.submittedAt)
          : a.surname.localeCompare(b.surname);
    return (
      (direction === "asc" ? primary : -primary) ||
      b.percentage - a.percentage ||
      a.studentName.localeCompare(b.studentName) ||
      b.submittedAt.localeCompare(a.submittedAt) ||
      a.id.localeCompare(b.id)
    );
  });
  const keys = [
    ...new Set(rows.map((r) => `${r.yearLevel} - ${r.section}`)),
  ].sort();
  const groups = keys.map((key) => {
    const records = rows.filter((r) => `${r.yearLevel} - ${r.section}` === key);
    return {
      key,
      yearLevel: records[0].yearLevel,
      section: records[0].section,
      rows: records,
      metrics: metrics(records),
    };
  });
  const viewer = await User.findById(req.user!.id).select("fullName").lean();
  return {
    generatedAt: new Date().toISOString(),
    viewer: {
      role: req.user!.role,
      name: viewer?.fullName || req.user!.username,
    },
    subjects,
    cohorts: cohorts
      .map((c) => c._id)
      .sort((a, b) =>
        `${a.yearLevel}${a.section}`.localeCompare(
          `${b.yearLevel}${b.section}`,
        ),
      ),
    groups,
    summary: metrics(rows),
    filters: {
      subjectId,
      yearLevel,
      section,
      status,
      sort,
      direction,
      minScore,
      maxScore,
      search,
    },
  };
}
export type Gradebook = Awaited<ReturnType<typeof buildGradebook>>;
