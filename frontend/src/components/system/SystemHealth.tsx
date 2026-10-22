import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
type Health = {
  status: string;
  mode: string;
  persistent: boolean;
  pingMs: number | null;
  writeReadVerified: boolean;
  syncCheckMs?: number;
  checkedAt: string;
  checkedOut: number;
  observedConnectionsOpened: number;
  observedConnectionsClosed: number;
  checkoutFailures: number;
  poolClears: number;
  topologyChanges: number;
  lastTopologyChange: string | null;
  auditFailures: number;
};
type Audit = {
  scope: string;
  total: number;
  pages: number;
  events: {
    _id: string;
    action: string;
    actorRole?: string;
    resourceId?: string;
    outcome: string;
    statusCode: number;
    durationMs: number;
    createdAt: string;
  }[];
  stats: { _id: string; count: number; failures: number; averageMs: number }[];
};
export function SystemHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const [h, a] = await Promise.all([
          api.request<Health>("/system/health", { signal: controller.signal }),
          api.request<Audit>(
            `/system/audit?${new URLSearchParams({ page: String(page), action, outcome })}`,
            { signal: controller.signal },
          ),
        ]);
        setHealth(h);
        setAudit(a);
        setError("");
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err.message);
          setHealth(null);
        }
      } finally {
        running = false;
      }
    };
    void refresh();
    const interval = setInterval(refresh, 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [page, action, outcome]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">
          Operations
        </p>
        <h1 className="text-3xl font-black text-[#070235]">
          System health & audit
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Refreshes every 15 seconds. Audit records cover your account and
          subjects you own; health metrics describe this server's database
          connection.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {health && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Database", health.status.toUpperCase()],
              [
                "Storage",
                health.persistent
                  ? "Persistent MongoDB"
                  : "Temporary local MongoDB",
              ],
              [
                "Ping",
                health.pingMs === null ? "Unavailable" : `${health.pingMs} ms`,
              ],
              [
                "Write/read check",
                health.writeReadVerified ? "Verified" : "Failed",
              ],
            ].map(([label, value]) => (
              <section key={label} className="rounded-2xl border bg-white p-5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-bold text-[#070235]">{value}</p>
              </section>
            ))}
          </div>
          {!health.persistent && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This server is using temporary local storage. Configure
              MONGODB_URI for persistent MongoDB / Atlas storage.
            </p>
          )}
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold mb-4">Driver connection monitoring</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ["Checked out", health.checkedOut],
                [
                  "Connections opened (observed)",
                  health.observedConnectionsOpened,
                ],
                [
                  "Connections closed (observed)",
                  health.observedConnectionsClosed,
                ],
                ["Checkout failures", health.checkoutFailures],
                ["Pool clears", health.poolClears],
                ["Topology changes", health.topologyChanges],
                ["Audit write failures", health.auditFailures],
                ["Write/read latency", `${health.syncCheckMs ?? "—"} ms`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 font-bold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-slate-500">
              Connection counters track events observed since this server
              connected. Last topology change:{" "}
              {health.lastTopologyChange
                ? new Date(health.lastTopologyChange).toLocaleString()
                : "None observed"}
              . Checked {new Date(health.checkedAt).toLocaleTimeString()}.
            </p>
          </section>
        </>
      )}
      {audit && (
        <>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold mb-3">Recorded activity & latency</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {audit.stats.map((stat) => (
                <div
                  key={stat._id}
                  className="rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <strong>{stat._id}</strong>
                  <p className="mt-1">
                    {stat.count} events · {stat.failures} failures · Average{" "}
                    {stat.averageMs.toFixed(2)} ms
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-white overflow-hidden">
            <header className="p-5 flex flex-wrap gap-4 items-center justify-between">
              <h2 className="font-bold">
                Persistent audit trail{" "}
                <span className="text-xs text-slate-500">({audit.total})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Audit action"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All actions</option>
                  {audit.stats.map((s) => (
                    <option key={s._id}>{s._id}</option>
                  ))}
                </select>
                <select
                  aria-label="Audit outcome"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={outcome}
                  onChange={(e) => {
                    setOutcome(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All outcomes</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                </select>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Event",
                      "Actor role",
                      "Outcome",
                      "HTTP",
                      "Duration",
                      "Date",
                    ].map((h) => (
                      <th className="p-4" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.events.map((event) => (
                    <tr key={event._id} className="border-t">
                      <td className="p-4">
                        <strong className="text-xs">{event.action}</strong>
                        <p className="text-[10px] text-slate-400 break-all">
                          {event.resourceId}
                        </p>
                      </td>
                      <td className="p-4">{event.actorRole || "Guest"}</td>
                      <td
                        className={`p-4 font-semibold ${event.outcome === "success" ? "text-emerald-700" : "text-amber-800"}`}
                      >
                        {event.outcome}
                      </td>
                      <td className="p-4">{event.statusCode}</td>
                      <td className="p-4 whitespace-nowrap">
                        {event.durationMs} ms
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!audit.events.length && (
                <p className="p-8 text-center text-slate-500">
                  No matching audit events.
                </p>
              )}
            </div>
          </section>
          <nav
            aria-label="Audit pages"
            className="flex gap-4 items-center text-sm"
          >
            <button
              className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous events
            </button>
            <span>
              Page {page} of {Math.max(1, audit.pages)}
            </span>
            <button
              className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
              disabled={page >= audit.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next events
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
