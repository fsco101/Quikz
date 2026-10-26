import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";
import fs from "node:fs/promises";
import path from "node:path";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { FacultyConnection } from "../models/FacultyConnection.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { Quiz } from "../models/Quiz.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { AuditEvent } from "../models/AuditEvent.js";

describe("Student-professor connections, audience permissions and personal results", () => {
  const users: Record<string, any> = {}, tokens: Record<string, string> = {};
  const auth = (name: string) => ({ Authorization: `Bearer ${tokens[name]}` });
  let subject: any, module: any, quiz: any;
  const question = { questionText: "Choose correct", options: ["Correct", "B", "C", "D"], correctIndex: 0 };
  beforeAll(async () => {
    await connectDB();
    await Promise.all([User.init(), FacultyConnection.init(), QuizAttempt.init(), QuizSubmission.init(), AuditEvent.init()]);
    const hash = await bcrypt.hash("Password123!", 10);
    for (const name of ["faculty", "otherFaculty", "student", "peer", "admin"]) {
      users[name] = await User.create({ username: name, email: `${name.toLowerCase()}@connect.edu`, role: name === "otherFaculty" ? "faculty" : name === "peer" ? "student" : name, fullName: `${name} PrivateName`, surname: name, passwordHash: hash, termsAccepted: true, yearLevel: name === "peer" ? "4th Year" : "1st Year", section: name === "peer" ? "Section D" : "Section A" });
      const res = await request(app).post("/api/auth/login").send({ loginIdentifier: users[name].email, password: "Password123!" });
      expect(res.status).toBe(200); tokens[name] = res.body.token;
    }
  });
  beforeEach(async () => {
    await Promise.all([FacultyConnection.deleteMany({}), Subject.deleteMany({}), Module.deleteMany({}), Quiz.deleteMany({}), QuizSubmission.deleteMany({}), QuizAttempt.deleteMany({})]);
    await User.updateMany({}, { active: true });
    subject = await Subject.create({ code: "CONNECT101", name: "Private course", term: "1st Semester", yearLevel: "1st Year", facultyId: users.faculty._id, facultyName: users.faculty.fullName });
    const created = await request(app).post(`/api/subjects/${subject._id}/modules`).set(auth("faculty")).send({ title: "Private lesson", summary: "Secret summary", textContent: "Secret lecture", contentType: "text" });
    expect(created.status).toBe(201); module = created.body.module;
    quiz = await Quiz.create({ subjectId: subject._id, moduleId: module._id, createdBy: users.faculty._id, title: "Private end quiz", questions: [question] });
    await Module.updateOne({ _id: module._id }, { quizId: quiz._id });
  });
  afterAll(disconnectDB);
  async function invite(from = "faculty", to = "student") {
    const res = await request(app).post("/api/connections").set(auth(from)).send({ email: `  ${users[to].email.toUpperCase()}  ` });
    expect(res.status).toBe(201);
    return (await FacultyConnection.findOne({ requestedBy: users[from]._id }))!;
  }
  async function connect(student = "student", professor = "faculty") {
    const res = await request(app).post("/api/connections").set(auth(professor)).send({ email: users[student].email });
    expect(res.status).toBe(201);
    const link = await FacultyConnection.findOne({ facultyId: users[professor]._id, studentId: users[student]._id });
    expect((await request(app).post(`/api/connections/${link!._id}/accept`).set(auth(student))).status).toBe(200);
    return link!;
  }
  async function result(name: string) {
    return QuizSubmission.create({ quizId: quiz._id, moduleId: module._id, subjectId: subject._id, studentId: users[name]._id, studentName: users[name].fullName, studentSurname: name, studentYearLevel: users[name].yearLevel, studentSection: users[name].section, score: 1, totalQuestions: 1, percentage: 100, passed: true });
  }
  const binary = (url: string, name: string) => request(app).get(url).set(auth(name)).buffer(true).parse((res, callback) => {
    const parts: Buffer[] = []; res.on("data", (part) => parts.push(Buffer.from(part))); res.on("end", () => callback(null, Buffer.concat(parts)));
  });
  it("requires authentication, opposite roles and valid email addresses", async () => {
    expect((await request(app).get("/api/connections")).status).toBe(401);
    expect((await request(app).get("/api/connections").set(auth("admin"))).status).toBe(403);
    for (const email of [users.faculty.email, users.otherFaculty.email, "missing@connect.edu", { $ne: "" }]) {
      expect((await request(app).post("/api/connections").set(auth("faculty")).send({ email })).status).toBeGreaterThanOrEqual(400);
    }
    expect((await request(app).get("/api/connections?page=0").set(auth("faculty"))).status).toBe(400);
  });
  it("matches normalized email, requires recipient acceptance and isolates requests", async () => {
    const link = await invite();
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("faculty"))).status).toBe(403);
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("peer"))).status).toBe(404);
    expect((await request(app).get(`/api/modules/${module._id}`).set(auth("student"))).status).toBe(403);
    const pending = await request(app).get("/api/connections?view=incoming").set(auth("student"));
    expect(pending.headers["cache-control"]).toBe("no-store");
    expect(pending.body.connections[0].person.email).toBe(users.faculty.email);
    expect((await request(app).get("/api/connections?view=incoming").set(auth("peer"))).body.total).toBe(0);
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("student"))).status).toBe(200);
    expect((await request(app).get(`/api/modules/${module._id}`).set(auth("student"))).body.module.textContent).toBe("Secret lecture");
    const roster = await request(app).get("/api/connections").set(auth("faculty"));
    expect(roster.body.connections[0].person.yearLevel).toBe("1st Year");
    expect(JSON.stringify(roster.body)).not.toMatch(/passwordHash|authVersion|termsAccepted/);
    expect((await request(app).get(`/api/modules/${module._id}`).set(auth("peer"))).status).toBe(403);
  });
  it("lets students request professors and prevents duplicates, auto-acceptance and unrelated deletion", async () => {
    const link = await invite("student", "faculty");
    expect((await request(app).post("/api/connections").set(auth("faculty")).send({ email: users.student.email })).status).toBe(409);
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("student"))).status).toBe(403);
    expect((await request(app).delete(`/api/connections/${link._id}`).set(auth("otherFaculty"))).status).toBe(404);
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("faculty"))).status).toBe(200);
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("faculty"))).status).toBe(409);
  });
  it("can decline or cancel requests and supports connections with multiple professors", async () => {
    const pending = await invite();
    expect((await request(app).delete(`/api/connections/${pending._id}`).set(auth("student"))).status).toBe(200);
    const next = await invite();
    expect((await request(app).delete(`/api/connections/${next._id}`).set(auth("faculty"))).status).toBe(200);
    await connect(); await connect("student", "otherFaculty");
    expect((await request(app).get("/api/connections").set(auth("student"))).body.total).toBe(2);
    expect((await request(app).get("/api/connections?search=.*").set(auth("student"))).body.total).toBe(0);
  });
  it("blocks private lessons, files and quizzes for unrelated users, discovery and overviews", async () => {
    expect(module.audience).toBe("connected");
    for (const name of ["student", "otherFaculty"]) {
      expect((await request(app).get(`/api/modules/${module._id}`).set(auth(name))).status).toBe(403);
      expect((await request(app).get(`/api/quizzes/${quiz._id}`).set(auth(name))).status).toBe(403);
      expect((await request(app).get(`/api/quizzes/subject/${subject._id}`).set(auth(name))).body.quizzes).toHaveLength(0);
      expect((await request(app).get(`/api/subjects/${subject._id}/modules`).set(auth(name))).body.modules).toHaveLength(0);
    }
    expect((await request(app).post(`/api/quizzes/${quiz._id}/attempts`).set(auth("student")).send({ sessionToken: "unconnected-private-session" })).status).toBe(403);
    const directory = await request(app).get("/api/directory?search=Secret");
    expect(directory.body.total).toBe(0); expect(directory.body.syllabuses).toHaveLength(0);
    expect((await request(app).get("/api/subjects")).body.subjects).toHaveLength(0);
    expect((await request(app).get("/api/subjects/overview").set(auth("student"))).body.courses).toHaveLength(0);
    expect((await request(app).get(`/api/modules/${module._id}`).set(auth("faculty"))).status).toBe(200);
  });
  it.each(["public", "both"])("publishes %s lessons while keeping the roster private", async (audience) => {
    expect((await request(app).patch(`/api/modules/${module._id}`).set(auth("faculty")).send({ audience })).status).toBe(200);
    expect((await request(app).get(`/api/modules/${module._id}`).set(auth("peer"))).status).toBe(200);
    expect((await request(app).get("/api/directory?search=Secret")).body.total).toBe(1);
    expect((await request(app).get("/api/connections").set(auth("otherFaculty"))).body.total).toBe(0);
    expect((await request(app).patch(`/api/modules/${module._id}`).set(auth("faculty")).send({ audience: "everyone" })).status).toBe(400);
  });
  it("does not expose private prerequisites through a public lesson or syllabus", async () => {
    const publicLesson = await Module.create({ subjectId: subject._id, orderIndex: 2, title: "Public second lesson", summary: "Public summary", audience: "public" });
    expect((await request(app).get(`/api/modules/${publicLesson._id}`).set(auth("peer"))).status).toBe(200);
    const directory = await request(app).get("/api/directory");
    expect(JSON.stringify(directory.body)).not.toContain("Private lesson");
    expect(directory.body.syllabuses[0].modules).toHaveLength(1);
    const listing = await request(app).get(`/api/subjects/${subject._id}/modules`).set(auth("peer"));
    expect(listing.body.modules).toHaveLength(1); expect(listing.body.progress.totalModules).toBe(1);
    expect(listing.body.modules[0].isLocked).toBe(false);
  });
  it("revokes private-file access, resumed quiz mutations and faculty reports after disconnection", async () => {
    const link = await connect();
    const file = await request(app).post(`/api/subjects/${subject._id}/modules`).set(auth("faculty")).field("title", "Private file").field("summary", "Attachment").field("contentType", "file").attach("file", Buffer.from("secret attachment"), "lesson.txt");
    const upload = file.body.module;
    // Put the attachment first so access is not blocked by unfinished quizzes.
    await Module.updateOne({ _id: upload._id }, { orderIndex: 0 });
    try {
      expect((await request(app).get(`/api/modules/${upload._id}/file`).set(auth("student"))).status).toBe(200);
      expect((await request(app).get(`/api/modules/${upload._id}/file`).set(auth("otherFaculty"))).status).toBe(403);
      await Module.updateOne({ _id: upload._id }, { orderIndex: 99 });
      const sessionToken = "private-session-0000000001";
      const started = await request(app).post(`/api/quizzes/${quiz._id}/attempts`).set(auth("student")).send({ sessionToken });
      expect(started.status).toBe(200);
      await result("student");
      expect((await request(app).get("/api/gradebook").set(auth("faculty"))).body.summary.attempts).toBe(1);
      expect((await request(app).delete(`/api/connections/${link._id}`).set(auth("student"))).status).toBe(200);
      expect((await request(app).get(`/api/modules/${upload._id}/file`).set(auth("student"))).status).toBe(403);
      expect((await request(app).patch(`/api/quizzes/${quiz._id}/attempts/${started.body.attempt.id}`).set(auth("student")).send({ sessionToken, answers: [0] })).status).toBe(403);
      expect((await request(app).get("/api/gradebook").set(auth("faculty"))).body.summary.attempts).toBe(0);
      expect((await request(app).get("/api/gradebook").set(auth("student"))).body.summary.attempts).toBe(1);
    } finally { await fs.unlink(path.join("uploads", path.basename(upload.fileUrl))); }
  });
  it("keeps unconnected students out of People, faculty totals, cohorts and both exports", async () => {
    await result("student"); await result("peer"); await connect();
    const people = await request(app).get("/api/users?search=PrivateName").set(auth("faculty"));
    expect(people.body.users.map((u: any) => u.id)).toContain(String(users.student._id));
    expect(people.body.users.map((u: any) => u.id)).not.toContain(String(users.peer._id));
    const report = await request(app).get("/api/gradebook").set(auth("faculty"));
    expect(report.body.summary.students).toBe(1);
    expect(report.body.cohorts).toEqual([{ yearLevel: "1st Year", section: "Section A" }]);
    expect(JSON.stringify(report.body)).not.toContain(users.peer.fullName);
    expect((await request(app).get("/api/gradebook").set(auth("otherFaculty"))).body.summary.attempts).toBe(0);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load((await binary("/api/gradebook/export/xlsx", "faculty")).body);
    expect(JSON.stringify(workbook.model)).not.toContain(users.peer.fullName);
    const parser = new PDFParse({ data: new Uint8Array((await binary("/api/gradebook/export/pdf", "faculty")).body) });
    try { expect((await parser.getText()).text).not.toContain(users.peer.fullName); } finally { await parser.destroy(); }
  });
  it("keeps My results, subject options, submissions and exports specific to each student even with forged IDs", async () => {
    await result("student"); await result("peer");
    for (const name of ["student", "peer"]) {
      const other = name === "student" ? "peer" : "student";
      const query = `studentId=${users[other]._id}&userId=${users[other]._id}&facultyId=${users.faculty._id}`;
      const report = await request(app).get(`/api/gradebook?${query}`).set(auth(name));
      expect(report.status).toBe(200); expect(report.headers["cache-control"]).toBe("no-store");
      expect(report.body.summary.attempts).toBe(1); expect(report.body.summary.students).toBe(1);
      expect(report.body.groups[0].rows.every((r: any) => r.studentId === String(users[name]._id))).toBe(true);
      expect(JSON.stringify(report.body)).not.toContain(users[other].fullName);
      const submissions = await request(app).get(`/api/quizzes/submissions?${query}`).set(auth(name));
      expect(submissions.body.submissions).toHaveLength(1);
      expect(submissions.body.submissions[0].studentId).toBe(String(users[name]._id));
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load((await binary(`/api/gradebook/export/xlsx?${query}`, name)).body);
      expect(JSON.stringify(workbook.model)).toContain(users[name].fullName);
      expect(JSON.stringify(workbook.model)).not.toContain(users[other].fullName);
      const parser = new PDFParse({ data: new Uint8Array((await binary(`/api/gradebook/export/pdf?${query}`, name)).body) });
      try { const text = (await parser.getText()).text; expect(text).toContain(users[name].fullName); expect(text).not.toContain(users[other].fullName); } finally { await parser.destroy(); }
    }
    await QuizSubmission.deleteMany({ studentId: users.peer._id });
    const empty = await request(app).get("/api/gradebook").set(auth("peer"));
    expect(empty.body.subjects).toHaveLength(0); expect(empty.body.groups).toHaveLength(0); expect(empty.body.summary.attempts).toBe(0);
    expect((await request(app).get(`/api/gradebook?subjectId=${subject._id}`).set(auth("peer"))).status).toBe(403);
  });
  it("requires active role-correct accounts for connections and ignores deactivated students in reports", async () => {
    const link = await invite(); await User.updateOne({ _id: users.student._id }, { active: false });
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("student"))).status).toBe(403);
    await User.updateOne({ _id: users.student._id }, { active: true });
    expect((await request(app).post(`/api/connections/${link._id}/accept`).set(auth("student"))).status).toBe(200);
    await result("student"); await User.updateOne({ _id: users.student._id }, { active: false });
    expect((await request(app).get("/api/gradebook").set(auth("faculty"))).body.summary.students).toBe(0);
    expect((await request(app).get("/api/connections").set(auth("faculty"))).body.total).toBe(0);
  });
});
