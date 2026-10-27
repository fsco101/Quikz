import { ArrowLeft, ChevronDown, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { QuizStudio } from '../quiz/QuizStudio.js';
import { QuizTaker } from '../quiz/QuizTaker.js';
import { Subject, ModuleItem, CurriculumProgress } from '../../types/curriculum.js';
import { api } from '../../services/api.js';
import { apiUrl } from '../../services/apiUrl.js';
import { useAuth } from '../../context/AuthContext.js';
import { CreateModuleModal } from './CreateModuleModal.js';

interface ModuleReaderProps {
  initialModuleId?: string;
  subject: Subject;
  onBack: () => void;
}

export const ModuleReader: React.FC<ModuleReaderProps> = ({ subject, onBack, initialModuleId }) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [progress, setProgress] = useState<CurriculumProgress>({ totalModules: 0, completedCount: 0 });
  const [activeModule, setActiveModule] = useState<ModuleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModules, setShowModules] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleItem | undefined>();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [takingQuiz, setTakingQuiz] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await api.getSubjectModules(subject._id);
      setModules(res.modules);
      if (!res.modules.length) setActiveModule(null);
      if (res.progress) {
        setProgress(res.progress);
      }

      // Pick current or first unlocked module if none active
      if (res.modules.length > 0) {
        setActiveModule((prev) => {
          if (prev) {
            const found = res.modules.find((m) => m._id === prev._id);
            if (found) return found;
          }
          const firstUnlocked = res.modules.find((m) => !m.isLocked && !m.isCompleted)
            || res.modules.find((m) => !m.isLocked);
          const requested = res.modules.find(m => m._id === initialModuleId && !m.isLocked);
          if (requested) return requested;
          return firstUnlocked || res.modules[0];
        });
      }
    } catch (err) {
      setModules([]); setActiveModule(null); setProgress({ totalModules: 0, completedCount: 0 });
      setActionMessage(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [subject._id]);

  const download = async (module: ModuleItem) => {
    try {
      const response = await fetch(apiUrl(module.fileUrl!), { headers: { Authorization: `Bearer ${api.getToken()}` } });
      if (!response.ok) throw new Error('Unable to download this lesson. Check prerequisites and try again.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = module.fileName || 'lesson'; link.click(); URL.revokeObjectURL(url);
    } catch (err: any) { setActionMessage(err.message); }
  };

  const completionPercentage =
    progress.totalModules > 0
      ? Math.round((progress.completedCount / progress.totalModules) * 100)
      : 0;

  return (
    <div className="reader-page space-y-6">
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="reader-heading flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to course catalog"
            className="w-9 h-9 rounded-xl border border-[#c8c5d0] hover:bg-[#eff4ff] text-[#47464f] flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#4648d4] text-[10px] font-black uppercase tracking-wider border border-[#d3e4fe]">
                {subject.code}
              </span>
              <h2 className="text-lg font-bold text-[#070235]">{subject.name}</h2>
            </div>
            <p className="text-xs text-[#47464f] mt-0.5">
              Instructor: {subject.facultyName} · {subject.term} · {subject.yearLevel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {user?.role === 'faculty' && user.id === subject.facultyId && (
            <button
              onClick={() => { setEditingModule(undefined); setIsAddModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-[#070235] hover:bg-[#1e1b4b] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">post_add</span>
              <span>Add Topic / Module</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div role="status" className="reader-notice flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">verified</span>
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Main Reader Layout: Sidebar + Document Canvas */}
      <div className="reader-layout">
        {/* LEFT SIDEBAR: Course Navigator & Sequential Progression List (4-Cols) */}
        <div className="reader-sidebar ui-panel space-y-5">
          {/* Progress Header */}
          <div className="pb-4 border-b border-[#c8c5d0]/30">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-[#070235]">{user?.role === "student" ? "Course Completion" : "Course structure"}</span>
              <span className="text-[#4648d4] font-black">{user?.role === "student" ? `${completionPercentage}%` : `${modules.length} modules`}</span>
            </div>
            {user?.role === "student" && <div className="w-full h-2 rounded-full bg-[#eff4ff] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6063ee] to-[#4648d4] transition-all duration-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>}
            <div className="flex items-center justify-between text-[11px] text-[#47464f] mt-2">
              <span>{user?.role === "student" ? `${progress.completedCount} of ${progress.totalModules} modules mastered` : "A guided path through your subject"}</span>
            </div>
          </div>

          <button className="reader-modules-toggle" aria-expanded={showModules} aria-controls="course-modules" onClick={() => setShowModules((value) => !value)}>
            {showModules ? "Hide course modules" : "Show course modules"}<ChevronDown size={17} aria-hidden="true" />
          </button>
          {/* Module List */}
          <div id="course-modules" className="reader-module-list space-y-2" data-expanded={showModules}>
            <h3 className="text-xs font-bold text-[#070235] uppercase tracking-wider mb-2">
              Course Learning Path
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#47464f]">Loading modules...</div>
            ) : modules.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#c8c5d0] text-center text-xs text-[#47464f]">
                No modules authored yet.
              </div>
            ) : (
              modules.map((mod, index) => {
                const isActive = activeModule?._id === mod._id;
                const isLocked = mod.isLocked && user?.role === 'student';
                const isCompleted = mod.isCompleted;

                return (
                  <button
                    type="button"
                    disabled={!!isLocked}
                    aria-current={isActive ? "step" : undefined}
                    key={mod._id}
                    onClick={() => {
                      if (!isLocked) {
                        setActiveModule(mod);
                        setShowModules(false);
                      }
                    }}
                    className={`reader-module-button p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 select-none ${
                      isLocked
                        ? 'bg-[#f8f9ff] border-[#c8c5d0]/40 opacity-60 cursor-not-allowed'
                        : isActive
                        ? 'border-[#4648d4] bg-[#eff4ff] shadow-sm cursor-pointer'
                        : 'border-[#c8c5d0]/50 hover:border-[#4648d4]/40 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isActive
                            ? 'bg-[#4648d4] text-white'
                            : 'bg-[#eff4ff] text-[#47464f]'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <h4
                          className={`text-xs font-bold leading-snug ${
                            isActive ? 'text-[#4648d4]' : 'text-[#070235]'
                          }`}
                        >
                          {mod.title}
                        </h4>
                        <div className="text-[11px] text-[#47464f] mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px]">
                            {mod.contentType === 'file'
                              ? 'description'
                              : mod.contentType === 'presentation'
                              ? 'slideshow'
                              : 'article'}
                          </span>
                          <span className="capitalize">{mod.contentType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isLocked ? (
                        <Lock size={16} aria-label="Locked: Complete previous module to unlock" />
                      ) : isCompleted ? (
                        <CheckCircle2 size={17} className="text-emerald-600" aria-label="Mastered" />
                      ) : (
                        <PlayCircle size={17} className="text-[#4648d4]" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT CANVAS: Scribd-Style Document Reader (8-Cols) */}
        <div className="reader-canvas ui-panel space-y-7">
          {activeModule ? (
            <>
              {/* Executive Summary Card (Requirement 5a) */}
              <div className="reader-summary space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4648d4]">
                  <span className="material-symbols-outlined text-[18px]">summarize</span>
                  <span>Executive Topic Summary</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{activeModule.audience === 'connected' ? 'Connected students only' : activeModule.audience === 'public' ? 'Public lesson' : 'Shared with connected students and public learners'}</p>
                <h3 className="reader-module-title">
                  {activeModule.title}
                </h3>
                <p className="reader-summary-copy">
                  {activeModule.summary}
                </p>
              </div>

              {/* Document Reading Viewport */}
              <div className="reader-document select-text space-y-5">
                {activeModule.textContent ? (
                  <div className="lesson-prose space-y-3 leading-relaxed">
                    <ReactMarkdown>{activeModule.textContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="py-6 text-center text-[#47464f]">
                    This module provides multimedia and slide attachment resources below.
                  </div>
                )}

                {/* File / Presentation Download Attachment */}
                {activeModule.fileUrl && (
                  <div className="reader-attachment">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#4648d4] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">attachment</span>
                      </div>
                      <div>
                        <div className="font-bold text-[#070235] text-xs">
                          {activeModule.fileName || 'Course Material Asset'}
                        </div>
                        <div className="text-[11px] text-[#47464f]">Lecture presentation & slides</div>
                      </div>
                    </div>

                    <button
                      onClick={() => download(activeModule)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#d3e4fe] text-[#4648d4] font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* End-of-Module Quiz Milestone CTA (Requirement 5 & 6d) */}
              <div className="reader-assessment">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#c4c1fb] font-semibold mb-1">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    <span>End-of-Module Milestone</span>
                  </div>
                  <h4 className="text-base font-bold text-white">End Quiz Assessment</h4>
                  <p className="text-xs text-[#e3dfff]/80 mt-0.5">
                    {activeModule.quizId ? `${activeModule.quizId.passingPercentage}% passing mark` : "Meet the faculty-set passing mark"} to unlock the next sequential module.
                  </p>
                </div>

                <div className="reader-assessment-actions">
                  {user?.role === 'faculty' ? (
                    activeModule.canEdit && !activeModule.quizId ? <button onClick={() => setStudioOpen(true)} className="px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3436b8] text-white text-xs font-bold">Create end quiz</button> : <span className="text-xs text-indigo-200">{activeModule.quizId ? `Published: ${activeModule.quizId.title}` : 'Awaiting instructor assessment'}</span>
                  ) : activeModule.quizId && user?.role === 'student' ? (
                    <button onClick={() => setTakingQuiz(activeModule.quizId!._id)} className="px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3436b8] text-white text-xs font-bold">{activeModule.isCompleted ? 'Practice again' : 'Start / resume end quiz'} · {activeModule.quizId.timePerQuestionSeconds ? `${activeModule.quizId.timePerQuestionSeconds} sec / question` : `${activeModule.quizId.timeLimitMinutes} min total`}</button>
                  ) : <span className="text-xs text-indigo-200">Your instructor has not published an end quiz yet.</span>}
                  {user?.role === 'faculty' && activeModule.canEdit && <button className="rounded-xl border px-4 py-2 text-xs font-bold" onClick={() => { setEditingModule(activeModule); setIsAddModalOpen(true); }}>Edit module</button>}
                  {user?.role === 'faculty' && activeModule.quizId?.createdBy === user.id && <button className="rounded-xl border px-4 py-2 text-xs font-bold" onClick={() => setStudioOpen(true)}>Edit quiz</button>}
                  {activeModule.isCompleted && user?.role === 'student'  && <span className="text-xs font-bold text-emerald-300">Mastered ✓</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center">
              <span className="material-symbols-outlined text-[#c8c5d0] text-[48px] mb-2">article</span>
              <h3 className="text-sm font-bold text-[#070235]">Select a module to view</h3>
              <p className="text-xs text-[#47464f] mt-1">Choose an unlocked topic from the course learning path.</p>
            </div>
          )}
        </div>
      </div>

      {studioOpen && activeModule && <QuizStudio subject={subject} module={activeModule} onClose={() => setStudioOpen(false)} onPublished={() => { setStudioOpen(false); setActionMessage('End quiz published. Assessment saved successfully.'); void fetchModules(); }} />}
      {takingQuiz && <QuizTaker quizId={takingQuiz} onClose={() => { setTakingQuiz(null); void fetchModules(); }} />}
      {/* Add Module Modal */}
      {isAddModalOpen && <CreateModuleModal
        isOpen={isAddModalOpen}
        subjectId={subject._id}
        module={editingModule}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={fetchModules}
      />}
    </div>
  );
};
