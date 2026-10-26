import { ReactNode } from "react";
import { BookOpen, BarChart3, Library, Users, UserCircle, Activity, ShieldCheck, LogOut, ChevronRight, ArrowUpRight, Link2 } from "lucide-react";
import { User } from "../../types/auth.js";
import { Avatar } from "../users/Avatar.js";
import { Brand } from "./Brand.js";

export function AppShell({ user, view, onNavigate, onLogout, children }: {
  user: User; view: string; onNavigate: (view: string) => void; onLogout: () => void; children: ReactNode;
}) {
  const links = [
    { key: "learning", label: "Learning path", icon: BookOpen },
    ...(user.role === "admin" ? [] : [{ key: "gradebook", label: user.role === "faculty" ? "Master gradebook" : "My results", icon: BarChart3 }]),
    { key: "directory", label: "Lesson directory", icon: Library },
    ...(user.role === "admin" ? [] : [{ key: "connections", label: "Connections", icon: Link2 }]),
    { key: "people", label: "People", icon: Users },
    { key: "profile", label: "My profile", icon: UserCircle },
    ...(user.role === "admin" ? [
      { key: "system", label: "System health", icon: Activity },
      { key: "users", label: "User management", icon: ShieldCheck },
    ] : []),
  ];
  const current = links.find((link) => link.key === view)?.label || "Learning path";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="app-sidebar">
        <div className="sidebar-brand"><Brand light onClick={() => onNavigate("learning")} /><p>Your space to grow.</p></div>
        <p className="sidebar-caption">Workspace</p>
        <nav aria-label="Main navigation" className="workspace-nav">
          {links.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onNavigate(key)} aria-current={view === key ? "page" : undefined}>
            <Icon size={19} aria-hidden="true" /><span>{label}</span>{view === key && <span className="nav-indicator" />}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="sidebar-note-icon"><BookOpen size={21} aria-hidden="true" /></span>
            <p>A little learning.<br />A lot of possibility.</p>
            <button onClick={() => onNavigate("directory")}>Explore lessons <ArrowUpRight size={15} aria-hidden="true" /></button>
          </div>
          <div className="sidebar-account"><span className="role-dot" /><span>{user.role} workspace</span></div>
          <button className="sidebar-signout" onClick={onLogout}><LogOut size={18} aria-hidden="true" /> Sign Out</button>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="workspace-topbar">
          <div className="mobile-brand"><Brand onClick={() => onNavigate("learning")} /></div>
          <div className="workspace-breadcrumb"><span>Workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>{current}</strong></div>
          <div className="topbar-account">
            <div className="topbar-identity"><strong>{user.fullName}</strong><span>{user.role === "student" ? `${user.yearLevel} · ${user.section}` : `${user.role} workspace`}</span></div>
            <button aria-label="Open my profile" className="profile-shortcut" onClick={() => onNavigate("profile")}><Avatar userId={user.id} name={user.fullName} url={user.avatarUrl} /></button>
            <button className="mobile-signout" onClick={onLogout} aria-label="Sign Out"><LogOut size={19} aria-hidden="true" /></button>
          </div>
        </header>
        <main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main>
        <footer className="workspace-footer"><span>Quikz · Learning, one step at a time.</span><span>Explore. Practice. Progress.</span></footer>
      </div>
    </div>
  );
}
