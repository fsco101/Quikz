import { AlertCircle, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, GraduationCap, Layers, PencilLine, ShieldCheck } from 'lucide-react';
import { Brand } from '../layout/Brand.js';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { TermsModal } from './TermsModal.js';
import { UserRole } from '../../types/auth.js';

export const AuthPage: React.FC<{ onBrowse?: () => void; onBrowseLessons?: () => void }> = ({ onBrowse,onBrowseLessons }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('student');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [surname, setSurname] = useState('');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [section, setSection] = useState('Section A');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick demo filler
  const handleDemoFill = (type: 'faculty' | 'student' | 'admin') => {
    setMode('login');
    if (type === 'admin') {
      setLoginIdentifier('admin@quikz.edu'); setLoginPassword('Admin@123');
    } else if (type === 'faculty') {
      setLoginIdentifier('faculty@quikz.edu');
      setLoginPassword('Faculty@123');
    } else {
      setLoginIdentifier('student@quikz.edu');
      setLoginPassword('Student@123');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login({ loginIdentifier, password: loginPassword });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!termsAccepted) {
      setErrorMsg('You must review and accept the Academic Honor Code and Terms before creating an account.');
      setIsTermsModalOpen(true);
      return;
    }

    setLoading(true);

    try {
      await register({
        username,
        email,
        password,
        role,
        fullName,
        surname,
        yearLevel: role === 'student' ? yearLevel : undefined,
        section: role === 'student' ? section : undefined,
        termsAccepted: true
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-topbar"><Brand /><div className="auth-mode-switch" aria-label="Account options">
        <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setErrorMsg(null); }}>Log In</button>
        <button type="button" aria-pressed={mode === "register"} onClick={() => { setMode("register"); setErrorMsg(null); }}>Create Account</button>
      </div></header>
      <main className="auth-layout">
        <section className="auth-story">
          <span className="auth-story-label"><span /> A little progress, every day</span>
          <h1>Big ideas.<br />Small steps.<br /><span>Lasting knowledge.</span></h1>
          <p>A calmer place to learn, teach, and see your progress. Your next chapter is waiting.</p>
          <div className="auth-path" aria-label="How learning works">
            <div><span><BookOpen size={20} aria-hidden="true" /></span><section><strong>Explore a lesson</strong><p>Clear topics. A path that makes sense.</p></section></div>
            <div><span><PencilLine size={20} aria-hidden="true" /></span><section><strong>Put it into practice</strong><p>Check your understanding with a quiz.</p></section></div>
            <div><span><CheckCircle2 size={20} aria-hidden="true" /></span><section><strong>See yourself grow</strong><p>Master a module. Unlock what comes next.</p></section></div>
          </div>
          <div className="auth-story-foot"><Layers size={18} aria-hidden="true" /><span>Made for curious minds. Built for meaningful learning.</span></div>
        </section>
        <section className="auth-form-panel">
          <div className="auth-form-heading"><p className="eyebrow">{mode === "login" ? "Your learning space" : "A fresh start"}</p>
            <h2>{mode === "login" ? "Welcome back." : "Make yourself at home."}</h2>
            <p>{mode === "login" ? "Sign in to pick up where you left off." : "Create your profile and start your Quikz journey."}</p>
          </div>
          {errorMsg && <div role="alert" className="auth-error"><AlertCircle size={18} aria-hidden="true" /><span>{errorMsg}</span></div>}
          {mode === "login" ? <form onSubmit={handleLoginSubmit} className="auth-form">
            <label>Username or Email<input type="text" autoComplete="username" required value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} placeholder="e.g. faculty@quikz.edu or prof_alvarez" /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" /></label>
            <button type="submit" disabled={loading} className="ui-button ui-button-primary auth-submit">{loading ? <span className="loading-ring" /> : <ArrowRight size={18} aria-hidden="true" />}<span>{loading ? "Authenticating..." : "Sign In to Quikz"}</span></button>
          </form> : <form onSubmit={handleRegisterSubmit} className="auth-form">
            <fieldset><legend>I am joining as a</legend><div className="auth-role-options">
              <button type="button" aria-pressed={role === "student"} onClick={() => setRole("student")}><BookOpen size={19} aria-hidden="true" /><strong>Student / Learner</strong><span>Explore, practice and grow</span></button>
              <button type="button" aria-pressed={role === "faculty"} onClick={() => setRole("faculty")}><GraduationCap size={19} aria-hidden="true" /><strong>Faculty / Professor</strong><span>Teach and guide progress</span></button>
            </div></fieldset>
            <div className="auth-field-row">
              <label>First / Full Name<input autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Maria Clara" /></label>
              <label>Surname<input autoComplete="family-name" required value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="e.g. Santos" /></label>
            </div>
            <div className="auth-field-row">
              <label>Username<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. msantos" /></label>
              <label>Institutional Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. maria@quikz.edu" /></label>
            </div>
            <label>Password<input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
            {role === "student" && <div className="auth-field-row">
              <label>Year Level<select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => <option key={year}>{year}</option>)}</select></label>
              <label>Section<select value={section} onChange={(e) => setSection(e.target.value)}>{["Section A", "Section B", "Section C", "Section D"].map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>}
            <div className={`auth-consent ${termsAccepted ? "consent-accepted" : ""}`}><ShieldCheck size={22} aria-hidden="true" /><div><strong>Academic Honor Code & Policy</strong><p>{termsAccepted ? "Accepted. You're ready to continue." : "Please review the terms before joining."}</p></div><button type="button" onClick={() => setIsTermsModalOpen(true)}>{termsAccepted ? "Review Terms" : "Read & Accept"}</button></div>
            <button type="submit" disabled={!termsAccepted || loading} className="ui-button ui-button-primary auth-submit">{loading ? "Creating Profile..." : "Complete Account Registration"}<ArrowRight size={17} aria-hidden="true" /></button>
          </form>}
          <div className="auth-demo"><div className="auth-divider"><span>Take a look around</span></div><p>Choose a demo to fill in the sign-in form.</p><div className="auth-demo-options">
            <button onClick={() => handleDemoFill("student")}><BookOpen size={16} aria-hidden="true" />Student Demo</button>
            <button onClick={() => handleDemoFill("faculty")}><GraduationCap size={17} aria-hidden="true" />Faculty Demo</button>
            {import.meta.env.DEV && <button onClick={() => handleDemoFill("admin")}><ShieldCheck size={16} aria-hidden="true" />Admin Demo</button>}
          </div></div>
        </section>
      </main>
      <footer className="auth-footer"><span>Curiosity is always welcome.</span><div>{onBrowse && <button onClick={onBrowse}>Browse the public subject catalog <ArrowUpRight size={14} aria-hidden="true" /></button>}{onBrowseLessons && <button onClick={onBrowseLessons}>Browse the public lesson directory <ArrowUpRight size={14} aria-hidden="true" /></button>}</div></footer>
      <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} onAccept={() => { setTermsAccepted(true); setErrorMsg(null); }} />
    </div>
  );
};
