import { User } from "../models/User.js";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { databaseHealth, telemetry } from "../services/telemetry.js";

describe("Sprint 5 — public lesson discovery, audit and actual database health", () => {
  let admin: string,
    faculty: string,
    facultyId: string,
    other: string,
    otherId: string,
    student: string,
    subjectId: string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    await connectDB();
    await AuditEvent.init();
    for (const [name, role] of [
      ["faculty", "faculty"],
      ["other", "faculty"],
      ["student", "student"],
    ]) {
      const result = await request(app)
        .post("/api/auth/register")
        .send({
          username: `system_${name}`,
          email: `${name}@system.test`,
          password: "Password123!",
          role,
          fullName: `System ${name}`,
          surname: name,
          yearLevel: "1st Year",
          section: "Section A",
          termsAccepted: true,
        });
      expect(result.status).toBe(201);
      if (name === "faculty") {
        faculty = result.body.token;
        facultyId = result.body.user.id;
      }
      if (name === "other") {
        other = result.body.token;
        otherId = result.body.user.id;
      }
      if (name === "student") student = result.body.token;
    }
    const account = await User.create({
      username: "sys_admin",
      email: "admin@system.test",
      role: "admin",
      fullName: "System Admin",
      surname: "Admin",
      termsAccepted: true,
      passwordHash: (await User.findById(facultyId))!.passwordHash,
    });
    admin = (
      await request(app)
        .post("/api/auth/login")
        .send({ loginIdentifier: account.email, password: "Password123!" })
    ).body.token;
    const result = await request(app)
      .post("/api/subjects")
      .set(auth(faculty))
      .send({
        name: "Biology directory",
        code: "BIOSEARCH",
        term: "1st Semester",
        yearLevel: "1st Year",
        description: "Biology syllabus overview",
      });
    expect(result.status).toBe(201);
    subjectId = result.body.subject._id;
    for (let i = 1; i <= 14; i++)
      await Module.create({
        subjectId,
        title: `Biology topic ${String(i).padStart(2, "0")}`,
        summary: "Core biological principles",
        orderIndex: i,
        contentType: i === 2 ? "presentation" : "text",
        textContent:
          i === 14
            ? "Distinctive mitochondria keyword in locked lecture."
            : "Private lecture body",
        fileUrl: "/uploads/private.txt",
        fileName: "private.txt",
      });
    await Subject.create({
      name: "Other chemistry",
      code: "CHEMSEARCH",
      term: "2nd Semester",
      yearLevel: "3rd Year",
      facultyId: otherId,
      facultyName: "System other",
    });
  });
  afterAll(disconnectDB);
  it("provides paginated public metadata and a syllabus without exposing full notes, files or quiz keys", async () => {
    const res = await request(app).get("/api/directory");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(14);
    expect(res.body.lessons).toHaveLength(12);
    expect(res.body.pages).toBe(2);
    expect(
      res.body.syllabuses.find((s: any) => s.code === "BIOSEARCH").modules,
    ).toHaveLength(14);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("Private lecture body");
    expect(serialized).not.toMatch(
      /fileUrl|correctIndex|textContent|passwordHash/,
    );
    const next = await request(app).get("/api/directory?page=2");
    expect(next.body.lessons).toHaveLength(2);
    expect(
      res.body.lessons.some((m: any) => m._id === next.body.lessons[0]._id),
    ).toBe(false);
  });
  it("searches lecture text without returning it, and combines instructor, term, year and format filters", async () => {
    const text = await request(app).get("/api/directory?search=mitochondria");
    expect(text.body.total).toBe(1);
    expect(text.body.lessons[0].orderIndex).toBe(14);
    const filtered = await request(app).get(
      `/api/directory?facultyId=${facultyId}&yearLevel=1st%20Year&term=1st%20Semester&contentType=presentation`,
    );
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.lessons[0].orderIndex).toBe(2);
    expect(
      (await request(app).get("/api/directory?search=BIOSEARCH")).body.total,
    ).toBe(14);
    expect(
      (await request(app).get("/api/directory?search=.%2A")).body.total,
    ).toBe(0);
  });
  it.each([
    "page=0",
    "page=1.5",
    "page=100001",
    "facultyId=bad",
    "subjectId=bad",
    "contentType=script",
    "search[x]=test",
  ])("rejects malformed directory filters: %s", async (query) => {
    expect((await request(app).get(`/api/directory?${query}`)).status).toBe(
      400,
    );
  });
  it("records credential, terms, publication, session, integrity and result events without secrets", async () => {
    await request(app).post("/api/auth/login").send({
      loginIdentifier: "faculty@system.test",
      password: "wrong-password-secret",
    });
    const created = await request(app)
      .post(`/api/subjects/${subjectId}/modules`)
      .set(auth(faculty))
      .send({
        title: "Audited publication",
        summary: "Summary",
        textContent: "Private publication text",
        contentType: "text",
      });
    expect(created.status).toBe(201);
    const quizzes = await request(app)
      .post("/api/quizzes")
      .set(auth(faculty))
      .send({
        title: "Audit quiz",
        subjectId,
        timeLimitMinutes: 10,
        questions: Array.from({ length: 4 }, (_, i) => ({
          questionText: `Audit question ${i}`,
          options: ["Correct", "B", "C", "D"],
          correctIndex: 0,
        })),
      });
    expect(quizzes.status).toBe(201);
    const quizId = quizzes.body.quiz._id,
      sessionToken = "audit-session-token-000000000000";
    const start = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth(student))
      .send({ sessionToken });
    expect(start.status).toBe(200);
    const attemptId = start.body.attempt.id;
    expect(
      (
        await request(app)
          .patch(`/api/quizzes/${quizId}/attempts/${attemptId}`)
          .set(auth(student))
          .send({ sessionToken, answers: [-1, -1, -1, -1], blur: true })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
          .set(auth(student))
          .send({ sessionToken, answers: [-1, -1, -1, -1] })
      ).status,
    ).toBe(200);
    const events = await AuditEvent.find().lean();
    for (const action of [
      "auth.register",
      "auth.login",
      "curriculum.subject_published",
      "curriculum.module_published",
      "quiz.published",
      "quiz.session_opened",
      "quiz.focus_warning",
      "quiz.submitted",
      "quiz.result_recorded",
    ])
      expect(events.some((e) => e.action === action)).toBe(true);
    expect(
      events.some((e) => e.action === "auth.login" && e.outcome === "failure"),
    ).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(
      /Password123|wrong-password-secret|audit-session-token|Private publication text|correctIndex|passwordHash/,
    );
  });
  it("restricts health and audit to administrators, including when the legacy faculty allowlist is configured", async () => {
    expect((await request(app).get("/api/system/health")).status).toBe(401);
    process.env.SYSTEM_ADMIN_USER_IDS = facultyId;
    try {
      for (const token of [student, faculty, other]) {
        for (const route of ["health", "audit"])
          expect(
            (await request(app).get(`/api/system/${route}`).set(auth(token)))
              .status,
          ).toBe(403);
      }
    } finally {
      delete process.env.SYSTEM_ADMIN_USER_IDS;
    }
    const all = await request(app).get("/api/system/audit").set(auth(admin));
    expect(all.status).toBe(200);
    expect(all.body.scope).toBe("system");
    expect(all.body.events.some((e: any) => e.actorId === otherId)).toBe(true);
    const failed = await request(app)
      .get("/api/system/audit?action=auth.login&outcome=failure")
      .set(auth(admin));
    expect(failed.body.events).toHaveLength(1);
    expect(
      (await request(app).get("/api/system/audit?page=0").set(auth(admin)))
        .status,
    ).toBe(400);
  });
  it("pings and verifies an actual database write/read while labeling ephemeral storage honestly", async () => {
    const result = await request(app)
      .get("/api/system/health")
      .set(auth(admin));
    expect(result.status).toBe(200);
    expect(result.body.mode).toBe("ephemeral");
    expect(result.body.persistent).toBe(false);
    expect(result.body.writeReadVerified).toBe(true);
    expect(result.body.pingMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(result.body)).not.toMatch(
      /mongodb:\/\/|JWT_SECRET|Password123/,
    );
    expect(
      await mongoose.connection
        .db!.collection("system_sync_probes")
        .countDocuments(),
    ).toBe(0);
  });
  it("reports a degraded connection when a real probe fails", async () => {
    const command = vi
      .spyOn(mongoose.connection.db!, "command")
      .mockRejectedValueOnce(new Error("Simulated network outage"));
    try {
      const result = await databaseHealth();
      expect(result.status).toBe("degraded");
      expect(result.writeReadVerified).toBe(false);
    } finally {
      command.mockRestore();
    }
  });
  it("does not silently switch a configured persistent database to ephemeral storage", async () => {
    const uri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = "mongodb://invalid.invalid/quikz";
    const connect = vi
      .spyOn(mongoose, "connect")
      .mockRejectedValueOnce(new Error("Simulated connection failure"));
    const fallback = vi.spyOn(MongoMemoryServer, "create");
    try {
      await expect(connectDB()).rejects.toThrow(
        "Ephemeral fallback is disabled",
      );
      expect(fallback).not.toHaveBeenCalled();
    } finally {
      process.env.MONGODB_URI = uri || "";
      connect.mockRestore();
      fallback.mockRestore();
    }
  });
  it("requires persistent storage in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(connectDB()).rejects.toThrow("MONGODB_URI is required");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
