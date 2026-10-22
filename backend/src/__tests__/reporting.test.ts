import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";
import { mkdir, writeFile } from "node:fs/promises";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Subject } from "../models/Subject.js";
import { Quiz } from "../models/Quiz.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { AuditEvent } from "../models/AuditEvent.js";

describe("Sprint 4 — scoped gradebooks and cohort-separated exports", () => {
  let faculty: string,
    otherFaculty: string,
    student: string,
    facultyId: string,
    otherFacultyId: string,
    studentId: string,
    peerId: string,
    subjectId: string,
    privateSubjectId: string,
    quizId: string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    await mkdir("../.analysis/reports", { recursive: true });
    await connectDB();
    await AuditEvent.init();
    for (const [name, role] of [
      ["owner", "faculty"],
      ["other", "faculty"],
      ["student", "student"],
      ["peer", "student"],
    ]) {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          username: `report_${name}`,
          email: `${name}@report.test`,
          password: "Password123!",
          role,
          fullName: `Report ${name}`,
          surname: name,
          yearLevel: "2nd Year",
          section: "Section A",
          termsAccepted: true,
        });
      expect(response.status).toBe(201);
      const { token, user } = response.body;
      if (name === "owner") {
        faculty = token;
        facultyId = user.id;
      }
      if (name === "other") {
        otherFaculty = token;
        otherFacultyId = user.id;
      }
      if (name === "student") {
        student = token;
        studentId = user.id;
      }
      if (name === "peer") peerId = user.id;
    }
    const subject = await Subject.create({
      name: "Reporting course",
      code: "REPORT101",
      term: "1st Semester",
      yearLevel: "2nd Year",
      facultyId,
      facultyName: "Report Faculty",
    });
    subjectId = String(subject._id);
    const other = await Subject.create({
      name: "Private other course",
      code: "PRIVATE101",
      term: "2nd Semester",
      yearLevel: "3rd Year",
      facultyId: otherFacultyId,
      facultyName: "Other Faculty",
    });
    privateSubjectId = String(other._id);
    const quiz = await Quiz.create({
      title: "Reporting assessment",
      subjectId,
      createdBy: facultyId,
      questions: Array.from({ length: 4 }, (_, i) => ({
        questionText: `Question ${i}`,
        options: ["One", "Two", "Three", "Four"],
        correctIndex: 0,
      })),
      timeLimitMinutes: 10,
    });
    quizId = String(quiz._id);
    await QuizSubmission.create([
      {
        quizId,
        studentId,
        subjectId,
        studentName: "Alex Alpha",
        studentSurname: "Alpha",
        studentYearLevel: "2nd Year",
        studentSection: "Section A",
        score: 3,
        totalQuestions: 4,
        percentage: 75,
        passed: true,
        submittedAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        quizId,
        studentId,
        subjectId,
        studentName: "Alex Alpha",
        studentSurname: "Alpha",
        studentYearLevel: "2nd Year",
        studentSection: "Section A",
        score: 4,
        totalQuestions: 4,
        percentage: 100,
        passed: true,
        submittedAt: new Date("2026-10-02T10:00:00Z"),
      },
      {
        quizId,
        studentId: peerId,
        subjectId,
        studentName: "Zoe Zulu",
        studentSurname: "Zulu",
        studentYearLevel: "3rd Year",
        studentSection: "Section B",
        score: 2,
        totalQuestions: 4,
        percentage: 50,
        passed: false,
        submittedAt: new Date("2026-10-03T10:00:00Z"),
      },
      {
        quizId,
        studentId: peerId,
        subjectId: privateSubjectId,
        studentName: "Private Student",
        studentSurname: "Private",
        studentYearLevel: "4th Year",
        studentSection: "Section D",
        score: 4,
        totalQuestions: 4,
        percentage: 100,
        passed: true,
      },
    ]);
  });
  afterAll(disconnectDB);
  it("requires authentication for gradebooks and exports", async () => {
    expect((await request(app).get("/api/gradebook")).status).toBe(401);
    expect((await request(app).get("/api/gradebook/export/pdf")).status).toBe(
      401,
    );
  });
  it("returns only the student’s own attempts, including retake numbers", async () => {
    const res = await request(app)
      .get(`/api/gradebook?studentId=${peerId}&sort=date&direction=asc`)
      .set(auth(student));
    expect(res.status).toBe(200);
    expect(res.body.summary.attempts).toBe(2);
    expect(res.body.summary.students).toBe(1);
    expect(
      res.body.groups
        .flatMap((g: any) => g.rows)
        .map((r: any) => [r.studentId, r.attempt]),
    ).toEqual([
      [studentId, 1],
      [studentId, 2],
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(
      /correctIndex|passwordHash|"answers"/,
    );
  });
  it("limits faculty to their own subjects and keeps cohorts separate", async () => {
    const res = await request(app).get("/api/gradebook").set(auth(faculty));
    expect(res.body.groups.map((g: any) => g.key)).toEqual([
      "2nd Year - Section A",
      "3rd Year - Section B",
    ]);
    expect(res.body.summary.attempts).toBe(3);
    expect(res.body.summary.average).toBe(75);
    expect(res.body.summary.passRate).toBeCloseTo(66.6667);
    for (const group of res.body.groups)
      expect(
        group.rows.every(
          (r: any) => `${r.yearLevel} - ${r.section}` === group.key,
        ),
      ).toBe(true);
    expect(
      (
        await request(app)
          .get(`/api/gradebook?subjectId=${privateSubjectId}`)
          .set(auth(faculty))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`/api/gradebook/export/pdf?subjectId=${privateSubjectId}`)
          .set(auth(faculty))
      ).status,
    ).toBe(403);
    expect(
      (await request(app).get("/api/gradebook").set(auth(otherFaculty))).body
        .summary.attempts,
    ).toBe(1);
  });
  it("combines cohort, search, score, status filters and stable multi-column sorting", async () => {
    const res = await request(app)
      .get(
        "/api/gradebook?yearLevel=2nd%20Year&section=Section%20A&minScore=75&maxScore=100&status=passed&search=Alpha&sort=surname",
      )
      .set(auth(faculty));
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].rows.map((r: any) => r.percentage)).toEqual([
      100, 75,
    ]);
    const failed = await request(app)
      .get(
        "/api/gradebook?status=needs-review&search=Reporting%20assessment&sort=score&direction=asc",
      )
      .set(auth(faculty));
    expect(failed.body.summary.attempts).toBe(1);
    expect(failed.body.groups[0].rows[0].studentId).toBe(peerId);
    const idSearch = await request(app)
      .get(`/api/gradebook?search=${studentId}`)
      .set(auth(faculty));
    expect(idSearch.body.summary.attempts).toBe(2);
  });
  it.each([
    "minScore=-1",
    "maxScore=101",
    "minScore=90&maxScore=10",
    "sort=invalid",
    "direction=nope",
    "yearLevel=5th%20Year",
    "section=Section%20Z",
    "subjectId=bad",
    "search[x]=oops",
    "page=0",
  ])("rejects malformed report filters: %s", async (query) => {
    expect(
      (await request(app).get(`/api/gradebook?${query}`).set(auth(faculty)))
        .status,
    ).toBe(400);
  });
  const binary = (url: string, token: string) =>
    request(app)
      .get(url)
      .set(auth(token))
      .buffer(true)
      .parse((res, callback) => {
        const parts: Buffer[] = [];
        res.on("data", (part) => parts.push(Buffer.from(part)));
        res.on("end", () => callback(null, Buffer.concat(parts)));
      });
  it("exports a styled workbook with a summary and an isolated sheet for each cohort", async () => {
    const response = await binary("/api/gradebook/export/xlsx", faculty);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      "Summary",
      "2nd Year - Section A",
      "3rd Year - Section B",
    ]);
    expect(
      workbook.getWorksheet("2nd Year - Section A")!.getCell("B5").value,
    ).toBe("Alex Alpha");
    expect(
      workbook.getWorksheet("2nd Year - Section A")!.getCell("J5").numFmt,
    ).toBe("0.00%");
    expect(
      workbook.getWorksheet("3rd Year - Section B")!.getCell("B5").value,
    ).toBe("Zoe Zulu");
    expect(
      workbook.getWorksheet("3rd Year - Section B")!.getCell("K5").value,
    ).toBe("Needs review");
    expect(workbook.getWorksheet("3rd Year - Section B")!.views[0].state).toBe(
      "frozen",
    );
    await mkdir("../.analysis/reports", { recursive: true });
    await writeFile("../.analysis/reports/gradebook.xlsx", response.body);
  });
  it("exports the recorded faculty passing mark without relabeling historical results", async () => {
    const record = await QuizSubmission.findOne({ studentName: "Alex Alpha" });
    const previous = record!.passingPercentage;
    await QuizSubmission.updateOne(
      { _id: record!._id },
      { passingPercentage: 60 },
    );
    try {
      const xlsx = await binary("/api/gradebook/export/xlsx", faculty);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(xlsx.body);
      const sheet = workbook.getWorksheet("2nd Year - Section A")!;
      expect(sheet.getCell("O4").value).toBe("Passing %");
      expect([sheet.getCell("O5").value, sheet.getCell("O6").value]).toContain(
        0.6,
      );
      const pdf = await binary("/api/gradebook/export/pdf", faculty);
      const parser = new PDFParse({ data: new Uint8Array(pdf.body) });
      try {
        expect((await parser.getText()).text).toContain("Pass mark 60%");
      } finally {
        await parser.destroy();
      }
    } finally {
      await QuizSubmission.updateOne(
        { _id: record!._id },
        { passingPercentage: previous },
      );
    }
  });
  it("exports personal workbooks with no peer records and honors score filters", async () => {
    const response = await binary(
      "/api/gradebook/export/xlsx?minScore=90",
      student,
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      "Summary",
      "2nd Year - Section A",
    ]);
    expect(workbook.getWorksheet("2nd Year - Section A")!.rowCount).toBe(5);
    expect(
      workbook.getWorksheet("2nd Year - Section A")!.getCell("J5").value,
    ).toBe(1);
  });
  it("exports a formal, cohort-separated PDF with repeated branding and verification blocks", async () => {
    const response = await binary("/api/gradebook/export/pdf", faculty);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    const parser = new PDFParse({ data: new Uint8Array(response.body) });
    try {
      const result = await parser.getText();
      expect(result.pages.length).toBe(3);
      expect(result.text).toContain("Faculty verification signature");
      expect(result.text).toContain("REPORT101");
      expect(result.text).toContain("1st Semester");
      expect(result.pages[1].text).toContain("Alex Alpha");
      expect(result.pages[1].text).not.toContain("Zoe Zulu");
      expect(result.pages[2].text).toContain("Zoe Zulu");
      expect(result.pages[2].text).not.toContain("Alex Alpha");
      expect(result.text).not.toContain("Private Student");
      await writeFile("../.analysis/reports/gradebook.pdf", response.body);
    } finally {
      await parser.destroy();
    }
  });
  it("handles empty filters without inventing grades", async () => {
    const res = await request(app)
      .get("/api/gradebook?search=no-match-at-all")
      .set(auth(faculty));
    expect(res.body.groups).toEqual([]);
    expect(res.body.summary.average).toBe(0);
    expect(
      (
        await binary(
          "/api/gradebook/export/pdf?search=no-match-at-all",
          faculty,
        )
      ).status,
    ).toBe(200);
  });
  it("paginates long PDF tables without losing report rows or footer/signature sections", async () => {
    const extra = await QuizSubmission.create(
      Array.from({ length: 65 }, (_, i) => ({
        quizId,
        studentId,
        subjectId,
        studentName: `Long Report Student ${String(i).padStart(2, "0")}`,
        studentSurname: `Surname${String(i).padStart(2, "0")}`,
        studentYearLevel: "2nd Year",
        studentSection: "Section A",
        score: 3,
        totalQuestions: 4,
        percentage: 75,
        passed: true,
      })),
    );
    try {
      const first = await request(app).get("/api/gradebook").set(auth(faculty));
      const second = await request(app)
        .get("/api/gradebook?page=2")
        .set(auth(faculty));
      expect(first.body.groups[0].rows).toHaveLength(25);
      expect(second.body.groups[0].rows).toHaveLength(25);
      expect(
        first.body.groups[0].rows.some((r: any) =>
          second.body.groups[0].rows.some((s: any) => s.id === r.id),
        ),
      ).toBe(false);
      expect(first.body.summary.attempts).toBe(68);
      const res = await binary("/api/gradebook/export/pdf", faculty);
      const parser = new PDFParse({ data: new Uint8Array(res.body) });
      try {
        const result = await parser.getText();
        expect(result.pages.length).toBeGreaterThan(4);
        expect(result.text).toContain("Long Report Student 00");
        expect(result.text).toContain("Long Report Student 64");
        expect(result.pages.every((p) => p.text.includes("QUIKZ"))).toBe(true);
        await writeFile("../.analysis/reports/gradebook-long.pdf", res.body);
      } finally {
        await parser.destroy();
      }
    } finally {
      await QuizSubmission.deleteMany({
        _id: { $in: extra.map((r) => r._id) },
      });
    }
  });
});
