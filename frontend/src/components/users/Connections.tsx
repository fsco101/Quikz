import { FormEvent, useEffect, useState } from "react";
import { Check, Link2, Mail, Search, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { api } from "../../services/api.js";
import { Avatar } from "./Avatar.js";
import { PageHeading } from "../ui/PageHeading.js";

type Connection = {
  id: string; status: "pending" | "accepted"; incoming: boolean;
  person: { id: string; fullName: string; email: string; role: string; avatarUrl?: string; yearLevel?: string; section?: string };
};
type Result = { connections: Connection[]; page: number; pages: number; total: number };
type View = "accepted" | "incoming" | "outgoing";
export function Connections() {
  const { user } = useAuth();
  const faculty = user?.role === "faculty";
  const [view, setView] = useState<View>("accepted");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setResult(null); setError(""); setConfirm("");
    const timer = setTimeout(() => {
      api.request<Result>(`/connections?${new URLSearchParams({ view, search, page: String(page) })}`, { signal: controller.signal })
        .then(setResult)
        .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, search, page, revision]);
  const changeView = (next: View) => { setView(next); setPage(1); setSearch(""); setConfirm(""); };
  async function send(event: FormEvent) {
    event.preventDefault(); setBusy("send"); setError(""); setMessage("");
    try {
      const response = await api.request<{ message: string }>("/connections", { method: "POST", body: JSON.stringify({ email }) });
      setEmail(""); setMessage(response.message); changeView("outgoing"); setRevision((n) => n + 1);
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  }
  async function act(link: Connection, accept: boolean) {
    setBusy(link.id); setError(""); setMessage("");
    try {
      const response = await api.request<{ message: string }>(`/connections/${link.id}${accept ? "/accept" : ""}`, { method: accept ? "POST" : "DELETE" });
      setMessage(response.message); setConfirm(""); setPage(1); setRevision((n) => n + 1);
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  }
  return <div className="connections-page space-y-6">
    <PageHeading eyebrow="Learn together" title="Connections" description={faculty
      ? "Connect with your students by their registered email. Only accepted students appear in your roster and course reports."
      : "Connect with your professors to access private lessons. Accepting shares your profile and your results in their courses with that professor."} />
    <section className="ui-panel connection-invite" aria-labelledby="invite-heading">
      <div><span className="connection-icon"><Mail size={21} aria-hidden="true" /></span><h2 id="invite-heading">{faculty ? "Invite a student" : "Connect with a professor"}</h2>
        <p>Enter their Quikz account email. They must accept the request in Connections before access is granted.</p></div>
      <form onSubmit={send} className="connection-invite-form">
        <label htmlFor="connection-email">{faculty ? "Student email" : "Professor email"}</label>
        <div><input id="connection-email" type="email" autoComplete="off" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={faculty ? "student@school.edu" : "professor@school.edu"} />
          <button className="ui-button ui-button-primary" disabled={!!busy}><Link2 size={16} aria-hidden="true" />{busy === "send" ? "Sending…" : "Send request"}</button></div>
      </form>
    </section>
    {message && <p role="status" className="connection-message">{message}</p>}
    {error && <div role="alert" className="connection-error">{error} <button onClick={() => setRevision((n) => n + 1)} className="underline">Refresh connections</button></div>}
    <section className="space-y-4" aria-label="Connection roster">
      <div className="connection-toolbar">
        <div className="connection-tabs" role="group" aria-label="Connection views">
          {([["accepted", faculty ? "My students" : "My professors"], ["incoming", "Incoming requests"], ["outgoing", "Sent requests"]] as [View, string][]).map(([key, label]) =>
            <button key={key} aria-pressed={view === key} onClick={() => changeView(key)}>{label}</button>)}
        </div>
        <label className="connection-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search connections</span><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email" maxLength={120} /></label>
      </div>
      {loading ? <p role="status">Loading connections…</p> : result && <>
        <p className="text-sm text-slate-500">{result.total} {view === "accepted" ? "connected" : "pending"} {view === "accepted" ? faculty ? result.total === 1 ? "student" : "students" : result.total === 1 ? "professor" : "professors" : result.total === 1 ? "request" : "requests"}</p>
        <div className="connection-grid">
          {result.connections.map((link) => <article key={link.id} className="ui-panel connection-card" aria-label={`${link.person.fullName} connection`}>
            <div className="connection-person"><Avatar userId={link.person.id} name={link.person.fullName} url={link.person.avatarUrl} size="h-12 w-12" /><div><h2>{link.person.fullName}</h2><p>{link.person.email}</p></div></div>
            <div className="connection-details"><span className={`connection-badge ${link.status === "accepted" ? "is-connected" : ""}`}>{link.status === "accepted" ? "Connected" : link.incoming ? "Awaiting your acceptance" : "Awaiting acceptance"}</span>
              {link.person.yearLevel && <p>{link.person.yearLevel} · {link.person.section}</p>}</div>
            {confirm === link.id ? <div className="connection-confirm"><p>Disconnect from {link.person.fullName}? Private lessons and faculty report access will end. Saved results stay with the student.</p><div><button className="ui-button connection-danger" disabled={!!busy} onClick={() => act(link, false)}>Confirm disconnect</button><button className="ui-button ui-button-secondary" disabled={!!busy} onClick={() => setConfirm("")}>Keep connection</button></div></div>
              : <div className="connection-actions">{link.status === "pending" && link.incoming && <button className="ui-button ui-button-primary" disabled={!!busy} onClick={() => act(link, true)}><Check size={16} aria-hidden="true" />Accept request</button>}
                <button className="ui-button ui-button-secondary" disabled={!!busy} onClick={() => link.status === "accepted" ? setConfirm(link.id) : act(link, false)}><X size={15} aria-hidden="true" />{link.status === "accepted" ? "Disconnect" : link.incoming ? "Decline" : "Cancel request"}</button></div>}
          </article>)}
        </div>
        {!result.total && <div className="connection-empty ui-panel"><Users size={28} aria-hidden="true" /><h2>{search ? "No matching connections" : view === "accepted" ? "Your connections start here" : "No pending requests"}</h2><p>{search ? "Try another name or email." : view === "accepted" ? "Send a request using the email above, or check Incoming requests. Accepting connects the student and professor; it does not connect them to other accounts." : "Requests appear here when you or the other person sends one."}</p></div>}
        <nav className="pagination-row" aria-label="Connection pages"><button className="ui-button ui-button-secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous page</button><span>Page {page} of {result.pages}</span><button className="ui-button ui-button-secondary" disabled={page >= result.pages} onClick={() => setPage((n) => n + 1)}>Next page</button></nav>
      </>}
    </section>
  </div>;
}
