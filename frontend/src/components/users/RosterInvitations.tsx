import { ChangeEvent, useState } from "react";
import { Download, FileUp, Send } from "lucide-react";
import { api } from "../../services/api.js";

type Row = { row: number; email: string; name: string; status: string; message: string };
type Result = { phase: "preview" | "sent"; summary: { total: number; ready: number; sent: number; skipped: number; failed: number }; rows: Row[] };
const labels: Record<string, string> = {
  ready: "Ready to invite", invalid: "Invalid row", duplicate: "Duplicate email", unavailable: "Account unavailable",
  connected: "Already connected", "pending-incoming": "Incoming request", "pending-outgoing": "Invitation pending", sent: "Invitation sent", failed: "Retry needed",
};
// Quote every cell and neutralize spreadsheet formulas in uploaded fields.
const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
export function RosterInvitations({ onImported }: { onImported: (sent: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | "">("");
  const [error, setError] = useState("");
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    setResult(null); setError(""); setFile(null);
    if (next && (!/\.csv$/i.test(next.name) || next.size > 256 * 1024 || !next.size)) {
      setError("Choose a nonempty UTF-8 .csv file up to 256 KB."); return;
    }
    setFile(next);
  }
  async function upload(action: "preview" | "send") {
    if (!file || busy) return;
    setBusy(action); setError("");
    if (action === "preview") setResult(null);
    try {
      const body = new FormData(); body.append("file", file);
      if (action === "send") body.append("confirm", "true");
      const response = await api.request<Result>(`/connections/roster/${action}`, { method: "POST", body });
      setResult(response);
      if (action === "send") onImported(response.summary.sent);
    } catch (err: any) {
      setError(`${err.message || "Unable to process this roster."}${action === "send" ? " Preview again before retrying; existing invitations will be skipped." : ""}`);
    } finally { setBusy(""); }
  }
  function download() {
    if (!result) return;
    const content = [["row", "email", "name", "status", "message"], ...result.rows.map((r) => [r.row, r.email, r.name, labels[r.status] || r.status, r.message])]
      .map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `quikz-roster-${result.phase}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return <details className="ui-panel roster-import">
    <summary><FileUp size={20} aria-hidden="true" /><span>Invite a class from CSV</span><span className="roster-limit">Up to 500 students</span></summary>
    <div className="roster-import-body space-y-5">
      <p className="roster-help">Use an <strong>email</strong> column and an optional <strong>name</strong> column. Replace the template examples with registered student emails. Names help you review the file and do not change student profiles.</p>
      <div className="roster-file-controls">
        <label>Class roster CSV<input type="file" accept=".csv,text/csv" disabled={!!busy} onChange={choose} /></label>
        <a className="ui-button ui-button-secondary" href="/student-roster-template.csv" download><Download size={16} aria-hidden="true" />Download CSV template</a>
        <button className="ui-button ui-button-primary" disabled={!file || !!busy} onClick={() => upload("preview")}>{busy === "preview" ? "Checking roster…" : result ? "Preview again" : "Preview roster"}</button>
      </div>
      <p className="roster-help">UTF-8 CSV, up to 256 KB and 500 student rows. Existing connections, pending requests and duplicate emails are skipped. Invitations appear inside Quikz. Each student must accept before private lessons or faculty reports become available.</p>
      {error && <p role="alert" className="connection-error">{error}</p>}
      {busy && <p role="status">{busy === "send" ? "Sending invitations. Keep this page open for the results…" : "Validating rows and checking existing connections…"}</p>}
      {result && <section aria-label={result.phase === "preview" ? "Roster preview" : "Roster invitation results"} className="space-y-4">
        <div className="roster-metrics">
          {[["Total rows", result.summary.total], [result.phase === "preview" ? "Ready to invite" : "Invitations sent", result.phase === "preview" ? result.summary.ready : result.summary.sent], ["Skipped", result.summary.skipped], ["Retry needed", result.summary.failed]].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
        </div>
        <p role="status" className="roster-help">{result.phase === "preview" ? result.summary.ready ? "Preview only. No invitations have been sent. Check the rows below, then send invitations to eligible students." : "No eligible students to invite. Review the row details, correct the file or check Incoming requests." : `${result.summary.sent} invitation${result.summary.sent === 1 ? "" : "s"} sent. ${result.summary.skipped} rows skipped. ${result.summary.failed ? "Some rows need a retry. Preview again to check their current status." : "Students must still accept their requests."}`}</p>
        <p className="roster-scroll-hint">Scroll inside the table to review status and details for each row.</p>
        <div className="roster-table-wrapper" role="region" aria-label="Roster row details" tabIndex={0}>
          <table className="roster-table"><caption>{result.phase === "preview" ? "Roster validation preview" : "Roster invitation results"}</caption>
            <thead><tr>{["CSV row", "Email", "Name from CSV", "Status", "Details"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{result.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.email || "—"}</td><td>{row.name || "—"}</td><td><span className={`roster-status ${["ready", "sent"].includes(row.status) ? "is-ready" : row.status === "failed" || row.status === "invalid" ? "is-error" : ""}`}>{labels[row.status] || row.status}</span></td><td>{row.message}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="roster-actions">
          {result.phase === "preview" && <button className="ui-button ui-button-primary" disabled={!result.summary.ready || !!busy} onClick={() => upload("send")}><Send size={16} aria-hidden="true" />{busy === "send" ? "Sending…" : `Send ${result.summary.ready} invitation${result.summary.ready === 1 ? "" : "s"}`}</button>}
          <button className="ui-button ui-button-secondary" disabled={!!busy} onClick={download}><Download size={16} aria-hidden="true" />Download row report</button>
        </div>
      </section>}
    </div>
  </details>;
}
