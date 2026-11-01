import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Module } from "../models/Module.js";
import { Quiz } from "../models/Quiz.js";
import { EditorDraft } from "../models/EditorDraft.js";

describe("Private persistent editor drafts", () => {
  let tokens: Record<string, string>, subject: any, module: any, scope: string, hash: string;
  const auth = (name = "faculty") => ({ Authorization: `Bearer ${tokens[name]}` });
  const data = { title: "", summary: "", contentType: "text", textContent: "Private incomplete notes", audience: "connected", removeFile: false, attachmentName: "" };
  const put = (version: number, patch = {}, target = scope) => request(app).put(`/api/drafts/${encodeURIComponent(target)}`).set(auth()).send({ version, revision: "0", data: { ...data, ...patch } });
  beforeAll(async () => { await connectDB(); await EditorDraft.init(); hash = await bcrypt.hash("Draft123!", 10); });
  afterAll(disconnectDB);
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Subject.deleteMany({}), Module.deleteMany({}), Quiz.deleteMany({}), EditorDraft.deleteMany({})]);
    tokens = {};
    let owner: any;
    for (const role of ["faculty", "other", "student", "admin"]) {
      const user = await User.create({ username: `draft_${role}`, email: `${role}@draft.test`, fullName: "Draft User", surname: "User", role: role === "other" ? "faculty" : role, passwordHash: hash, termsAccepted: true });
      if (role === "faculty") owner = user;
      tokens[role] = (await request(app).post("/api/auth/login").send({ loginIdentifier: user.email, password: "Draft123!" })).body.token;
    }
    subject = await Subject.create({ name: "Draft course", code: "DRAFT", term: "1st Semester", yearLevel: "1st Year", facultyId: owner._id, facultyName: owner.fullName });
    module = await Module.create({ title: "Published title", summary: "Published summary", contentType: "text", subjectId: subject._id, createdBy: owner._id, orderIndex: 1 });
    scope = `module:${subject._id}:${module._id}`;
  });
  it("requires authentication and current ownership for reading, saving and deleting", async () => {
    const endpoint = `/api/drafts/${scope}`;
    expect((await request(app).get(endpoint)).status).toBe(401);
    for (const role of ["student", "other", "admin"]) {
      expect((await request(app).get(endpoint).set(auth(role))).status).toBe(403);
      expect((await request(app).put(endpoint).set(auth(role)).send({ version: 0, revision: "0", data })).status).toBe(403);
      expect((await request(app).delete(endpoint).set(auth(role)).send({ version: 0 })).status).toBe(403);
    }
  });
  it("persists incomplete drafts separately from published curriculum and never caches private data", async () => {
    expect((await request(app).get(`/api/drafts/${scope}`).set(auth())).body).toEqual({ version: 0, draft: null });
    const saved = await put(0);
    expect(saved.status).toBe(200);
    const retrieved = await request(app).get(`/api/drafts/${scope}`).set(auth());
    expect(retrieved.body).toMatchObject({ version: 1, draft: { format: 1, revision: "0", data } });
    expect(retrieved.headers["cache-control"]).toBe("no-store");
    expect((await Module.findById(module._id))?.title).toBe("Published title");
    expect(await EditorDraft.countDocuments()).toBe(1);
  });
  it("allows one concurrent save and rejects stale-device overwrites", async () => {
    expect((await put(0)).status).toBe(200);
    const responses = await Promise.all([put(1, { title: "Device A" }), put(1, { title: "Device B" })]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await put(0, { title: "Old offline copy" })).status).toBe(409);
    expect((await request(app).get(`/api/drafts/${scope}`).set(auth())).body.version).toBe(2);
  });
  it("keeps deletion versions so delayed saves cannot resurrect discarded drafts", async () => {
    await put(0);
    const cleared = await request(app).delete(`/api/drafts/${scope}`).set(auth()).send({ version: 1 });
    expect(cleared.body).toEqual({ version: 2, draft: null });
    expect((await put(1)).status).toBe(409);
    expect((await request(app).delete(`/api/drafts/${scope}`).set(auth()).send({ version: 1 })).status).toBe(409);
    expect((await put(2)).body.version).toBe(3);
  });
  it("bounds draft payloads and validates scope and structure", async () => {
    expect((await put(0, { textContent: "x".repeat(1024 * 1024) })).status).toBe(400);
    expect((await put(0, { password: "never store credentials" })).status).toBe(400);
    expect((await put(0, { contentType: "executable" })).status).toBe(400);
    expect((await request(app).put(`/api/drafts/${scope}`).set(auth()).send({ version: -1, revision: "0", data })).status).toBe(400);
    expect((await request(app).get("/api/drafts/invalid").set(auth())).status).toBe(400);
    expect((await request(app).get(`/api/drafts/module:${subject._id}:bad`).set(auth())).status).toBe(400);
  });
  it("stores quiz drafts without publishing questions or binding a quiz", async () => {
    const quizScope = `quiz:${module._id}`;
    const draft = { title: "", duration: 0, timeUnit: "seconds", passingPercentage: 75, questionCount: 1, questions: [{ questionText: "", options: ["", "", "", ""], correctIndex: 0 }], mode: "manual", content: "", draftLimit: 20, questionStyle: "mixed", lectureSource: "other", legacyTotal: false, attachmentName: "" };
    const saved = await request(app).put(`/api/drafts/${quizScope}`).set(auth()).send({ version: 0, revision: "0:new:new", data: draft });
    expect(saved.status).toBe(200);
    expect(await Quiz.countDocuments()).toBe(0);
    expect((await Module.findById(module._id))?.quizId).toBeUndefined();
    expect((await request(app).get(`/api/drafts/${quizScope}`).set(auth("other"))).status).toBe(403);
  });
});
