import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { Quiz } from "../models/Quiz.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { StudentProgress } from "../models/StudentProgress.js";
import { User } from "../models/User.js";

describe("Sprint 6 — verified course progress and faculty assessment readiness", () => {
  const accounts: Record<string, { token: string; id: string }> = {};
  const overview = (name = "student") => request(app).get("/api/subjects/overview")
    .set("Authorization", `Bearer ${accounts[name].token}`);

  beforeAll(async () => {
    await connectDB();
    for (const [name, role] of [["faculty", "faculty"], ["otherFaculty", "faculty"], ["student", "student"], ["otherStudent", "student"]]) {
      const response = await request(app).post("/api/auth/register").send({
        username: name, email: `${name}@overview.edu`, password: "Password123!",
        fullName: `Overview ${name}`, surname: name, role, termsAccepted: true,
        yearLevel: "1st Year", section: "BSIT-S-1A",
      });
      expect(response.status).toBe(201);
      accounts[name] = { token: response.body.token, id: response.body.user.id };
    }
  });
  beforeEach(async () => {
    await Promise.all([Subject.deleteMany({}), Module.deleteMany({}), Quiz.deleteMany({}),
      QuizSubmission.deleteMany({}), StudentProgress.deleteMany({})]);
  });
  afterAll(disconnectDB);

  async function course(code = "OVERVIEW", owner = "faculty", count = 3) {
    const subject = await Subject.create({ name: `${code} course`, code, term: "1st Semester",
      yearLevel: "1st Year", facultyId: accounts[owner].id, facultyName: owner });
    const modules = [];
    for (let index = 0; index < count; index++) {
      const module = await Module.create({ subjectId: subject._id, title: `Lesson ${index + 1}`,
        summary: "Private lesson summary", textContent: "Private lecture notes", orderIndex: index + 1 });
      const quiz = await Quiz.create({ subjectId: subject._id, moduleId: module._id,
        title: `End quiz ${index + 1}`, createdBy: accounts[owner].id,
        questions: [{ questionText: "Private question", options: ["A", "B", "C", "D"], correctIndex: 0 }] });
      module.quizId = quiz._id as mongoose.Types.ObjectId;
      await module.save();
      modules.push(module);
    }
    return { subject, modules };
  }
  async function result(subjectId: unknown, module: any, name = "student", passed = true, quizId = module.quizId) {
    return QuizSubmission.create({ subjectId, moduleId: module._id, quizId,
      studentId: accounts[name].id, studentName: name, studentSurname: name,
      score: passed ? 1 : 0, totalQuestions: 1, percentage: passed ? 100 : 0, passed, answers: [] });
  }
  async function record(subjectId: unknown, modules: any[], name = "student") {
    return StudentProgress.create({ studentId: accounts[name].id, subjectId,
      completedModuleIds: modules.map((m) => m._id) });
  }

  it("requires authentication and keeps the public catalog free of personalized data", async () => {
    await course();
    expect((await request(app).get("/api/subjects/overview")).status).toBe(401);
    const catalog = await request(app).get("/api/subjects");
    expect(catalog.status).toBe(200);
    expect(catalog.body.subjects[0]).not.toHaveProperty("completedCount");
    expect(catalog.body.subjects[0]).not.toHaveProperty("nextModule");
  });

  it("denies administrators access to student and faculty overviews", async () => {
    await User.updateOne({ _id: accounts.otherStudent.id }, { role: "admin" });
    try {
      expect((await overview("otherStudent")).status).toBe(403);
    } finally {
      await User.updateOne({ _id: accounts.otherStudent.id }, { role: "student" });
    }
  });

  it("shows first unfinished lessons and counts only verified designated passes once", async () => {
    const { subject, modules } = await course();
    await record(subject._id, modules);
    // A legacy flag, a failed submission and another student's pass cannot grant mastery.
    await result(subject._id, modules[1], "student", false);
    await result(subject._id, modules[2], "otherStudent");
    let response = await overview();
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.courses[0]).toMatchObject({ completedCount: 0, totalModules: 3,
      status: "not-started", nextModule: { id: String(modules[0]._id) } });
    await result(subject._id, modules[0]);
    await result(subject._id, modules[0]);
    await result(subject._id, modules[0], "student", false);
    response = await overview();
    expect(response.body.courses[0]).toMatchObject({ completedCount: 1,
      status: "in-progress", nextModule: { id: String(modules[1]._id) } });
    const path = await request(app).get(`/api/subjects/${subject._id}/modules`)
      .set("Authorization", `Bearer ${accounts.student.token}`);
    expect(path.body.progress.completedCount).toBe(1);
    expect(path.body.modules[1].isLocked).toBe(false);
    expect(path.body.modules[2].isLocked).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/Private|questions|correctIndex|sessionToken|answers/);
  });

  it("does not count passes without a recorded completion or on replaced quizzes", async () => {
    const { subject, modules } = await course();
    await result(subject._id, modules[0]);
    expect((await overview()).body.courses[0].completedCount).toBe(0);
    await record(subject._id, modules);
    modules[0].quizId = new mongoose.Types.ObjectId();
    await modules[0].save();
    expect((await overview()).body.courses[0].completedCount).toBe(0);
  });

  it("ignores a forged subject association in completion evidence", async () => {
    const { subject, modules } = await course();
    const other = await course("OTHER");
    await record(subject._id, modules);
    await record(other.subject._id, modules);
    await result(other.subject._id, modules[0]);
    const response = await overview();
    expect(response.body.courses.every((c: any) => c.completedCount === 0)).toBe(true);
  });

  it("isolates student progress even when another student's ID is supplied", async () => {
    const { subject, modules } = await course();
    await record(subject._id, modules, "otherStudent");
    for (const module of modules) await result(subject._id, module, "otherStudent");
    const own = await request(app).get(`/api/subjects/overview?studentId=${accounts.otherStudent.id}`)
      .set("Authorization", `Bearer ${accounts.student.token}`);
    expect(own.body.courses[0].completedCount).toBe(0);
    const other = await overview("otherStudent");
    expect(other.body.courses[0]).toMatchObject({ completedCount: 3, status: "completed", nextModule: null });
  });

  it("treats empty courses as empty rather than mastered or ready", async () => {
    await course("EMPTY", "faculty", 0);
    expect((await overview()).body.courses[0]).toMatchObject({ totalModules: 0, completedCount: 0, status: "empty", nextModule: null });
    expect((await overview("faculty")).body.courses[0]).toMatchObject({ totalModules: 0, readyQuizCount: 0, missingQuizCount: 0, status: "empty" });
  });

  it("limits readiness to owned courses and identifies missing, deleted and mismatched quiz bindings", async () => {
    const { subject, modules } = await course();
    const other = await course("FOREIGN", "otherFaculty");
    await Module.updateOne({ _id: modules[1]._id }, { $unset: { quizId: 1 } });
    await Quiz.deleteOne({ _id: modules[2].quizId });
    let response = await overview("faculty");
    expect(response.body.courses).toHaveLength(1);
    expect(response.body.courses[0]).toMatchObject({ subjectId: String(subject._id), readyQuizCount: 1,
      missingQuizCount: 2, status: "needs-quizzes", nextModule: { id: String(modules[1]._id) } });
    await Module.updateOne({ _id: modules[0]._id }, { quizId: other.modules[0].quizId });
    response = await overview("faculty");
    expect(response.body.courses[0]).toMatchObject({ readyQuizCount: 0, missingQuizCount: 3 });
    expect(JSON.stringify(response.body)).not.toMatch(/Private|FOREIGN|correctIndex|questions|answers/);
    expect((await overview("otherFaculty")).body.courses[0]).toMatchObject({ readyQuizCount: 3, status: "ready", nextModule: null });
  });
});
