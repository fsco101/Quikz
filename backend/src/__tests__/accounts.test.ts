import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { StudentProgress } from "../models/StudentProgress.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { bootstrapAdmin } from "../services/users.js";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const questions = Array.from({ length: 4 }, (_, i) => ({
  questionText: `Original question ${i}`,
  options: ["Correct", "B", "C", "D"],
  correctIndex: 0,
}));
describe("Owned editing, admin permissions, profile updates and shared avatars", () => {
  let hash: string,
    users: Record<string, any>,
    tokens: Record<string, string>,
    subjectId: string,
    moduleId: string;
  const login = (name: string, password = "Password123!") =>
    request(app)
      .post("/api/auth/login")
      .send({ loginIdentifier: `${name}@accounts.test`, password });
  beforeAll(async () => {
    await connectDB();
    hash = await bcrypt.hash("Password123!", 10);
    await Promise.all([
      User.init(),
      QuizAttempt.init(),
      QuizSubmission.init(),
      StudentProgress.init(),
      AuditEvent.init(),
    ]);
  });
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Subject.deleteMany({}),
      Module.deleteMany({}),
      Quiz.deleteMany({}),
      QuizAttempt.deleteMany({}),
      QuizSubmission.deleteMany({}),
      StudentProgress.deleteMany({}),
      AuditEvent.deleteMany({}),
    ]);
    users = {};
    tokens = {};
    for (const name of ["admin", "faculty", "other", "student"]) {
      users[name] = await User.create({
        username: `account_${name}`,
        email: `${name}@accounts.test`,
        passwordHash: hash,
        role: name === "other" ? "faculty" : name,
        fullName: `Test ${name}`,
        surname: name,
        termsAccepted: true,
      });
      const response = await login(name);
      expect(response.status).toBe(200);
      tokens[name] = response.body.token;
    }
    const subject = await Subject.create({
      code: "ACCOUNT101",
      name: "Owned course",
      term: "1st Semester",
      yearLevel: "1st Year",
      facultyId: users.faculty._id,
      facultyName: "Test faculty",
    });
    subjectId = String(subject._id);
    const module = await request(app)
      .post(`/api/subjects/${subjectId}/modules`)
      .set(auth(tokens.faculty))
      .send({
        title: "Original module",
        summary: "Summary",
        textContent: "Original lecture",
        contentType: "text",
      });
    expect(module.status).toBe(201);
    moduleId = module.body.module._id;
  });
  afterAll(disconnectDB);
  it("does not allow public registration as an administrator", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send({
            username: "rogue_admin",
            email: "rogue@accounts.test",
            password: "Password123!",
            role: "admin",
            fullName: "Rogue Admin",
            surname: "Admin",
            termsAccepted: true,
          })
      ).status,
    ).toBe(400);
  });
  it("restricts system and user management to admins regardless of a token's original role", async () => {
    for (const path of [
      "/api/system/health",
      "/api/system/audit",
      "/api/admin/users",
    ]) {
      expect((await request(app).get(path)).status).toBe(401);
      for (const role of ["student", "faculty", "other"])
        expect(
          (await request(app).get(path).set(auth(tokens[role]))).status,
        ).toBe(403);
      expect(
        (await request(app).get(path).set(auth(tokens.admin))).status,
      ).toBe(200);
    }
    const promoted = await request(app)
      .patch(`/api/admin/users/${users.other._id}`)
      .set(auth(tokens.admin))
      .send({ role: "admin" });
    expect(promoted.status).toBe(200);
    expect(
      (await request(app).get("/api/admin/users").set(auth(tokens.other)))
        .status,
    ).toBe(200);
    await request(app)
      .patch(`/api/admin/users/${users.other._id}`)
      .set(auth(tokens.admin))
      .send({ role: "faculty" });
    expect(
      (await request(app).get("/api/admin/users").set(auth(tokens.other)))
        .status,
    ).toBe(403);
  });
  it("creates accounts, filters users, and never returns password hashes or security internals", async () => {
    const created = await request(app)
      .post("/api/admin/users")
      .set(auth(tokens.admin))
      .send({
        username: "new_account",
        email: "new@accounts.test",
        fullName: "New Person",
        surname: "Person",
        role: "faculty",
        password: "Initial123!",
        termsAccepted: true,
      });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toMatch(
      /passwordHash|authVersion|avatarData/,
    );
    const filtered = await request(app)
      .get("/api/admin/users?search=New%20Person&role=faculty&status=active")
      .set(auth(tokens.admin));
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.users[0].username).toBe("new_account");
    expect(
      (
        await request(app)
          .get("/api/admin/users?page=0")
          .set(auth(tokens.admin))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get("/api/admin/users?search=.*")
          .set(auth(tokens.admin))
      ).body.total,
    ).toBe(0);
    expect(
      (
        await request(app)
          .post("/api/admin/users")
          .set(auth(tokens.faculty))
          .send({})
      ).status,
    ).toBe(403);
  });
  it("disables accounts immediately, keeps ownership/history and revokes their old tokens after reactivation", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/admin/users/${users.faculty._id}`)
          .set(auth(tokens.admin))
          .send({ active: false })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").set(auth(tokens.faculty))).status,
    ).toBe(403);
    expect((await login("faculty")).status).toBe(401);
    expect(await Module.exists({ _id: moduleId })).toBeTruthy();
    await request(app)
      .patch(`/api/admin/users/${users.faculty._id}`)
      .set(auth(tokens.admin))
      .send({ active: true });
    expect(
      (await request(app).get("/api/auth/me").set(auth(tokens.faculty))).status,
    ).toBe(403);
    expect((await login("faculty")).status).toBe(200);
  });
  it.each([{ role: "faculty" }, { active: false }])(
    "prevents an admin removing their own access %j",
    async (body) => {
      expect(
        (
          await request(app)
            .patch(`/api/admin/users/${users.admin._id}`)
            .set(auth(tokens.admin))
            .send(body)
        ).status,
      ).toBe(409);
    },
  );
  it("keeps an active administrator during simultaneous mutual demotions", async () => {
    await User.updateOne({ _id: users.other._id }, { role: "admin" });
    const results = await Promise.all([
      request(app)
        .patch(`/api/admin/users/${users.other._id}`)
        .set(auth(tokens.admin))
        .send({ role: "faculty" }),
      request(app)
        .patch(`/api/admin/users/${users.admin._id}`)
        .set(auth(tokens.other))
        .send({ role: "faculty" }),
    ]);
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect(results.every((r) => [200, 403, 409].includes(r.status))).toBe(true);
    expect(
      await User.countDocuments({ role: "admin", active: { $ne: false } }),
    ).toBeGreaterThanOrEqual(1);
  });
  it("resets passwords and revokes all existing sessions", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/admin/users/${users.student._id}`)
          .set(auth(tokens.admin))
          .send({ password: "NewPassword123!" })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").set(auth(tokens.student))).status,
    ).toBe(403);
    expect((await login("student")).status).toBe(401);
    expect((await login("student", "NewPassword123!")).status).toBe(200);
  });
  it.each(["student", "faculty", "admin"])(
    "lets %s update only their own profile",
    async (role) => {
      const updated = await request(app)
        .patch("/api/users/me")
        .set(auth(tokens[role]))
        .send({
          fullName: `Updated ${role}`,
          bio: "My public bio",
          yearLevel: "2nd Year",
          section: "Section C",
        });
      expect(updated.status).toBe(200);
      expect(updated.body.user.fullName).toBe(`Updated ${role}`);
      expect(updated.body.user.role).toBe(role);
      const me = await request(app).get("/api/auth/me").set(auth(tokens[role]));
      expect(me.body.user.bio).toBe("My public bio");
      expect(JSON.stringify(me.body)).not.toMatch(
        /passwordHash|authVersion|avatarData/,
      );
      expect(
        (
          await request(app)
            .patch("/api/users/me")
            .set(auth(tokens[role]))
            .send({ role: "admin" })
        ).status,
      ).toBe(400);
      if (role === "faculty")
        expect(
          (await request(app).get("/api/subjects")).body.subjects[0]
            .facultyName,
        ).toBe("Updated faculty");
    },
  );
  it("validates profiles and rejects duplicate emails and usernames", async () => {
    for (const body of [
      { email: "bad" },
      { username: "x" },
      { bio: "x".repeat(501) },
      { yearLevel: "5th Year" },
    ])
      expect(
        (
          await request(app)
            .patch("/api/users/me")
            .set(auth(tokens.student))
            .send(body)
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .patch("/api/users/me")
          .set(auth(tokens.student))
          .send({ email: "FACULTY@accounts.test" })
      ).status,
    ).toBe(409);
  });
  it("requires the current password and supports pre-versioned accounts during password changes", async () => {
    await User.collection.updateOne(
      { _id: users.student._id },
      { $unset: { authVersion: "" } },
    );
    expect(
      (
        await request(app)
          .post("/api/users/me/password")
          .set(auth(tokens.student))
          .send({ currentPassword: "Wrong", newPassword: "Changed123!" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/users/me/password")
          .set(auth(tokens.student))
          .send({ currentPassword: "Password123!", newPassword: "Changed123!" })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").set(auth(tokens.student))).status,
    ).toBe(403);
    expect((await login("student", "Changed123!")).status).toBe(200);
  });
  it("sanitizes uploaded avatars, exposes them to others and keeps people profiles free of private account data", async () => {
    const png = await sharp({
      create: { width: 24, height: 32, channels: 3, background: "#4648d4" },
    })
      .png()
      .toBuffer();
    const uploaded = await request(app)
      .post("/api/users/me/avatar")
      .set(auth(tokens.faculty))
      .attach("avatar", png, "avatar.png");
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.user.avatarUrl).toContain(
      `/api/users/${users.faculty._id}/avatar?v=`,
    );
    const avatar = await request(app).get(uploaded.body.user.avatarUrl);
    expect(avatar.status).toBe(200);
    expect(avatar.headers["content-type"]).toContain("image/webp");
    const metadata = await sharp(avatar.body).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    const people = await request(app)
      .get("/api/users?search=faculty")
      .set(auth(tokens.student));
    expect(people.body.users[0].avatarUrl).toBe(uploaded.body.user.avatarUrl);
    expect(JSON.stringify(people.body)).not.toMatch(
      /email|passwordHash|yearLevel|section|authVersion|avatarData|termsAccepted/,
    );
    expect((await request(app).get("/api/users")).status).toBe(401);
    expect(
      (await request(app).get("/api/users?search=.*").set(auth(tokens.student)))
        .body.total,
    ).toBe(0);
    await request(app).delete("/api/users/me/avatar").set(auth(tokens.faculty));
    expect((await request(app).get(uploaded.body.user.avatarUrl)).status).toBe(
      404,
    );
  });
  it("rejects malformed, vector and oversized avatars", async () => {
    for (const input of [
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      Buffer.from("not an image"),
    ])
      expect(
        (
          await request(app)
            .post("/api/users/me/avatar")
            .set(auth(tokens.student))
            .attach("avatar", input, "fake.png")
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/users/me/avatar")
          .set(auth(tokens.student))
          .attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), "huge.png")
      ).status,
    ).toBe(400);
  });
  it("allows only creators to edit modules and quizzes, without ownership reassignment", async () => {
    const quiz = (
      await request(app)
        .post("/api/quizzes")
        .set(auth(tokens.faculty))
        .send({
          subjectId,
          moduleId,
          title: "Owned quiz",
          questions,
          timePerQuestion: 30,
          timeUnit: "seconds",
        })
    ).body.quiz;
    for (const role of ["other", "student", "admin"]) {
      expect(
        (
          await request(app)
            .patch(`/api/modules/${moduleId}`)
            .set(auth(tokens[role]))
            .send({ title: "Stolen" })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .patch(`/api/quizzes/${quiz._id}`)
            .set(auth(tokens[role]))
            .send({ title: "Stolen" })
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await request(app)
          .patch(`/api/modules/${moduleId}`)
          .set(auth(tokens.faculty))
          .send({ title: "Updated module", textContent: "Updated lecture" })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/quizzes/${quiz._id}`)
          .set(auth(tokens.faculty))
          .send({ title: "Updated quiz", passingPercentage: 90 })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/quizzes/${quiz._id}`)
          .set(auth(tokens.faculty))
          .send({ createdBy: String(users.other._id) })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/modules/${moduleId}`)
          .set(auth(tokens.faculty))
          .send({ subjectId })
      ).status,
    ).toBe(400);
    const own = await request(app)
      .get(`/api/subjects/${subjectId}/modules`)
      .set(auth(tokens.faculty));
    expect(own.body.modules[0].canEdit).toBe(true);
    const other = await request(app)
      .get(`/api/subjects/${subjectId}/modules`)
      .set(auth(tokens.other));
    expect(other.body.modules[0].canEdit).toBe(false);
    await Module.updateOne({ _id: moduleId }, { $unset: { createdBy: 1 } });
    expect(
      (
        await request(app)
          .patch(`/api/modules/${moduleId}`)
          .set(auth(tokens.faculty))
          .send({ title: "Legacy module update" })
      ).status,
    ).toBe(200);
  });
  it("preserves active quiz questions, choice order, timers and grading when the owner updates a quiz", async () => {
    const quiz = (
      await request(app)
        .post("/api/quizzes")
        .set(auth(tokens.faculty))
        .send({
          subjectId,
          moduleId,
          title: "Original quiz",
          questions,
          timeLimitMinutes: 10,
          passingPercentage: 75,
        })
    ).body.quiz;
    const sessionToken = "snapshot-session-0000000000000000";
    const opened = await request(app)
      .post(`/api/quizzes/${quiz._id}/attempts`)
      .set(auth(tokens.student))
      .send({ sessionToken });
    expect(opened.status).toBe(200);
    const quizId = quiz._id,
      attemptId = opened.body.attempt.id;
    const update = await request(app)
      .patch(`/api/quizzes/${quizId}`)
      .set(auth(tokens.faculty))
      .send({
        title: "Revised quiz",
        questions: [
          {
            questionText: "New question",
            options: ["A", "New correct", "C", "D"],
            correctIndex: 1,
          },
        ],
        questionCount: 1,
        timePerQuestion: 5,
        timeUnit: "seconds",
        passingPercentage: 100,
        version: quiz.__v,
      });
    expect(update.status).toBe(200);
    const resumed = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth(tokens.student))
      .send({ sessionToken });
    expect(resumed.body.quiz.title).toBe("Original quiz");
    expect(resumed.body.quiz.questions).toEqual(opened.body.quiz.questions);
    expect(resumed.body.attempt.expiresAt).toBe(opened.body.attempt.expiresAt);
    expect(JSON.stringify(resumed.body)).not.toMatch(
      /quizSnapshot|correctIndex|explanation/,
    );
    const answers = opened.body.quiz.questions.map((q: any, i: number) =>
      i < 3 ? q.options.indexOf("Correct") : -1,
    );
    const submitted = await request(app)
      .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
      .set(auth(tokens.student))
      .send({ sessionToken, answers });
    expect(submitted.body.submission).toMatchObject({
      totalQuestions: 4,
      percentage: 75,
      passed: true,
      passingPercentage: 75,
    });
    const next = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth(tokens.student))
      .send({ sessionToken });
    expect(next.body.quiz.questions).toHaveLength(1);
    expect(next.body.quiz.title).toBe("Revised quiz");
    expect(next.body.attempt.timePerQuestionSeconds).toBe(5);
    expect(
      (
        await request(app)
          .patch(`/api/quizzes/${quizId}`)
          .set(auth(tokens.faculty))
          .send({ title: "Stale edit", version: quiz.__v })
      ).status,
    ).toBe(409);
  });
  it("blocks edits while pre-snapshot quiz sessions are active", async () => {
    const quiz = (
      await request(app)
        .post("/api/quizzes")
        .set(auth(tokens.faculty))
        .send({
          subjectId,
          title: "Legacy session quiz",
          questions,
          timeLimitMinutes: 10,
        })
    ).body.quiz;
    const opened = await request(app)
      .post(`/api/quizzes/${quiz._id}/attempts`)
      .set(auth(tokens.student))
      .send({ sessionToken: "legacy-snapshot-token-0000000" });
    await QuizAttempt.updateOne(
      { _id: opened.body.attempt.id },
      { $unset: { quizSnapshot: 1 } },
    );
    expect(
      (
        await request(app)
          .patch(`/api/quizzes/${quiz._id}`)
          .set(auth(tokens.faculty))
          .send({ title: "Unsafe edit" })
      ).status,
    ).toBe(409);
  });
  it("provisions an initial admin only with explicit server configuration and does not reset existing admins", async () => {
    await User.deleteMany({ role: "admin" });
    process.env.ADMIN_EMAIL = "bootstrap@accounts.test";
    process.env.ADMIN_PASSWORD = "Bootstrap123!";
    try {
      await bootstrapAdmin();
      await bootstrapAdmin();
      expect(await User.countDocuments({ role: "admin" })).toBe(1);
      const logged = await request(app)
        .post("/api/auth/login")
        .send({
          loginIdentifier: process.env.ADMIN_EMAIL,
          password: "Bootstrap123!",
        });
      expect(logged.status).toBe(200);
      expect(logged.body.user.role).toBe("admin");
    } finally {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
    }
  });
});
