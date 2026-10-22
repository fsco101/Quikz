import { Response } from "express";
import mongoose from "mongoose";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { Module } from "../models/Module.js";
import { Subject } from "../models/Subject.js";
import { User } from "../models/User.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { AuthRequest } from "../middleware/auth.js";
import { generateQuestionsFromContent } from "../services/questionGenerator.js";
import { extractDocumentText } from "../services/documentText.js";
import {
  InputError,
  importQuestionBank,
  shuffle,
  validateQuestions,
} from "../services/questionBank.js";
import {
  recordCompletion,
  requireModuleAccess,
} from "../services/progression.js";

export const REVIEW_INTERVAL_SECONDS = 60;
function id(value: string) {
  if (!mongoose.isValidObjectId(value))
    throw new InputError("Invalid resource ID.");
  return value;
}
async function quizFor(req: AuthRequest) {
  const quiz = await Quiz.findById(id(req.params.id));
  if (!quiz) throw new InputError("Quiz not found.", 404);
  if (req.user!.role === "student" && quiz.moduleId) {
    const module = await requireModuleAccess(
      req.user!.id,
      String(quiz.moduleId),
    );
    if (String(module.quizId) !== String(quiz._id))
      throw new InputError(
        "This quiz is no longer the designated module assessment.",
        409,
      );
  }
  return quiz;
}
function publicQuiz(quiz: any) {
  const data = quiz.toObject();
  return {
    ...data,
    questions: data.questions.map((q: any) => ({
      questionText: q.questionText,
      options: q.options,
    })),
  };
}
export const createQuiz = async (req: AuthRequest, res: Response) => {
  const {
    title,
    subjectId,
    moduleId,
    questions,
    timeLimitMinutes = 15,
    timePerQuestion,
    timeUnit,
    passingPercentage = 75,
    questionCount,
  } = req.body;
  if (typeof title !== "string" || !title.trim())
    throw new InputError("Quiz title is required.");
  const perQuestion = timePerQuestion !== undefined || timeUnit !== undefined;
  const seconds =
    perQuestion && typeof timePerQuestion === "number"
      ? timePerQuestion * (timeUnit === "minutes" ? 60 : 1)
      : undefined;
  if (
    perQuestion &&
    (!["seconds", "minutes"].includes(timeUnit) ||
      !Number.isFinite(seconds) ||
      seconds! < 1 ||
      seconds! > 86400)
  )
    throw new InputError(
      "Set a time per question from 1 second to 1,440 minutes and choose seconds or minutes.",
    );
  if (
    !perQuestion &&
    (typeof timeLimitMinutes !== "number" ||
      !Number.isFinite(timeLimitMinutes) ||
      timeLimitMinutes <= 0 ||
      timeLimitMinutes > 1440)
  )
    throw new InputError(
      "Quiz duration must be greater than zero and at most 1,440 minutes.",
    );
  if (
    typeof passingPercentage !== "number" ||
    !Number.isFinite(passingPercentage) ||
    passingPercentage < 1 ||
    passingPercentage > 100
  )
    throw new InputError("Passing percentage must be between 1 and 100.");
  const validated = validateQuestions(questions);
  const count = questionCount === undefined ? validated.length : questionCount;
  if (!Number.isInteger(count) || count < 1 || count > validated.length)
    throw new InputError(
      "Questions per attempt must be a whole number between 1 and the question bank size.",
    );
  const subject = await Subject.findById(id(subjectId));
  if (!subject) throw new InputError("Subject not found.", 404);
  if (String(subject.facultyId) !== req.user!.id)
    throw new InputError("Only the subject owner can publish quizzes.", 403);
  let module;
  if (moduleId) {
    module = await Module.findById(id(moduleId));
    if (!module || String(module.subjectId) !== subjectId)
      throw new InputError("Module must belong to the selected subject.");
    if (module.quizId)
      throw new InputError("This module already has an end quiz.", 409);
  }
  const quiz = await Quiz.create({
    title: title.trim(),
    subjectId,
    moduleId: module?._id,
    timeLimitMinutes: seconds ? (seconds * count) / 60 : timeLimitMinutes,
    timePerQuestionSeconds: seconds,
    questionCount: count,
    passingPercentage,
    questions: validated,
    createdBy: req.user!.id,
  });
  if (module) {
    const bound = await Module.updateOne(
      { _id: module._id, quizId: null },
      { $set: { quizId: quiz._id } },
    );
    if (!bound.modifiedCount) {
      await Quiz.deleteOne({ _id: quiz._id });
      throw new InputError("This module already has an end quiz.", 409);
    }
  }
  res.status(201).json({ quiz });
};
export const importQuestions = async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new InputError("Select a question bank file.");
  const format = req.file.originalname.split(".").pop()!.toLowerCase();
  const questions = importQuestionBank(
    req.file.buffer.toString("utf8"),
    format,
  );
  res.json({ questions, count: questions.length });
};
export const generateQuestions = async (req: AuthRequest, res: Response) => {
  const content = req.file
    ? await extractDocumentText(req.file.buffer, req.file.originalname)
    : req.body.content;
  if (typeof content !== "string" || !content.trim() || content.length > 250000)
    throw new InputError("Provide lecture text up to 250,000 characters.");
  const questions = generateQuestionsFromContent(content);
  res.json({
    questions,
    count: questions.length,
    message: "Review and edit generated questions before publishing.",
  });
};
export const getQuizzesBySubject = async (req: AuthRequest, res: Response) => {
  const quizzes = await Quiz.find({ subjectId: id(req.params.subjectId) }).sort(
    { createdAt: -1 },
  );
  // List only metadata; locked assessment questions are never sent in catalogs.
  res.json({
    quizzes: quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      moduleId: q.moduleId,
      timeLimitMinutes: q.timeLimitMinutes,
      timePerQuestionSeconds: q.timePerQuestionSeconds,
      questionCount: q.questionCount ?? q.questions.length,
      passingPercentage: q.passingPercentage,
    })),
  });
};
export const getQuizById = async (req: AuthRequest, res: Response) => {
  const quiz = await quizFor(req);
  if (req.user!.role === "student") {
    const { questions, ...metadata } = publicQuiz(quiz);
    return res.json({
      quiz: {
        ...metadata,
        questionCount: quiz.questionCount ?? questions.length,
      },
    });
  }
  res.json({
    quiz:
      req.user!.role === "faculty" && String(quiz.createdBy) === req.user!.id
        ? quiz
        : publicQuiz(quiz),
  });
};

