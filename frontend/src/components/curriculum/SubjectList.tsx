import { Avatar } from "../users/Avatar.js";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Subject, CourseOverview } from "../../types/curriculum.js";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.js";
import { CreateSubjectModal } from "./CreateSubjectModal.js";

interface SubjectListProps {
  onSelectSubject: (subject: Subject, moduleId?: string) => void;
}

export const SubjectList: React.FC<SubjectListProps> = ({ onSelectSubject }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [overview, setOverview] = useState<CourseOverview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("All");
  const [courseStatus, setCourseStatus] = useState("all");
  const personalized = user?.role === "student" || user?.role === "faculty";
  const student = user?.role === "student";

  const fetchSubjects = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    setOverviewError("");
    const [catalog, progress] = await Promise.allSettled([
      api.getSubjects(signal),
      personalized ? api.getCourseOverview(signal) : Promise.resolve(null),
    ]);
    if (signal?.aborted) return;
    if (catalog.status === "fulfilled") setSubjects(catalog.value.subjects);
    else {
      setSubjects([]);
      setError(catalog.reason instanceof Error ? catalog.reason.message : "Unable to load the subject catalog.");
    }
    if (progress.status === "fulfilled") setOverview(progress.value?.courses ?? null);
    else {
      setOverview(null);
      setCourseStatus("all");
      setOverviewError("Course overview could not be loaded. You can still open your courses.");
    }
    setLoading(false);
  }, [user?.id, user?.role]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSubjects(controller.signal);
    return () => controller.abort();
  }, [fetchSubjects]);

  const courseMap = useMemo(() => new Map(overview?.map((c) => [c.subjectId, c])), [overview]);
  const filteredSubjects = subjects.filter((s) => {
    const needle = searchQuery.trim().toLocaleLowerCase();
    return [s.name, s.code, s.facultyName, s.term].some((value) => value.toLocaleLowerCase().includes(needle)) &&
      (filterYear === "All" || s.yearLevel === filterYear) &&
      (courseStatus === "all" ||
        (courseStatus === "mine" ? s.facultyId === user?.id : courseMap.get(s._id)?.status === courseStatus));
  });
  const totals = overview && (student ? [
    ["Modules mastered", overview.reduce((sum, c) => sum + (c.completedCount || 0), 0)],
    ["Courses in progress", overview.filter((c) => c.status === "in-progress").length],
    ["Courses completed", overview.filter((c) => c.status === "completed").length],
  ] : [
    ["My courses", overview.length],
    ["End quizzes ready", overview.reduce((sum, c) => sum + (c.readyQuizCount || 0), 0)],
    ["Modules missing end quizzes", overview.reduce((sum, c) => sum + (c.missingQuizCount || 0), 0)],
  ]);

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl border border-[#c8c5d0]/50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#070235]">Academic Subject Catalog</h2>
          <p className="text-xs text-[#47464f] mt-1">
            {student ? "Track your mastery and continue with your next unfinished lesson."
              : user?.role === "faculty" ? "Manage your courses and find lessons that still need an end quiz."
              : "Browse modular learning curricula and course prerequisite milestones."}
          </p>
        </div>
        {user?.role === "faculty" && (
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-[#070235] text-white text-xs font-bold self-start">
            Create New Subject
          </button>
        )}
      </header>

      {!loading && !error && totals && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label={student ? "Learning overview" : "Teaching overview"}>
          {totals.map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="text-3xl font-black text-[#070235] mt-1">{value}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input aria-label="Search subjects" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by code, title, or instructor..."
          className="flex-1 min-w-0 w-full sm:min-w-64 rounded-xl border border-[#c8c5d0] bg-white px-4 py-2 text-sm" />
        <label className="text-xs font-bold">
          <span className="sr-only">Subject year level</span>
          <select aria-label="Subject year level" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm">
            {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((yr) => <option key={yr} value={yr}>{yr === "All" ? "All year levels" : yr}</option>)}
          </select>
        </label>
        {personalized && (
          <select aria-label="Course status" value={courseStatus} onChange={(e) => setCourseStatus(e.target.value)} disabled={loading || !overview}
            className="rounded-xl border bg-white px-3 py-2 text-sm disabled:opacity-50">
            <option value="all">All courses</option>
            {student ? <>
              <option value="in-progress">In progress</option>
              <option value="not-started">Not started</option>
              <option value="completed">Completed</option>
              <option value="empty">No modules yet</option>
            </> : <>
              <option value="mine">My courses</option>
              <option value="needs-quizzes">Needs end quizzes</option>
              <option value="ready">All end quizzes ready</option>
              <option value="empty">My empty courses</option>
            </>}
          </select>
        )}
      </div>

      {(error || overviewError) && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap gap-3 justify-between">
          <span>{error || overviewError}</span>
          <button disabled={loading} className="font-bold underline disabled:opacity-50" onClick={() => void fetchSubjects()}>Retry catalog</button>
        </div>
      )}
      {loading ? <p role="status" className="py-16 text-center text-sm">Loading Academic Catalog...</p>
        : !error && filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed p-10 text-center">
            <h3 className="font-bold text-[#070235]">No Subjects Found</h3>
            <p className="text-sm text-slate-600 mt-2">Try adjusting your search or course filters.</p>
            <button className="mt-4 font-bold text-indigo-700" onClick={() => { setSearchQuery(""); setFilterYear("All"); setCourseStatus("all"); }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const course = courseMap.get(subject._id);
              const percentage = course?.totalModules ? Math.round((course.completedCount || 0) / course.totalModules * 100) : 0;
              return (
                <article key={subject._id} aria-label={`${subject.code} course`} className="bg-white rounded-2xl border border-[#c8c5d0]/60 p-6 shadow-sm flex flex-col">
                  <button onClick={() => onSelectSubject(subject)} className="text-left group rounded-lg focus-visible:outline-indigo-600">
                    <span className="inline-block rounded-lg bg-[#eff4ff] text-[#4648d4] px-2.5 py-1 text-xs font-black">{subject.code}</span>
                    <h3 className="text-base font-bold text-[#070235] group-hover:text-[#4648d4] mt-3 mb-2">{subject.name}</h3>
                    <p className="text-xs text-slate-600">{subject.term} · {subject.yearLevel}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-3">{subject.description || "Structured academic modules with sequential progression and mastery verification."}</p>
                  </button>
                  <div className="flex items-center gap-2 mt-4 text-xs text-slate-600">
                    <Avatar userId={subject.facultyId} name={subject.facultyName} size="h-7 w-7" />
                    {subject.facultyName}
                  </div>
                  {course && (
                    <div className="mt-4 pt-4 border-t text-sm space-y-3">
                      {student ? <>
                        <p>{course.completedCount} of {course.totalModules} modules mastered</p>
                        <progress aria-label={`${subject.code} completion`} className="w-full h-2 accent-indigo-600" max={100} value={percentage} />
                        <p className="text-xs text-slate-600">{course.status === "completed" ? "Course mastered. You can revisit any lesson."
                          : course.status === "empty" ? "No modules published yet."
                          : `Next: ${course.nextModule?.title}`}</p>
                      </> : <>
                        <p>{course.readyQuizCount} of {course.totalModules} end quizzes ready</p>
                        <p className={`text-xs ${course.missingQuizCount ? "text-amber-800" : "text-slate-600"}`}>
                          {course.status === "empty" ? "Add your first module to begin."
                            : course.missingQuizCount ? `${course.missingQuizCount} modules still need a valid end quiz.` : "Every module has a linked end quiz."}
                        </p>
                      </>}
                      {course.nextModule && (
                        <button onClick={() => onSelectSubject(subject, course.nextModule!.id)} className="w-full rounded-xl bg-[#070235] text-white py-2 px-3 text-xs font-bold">
                          {student ? course.completedCount ? "Continue learning" : "Start learning" : "Review missing end quiz"}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      <CreateSubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => void fetchSubjects()} />
    </div>
  );
};
