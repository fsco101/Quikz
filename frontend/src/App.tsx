import React, { useEffect, useState } from "react";
import { LandingPage } from "./components/landing/LandingPage.js";
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
import { PaigeGuide } from "./components/mascot/PaigeGuide.js";
const MainApp: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [publicPage, setPublicPage] = useState(() => window.location.hash.slice(2) || "home");
  const [view, setView] = useState("learning");
  const [initialModuleId, setInitialModuleId] = useState<string | undefined>();
  const [lessonOrigin, setLessonOrigin] = useState('learning');

  useEffect(() => {
    const syncPage = () => {
      if (window.location.hash && !window.location.hash.startsWith("#/")) return;
      setPublicPage(window.location.hash.slice(2) || "home");
      setSelectedSubject(null);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  const navigatePublic = (page: string) => {
    window.location.hash = page === "home" ? "/" : `/${page}`;
    setPublicPage(page);
    setSelectedSubject(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  useEffect(() => {
    if (!user) {
      const titles: Record<string, string> = { login: "Log in", signup: "Create an account", catalog: "Subject catalog", lessons: "Lesson directory" };
      document.title = `${titles[publicPage] || "A little progress, every day"} | Quikz`;
      // Move keyboard focus with public-page navigation, without opening a mobile keyboard.
      document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    } else document.title = "Quikz | Learning workspace";
  }, [publicPage, user, loading]);

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

  const paigeContext = !user
    ? (["catalog", "lessons", "login", "signup"].includes(publicPage) ? publicPage : "home")
    : selectedSubject && (view === "learning" || view === "my-lessons") ? "reading" : view;
  const guide = <PaigeGuide context={paigeContext} role={user?.role} />;

  if (!user) {
    const signIn = () => {
      navigatePublic("login");
      setSelectedSubject(null);
      setView("learning");
    };
    if (publicPage === "catalog" || publicPage === "lessons")
      return (
        <div className="public-workspace">
          <div className="public-content space-y-8">
            <header className="public-topbar">
              <Brand onClick={() => navigatePublic("home")} />
              <h1 className="public-page-title">
                {publicPage === "lessons"
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
                aria-current={publicPage === "catalog" ? "page" : undefined} onClick={() => navigatePublic("catalog")}
              >
                Subject catalog
              </button>
              <button
                className="rounded-xl border bg-white px-4 py-2"
                aria-current={publicPage === "lessons" ? "page" : undefined} onClick={() => navigatePublic("lessons")}
              >
                Lesson directory
              </button>
            </nav>
            {publicPage === "lessons" ? (
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
          {guide}
        </div>
      );
    if (publicPage !== "login" && publicPage !== "signup") return <>
      <LandingPage
        onLogin={() => navigatePublic("login")} onSignup={() => navigatePublic("signup")}
        onBrowse={() => navigatePublic("catalog")} onBrowseLessons={() => navigatePublic("lessons")} />
      {guide}
    </>;
    return (
      <>
        <AuthPage
          mode={publicPage === "signup" ? "register" : "login"}
          onModeChange={(mode) => navigatePublic(mode === "register" ? "signup" : "login")}
          onHome={() => navigatePublic("home")}
          onBrowse={() => navigatePublic("catalog")}
          onBrowseLessons={() => navigatePublic("lessons")}
        />
        {guide}
      </>
    );
  }

  return (
    <>
    {guide}
    <AppShell user={user} view={view}
      onNavigate={(next) => {
        setView(next);
        if (next === "learning" || next === "my-lessons") {
          setLessonOrigin(next);
          setSelectedSubject(null);
          setInitialModuleId(undefined);
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
      onLogout={() => {
        setSelectedSubject(null);
        setInitialModuleId(undefined);
        setView("learning");
        navigatePublic("login");
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
        ) : view === "my-lessons" && user.role === "faculty" && !selectedSubject ? (
          <SubjectList key={`${user.id}:mine`} mine onSelectSubject={(subject, moduleId) => {
            setLessonOrigin('my-lessons');
            setSelectedSubject(subject);
            setInitialModuleId(moduleId);
          }} />
        ) : view === "directory" ? (
          <LessonDirectory
            key={`${user.id}:${view}`}
            onOpenLesson={(subject, moduleId) => {
              setLessonOrigin(view);
              setSelectedSubject(subject);
              setInitialModuleId(moduleId);
              setView("learning");
            }}
          />
        ) : selectedSubject ? (
          <ModuleReader
            key={selectedSubject._id}
            subject={selectedSubject}
            backLabel={lessonOrigin === 'my-lessons' ? 'Back to My Lessons' : undefined}
            initialModuleId={initialModuleId}
            onBack={() => { setSelectedSubject(null); setInitialModuleId(undefined); setView(lessonOrigin); }}
          />
        ) : (
          <SubjectList
            onSelectSubject={(subject, moduleId) => {
              setLessonOrigin('learning');
              setSelectedSubject(subject);
              setInitialModuleId(moduleId);
            }}
          />
        )}
    </AppShell>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
