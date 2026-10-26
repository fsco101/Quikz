import { ArrowRight, BookOpen, CheckCircle2, FileText, Layers, Plus, RefreshCw, Search } from 'lucide-react';
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
    <div className="catalog-page">
      <header className="catalog-welcome">
        <div className="catalog-welcome-copy">
          <p className="eyebrow">{user ? "Welcome to your workspace" : "A world of understanding"}</p>
          <h1>{student ? "Your next chapter starts here." : user?.role === "faculty" ? "Make every lesson count." : "Find your next chapter."}</h1>
          <p>{student ? "Pick up where you left off. Every lesson brings you a little further."
            : user?.role === "faculty" ? "Create thoughtful lessons, keep assessments on track, and help your students grow."
            : "Explore courses, discover new ideas, and build your understanding one lesson at a time."}</p>
          {user?.role === "faculty" && <button onClick={() => setIsModalOpen(true)} className="ui-button ui-button-primary"><Plus size={17} aria-hidden="true" />Create New Subject</button>}
        </div>
        <div className="learning-illustration" aria-hidden="true">
          <span className="illustration-orbit orbit-one" /><span className="illustration-orbit orbit-two" />
          <div className="illustration-book"><BookOpen size={42} strokeWidth={1.4} /></div>
          <span className="illustration-step step-read"><FileText size={16} /> Explore</span>
          <span className="illustration-step step-master"><CheckCircle2 size={17} /> Make progress</span>
          <span className="illustration-spark">✦</span>
        </div>
      </header>

      {!loading && !error && totals && (
        <section className="overview-grid" aria-label={student ? "Learning overview" : "Teaching overview"}>
          {totals.map(([label, value], index) => {
            const Icon = [BookOpen, Layers, CheckCircle2][index];
            return <div key={label} className={`overview-metric metric-${index}`}>
              <span className="metric-icon"><Icon size={21} aria-hidden="true" /></span>
              <div><p>{label}</p><strong>{value}</strong></div>
            </div>;
          })}
        </section>
      )}

      <section aria-label="Subject catalog" className="catalog-section">
        <div className="section-heading"><div><p className="eyebrow">Explore & grow</p><h2>Academic Subject Catalog</h2></div>
          {!loading && !error && <span className="count-label">{filteredSubjects.length} {filteredSubjects.length === 1 ? "course" : "courses"}</span>}
        </div>
        <div className="catalog-toolbar">
          <label className="search-field"><Search size={18} aria-hidden="true" /><input aria-label="Search subjects" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by code, title, or instructor..." /></label>
          <select aria-label="Subject year level" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="ui-select">
            {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((yr) => <option key={yr} value={yr}>{yr === "All" ? "All year levels" : yr}</option>)}
          </select>
          {personalized && <select aria-label="Course status" value={courseStatus} onChange={(e) => setCourseStatus(e.target.value)} disabled={loading || !overview} className="ui-select">
            <option value="all">All courses</option>
            {student ? <><option value="in-progress">In progress</option><option value="not-started">Not started</option><option value="completed">Completed</option><option value="empty">No modules yet</option></>
              : <><option value="mine">My courses</option><option value="needs-quizzes">Needs end quizzes</option><option value="ready">All end quizzes ready</option><option value="empty">My empty courses</option></>}
          </select>}
        </div>
        {(error || overviewError) && <div role="alert" className="catalog-alert"><span>{error || overviewError}</span><button disabled={loading} className="ui-text-button" onClick={() => void fetchSubjects()}>Retry catalog <RefreshCw size={15} aria-hidden="true" /></button></div>}
        {loading ? <div role="status" className="catalog-loading"><span className="loading-ring" /><p>Loading Academic Catalog...</p></div>
          : !error && filteredSubjects.length === 0 ? <div className="ui-empty"><BookOpen size={34} aria-hidden="true" /><h3>No Subjects Found</h3><p>Try a different keyword or give your course filters a little more room.</p><button className="ui-button ui-button-secondary" onClick={() => { setSearchQuery(""); setFilterYear("All"); setCourseStatus("all"); }}>Clear filters</button></div>
          : <div className="course-grid">
            {filteredSubjects.map((subject) => {
              const course = courseMap.get(subject._id);
              const percentage = course?.totalModules ? Math.round((course.completedCount || 0) / course.totalModules * 100) : 0;
              const tone = [...subject.code].reduce((n, char) => n + char.charCodeAt(0), 0) % 3;
              const status = course && ({ "completed": "Mastered", "in-progress": "In progress", "not-started": "Ready to begin", "empty": "Coming together", "needs-quizzes": "Needs end quizzes", "ready": "Quizzes ready" }[course.status]);
              return <article key={subject._id} aria-label={`${subject.code} course`} className={`course-card course-tone-${tone}`}>
                <button onClick={() => onSelectSubject(subject)} className="course-entry" aria-label={`Open ${subject.code}: ${subject.name}`}>
                  <div className="course-cover"><span className="course-cover-icon"><BookOpen size={27} strokeWidth={1.6} aria-hidden="true" /></span><span className="course-code">{subject.code}</span><span className="course-cover-lines" aria-hidden="true" /></div>
                  <div className="course-description"><p className="course-meta">{subject.yearLevel} <span>·</span> {subject.term}</p><h3>{subject.name}</h3><p className="course-summary">{subject.description || "Build your understanding through guided lessons and practical assessments."}</p></div>
                </button>
                <div className="course-instructor"><Avatar userId={subject.facultyId} name={subject.facultyName} size="h-7 w-7" /><span>{subject.facultyName}</span></div>
                {course ? <div className="course-progress">
                  <div className="course-progress-label"><span className={`status-pill ${course.status === "completed" || course.status === "ready" ? "status-success" : course.status === "needs-quizzes" ? "status-warning" : ""}`}>{status}</span>{student && course.totalModules > 0 && <strong>{percentage}%</strong>}</div>
                  {student ? <><progress aria-label={`${subject.code} completion`} max={100} value={percentage} /><p>{course.completedCount} of {course.totalModules} modules mastered</p><p className="course-next">{course.status === "completed" ? "Well done. Revisit any lesson, anytime." : course.status === "empty" ? "Your instructor is preparing this course." : `Up next: ${course.nextModule?.title}`}</p></>
                    : <><p>{course.readyQuizCount} of {course.totalModules} end quizzes ready</p><p className="course-next">{course.status === "empty" ? "Add your first module to begin." : course.missingQuizCount ? `${course.missingQuizCount} ${course.missingQuizCount === 1 ? "module still needs" : "modules still need"} a valid end quiz.` : "Every module has a linked end quiz."}</p></>}
                  <button onClick={() => onSelectSubject(subject, course.nextModule?.id)} className="course-action">{course.nextModule ? student ? course.completedCount ? "Continue learning" : "Start learning" : "Review missing end quiz" : student && course.status === "completed" ? "Revisit course" : "Open course"}<ArrowRight size={17} aria-hidden="true" /></button>
                </div> : <div className="course-progress"><button onClick={() => onSelectSubject(subject)} className="course-action">Explore course <ArrowRight size={17} aria-hidden="true" /></button></div>}
              </article>;
            })}
          </div>}
      </section>
      <CreateSubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => void fetchSubjects()} />
    </div>
  );
};
