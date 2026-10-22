import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { Module } from "../models/Module.js";
import { Subject } from "../models/Subject.js";
import { StudentProgress } from "../models/StudentProgress.js";
import { finalizeExpiredAttempts } from "../controllers/quizController.js";

const questions = Array.from({ length: 4 }, (_, i) => ({
  questionText: `Question ${i + 1}?`,
  options: ["Correct", "Second", "Third", "Fourth"],
  correctIndex: 0,
  explanation: "The explanation.",
}));
const sessionToken = "test-session-token-with-enough-entropy";
describe("Sprint 3 — Quiz studio, execution, integrity and progression", () => {
  let faculty: string,
    student: string,
    studentId: string,
    facultyId: string,
    subjectId: string,
    moduleId: string,
    nextId: string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const publish = (patch: Record<string, unknown> = {}) =>
    request(app)
      .post("/api/quizzes")
      .set(auth(faculty))
      .send({
        title: "Assessment",
        subjectId,
        moduleId,
        timeLimitMinutes: 10,
        questions,
        ...patch,
      });
  const start = (quizId: string, token = sessionToken) =>
    request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth(student))
      .send({ sessionToken: token });
  const displayAnswers = async (attemptId: string, answers: number[]) => {
    const attempt = await QuizAttempt.findById(attemptId);
    return answers.map((answer, position) =>
      answer < 0 || answer > 3 || !attempt?.optionOrders
        ? answer
        : attempt.optionOrders[attempt.questionOrder[position]].indexOf(answer),
    );
  };
  const submit = async (
    quizId: string,
    attemptId: string,
    answers = [0, 0, 0, 0],
    token = sessionToken,
  ) =>
    request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
      .set(auth(student))
      .send({
        sessionToken: token,
        answers: await displayAnswers(attemptId, answers),
        percentage: 100,
        timeSpentSeconds: 1,
      });
  beforeAll(async () => {
    await connectDB();
    await Promise.all([
      QuizAttempt.init(),
      QuizSubmission.init(),
      StudentProgress.init(),
    ]);
    for (const role of ["faculty", "student"]) {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: `quiz_${role}`,
          email: `${role}@test.edu`,
          password: "Password123!",
          fullName: `Test ${role}`,
          surname: role,
          role,
          termsAccepted: true,
          yearLevel: "2nd Year",
          section: "Section B",
        });
      expect(res.status).toBe(201);
      if (role === "faculty") {
        faculty = res.body.token;
        facultyId = res.body.user.id;
      } else {
        student = res.body.token;
        studentId = res.body.user.id;
      }
    }
    const subject = await Subject.create({
      name: "Quiz course",
      code: "QUIZ101",
      term: "1st Semester",
      yearLevel: "2nd Year",
      facultyId,
      facultyName: "Faculty",
    });
    subjectId = String(subject._id);
  });
  beforeEach(async () => {
    await Promise.all([
      QuizAttempt.deleteMany({}),
      QuizSubmission.deleteMany({}),
      Quiz.deleteMany({}),
      Module.deleteMany({}),
      StudentProgress.deleteMany({}),
    ]);
    const modules = await Module.create([
      {
        subjectId,
        title: "First",
        summary: "First summary",
        orderIndex: 1,
        textContent: "First lecture",
      },
      {
        subjectId,
        title: "Second",
        summary: "Second summary",
        orderIndex: 2,
        textContent: "Secret second lecture",
        fileName: "notes.txt",
        fileUrl: "/uploads/not-public.txt",
      },
    ]);
    moduleId = String(modules[0]._id);
    nextId = String(modules[1]._id);
  });
  afterAll(disconnectDB);

  it.each([0, 1441, -1, null, "15"])(
    "rejects invalid time limits: %s",
    async (value) => {
      expect((await publish({ timeLimitMinutes: value })).status).toBe(400);
    },
  );
  it.each([10, 20])("accepts the timer boundary %s", async (value) => {
    expect((await publish({ timeLimitMinutes: value })).status).toBe(201);
  });
  it("validates minimum question count, four distinct options and integer keys", async () => {
    expect((await publish({ questions: [] })).status).toBe(400);
    for (const patch of [
      { correctIndex: 0.5 },
      { correctIndex: 4 },
      { options: ["A", "A", "B", "C"] },
      { options: ["A", "B"] },
      { questionText: " " },
    ]) {
      const res = await publish({
        questions: questions.map((q, i) => (i === 1 ? { ...q, ...patch } : q)),
      });
      expect(res.status).toBe(400);
      expect(res.body.errors[0]).toContain("Question 2");
    }
  });
  it("enforces roles, ownership, valid IDs and module-subject relationships", async () => {
    expect(
      (await request(app).post("/api/quizzes").set(auth(student)).send({}))
        .status,
    ).toBe(403);
    expect(
      (await request(app).get("/api/quizzes/invalid").set(auth(student)))
        .status,
    ).toBe(400);
    const other = await Subject.create({
      name: "Other",
      code: `OTHER${Date.now()}`,
      term: "1st",
      yearLevel: "2nd Year",
      facultyId: studentId,
      facultyName: "Other faculty",
    });
    expect((await publish({ subjectId: String(other._id) })).status).toBe(403);
    const foreign = await Module.create({
      subjectId: other._id,
      title: "Other module",
      summary: "Other",
      orderIndex: 1,
    });
    expect((await publish({ moduleId: String(foreign._id) })).status).toBe(400);
  });
  it("binds a module once and excludes keys/explanations from all student reads", async () => {
    const published = await publish();
    expect(published.status).toBe(201);
    expect((await publish()).status).toBe(409);
    const quizId = published.body.quiz._id;
    expect(String((await Module.findById(moduleId))!.quizId)).toBe(quizId);
    const detail = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set(auth(student));
    expect(detail.body.quiz).not.toHaveProperty("questions");
    expect(detail.body.quiz.questionCount).toBe(4);
    const catalog = await request(app)
      .get(`/api/quizzes/subject/${subjectId}`)
      .set(auth(student));
    expect(catalog.body.quizzes[0]).not.toHaveProperty("questions");
    const modules = await request(app)
      .get(`/api/subjects/${subjectId}/modules`)
      .set(auth(student));
    expect(modules.body.modules[0].quizId).not.toHaveProperty("questions");
    expect(modules.body.modules[1]).not.toHaveProperty("textContent");
    expect(modules.body.modules[1]).not.toHaveProperty("fileUrl");
    expect(
      (await request(app).get(`/api/modules/${nextId}/file`).set(auth(student)))
        .status,
    ).toBe(403);
    expect((await request(app).get("/uploads/not-public.txt")).status).toBe(
      404,
    );
  });
  it("rejects assessment access for locked modules on both read and start", async () => {
    const res = await publish({ moduleId: nextId });
    expect(
      (
        await request(app)
          .get(`/api/quizzes/${res.body.quiz._id}`)
          .set(auth(student))
      ).status,
    ).toBe(403);
    expect((await start(res.body.quiz._id)).status).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/modules/${nextId}/complete`)
          .set(auth(student))
      ).status,
    ).toBe(403);
  });
  it("keeps one active session per student, resumes its original deadline and rejects foreign tokens", async () => {
    const quizId = (await publish()).body.quiz._id;
    const [a, b] = await Promise.all([
      start(quizId),
      start(quizId, "different-concurrent-session-token"),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? a : b;
    const key =
      a.status === 200 ? sessionToken : "different-concurrent-session-token";
    const resumed = await start(quizId, key);
    expect(resumed.body.attempt.expiresAt).toBe(winner.body.attempt.expiresAt);
    expect(resumed.body.attempt.id).toBe(winner.body.attempt.id);
    expect(resumed.body.quiz.questions[0]).not.toHaveProperty("correctIndex");
    expect(
      (
        await submit(
          quizId,
          winner.body.attempt.id,
          [0, 0, 0, 0],
          "wrong-session-token-000000",
        )
      ).status,
    ).toBe(404);
  });
  it("saves drafts and focus warnings, scores exactly 75%, persists once and unlocks the next module", async () => {
    const quizId = (await publish({ passingPercentage: 75 })).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const endpoint = `/api/quizzes/${quizId}/attempts/${attemptId}`;
    const saved = await request(app)
      .patch(endpoint)
      .set(auth(student))
      .send({
        sessionToken,
        answers: await displayAnswers(attemptId, [0, 0, 0, 1]),
        blur: true,
      });
    expect(saved.body.blurCount).toBe(1);
    expect((await start(quizId)).body.attempt.answers).toEqual(
      await displayAnswers(attemptId, [0, 0, 0, 1]),
    );
    const result = await submit(quizId, attemptId, [0, 0, 0, 1]);
    expect(result.status).toBe(200);
    expect(result.body.submission.percentage).toBe(75);
    expect(result.body.submission.passed).toBe(true);
    expect(result.body.submission.blurCount).toBe(1);
    const retry = await submit(quizId, attemptId, [-1, -1, -1, -1]);
    expect(retry.body.submission._id).toBe(result.body.submission._id);
    expect(await QuizSubmission.countDocuments()).toBe(1);
    const modules = await request(app)
      .get(`/api/subjects/${subjectId}/modules`)
      .set(auth(student));
    expect(modules.body.modules[0].isCompleted).toBe(true);
    expect(modules.body.modules[1].isLocked).toBe(false);
  });
  it("rejects malformed answer arrays and fabricated session submissions", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    expect((await submit(quizId, attemptId, [5, 0, 0, 0])).status).toBe(400);
    expect((await submit(quizId, attemptId, [0])).status).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/quizzes/${quizId}/submit`)
          .set(auth(student))
          .send({ percentage: 100 })
      ).status,
    ).toBe(404);
  });
  it("allows immediate module retakes after failure, including legacy cooldown records", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const result = await submit(quizId, attemptId, [0, 0, 1, 1]);
    expect(result.body.submission.passed).toBe(false);
    expect(result.body.submission.percentage).toBe(50);
    expect(result.body.submission.retryAfter).toBeUndefined();
    expect(await StudentProgress.countDocuments()).toBe(0);
    await QuizSubmission.updateOne(
      { _id: result.body.submission._id },
      { retryAfter: new Date(Date.now() + 60000) },
    );
    expect((await start(quizId)).status).toBe(200);
  });
  it("does not round 74.5% up to the passing threshold", async () => {
    const quizId = (
      await publish({
        questions: Array.from({ length: 51 }, () => questions[0]),
      })
    ).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const result = await submit(
      quizId,
      attemptId,
      Array.from({ length: 51 }, (_, i) => (i < 38 ? 0 : 1)),
    );
    expect(result.body.submission.percentage).toBeCloseTo(74.5098);
    expect(result.body.submission.passed).toBe(false);
  });
  it("uses saved answers after server expiry, ignoring late answers and client timer values", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    await request(app)
      .patch(`/api/quizzes/${quizId}/attempts/${attemptId}`)
      .set(auth(student))
      .send({
        sessionToken,
        answers: await displayAnswers(attemptId, [0, 0, 0, -1]),
      });
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    const result = await submit(quizId, attemptId, [0, 0, 0, 0]);
    expect(result.body.submission.score).toBe(3);
    expect(result.body.submission.percentage).toBe(75);
  });
  it("finalizes abandoned expired sessions before allowing another attempt", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    expect(
      (await start(quizId, "another-tab-session-token-00000")).status,
    ).toBe(200);
    expect(await QuizSubmission.countDocuments()).toBe(1);
    expect((await QuizAttempt.findById(attemptId))!.active).toBe(false);
  });
  it("provides own submission history only", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    await submit(quizId, attemptId);
    const history = await request(app)
      .get("/api/quizzes/submissions")
      .set(auth(student));
    expect(history.body.submissions).toHaveLength(1);
    expect(history.body.submissions[0].studentId).toBe(studentId);
    expect(history.body.submissions[0]).not.toHaveProperty("answers");
    expect(
      (await request(app).get("/api/quizzes/submissions").set(auth(faculty)))
        .status,
    ).toBe(403);
  });
  it("persists abandoned sessions and recovers an interrupted save lease", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    await QuizAttempt.updateOne(
      { _id: attemptId },
      {
        answers: await displayAnswers(attemptId, [0, 0, 0, -1]),
        expiresAt: new Date(Date.now() - 1000),
        finalizing: true,
        finalizingAt: new Date(Date.now() - 31000),
      },
    );
    await finalizeExpiredAttempts();
    await finalizeExpiredAttempts();
    const submissions = await QuizSubmission.find({ attemptId });
    expect(submissions).toHaveLength(1);
    expect(submissions[0].score).toBe(3);
    expect((await QuizAttempt.findById(attemptId))!.active).toBe(false);
  });
  it("persists exactly one result when submit requests race", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const results = await Promise.all([
      submit(quizId, attemptId),
      submit(quizId, attemptId),
    ]);
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(
      true,
    );
    expect((await submit(quizId, attemptId)).status).toBe(200);
    expect(await QuizSubmission.countDocuments({ attemptId })).toBe(1);
  });
  it("rejects query operator objects in place of session tokens", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const res = await request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
      .set(auth(student))
      .send({ sessionToken: { $ne: null }, answers: [0, 0, 0, 0] });
    expect(res.status).toBe(400);
  });
  it("does not trust legacy completion flags without a passing submission", async () => {
    await publish();
    await StudentProgress.create({
      studentId,
      subjectId,
      completedModuleIds: [moduleId],
    });
    const modules = await request(app)
      .get(`/api/subjects/${subjectId}/modules`)
      .set(auth(student));
    expect(modules.body.modules[0].isCompleted).toBe(false);
    expect(modules.body.modules[1].isLocked).toBe(true);
    expect(
      (await request(app).get(`/api/modules/${nextId}`).set(auth(student)))
        .status,
    ).toBe(403);
  });
  it("shuffles displayed answer letters, preserves them on resume, and grades the original answer key", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const quizId = (await publish()).body.quiz._id;
      const opened = await start(quizId);
      const attemptId = opened.body.attempt.id;
      expect(
        opened.body.quiz.questions.every(
          (q: any) => q.options[3] === "Correct",
        ),
      ).toBe(true);
      expect((await start(quizId)).body.quiz.questions).toEqual(
        opened.body.quiz.questions,
      );
      const failed = await request(app)
        .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
        .set(auth(student))
        .send({ sessionToken, answers: [0, 0, 0, 0] });
      expect(failed.body.submission.score).toBe(0);
      const next = await start(quizId);
      expect(next.status).toBe(200);
      expect(next.body.attempt.id).not.toBe(attemptId);
      const passed = await request(app)
        .post(`/api/quizzes/${quizId}/attempts/${next.body.attempt.id}/submit`)
        .set(auth(student))
        .send({ sessionToken, answers: [3, 3, 3, 3] });
      expect(passed.body.submission.percentage).toBe(100);
      expect(
        passed.body.submission.answers.every(
          (answer: any) => answer.selectedOption === 0,
        ),
      ).toBe(true);
      expect((await start(quizId)).status).toBe(200);
    } finally {
      random.mockRestore();
    }
  });
  it("retains review intervals for standalone quizzes", async () => {
    const quizId = (await publish({ moduleId: undefined })).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    const result = await submit(quizId, attemptId, [-1, -1, -1, -1]);
    expect(result.body.submission.retryAfter).toBeDefined();
    expect((await start(quizId)).status).toBe(429);
  });
  it("resumes and grades attempts created before option shuffling was introduced", async () => {
    const quizId = (await publish()).body.quiz._id;
    const attemptId = (await start(quizId)).body.attempt.id;
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { $unset: { optionOrders: 1 } },
    );
    const resumed = await start(quizId);
    expect(
      resumed.body.quiz.questions.every((q: any) => q.options[0] === "Correct"),
    ).toBe(true);
    expect((await submit(quizId, attemptId)).body.submission.percentage).toBe(
      100,
    );
  });
  it.each([
    [30, "seconds", 30],
    [0.5, "minutes", 30],
    [25, "minutes", 1500],
  ])(
    "accepts %s %s per question and configurable count and passing mark",
    async (time, unit, seconds) => {
      const created = await publish({
        timePerQuestion: time,
        timeUnit: unit,
        questionCount: 2,
        passingPercentage: 60,
      });
      expect(created.status).toBe(201);
      expect(created.body.quiz).toMatchObject({
        timePerQuestionSeconds: seconds,
        questionCount: 2,
        passingPercentage: 60,
      });
      const opened = await start(created.body.quiz._id);
      expect(opened.body.quiz.questions).toHaveLength(2);
      expect(opened.body.attempt.answers).toEqual([-1, -1]);
      expect(
        Date.parse(opened.body.attempt.questionExpiresAt) -
          Date.parse(opened.body.attempt.startedAt),
      ).toBeCloseTo(Number(seconds) * 1000, -1);
    },
  );
  it.each([
    { timePerQuestion: 0, timeUnit: "seconds" },
    { timePerQuestion: "30", timeUnit: "seconds" },
    { timePerQuestion: 1, timeUnit: "hours" },
    { timePerQuestion: 1441, timeUnit: "minutes" },
    { passingPercentage: 0 },
    { passingPercentage: 101 },
    { passingPercentage: "80" },
    { questionCount: 0 },
    { questionCount: 5 },
    { questionCount: 1.5 },
  ])("rejects invalid faculty settings %j", async (patch) => {
    expect((await publish(patch)).status).toBe(400);
  });
  it("locks past/future answers, resumes the same timer, and grades only the selected subset", async () => {
    const created = await publish({
      timePerQuestion: 30,
      timeUnit: "seconds",
      questionCount: 2,
      passingPercentage: 50,
    });
    const quizId = created.body.quiz._id;
    const first = await start(quizId);
    const attemptId = first.body.attempt.id;
    const correct = await displayAnswers(attemptId, [0, 0]);
    const advanced = await request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/advance`)
      .set(auth(student))
      .send({ sessionToken, questionIndex: 0, answers: correct });
    expect(advanced.body.attempt.currentQuestionIndex).toBe(1);
    expect(advanced.body.attempt.answers).toEqual([correct[0], -1]);
    const duplicate = await request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/advance`)
      .set(auth(student))
      .send({ sessionToken, questionIndex: 0, answers: [-1, -1] });
    expect(duplicate.body.attempt.questionExpiresAt).toBe(
      advanced.body.attempt.questionExpiresAt,
    );
    const resumed = await start(quizId);
    expect(resumed.body.attempt.currentQuestionIndex).toBe(1);
    expect(resumed.body.attempt.questionExpiresAt).toBe(
      advanced.body.attempt.questionExpiresAt,
    );
    const result = await request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
      .set(auth(student))
      .send({ sessionToken, questionIndex: 1, answers: [-1, -1] });
    expect(result.body.submission).toMatchObject({
      score: 1,
      totalQuestions: 2,
      percentage: 50,
      passingPercentage: 50,
      passed: true,
    });
    const unlocked = await request(app)
      .get(`/api/modules/${nextId}`)
      .set(auth(student));
    expect(unlocked.status).toBe(200);
    const report = await request(app).get("/api/gradebook").set(auth(student));
    expect(report.body.groups[0].rows[0].passingPercentage).toBe(50);
  });
  it("advances expired questions without accepting late answers or resetting deadlines", async () => {
    const quizId = (await publish({ timePerQuestion: 30, timeUnit: "seconds" }))
      .body.quiz._id;
    const opened = await start(quizId);
    const attemptId = opened.body.attempt.id;
    const expiredDeadline = new Date(Date.now() - 31000);
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { questionExpiresAt: expiredDeadline },
    );
    const late = await request(app)
      .patch(`/api/quizzes/${quizId}/attempts/${attemptId}`)
      .set(auth(student))
      .send({ sessionToken, questionIndex: 0, answers: [0, 0, 0, 0] });
    expect(late.status).toBe(200);
    expect(late.body.attempt.currentQuestionIndex).toBe(2);
    expect(late.body.attempt.answers).toEqual([-1, -1, -1, -1]);
    expect(Date.parse(late.body.attempt.questionExpiresAt)).toBe(
      expiredDeadline.getTime() + 60000,
    );
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { expiresAt: new Date(Date.now() - 1) },
    );
    await finalizeExpiredAttempts();
    const result = await QuizSubmission.findOne({ attemptId });
    expect(result?.score).toBe(0);
    expect(result?.passingPercentage).toBe(75);
  });
  it("uses a higher faculty threshold for module progression", async () => {
    const quizId = (await publish({ passingPercentage: 80 })).body.quiz._id;
    const opened = await start(quizId);
    const result = await submit(quizId, opened.body.attempt.id, [0, 0, 0, -1]);
    expect(result.body.submission).toMatchObject({
      percentage: 75,
      passed: false,
      passingPercentage: 80,
    });
    expect(
      await StudentProgress.countDocuments({ completedModuleIds: moduleId }),
    ).toBe(0);
  });
});
