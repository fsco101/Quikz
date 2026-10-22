import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connectDB, disconnectDB } from "../config/db.js";
import app from "../server.js";
import { seedDatabase } from "../utils/seeder.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import fs from "node:fs/promises";
import path from "node:path";

describe("Sprint 2 - Curriculum & Sequential Module Progression Gating", () => {
  let facultyToken = "";
  let studentToken = "";
  let seededSubjectId = "";

  beforeAll(async () => {
    await connectDB();
    await seedDatabase();

    // Log in faculty
    const facultyLogin = await request(app)
      .post("/api/auth/login")
      .send({ loginIdentifier: "faculty@quikz.edu", password: "Faculty@123" });
    facultyToken = facultyLogin.body.token;

    // Log in student
    const studentLogin = await request(app)
      .post("/api/auth/login")
      .send({ loginIdentifier: "student@quikz.edu", password: "Student@123" });
    studentToken = studentLogin.body.token;

    const subject = await Subject.findOne({ code: "CS101" });
    seededSubjectId = subject!._id.toString();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("allows students and faculty to list all subjects", async () => {
    const res = await request(app)
      .get("/api/subjects")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subjects.length).toBeGreaterThan(0);
    expect(res.body.subjects[0].code).toBe("CS101");
  });

  it("prevents students from creating subjects", async () => {
    const res = await request(app)
      .post("/api/subjects")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        name: "Hacking 101",
        code: "HACK101",
        term: "1st Semester",
        yearLevel: "1st Year",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Requires faculty privileges");
  });

  it("enforces sequential prerequisite locking for students on modules", async () => {
    const res = await request(app)
      .get(`/api/subjects/${seededSubjectId}/modules`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const { modules } = res.body;
    expect(modules.length).toBe(3);

    // Module 1 is the start of the course -> must be unlocked
    expect(modules[0].orderIndex).toBe(1);
    expect(modules[0].isLocked).toBe(false);

    // Module 2 is gated behind Module 1 completion -> must be locked
    expect(modules[1].orderIndex).toBe(2);
    expect(modules[1].isLocked).toBe(true);

    // Module 3 is gated behind Module 2 completion -> must be locked
    expect(modules[2].orderIndex).toBe(3);
    expect(modules[2].isLocked).toBe(true);
  });

  it("rejects direct completion without a passing end quiz", async () => {
    const modules = await Module.find({ subjectId: seededSubjectId }).sort({
      orderIndex: 1,
    });
    const res = await request(app)
      .post(`/api/modules/${modules[0]._id}/complete`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    const updated = await request(app)
      .get(`/api/subjects/${seededSubjectId}/modules`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(updated.body.modules[1].isLocked).toBe(true);
    expect(updated.body.modules[1].textContent).toBeUndefined();
    expect(updated.body.modules[1].fileUrl).toBeUndefined();
    expect(updated.body.modules[0].quizId).not.toHaveProperty("questions");
  });
  it("serves a public catalog and validates subject fields and unique codes", async () => {
    expect((await request(app).get("/api/subjects")).status).toBe(200);
    const payload = {
      name: "Upload course",
      code: "UPLOAD101",
      term: "1st Semester",
      yearLevel: "2nd Year",
    };
    const create = await request(app)
      .post("/api/subjects")
      .set("Authorization", `Bearer ${facultyToken}`)
      .send(payload);
    expect(create.status).toBe(201);
    expect(
      (
        await request(app)
          .post("/api/subjects")
          .set("Authorization", `Bearer ${facultyToken}`)
          .send({ ...payload, code: " upload101 " })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post("/api/subjects")
          .set("Authorization", `Bearer ${facultyToken}`)
          .send({ ...payload, code: "INVALIDYEAR", yearLevel: "5th Year" })
      ).status,
    ).toBe(400);
  });
  it("uploads a lesson and serves its content only through authenticated module routes", async () => {
    const created = await request(app)
      .post("/api/subjects")
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({
        name: "Attachment course",
        code: "FILES101",
        term: "1st Semester",
        yearLevel: "2nd Year",
      });
    const subject = created.body.subject;
    const uploaded = await request(app)
      .post(`/api/subjects/${subject!._id}/modules`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .field("title", "Attached lecture")
      .field("summary", "Learning objectives")
      .field("contentType", "file")
      .attach("file", Buffer.from("Lecture material"), "lecture.txt");
    expect(uploaded.status).toBe(201);
    const module = uploaded.body.module;
    try {
      const detail = await request(app)
        .get(`/api/modules/${module._id}`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(detail.status).toBe(200);
      expect(detail.body.module.fileUrl).toBe(
        `/api/modules/${module._id}/file`,
      );
      expect((await request(app).get(detail.body.module.fileUrl)).status).toBe(
        401,
      );
      const downloaded = await request(app)
        .get(detail.body.module.fileUrl)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(downloaded.status).toBe(200);
      expect(downloaded.text).toBe("Lecture material");
      expect((await request(app).get(module.fileUrl)).status).toBe(404);
    } finally {
      await fs.unlink(path.resolve("uploads", path.basename(module.fileUrl)));
    }
  });
});
