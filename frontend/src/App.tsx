import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AuthPage } from "./components/auth/AuthPage.js";
import { SubjectList } from "./components/curriculum/SubjectList.js";
import { ModuleReader } from "./components/curriculum/ModuleReader.js";
import { Subject } from "./types/curriculum.js";
import { Gradebook } from "./components/gradebook/Gradebook.js";
import { LessonDirectory } from "./components/directory/LessonDirectory.js";
import { SystemHealth } from "./components/system/SystemHealth.js";

const MainApp: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [browseCatalog, setBrowseCatalog] = useState(false);
  const [view, setView] = useState("learning");
  const [initialModuleId, setInitialModuleId] = useState<string | undefined>();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[#4648d4] text-[36px] animate-spin">
            progress_activity
          </span>
          <p className="text-xs font-bold text-[#070235]">
            Initializing Quikz Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    const signIn = () => {
      setBrowseCatalog(false);
      setSelectedSubject(null);
      setView("learning");
    };
    if (browseCatalog)
      return (
        <div className="min-h-screen bg-[#f8f9ff] p-6 md:p-10">
          <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex justify-between items-center gap-4">
              <h1 className="text-2xl font-black text-[#070235]">
                Quikz ·{" "}
                {view === "directory"
                  ? "Public lesson directory"
                  : "Public subject catalog"}
              </h1>
              <button
                className="rounded-xl bg-[#070235] px-4 py-2 text-white"
                onClick={signIn}
              >
                Sign in
              </button>
            </header>
            <nav className="flex gap-3">
              <button
                className="rounded-xl border bg-white px-4 py-2"
                onClick={() => setView("learning")}
              >
                Subject catalog
              </button>
              <button
                className="rounded-xl border bg-white px-4 py-2"
                onClick={() => setView("directory")}
              >
                Lesson directory
              </button>
            </nav>
            {view === "directory" ? (
              <LessonDirectory onSignIn={signIn} />
            ) : (
              <>
                {selectedSubject && (
                  <section className="rounded-2xl border bg-white p-6">
                    <h2 className="text-xl font-bold">
                      {selectedSubject.name}
                    </h2>
                    <p className="my-3">{selectedSubject.description}</p>
                    <p className="text-sm text-slate-600">
                      Sign in to read lessons, take quizzes, and track your
                      learning path.
                    </p>
                  </section>
                )}
                <SubjectList onSelectSubject={setSelectedSubject} />
              </>
            )}
          </div>
        </div>
      );
    return (
      <AuthPage
        onBrowse={() => {
          setView("learning");
          setBrowseCatalog(true);
        }}
        onBrowseLessons={() => {
          setView("directory");
          setBrowseCatalog(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col font-sans selection:bg-[#6063ee] selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="bg-white border-b border-[#c8c5d0]/50 shadow-sm px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => {
              setSelectedSubject(null);
              setView("learning");
            }}
            className="w-10 h-10 rounded-xl bg-[#070235] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#1e1b4b] transition-colors"
          >
            <span className="material-symbols-outlined text-[#e3dfff]">
              school
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                onClick={() => {
                  setSelectedSubject(null);
                  setView("learning");
                }}
                className="text-xl font-black text-[#070235] tracking-tight cursor-pointer"
              >
                Quikz
              </span>
              <span className="bg-[#eff4ff] text-[#4648d4] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-[#d3e4fe]">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-[#47464f]">
              Modular Quiz & Academic Learning Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-[#070235]">
              {user.fullName}
            </div>
            <div className="text-[11px] text-[#47464f]">
              {user.role === "student"
                ? `${user.yearLevel} · ${user.section}`
                : user.email}
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedSubject(null);
              setInitialModuleId(undefined);
              setView("learning");
              logout();
            }}
            className="px-3.5 py-1.5 rounded-xl border border-[#c8c5d0] hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-semibold text-[#47464f] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              logout
            </span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>
      <nav
        className="border-b bg-white px-6 py-3 flex flex-wrap gap-2"
        aria-label="Main navigation"
      >
        {[
          ["learning", "Learning path"],
          [
            "gradebook",
            user.role === "faculty" ? "Master gradebook" : "My results",
          ],
          ["directory", "Lesson directory"],
          ...(user.role === "faculty" ? [["system", "System health"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={view === key ? "page" : undefined}
            onClick={() => setView(key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${view === key ? "bg-[#070235] text-white" : "text-slate-600 hover:bg-indigo-50"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {view === "gradebook" ? (
          <Gradebook />
        ) : view === "system" && user.role === "faculty" ? (
          <SystemHealth />
        ) : view === "directory" ? (
          <LessonDirectory
            onOpenLesson={(subject, moduleId) => {
              setSelectedSubject(subject);
              setInitialModuleId(moduleId);
              setView("learning");
            }}
          />
        ) : selectedSubject ? (
          <ModuleReader
            subject={selectedSubject}
            initialModuleId={initialModuleId}
            onBack={() => setSelectedSubject(null)}
          />
        ) : (
          <SubjectList
            onSelectSubject={(subject) => setSelectedSubject(subject)}
          />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
