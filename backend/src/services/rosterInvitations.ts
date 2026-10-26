import { parse } from "csv-parse/sync";
import { FacultyConnection } from "../models/FacultyConnection.js";
import { User } from "../models/User.js";
import { InputError } from "./questionBank.js";

export const MAX_ROSTER_BYTES = 256 * 1024;
export const MAX_ROSTER_ROWS = 500;
type Status = "ready" | "invalid" | "duplicate" | "unavailable" | "connected" | "pending-incoming" | "pending-outgoing" | "sent" | "failed";
type Row = { row: number; email: string; name: string; status: Status; message: string; studentId?: string };

export function parseRoster(buffer: Buffer): Row[] {
  if (!buffer.length || buffer.length > MAX_ROSTER_BYTES)
    throw new InputError("Choose a UTF-8 CSV file up to 256 KB.");
  let records: string[][];
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    records = parse(text, { bom: true, trim: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 8192 });
  } catch {
    throw new InputError("Unable to read the CSV. Save it as UTF-8 CSV and check quoted fields.");
  }
  const headers = records.shift()?.map((value) => value.trim().toLowerCase()) || [];
  if (!headers.includes("email") || new Set(headers).size !== headers.length || headers.some((h) => !["email", "name"].includes(h)))
    throw new InputError("The header must contain email and may include name. Download the roster template.");
  if (!records.length || records.length > MAX_ROSTER_ROWS)
    throw new InputError("Provide between 1 and 500 student rows per CSV.");
  const seen = new Set<string>();
  return records.map((record, index) => {
    const email = (record[headers.indexOf("email")] || "").trim().toLowerCase();
    const name = (record[headers.indexOf("name")] || "").trim();
    const row: Row = { row: index + 2, email: email.slice(0, 254), name: name.slice(0, 120), status: "ready", message: "Ready to invite. The student must accept." };
    if (record.length !== headers.length || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || name.length > 120) {
      row.status = "invalid"; row.message = "Check the email, column count, and name length (up to 120 characters).";
    } else if (seen.has(email)) {
      row.status = "duplicate"; row.message = "Duplicate email in this file; only the first row is considered.";
    }
    if (row.status !== "invalid") seen.add(email);
    return row;
  });
}

function existing(row: Row, link: { status: string; requestedBy: unknown }, facultyId: string) {
  if (link.status === "accepted") {
    row.status = "connected"; row.message = "Already connected. No invitation needed.";
  } else if (String(link.requestedBy) === facultyId) {
    row.status = "pending-outgoing"; row.message = "Invitation already sent. Waiting for the student to accept.";
  } else {
    row.status = "pending-incoming"; row.message = "The student already requested a connection. Review Incoming requests.";
  }
}

async function assessRoster(buffer: Buffer, facultyId: string) {
  const rows = parseRoster(buffer);
  const students = await User.find({ email: { $in: rows.filter((r) => r.status === "ready").map((r) => r.email) }, role: "student", active: { $ne: false } }).select("_id email").lean();
  const byEmail = new Map(students.map((s) => [s.email, String(s._id)]));
  const links = await FacultyConnection.find({ facultyId, studentId: { $in: students.map((s) => s._id) } }).select("studentId status requestedBy").lean();
  const byStudent = new Map(links.map((link) => [String(link.studentId), link]));
  for (const row of rows) {
    if (row.status !== "ready") continue;
    row.studentId = byEmail.get(row.email);
    if (!row.studentId) {
      row.status = "unavailable"; row.message = "No eligible registered student account. Ask the student to register or check the email.";
    } else {
      const link = byStudent.get(row.studentId);
      if (link) existing(row, link, facultyId);
    }
  }
  return rows;
}

function result(rows: Row[], phase: "preview" | "sent") {
  const count = (status: Status) => rows.filter((r) => r.status === status).length;
  return { phase, summary: { total: rows.length, ready: count("ready"), sent: count("sent"), failed: count("failed"), skipped: rows.filter((r) => !["ready", "sent", "failed"].includes(r.status)).length },
    // Account IDs and names from the user database are never part of the import
    // response. Names below come only from the professor's uploaded CSV.
    rows: rows.map(({ studentId, ...row }) => row) };
}

export async function previewRoster(buffer: Buffer, facultyId: string) {
  return result(await assessRoster(buffer, facultyId), "preview");
}

export async function sendRoster(buffer: Buffer, facultyId: string) {
  // Reparse the original file and recheck current accounts/relationships;
  // client-supplied preview statuses and student IDs are never trusted.
  const rows = await assessRoster(buffer, facultyId);
  const ready = rows.filter((r) => r.status === "ready");
  for (let offset = 0; offset < ready.length; offset += 20) {
    await Promise.all(ready.slice(offset, offset + 20).map(async (row) => {
      try {
        const write = await FacultyConnection.updateOne({ facultyId, studentId: row.studentId },
          { $setOnInsert: { requestedBy: facultyId, status: "pending" } }, { upsert: true, runValidators: true });
        if (write.upsertedCount) {
          row.status = "sent"; row.message = "Invitation sent in Quikz. Waiting for the student to accept."; return;
        }
      } catch (err: any) {
        if (err.code !== 11000) {
          row.status = "failed"; row.message = "Could not confirm this invitation. Preview the file again to safely retry."; return;
        }
        // A concurrent upload or individual invitation won the unique pair.
      }
      try {
        const link = await FacultyConnection.findOne({ facultyId, studentId: row.studentId }).select("status requestedBy").lean();
        if (link) { existing(row, link, facultyId); return; }
      } catch { /* Report an uncertain row without losing other row outcomes. */ }
      row.status = "failed"; row.message = "Connection changed during import. Preview the file again to safely retry.";
    }));
  }
  return result(rows, "sent");
}
