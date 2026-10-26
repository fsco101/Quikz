import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AuthPage } from "./components/auth/AuthPage.js";
import { SubjectList } from "./components/curriculum/SubjectList.js";
import { ModuleReader } from "./components/curriculum/ModuleReader.js";
import { Subject } from "./types/curriculum.js";
import { Gradebook } from "./components/gradebook/Gradebook.js";
import { LessonDirectory } from "./components/directory/LessonDirectory.js";
import { SystemHealth } from "./components/system/SystemHealth.js";

import { AppShell } from "./components/layout/AppShell.js";
import { Brand } from "./components/layout/Brand.js";
import { Profile } from "./components/users/Profile.js";
import { People } from "./components/users/People.js";
import { UserManagement } from "./components/users/UserManagement.js";
import { Connections } from "./components/users/Connections.js";
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
        <div className="public-workspace">
          <div className="public-content space-y-8">
            <header className="public-topbar">
              <Brand onClick={signIn} />
              <h1 className="public-page-title">
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
            <nav className="public-tabs" aria-label="Public navigation">
              <button
                className="rounded-xl border bg-white px-4 py-2"
                aria-current={view === "learning" ? "page" : undefined} onClick={() => setView("learning")}
              >
                Subject catalog
              </button>
              <button
                className="rounded-xl border bg-white px-4 py-2"
                aria-current={view === "directory" ? "page" : undefined} onClick={() => setView("directory")}
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
    <AppShell user={user} view={view}
      onNavigate={(next) => {
        setView(next);
        if (next === "learning") {
          setSelectedSubject(null);
          setInitialModuleId(undefined);
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
      onLogout={() => {
        setSelectedSubject(null);
        setInitialModuleId(undefined);
        setView("learning");
        logout();
      }}>
        {view === "profile" ? (
          <Profile key={user.id} />
        ) : view === "people" ? (
          <People />
        ) : view === "connections" && user.role !== "admin" ? (
          <Connections key={user.id} />
        ) : view === "users" && user.role === "admin" ? (
          <UserManagement />
        ) : view === "gradebook" && user.role !== "admin" ? (
          <Gradebook key={user.id} />
        ) : view === "system" && user.role === "admin" ? (
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
            onSelectSubject={(subject, moduleId) => {
              setSelectedSubject(subject);
              setInitialModuleId(moduleId);
            }}
          />
        )}
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
