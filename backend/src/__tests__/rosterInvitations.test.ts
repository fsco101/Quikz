import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../server.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { FacultyConnection } from "../models/FacultyConnection.js";
import { AuditEvent } from "../models/AuditEvent.js";
import { MAX_ROSTER_BYTES, parseRoster } from "../services/rosterInvitations.js";

describe("CSV roster invitations", () => {
  const users: Record<string, any> = {}, tokens: Record<string, string> = {};
  const auth = (name = "faculty") => ({ Authorization: `Bearer ${tokens[name]}` });
  const csv = "email,name\na@roster.edu,Student A\nb@roster.edu,Student B\n";
  const upload = (action: "preview" | "send", content: string | Buffer = csv, name = "faculty") => {
    const call = request(app).post(`/api/connections/roster/${action}`).set(auth(name));
    if (action === "send") call.field("confirm", "true");
    return call.attach("file", Buffer.isBuffer(content) ? content : Buffer.from(content), "class.csv");
  };
  beforeAll(async () => {
    await connectDB();
    await Promise.all([User.init(), FacultyConnection.init(), AuditEvent.init()]);
    const hash = await bcrypt.hash("Password123!", 10);
    for (const name of ["faculty", "otherFaculty", "admin", "a", "b", "connected", "outgoing", "incoming", "disabled"]) {
      users[name] = await User.create({ username: `roster_${name}`, email: `${name.toLowerCase()}@roster.edu`, passwordHash: hash, role: name === "otherFaculty" ? "faculty" : ["faculty", "admin"].includes(name) ? name : "student", fullName: `Database private ${name}`, surname: name, termsAccepted: true });
      if (["faculty", "otherFaculty", "admin", "a"].includes(name)) {
        const res = await request(app).post("/api/auth/login").send({ loginIdentifier: users[name].email, password: "Password123!" });
        expect(res.status).toBe(200); tokens[name] = res.body.token;
      }
    }
  });
  beforeEach(async () => {
    await FacultyConnection.deleteMany({});
    await User.updateOne({ _id: users.b._id }, { active: true });
    await User.updateOne({ _id: users.disabled._id }, { active: false });
  });
  afterAll(disconnectDB);
  it("accepts BOMs, CRLF, quoted commas, optional names and case-normalized emails", () => {
    const rows = parseRoster(Buffer.from('\uFEFF Email , Name\r\n A@ROSTER.EDU ,"García, Ana"\r\n\r\nb@roster.edu,Beta\r\n'));
    expect(rows.map((r) => [r.email, r.name, r.status])).toEqual([["a@roster.edu", "García, Ana", "ready"], ["b@roster.edu", "Beta", "ready"]]);
    expect(parseRoster(Buffer.from("email\na@roster.edu\n"))[0].name).toBe("");
  });
  it("rejects malformed encodings, headers, syntax, empty data and oversized rosters", () => {
    for (const input of ["", "email\n", "name\nStudent\n", "email,email\na@roster.edu,b@roster.edu", 'email,name\na@roster.edu,"unterminated', "email,role\na@roster.edu,student"]) {
      expect(() => parseRoster(Buffer.from(input))).toThrow();
    }
    expect(() => parseRoster(Buffer.from([0xff, 0xfe, 0x61]))).toThrow(/UTF-8/);
    expect(() => parseRoster(Buffer.alloc(MAX_ROSTER_BYTES + 1, 65))).toThrow(/256 KB/);
    expect(() => parseRoster(Buffer.from(`email\n${Array.from({ length: 501 }, (_, i) => `student${i}@roster.edu`).join("\n")}`))).toThrow(/500/);
    expect(parseRoster(Buffer.from(`email\n${Array.from({ length: 500 }, (_, i) => `student${i}@roster.edu`).join("\n")}`))).toHaveLength(500);
  });
  it("reports invalid/duplicate records without discarding later valid rows", () => {
    const rows = parseRoster(Buffer.from(`email,name\na@roster.edu,${"x".repeat(121)}\na@roster.edu,Valid\nA@ROSTER.EDU,Duplicate\nwrong,Invalid\nb@roster.edu,Beta,Extra\n`));
    expect(rows.map((r) => r.status)).toEqual(["invalid", "ready", "duplicate", "invalid", "invalid"]);
    expect(rows.map((r) => r.row)).toEqual([2, 3, 4, 5, 6]);
  });
  it.each(["preview", "send"] as const)("restricts %s to authenticated faculty before accepting uploads", async (action) => {
    expect((await request(app).post(`/api/connections/roster/${action}`)).status).toBe(401);
    for (const name of ["a", "admin"]) expect((await upload(action, csv, name)).status).toBe(403);
    expect(await FacultyConnection.countDocuments()).toBe(0);
  });
  it("validates the upload, confirmation and file size", async () => {
    expect((await request(app).post("/api/connections/roster/preview").set(auth()).send({ csv })).status).toBe(400);
    expect((await request(app).post("/api/connections/roster/preview").set(auth()).attach("file", Buffer.from(csv), "class.xlsx")).status).toBe(400);
    expect((await request(app).post("/api/connections/roster/send").set(auth()).attach("file", Buffer.from(csv), "class.csv")).status).toBe(400);
    expect((await upload("preview", Buffer.alloc(MAX_ROSTER_BYTES + 1, 65))).status).toBe(400);
    expect(await FacultyConnection.countDocuments()).toBe(0);
  });
  it("previews mixed rows without writing connections or revealing database profiles", async () => {
    await FacultyConnection.create([
      { facultyId: users.faculty._id, studentId: users.connected._id, requestedBy: users.faculty._id, status: "accepted" },
      { facultyId: users.faculty._id, studentId: users.outgoing._id, requestedBy: users.faculty._id },
      { facultyId: users.faculty._id, studentId: users.incoming._id, requestedBy: users.incoming._id },
    ]);
    const mixed = `${csv}A@ROSTER.EDU,Repeated\nnot-email,Wrong\nmissing@roster.edu,Missing\nfaculty@roster.edu,Faculty\ndisabled@roster.edu,Disabled\nconnected@roster.edu,Connected\noutgoing@roster.edu,Outgoing\nincoming@roster.edu,Incoming`;
    const response = await upload("preview", mixed);
    expect(response.status).toBe(200); expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.summary).toEqual({ total: 10, ready: 2, sent: 0, skipped: 8, failed: 0 });
    expect(response.body.rows.map((r: any) => r.status)).toEqual(["ready", "ready", "duplicate", "invalid", "unavailable", "unavailable", "unavailable", "connected", "pending-outgoing", "pending-incoming"]);
    expect(await FacultyConnection.countDocuments()).toBe(3);
    expect(JSON.stringify(response.body)).not.toMatch(/Database private|passwordHash|authVersion|studentId|facultyId/);
  });
  it("sends only eligible requests bound to the professor and keeps students pending", async () => {
    await FacultyConnection.create({ facultyId: users.otherFaculty._id, studentId: users.a._id, requestedBy: users.a._id, status: "accepted" });
    const response = await upload("send", `${csv}a@roster.edu,Again\nwrong,Invalid\nmissing@roster.edu,Missing`);
    expect(response.status).toBe(200); expect(response.body.summary).toEqual({ total: 5, ready: 0, sent: 2, skipped: 3, failed: 0 });
    const links = await FacultyConnection.find({ facultyId: users.faculty._id });
    expect(links).toHaveLength(2);
    expect(links.every((l) => l.status === "pending" && String(l.requestedBy) === String(users.faculty._id))).toBe(true);
    expect((await request(app).get("/api/connections?view=incoming").set(auth("a"))).body.total).toBe(1);
    expect((await request(app).get("/api/connections").set(auth())).body.total).toBe(0);
    const repeated = await upload("send");
    expect(repeated.body.summary.sent).toBe(0); expect(repeated.body.summary.skipped).toBe(2);
    expect(await FacultyConnection.countDocuments({ facultyId: users.faculty._id })).toBe(2);
  });
  it("revalidates accounts and incoming requests between preview and send", async () => {
    expect((await upload("preview")).body.summary.ready).toBe(2);
    await FacultyConnection.create({ facultyId: users.faculty._id, studentId: users.a._id, requestedBy: users.a._id });
    await User.updateOne({ _id: users.b._id }, { active: false });
    const sent = await upload("send");
    expect(sent.body.summary.sent).toBe(0);
    expect(sent.body.rows.map((r: any) => r.status)).toEqual(["pending-incoming", "unavailable"]);
    const link = await FacultyConnection.findOne({ facultyId: users.faculty._id, studentId: users.a._id });
    expect(link!.status).toBe("pending"); expect(String(link!.requestedBy)).toBe(String(users.a._id));
  });
  it("handles concurrent submissions without duplicate connections or auto-acceptance", async () => {
    const responses = await Promise.all([upload("send"), upload("send")]);
    expect(responses.every((r) => r.status === 200 && r.body.summary.failed === 0)).toBe(true);
    expect(responses.reduce((count, r) => count + r.body.summary.sent, 0)).toBe(2);
    const links = await FacultyConnection.find({ facultyId: users.faculty._id });
    expect(links).toHaveLength(2); expect(links.every((link) => link.status === "pending")).toBe(true);
  });
  it("reports partial write failures and safely retries only remaining invitations", async () => {
    const spy = vi.spyOn(FacultyConnection, "updateOne");
    spy.mockImplementationOnce((() => Promise.reject(new Error("temporary write failure"))) as any);
    try {
      const sent = await upload("send");
      expect(sent.status).toBe(200); expect(sent.body.summary.sent).toBe(1); expect(sent.body.summary.failed).toBe(1);
      expect(sent.body.rows.map((r: any) => r.status)).toEqual(["failed", "sent"]);
    } finally { spy.mockRestore(); }
    const retry = await upload("send");
    expect(retry.body.summary).toEqual({ total: 2, ready: 0, sent: 1, skipped: 1, failed: 0 });
    expect(await FacultyConnection.countDocuments({ facultyId: users.faculty._id })).toBe(2);
  });
  it("audits only counts without roster emails, names or file content", async () => {
    const before = await AuditEvent.countDocuments({ action: "connection.roster_invited" });
    await upload("send");
    await vi.waitFor(async () => expect(await AuditEvent.countDocuments({ action: "connection.roster_invited" })).toBe(before + 1));
    const event = await AuditEvent.findOne({ action: "connection.roster_invited" }).sort({ createdAt: -1 });
    expect(event!.details).toEqual({ total: 2, sent: 2, skipped: 0, failed: 0 });
    expect(JSON.stringify(event)).not.toContain("@roster.edu"); expect(JSON.stringify(event)).not.toContain("Student A");
  });
});
