import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { Subject } from "../../types/curriculum.js";
type Lesson = {
  _id: string;
  title: string;
  summary: string;
  contentType: string;
  orderIndex: number;
  subject: Subject;
};
type Directory = {
  lessons: Lesson[];
  total: number;
  pages: number;
  syllabuses: (Subject & {
    modules: {
      id: string;
      title: string;
      orderIndex: number;
      contentType: string;
    }[];
  })[];
  filters: {
    years: string[];
    terms: string[];
    instructors: { id: string; name: string }[];
  };
};
export function LessonDirectory({
  onOpenLesson,
  onSignIn,
}: {
  onOpenLesson?: (subject: Subject, moduleId: string) => void;
  onSignIn?: () => void;
}) {
  const [filters, setFilters] = useState({
    search: "",
    yearLevel: "",
    term: "",
    facultyId: "",
    contentType: "",
    page: "1",
  });
  const [data, setData] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => !!v),
  ).toString();
  const update = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: "1" }));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api
        .request<Directory>(`/directory?${query}`, {
          signal: controller.signal,
        })
        .then((result) => {
          setData(result);
          setError("");
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err.message);
            setData(null);
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
  const field =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">
          Open learning index
        </p>
        <h1 className="text-3xl font-black text-[#070235]">Lesson directory</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explore topics, summaries, and course syllabuses from all instructors.
          Search also matches lecture notes. Full lessons follow your
          learning-path prerequisites.
        </p>
      </header>
      <section className="rounded-2xl border bg-white p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <label className="text-xs font-bold">
          Keyword
          <input
            aria-label="Search lessons"
            className={field}
            placeholder="Topic, concept, or course code"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </label>
        <label className="text-xs font-bold">
          Year level
          <select
            aria-label="Directory year level"
            className={field}
            value={filters.yearLevel}
            onChange={(e) => update("yearLevel", e.target.value)}
          >
            <option value="">All years</option>
            {(
              data?.filters.years || [
                "1st Year",
                "2nd Year",
                "3rd Year",
                "4th Year",
              ]
            ).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Term
          <select
            aria-label="Directory term"
            className={field}
            value={filters.term}
            onChange={(e) => update("term", e.target.value)}
          >
            <option value="">All terms</option>
            {data?.filters.terms.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Instructor
          <select
            aria-label="Directory instructor"
            className={field}
            value={filters.facultyId}
            onChange={(e) => update("facultyId", e.target.value)}
          >
            <option value="">All instructors</option>
            {data?.filters.instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Format
          <select
            aria-label="Directory format"
            className={field}
            value={filters.contentType}
            onChange={(e) => update("contentType", e.target.value)}
          >
            <option value="">All formats</option>
            <option value="text">Lecture text</option>
            <option value="file">Document / PDF</option>
            <option value="presentation">Presentation</option>
          </select>
        </label>
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-indigo-700">
          Searching lessons…
        </p>
      )}
      {data && (
        <>
          <p className="text-sm text-slate-500">
            {data.total} {data.total === 1 ? "lesson" : "lessons"} found
          </p>
          <div
            className={`grid md:grid-cols-2 lg:grid-cols-3 gap-5 ${loading ? "opacity-50" : ""}`}
          >
            {data.lessons.map((lesson) => (
              <article
                key={lesson._id}
                className="rounded-2xl border bg-white p-6 flex flex-col gap-4"
              >
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span className="rounded-lg bg-indigo-50 px-2 py-1 font-bold text-indigo-700">
                    {lesson.subject.code}
                  </span>
                  <span className="capitalize text-slate-500">
                    {lesson.contentType}
                  </span>
                </div>
                <h2 className="font-bold text-lg text-[#070235]">
                  {lesson.title}
                </h2>
                <p className="text-sm text-slate-600 line-clamp-4">
                  {lesson.summary}
                </p>
                <p className="text-xs text-slate-500">
                  {lesson.subject.facultyName}
                  <br />
                  {lesson.subject.yearLevel} · {lesson.subject.term} · Module{" "}
                  {lesson.orderIndex}
                </p>
                <button
                  className="mt-auto rounded-xl bg-[#070235] px-4 py-2 text-sm font-bold text-white"
                  onClick={() =>
                    onOpenLesson
                      ? onOpenLesson(lesson.subject, lesson._id)
                      : onSignIn?.()
                  }
                >
                  {onOpenLesson ? "Open learning path" : "Sign in to study"}
                </button>
              </article>
            ))}
          </div>
          {!data.lessons.length && !loading && (
            <p className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
              No lessons match these filters.
            </p>
          )}
          <nav aria-label="Directory pages" className="flex items-center gap-4">
            <button
              disabled={Number(filters.page) <= 1 || loading}
              className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40"
              onClick={() =>
                setFilters((f) => ({ ...f, page: String(Number(f.page) - 1) }))
              }
            >
              Previous page
            </button>
            <span className="text-sm">
              Page {filters.page} of {Math.max(1, data.pages)}
            </span>
            <button
              disabled={Number(filters.page) >= data.pages || loading}
              className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40"
              onClick={() =>
                setFilters((f) => ({ ...f, page: String(Number(f.page) + 1) }))
              }
            >
              Next page
            </button>
          </nav>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#070235]">
              Syllabus overview
            </h2>
            {data.syllabuses.map((subject) => (
              <details
                key={subject._id}
                className="rounded-2xl border bg-white p-5"
              >
                <summary className="cursor-pointer font-semibold">
                  {subject.code} · {subject.name}{" "}
                  <span className="text-xs text-slate-500">
                    ({subject.modules.length} modules)
                  </span>
                </summary>
                <p className="my-3 text-sm text-slate-600">
                  {subject.description ||
                    "Follow the course sequence to build mastery."}
                </p>
                <ol className="list-decimal pl-5 text-sm space-y-2">
                  {subject.modules.map((module) => (
                    <li key={module.id}>
                      {module.title}{" "}
                      <span className="text-xs text-slate-500">
                        ({module.contentType})
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