async function applyProgress(submission: any) {
  await AuditEvent.updateOne(
    { dedupeKey: `submission:${submission._id}` },
    {
      $setOnInsert: {
        action: "quiz.result_recorded",
        actorId: submission.studentId,
        actorRole: "student",
        subjectId: submission.subjectId,
        resourceId: String(submission._id),
        statusCode: 200,
        outcome: "success",
        durationMs: 0,
        details: {
          percentage: submission.percentage,
          passed: submission.passed,
          blurCount: submission.blurCount,
        },
      },
    },
    { upsert: true },
  );
  if (submission.passed && submission.moduleId) {
    const module = await Module.findById(submission.moduleId);
    if (String(module?.quizId) === String(submission.quizId))
      await recordCompletion(
        String(submission.studentId),
        submission.subjectId,
        submission.moduleId,
      );
  }
}
async function finishAttempt(attempt: any) {
  const previous = await QuizSubmission.findOne({ attemptId: attempt._id });
  if (previous) {
    await applyProgress(previous);
    await QuizAttempt.updateOne(
      { _id: attempt._id },
      { active: false, finalizing: false },
    );
    return previous;
  }
  const claim = await QuizAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      active: true,
      $or: [
        { finalizing: false },
        { finalizingAt: { $lt: new Date(Date.now() - 30000) } },
      ],
    },
    { finalizing: true, finalizingAt: new Date() },
    { new: true },
  );
  if (!claim)
    throw new InputError("Submission is being saved. Retry shortly.", 409);
  try {
    const quiz = await Quiz.findById(claim.quizId);
    const student = await User.findById(claim.studentId);
    if (!quiz || !student)
      throw new InputError("Quiz or student no longer exists.", 404);
    const answers = claim.questionOrder.map((index, position) => {
      const displayedOption = claim.answers[position] ?? -1;
      const selectedOption =
        displayedOption < 0
          ? -1
          : (claim.optionOrders?.[index]?.[displayedOption] ?? displayedOption);
      return {
        questionIndex: index,
        selectedOption,
        isCorrect: selectedOption === quiz.questions[index].correctIndex,
      };
    });
    const score = answers.filter((a) => a.isCorrect).length;
    const percentage = (score / claim.questionOrder.length) * 100; // Never round a failing score into a pass.
    const now = new Date();
    const submission = await QuizSubmission.create({
      attemptId: claim._id,
      quizId: quiz._id,
      studentId: student._id,
      studentName: student.fullName,
      studentSurname: student.surname,
      studentYearLevel: student.yearLevel,
      studentSection: student.section,
      subjectId: quiz.subjectId,
      moduleId: quiz.moduleId,
      score,
      totalQuestions: claim.questionOrder.length,
      percentage,
      passingPercentage: quiz.passingPercentage,
      passed: percentage >= quiz.passingPercentage,
      answers,
      blurCount: claim.blurCount,
      timeSpentSeconds: Math.min(
        (claim.expiresAt.getTime() - claim.startedAt.getTime()) / 1000,
        Math.max(
          0,
          Math.floor((Date.now() - claim.startedAt.getTime()) / 1000),
        ),
      ),
      submittedAt: now,
      retryAfter:
        percentage < quiz.passingPercentage && !quiz.moduleId
          ? new Date(now.getTime() + REVIEW_INTERVAL_SECONDS * 1000)
          : undefined,
    });
    await applyProgress(submission);
    await QuizAttempt.updateOne(
      { _id: claim._id },
      { active: false, finalizing: false },
    );
    return submission;
  } catch (err) {
    await QuizAttempt.updateOne({ _id: claim._id }, { finalizing: false });
    throw err;
  }
}
function attemptState(attempt: any) {
  return {
    id: attempt._id,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    questionExpiresAt: attempt.questionExpiresAt,
    currentQuestionIndex: attempt.currentQuestionIndex,
    timePerQuestionSeconds: attempt.timePerQuestionSeconds,
    serverNow: new Date(),
    answers: attempt.answers,
    blurCount: attempt.blurCount,
  };
}
async function synchronizeQuestion(attempt: any) {
  if (
    !attempt.active ||
    !attempt.timePerQuestionSeconds ||
    attempt.expiresAt.getTime() <= Date.now()
  )
    return attempt;
  const deadline = attempt.questionExpiresAt.getTime();
  if (deadline > Date.now()) return attempt;
  const elapsed =
    Math.floor(
      (Date.now() - deadline) / (attempt.timePerQuestionSeconds * 1000),
    ) + 1;
  const index = Math.min(
    attempt.questionOrder.length - 1,
    attempt.currentQuestionIndex + elapsed,
  );
  return (
    (await QuizAttempt.findOneAndUpdate(
      {
        _id: attempt._id,
        active: true,
        finalizing: false,
        currentQuestionIndex: attempt.currentQuestionIndex,
        questionExpiresAt: attempt.questionExpiresAt,
      },
      {
        $set: {
          currentQuestionIndex: index,
          questionExpiresAt: new Date(
            deadline + elapsed * attempt.timePerQuestionSeconds * 1000,
          ),
        },
      },
      { new: true },
    )) ||
    (await QuizAttempt.findById(attempt._id)) ||
    attempt
  );
}
function answerUpdate(attempt: any, body: any) {
  const answers = validateAnswers(body.answers, attempt.questionOrder.length);
  if (!attempt.timePerQuestionSeconds) return { answers };
  // Completed and future questions cannot be rewritten by a forged or stale request.
  if (body.questionIndex !== attempt.currentQuestionIndex) return {};
  return {
    [`answers.${attempt.currentQuestionIndex}`]:
      answers[attempt.currentQuestionIndex],
  };
}
export const advanceQuestion = async (req: AuthRequest, res: Response) => {
  let attempt = await synchronizeQuestion(await ownAttempt(req));
  if (!attempt.active || attempt.expiresAt.getTime() <= Date.now())
    return res.json({ submission: await finishAttempt(attempt) });
  if (!attempt.timePerQuestionSeconds)
    throw new InputError("This quiz uses a total timer.");
  if (req.body.questionIndex === attempt.currentQuestionIndex) {
    const index = attempt.currentQuestionIndex!;
    const answers = answerUpdate(attempt, req.body);
    if (index === attempt.questionOrder.length - 1) {
      attempt =
        (await QuizAttempt.findOneAndUpdate(
          {
            _id: attempt._id,
            active: true,
            finalizing: false,
            currentQuestionIndex: index,
            questionExpiresAt: { $gt: new Date() },
          },
          { $set: answers },
          { new: true },
        )) || attempt;
      return res.json({ submission: await finishAttempt(attempt) });
    }
    const now = Date.now();
    attempt =
      (await QuizAttempt.findOneAndUpdate(
        {
          _id: attempt._id,
          active: true,
          finalizing: false,
          currentQuestionIndex: index,
          questionExpiresAt: { $gt: new Date(now) },
        },
        {
          $set: {
            ...answers,
            currentQuestionIndex: index + 1,
            questionExpiresAt: new Date(
              now + attempt.timePerQuestionSeconds * 1000,
            ),
            expiresAt: new Date(
              now +
                (attempt.questionOrder.length - index - 1) *
                  attempt.timePerQuestionSeconds *
                  1000,
            ),
          },
        },
        { new: true },
      )) ||
      (await QuizAttempt.findById(attempt._id)) ||
      attempt;
  }
  res.json({ attempt: attemptState(attempt) });
};
// Persist abandoned sessions from their last server-saved answers, even when
// the student closes the browser before its countdown can submit.
export async function finalizeExpiredAttempts() {
  const expired = await QuizAttempt.find({
    active: true,
    $or: [
      { finalizing: false },
      { finalizingAt: { $lt: new Date(Date.now() - 30000) } },
    ],
    expiresAt: { $lte: new Date() },
  }).limit(100);
  for (const attempt of expired) {
    try {
      await finishAttempt(attempt);
    } catch (err) {
      if (!(err instanceof InputError && err.status === 409))
        console.error("Expired quiz submission could not be saved:", err);
    }
  }
}
export const startAttempt = async (req: AuthRequest, res: Response) => {
  const quiz = await quizFor(req);
  const { sessionToken } = req.body;
  if (
    typeof sessionToken !== "string" ||
    sessionToken.length < 20 ||
    sessionToken.length > 100
  )
    throw new InputError("A valid session token is required.");
  let active = await QuizAttempt.findOne({
    studentId: req.user!.id,
    active: true,
  });
  if (active && active.expiresAt.getTime() <= Date.now()) {
    await finishAttempt(active);
    active = null;
  }
  if (
    active &&
    (String(active.quizId) !== String(quiz._id) ||
      active.sessionToken !== sessionToken)
  )
    throw new InputError(
      "Another quiz session is active. Resume it in its original tab or wait for expiry.",
      409,
    );
  if (!active) {
    const last = await QuizSubmission.findOne({
      studentId: req.user!.id,
      quizId: quiz._id,
    }).sort({ submittedAt: -1 });
    if (
      !quiz.moduleId &&
      last?.retryAfter &&
      last.retryAfter.getTime() > Date.now()
    )
      throw new InputError(
        `Review the lesson before retrying. Available at ${last.retryAfter.toISOString()}.`,
        429,
      );
    try {
      const count = quiz.questionCount ?? quiz.questions.length;
      active = await QuizAttempt.create({
        studentId: req.user!.id,
        quizId: quiz._id,
        sessionToken,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + quiz.timeLimitMinutes * 60000),
        timePerQuestionSeconds: quiz.timePerQuestionSeconds,
        currentQuestionIndex: quiz.timePerQuestionSeconds ? 0 : undefined,
        questionExpiresAt: quiz.timePerQuestionSeconds
          ? new Date(Date.now() + quiz.timePerQuestionSeconds * 1000)
          : undefined,
        questionOrder: shuffle(quiz.questions.map((_, i) => i)).slice(0, count),
        optionOrders: quiz.questions.map((q) =>
          shuffle(q.options.map((_, i) => i)),
        ),
        answers: Array.from({ length: count }, () => -1),
      });
    } catch (err: any) {
      if (err.code === 11000)
        throw new InputError("Another quiz session is active.", 409);
      throw err;
    }
  }
  active = await synchronizeQuestion(active);
  res.json({
    attempt: attemptState(active),
    quiz: {
      ...publicQuiz(quiz),
      questions: active!.questionOrder.map((i) => ({
        questionText: quiz.questions[i].questionText,
        options: (
          active!.optionOrders?.[i] ||
          quiz.questions[i].options.map((_, index) => index)
        ).map((index) => quiz.questions[i].options[index]),
      })),
    },
  });
};
async function ownAttempt(req: AuthRequest) {
  if (
    typeof req.body.sessionToken !== "string" ||
    req.body.sessionToken.length < 20 ||
    req.body.sessionToken.length > 100
  )
    throw new InputError("A valid session token is required.");
  const attempt = await QuizAttempt.findOne({
    _id: id(req.params.attemptId),
    studentId: req.user!.id,
    quizId: id(req.params.id),
    sessionToken: req.body.sessionToken,
  });
  if (!attempt) throw new InputError("Quiz session not found.", 404);
  return attempt;
}
function validateAnswers(answers: unknown, count: number): number[] {
  if (
    !Array.isArray(answers) ||
    answers.length !== count ||
    answers.some((a) => !Number.isInteger(a) || a < -1 || a > 3)
  )
    throw new InputError(
      "Answers must contain one option index (-1 or 0-3) per question.",
    );
  return answers;
}
export const saveAttempt = async (req: AuthRequest, res: Response) => {
  const attempt = await synchronizeQuestion(await ownAttempt(req));
  if (!attempt.active || attempt.expiresAt.getTime() <= Date.now()) {
    const submission = await finishAttempt(attempt);
    return res.json({ submission, serverNow: new Date() });
  }
  const answers = answerUpdate(attempt, req.body);
  const updated = await QuizAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      active: true,
      finalizing: false,
      expiresAt: { $gt: new Date() },
      ...(attempt.timePerQuestionSeconds
        ? {
            currentQuestionIndex: attempt.currentQuestionIndex,
            questionExpiresAt: { $gt: new Date() },
          }
        : {}),
    },
    {
      $set: answers,
      ...(req.body.blur === true ? { $inc: { blurCount: 1 } } : {}),
    },
    { new: true },
  );
  if (!updated)
    throw new InputError(
      "Session is closing. Submit to retrieve your result.",
      409,
    );
  res.json({
    attempt: attemptState(updated),
    saved: true,
    blurCount: updated.blurCount,
    serverNow: new Date(),
    expiresAt: updated.expiresAt,
  });
};
export const submitQuiz = async (req: AuthRequest, res: Response) => {
  let attempt = await synchronizeQuestion(await ownAttempt(req));
  if (
    attempt.active &&
    !attempt.finalizing &&
    attempt.expiresAt.getTime() > Date.now()
  ) {
    const answers = answerUpdate(attempt, req.body);
    attempt =
      (await QuizAttempt.findOneAndUpdate(
        {
          _id: attempt._id,
          active: true,
          finalizing: false,
          expiresAt: { $gt: new Date() },
          ...(attempt.timePerQuestionSeconds
            ? {
                currentQuestionIndex: attempt.currentQuestionIndex,
                questionExpiresAt: { $gt: new Date() },
              }
            : {}),
        },
        { $set: answers },
        { new: true },
      )) || attempt;
  }
  const submission = await finishAttempt(attempt);
  res.json({
    submission,
    message: submission.passed
      ? "Quiz passed. Next module unlocked."
      : submission.moduleId
        ? "You can retake this module quiz immediately."
        : "Review the lesson for one minute before retrying.",
  });
};
export const getStudentSubmissions = async (
  req: AuthRequest,
  res: Response,
) => {
  const filter: any = { studentId: req.user!.id };
  if (req.query.subjectId) filter.subjectId = id(String(req.query.subjectId));
  const submissions = await QuizSubmission.find(filter)
    .select("-answers")
    .populate("quizId", "title timeLimitMinutes")
    .sort({ submittedAt: -1 });
  res.json({ submissions });
};
