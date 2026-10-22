import { Avatar } from "../users/Avatar.js";
import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.js";

type Row = {
  id: string;
  studentId: string;
  studentName: string;
  surname: string;
  subjectCode: string;
  term: string;
  quizTitle: string;
  attempt: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  submittedAt: string;
  blurCount: number;
  timeSpentSeconds: number;
};
type Metrics = {
  attempts: number;
  students: number;
  average: number;
  passRate: number;
  passed: number;
  distribution: { label: string; count: number }[];
};
type Report = {
  pagination: { page: number; pages: number; pageSize: number };
  groups: {
    key: string;
    yearLevel: string;
    section: string;
    rows: Row[];
    metrics: Metrics;
  }[];
  summary: Metrics;
  cohorts: { yearLevel: string; section: string }[];
  subjects: { _id: string; code: string; name: string }[];
  generatedAt: string;
};
const field =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm w-full";
export function Gradebook() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    subjectId: "",
    yearLevel: "",
    section: "",
    search: "",
    minScore: "",
    maxScore: "",
    status: "all",
    sort: "surname",
    direction: "asc",
  });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [page, setPage] = useState(1);
  const filterQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== ""),
  ).toString();
  const query = `${filterQuery}&page=${page}`;
  useEffect(() => {
    setPage(1);
  }, [filterQuery]);
  const update = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void api
        .request<Report>(`/gradebook?${query}`, { signal: controller.signal })
        .then(setReport)
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err.message);
            setReport(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const download = async (format: string) => {
    setExporting(format);
    setError("");
    try {
      const res = await fetch(`/api/gradebook/export/${format}?${query}`, {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Report export failed.");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `quikz-${user?.role}-results.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting("");
    }
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-xs uppercase font-bold tracking-widest text-indigo-600">
            Academic performance
          </p>
          <h1 className="text-3xl font-black text-[#070235]">
            {user?.role === "faculty" ? "Master gradebook" : "My quiz results"}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {user?.role === "faculty"
              ? "Your subjects, separated by year level and section. Every attempt stays visible."
              : "Your attempt history, scores, and progress toward the faculty-set passing mark."}
          </p>
        </div>
        <div className="flex gap-2">
          {["pdf", "xlsx"].map((format) => (
            <button
              key={format}
              onClick={() => download(format)}
              disabled={loading || !report?.summary.attempts || !!exporting}
              className="rounded-xl bg-[#070235] px-4 py-2 text-white text-sm font-bold disabled:opacity-40"
            >
              {exporting === format
                ? "Preparing…"
                : `Export ${format === "xlsx" ? "Excel" : "PDF"}`}
            </button>
          ))}
        </div>
      </header>
      <section
        className="rounded-2xl border bg-white p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Gradebook filters"
      >
        <label className="text-xs font-bold">
          Subject
          <select
            aria-label="Gradebook subject"
            className={`${field} mt-1`}
            value={filters.subjectId}
            onChange={(e) => update("subjectId", e.target.value)}
          >
            <option value="">All subjects</option>
            {report?.subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Search
          <input
            aria-label="Search results"
            placeholder="Name, student ID, or quiz title"
            className={`${field} mt-1`}
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </label>
        <label className="text-xs font-bold">
          Year level
          <select
            aria-label="Gradebook year level"
            className={`${field} mt-1`}
            value={filters.yearLevel}
            onChange={(e) => update("yearLevel", e.target.value)}
          >
            <option value="">All years</option>
            {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Section
          <select
            aria-label="Gradebook section"
            className={`${field} mt-1`}
            value={filters.section}
            onChange={(e) => update("section", e.target.value)}
          >
            <option value="">All sections</option>
            {["Section A", "Section B", "Section C", "Section D"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Status
          <select
            aria-label="Result status"
            className={`${field} mt-1`}
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="all">All results</option>
            <option value="passed">Passed</option>
            <option value="needs-review">Needs review</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Minimum score %
          <input
            aria-label="Minimum score"
            className={`${field} mt-1`}
            type="number"
            min="0"
            max="100"
            value={filters.minScore}
            onChange={(e) => update("minScore", e.target.value)}
          />
        </label>
        <label className="text-xs font-bold">
          Maximum score %
          <input
            aria-label="Maximum score"
            className={`${field} mt-1`}
            type="number"
            min="0"
            max="100"
            value={filters.maxScore}
            onChange={(e) => update("maxScore", e.target.value)}
          />
        </label>
        <label className="text-xs font-bold">
          Sort
          <select
            aria-label="Sort results"
            className={`${field} mt-1`}
            value={`${filters.sort}:${filters.direction}`}
            onChange={(e) => {
              const [sort, direction] = e.target.value.split(":");
              setFilters((f) => ({ ...f, sort, direction }));
            }}
          >
            <option value="surname:asc">Surname A–Z, then highest score</option>
            <option value="surname:desc">
              Surname Z–A, then highest score
            </option>
            <option value="score:desc">Highest score first</option>
            <option value="score:asc">Lowest score first</option>
            <option value="date:desc">Newest attempts first</option>
            <option value="date:asc">Oldest attempts first</option>
          </select>
        </label>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800"
        >
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-indigo-700">
          Updating results…
        </p>
      )}
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Attempts", report.summary.attempts],
              ["Students", report.summary.students],
              ["Average", `${report.summary.average.toFixed(2)}%`],
              ["Pass rate", `${report.summary.passRate.toFixed(2)}%`],
            ].map(([name, value]) => (
              <div className="rounded-2xl border bg-white p-5" key={name}>
                <p className="text-xs text-slate-500">{name}</p>
                <p className="mt-2 text-3xl font-black text-[#070235]">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-sm font-bold mb-3">
              Score distribution · all displayed attempts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {report.summary.distribution.map((bin) => (
                <div key={bin.label}>
                  <div className="flex justify-between text-xs">
                    <span>{bin.label}</span>
                    <strong>{bin.count}</strong>
                  </div>
                  <div className="mt-2 h-2 rounded bg-indigo-50">
                    <div
                      className="h-2 rounded bg-indigo-500"
                      style={{
                        width: `${report.summary.attempts ? (bin.count / report.summary.attempts) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          {user?.role === "faculty" && (
            <nav className="flex flex-wrap gap-2" aria-label="Cohort tabs">
              <button
                onClick={() =>
                  setFilters((f) => ({ ...f, yearLevel: "", section: "" }))
                }
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${!filters.yearLevel && !filters.section ? "bg-[#070235] text-white" : "bg-white"}`}
              >
                All cohorts (separate tables)
              </button>
              {report.cohorts.map((c) => (
                <button
                  key={`${c.yearLevel}${c.section}`}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      yearLevel: c.yearLevel,
                      section: c.section,
                    }))
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${filters.yearLevel === c.yearLevel && filters.section === c.section ? "bg-[#4648d4] text-white" : "bg-white"}`}
                >
                  {c.yearLevel} - {c.section}
                </button>
              ))}
            </nav>
          )}
          {!report.groups.length && !loading && (
            <div className="rounded-2xl border border-dashed p-12 text-center text-slate-600">
              No quiz results match these filters.
            </div>
          )}
          <div className={`space-y-5 ${loading ? "opacity-50" : ""}`}>
            {report.groups.map((group) => (
              <section
                key={group.key}
                className="rounded-2xl border bg-white overflow-hidden"
                aria-label={`${group.key} results`}
              >
                <header className="p-5 border-b bg-indigo-50 flex flex-wrap gap-2 justify-between">
                  <h2 className="font-bold text-[#070235]">{group.key}</h2>
                  <p className="text-xs text-slate-600">
                    {group.metrics.attempts} attempts · Average{" "}
                    {group.metrics.average.toFixed(2)}% · Pass rate{" "}
                    {group.metrics.passRate.toFixed(2)}%
                  </p>
                </header>
                <div className="overflow-x-auto">
                  <p className="p-3 text-xs text-slate-500 sm:hidden">
                    Scroll horizontally to view scores, status, and dates.
                  </p>
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50">
                      <tr>
                        {[
                          "Student / surname",
                          "Subject / term",
                          "Quiz",
                          "Attempt",
                          "Score",
                          "Status",
                          "Date",
                          "Focus warnings",
                        ].map((h) => (
                          <th key={h} className="p-4 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id} className="border-t hover:bg-slate-50">
                          <td className="p-4">
                            <p className="font-semibold whitespace-nowrap">
                              <Avatar userId={row.studentId} name={row.studentName} size="h-7 w-7" /> {row.studentName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.surname}
                            </p>
                            <span className="text-[10px] text-slate-400 break-all">
                              {row.studentId}
                            </span>
                          </td>
                          <td className="p-4">
                            <p>{row.subjectCode}</p>
                            <p className="text-xs text-slate-500 whitespace-nowrap">
                              {row.term}
                            </p>
                          </td>
                          <td className="p-4 min-w-40">{row.quizTitle}</td>
                          <td className="p-4">#{row.attempt}</td>
                          <td className="p-4">
                            <strong>{row.percentage.toFixed(2)}%</strong>
                            <p className="text-xs text-slate-500">
                              Pass mark {row.passingPercentage}%
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.score}/{row.totalQuestions}
                            </p>
                          </td>
                          <td className="p-4">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap ${row.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                            >
                              {row.passed ? "Passed" : "Needs review"}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap text-xs">
                            {new Date(row.submittedAt).toLocaleString()}
                          </td>
                          <td className="p-4">{row.blurCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
          {report.pagination.pages > 1 && (
            <nav
              className="flex gap-4 items-center text-sm"
              aria-label="Result pages"
            >
              <button
                disabled={loading || report.pagination.page <= 1}
                onClick={() => setPage(report.pagination.page - 1)}
                className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
              >
                Previous results
              </button>
              <span>
                Page {report.pagination.page} of {report.pagination.pages} · Up
                to 25 attempts per cohort
              </span>
              <button
                disabled={
                  loading || report.pagination.page >= report.pagination.pages
                }
                onClick={() => setPage(report.pagination.page + 1)}
                className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40"
              >
                Next results
              </button>
            </nav>
          )}
          <p className="text-xs text-slate-500">
            Metrics count assessment attempts, including retakes. Exports apply
            the current filters across all pages and preserve cohort separation;
            PDF records are indexed by surname.
          </p>
        </>
      )}
    </div>
  );
}
