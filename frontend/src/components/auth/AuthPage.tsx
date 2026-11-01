import { ValidatedForm } from "../ui/ValidatedForm.js";
import { AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, Eye, EyeOff, GraduationCap, Layers, LockKeyhole, PencilLine, ShieldCheck } from 'lucide-react';
import { Brand } from '../layout/Brand.js';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { TermsModal } from './TermsModal.js';
import { UserRole } from '../../types/auth.js';

type AuthMode = 'login' | 'register';
export const AuthPage: React.FC<{ mode: AuthMode; onModeChange: (mode: AuthMode) => void; onHome: () => void; onBrowse?: () => void; onBrowseLessons?: () => void }> = ({ mode, onModeChange, onHome, onBrowse, onBrowseLessons }) => {
  const { login, register } = useAuth();

  const setMode = onModeChange;
  const [role, setRole] = useState<UserRole>('student');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [surname, setSurname] = useState('');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [section, setSection] = useState('BSIT-S-1A');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setErrorMsg(null); setShowPassword(false); }, [mode]);
  useEffect(() => { if (errorMsg) errorRef.current?.focus(); }, [errorMsg]);


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

    if (password !== confirmPassword) {
      setErrorMsg('Your passwords do not match. Please check them and try again.');
      return;
    }

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
    <div className={`auth-page auth-refreshed ${mode === 'register' ? 'auth-register' : ''}`}>
      <a className="skip-link" href="#auth-main" onClick={(event) => { event.preventDefault(); document.getElementById('auth-main')?.focus(); }}>Skip to account form</a>
      <header className="auth-topbar"><Brand onClick={onHome} /><div className="auth-mode-switch" aria-label="Account options">
        <button type="button" disabled={loading} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setErrorMsg(null); }}>Log In</button>
        <button type="button" disabled={loading} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setErrorMsg(null); }}>Create Account</button>
      </div></header>
      <main className="auth-layout" tabIndex={-1}>
        <section className="auth-story">
          <span className="auth-story-label"><span /> A little progress, every day</span>
          <h2>{mode === 'login' ? <>Your next<br />“aha” moment<br /><span>starts here.</span></> : <>A curious mind.<br />A fresh start.<br /><span>Your kind of space.</span></>}</h2>
          <p>{mode === 'login' ? 'Pick up a new idea. Build on what you know. Your learning journey is right where you left it.' : 'Whether you’re here to discover or to teach, a little progress can lead to something remarkable.'}</p>
          <div className="auth-path" aria-label="How learning works">
            <div><span><BookOpen size={20} aria-hidden="true" /></span><section><strong>Explore a lesson</strong><p>Clear topics. A path that makes sense.</p></section></div>
            <div><span><PencilLine size={20} aria-hidden="true" /></span><section><strong>Put it into practice</strong><p>Check your understanding with a quiz.</p></section></div>
            <div><span><CheckCircle2 size={20} aria-hidden="true" /></span><section><strong>See yourself grow</strong><p>Master a module. Unlock what comes next.</p></section></div>
          </div>
          <div className="auth-story-foot"><Layers size={18} aria-hidden="true" /><span>Made for curious minds. Built for meaningful learning.</span></div>
        </section>
        <section className="auth-form-panel" id="auth-main" tabIndex={-1}>
          <button type="button" className="auth-back" onClick={onHome}><ArrowLeft size={14} /> Back to home</button>
          <div className="auth-form-heading"><p className="eyebrow">{mode === "login" ? "Your learning space" : "A fresh start"}</p>
            <h1>{mode === "login" ? "Welcome back." : "Make yourself at home."}</h1>
            <p>{mode === "login" ? "Sign in to pick up where you left off." : "Create your profile and start your Quikz journey."}</p>
          </div>
          {errorMsg && <div ref={errorRef} tabIndex={-1} role="alert" className="auth-error"><AlertCircle size={18} aria-hidden="true" /><span>{errorMsg}</span></div>}
          {mode === "login" ? <ValidatedForm key="login" onSubmit={handleLoginSubmit} className="auth-form" aria-busy={loading}>
            <label>Username or Email<input type="text" autoComplete="username" maxLength={254} required value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} placeholder="e.g. you@school.edu or your_username" /></label>
            <div className="auth-password-field"><label htmlFor="login-password">Password</label><div className="auth-password-input"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <button type="submit" disabled={loading} className="ui-button ui-button-primary auth-submit">{loading ? <span className="loading-ring" /> : <ArrowRight size={18} aria-hidden="true" />}<span>{loading ? "Authenticating..." : "Sign In to Quikz"}</span></button>
            <p className="auth-security-note"><LockKeyhole size={13} /> Your next chapter is just a sign-in away.</p>
          </ValidatedForm> : <ValidatedForm key="register" onSubmit={handleRegisterSubmit} className="auth-form" aria-busy={loading}>
            <fieldset><legend>I am joining as a</legend><div className="auth-role-options">
              <button type="button" aria-pressed={role === "student"} onClick={() => setRole("student")}><BookOpen size={19} aria-hidden="true" /><strong>Student / Learner</strong><span>Explore, practice and grow</span></button>
              <button type="button" aria-pressed={role === "faculty"} onClick={() => setRole("faculty")}><GraduationCap size={19} aria-hidden="true" /><strong>Faculty / Professor</strong><span>Teach and guide progress</span></button>
            </div></fieldset>
            <div className="auth-field-row">
              <label>First / Full Name<input autoComplete="name" maxLength={120} required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Maria Clara" /></label>
              <label>Surname<input autoComplete="family-name" maxLength={120} required value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="e.g. Santos" /></label>
            </div>
            <div className="auth-field-row">
              <label>Username<input autoComplete="username" data-validate="username" minLength={3} maxLength={40} required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. msantos" /></label>
              <label>Institutional Email<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. maria@quikz.edu" /></label>
            </div>
            <div className="auth-password-field"><label htmlFor="new-password">Password</label><div className="auth-password-input"><input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby="password-guidance" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p id="password-guidance" className={`auth-password-hint ${password.length >= 6 ? 'is-met' : ''}`}>{password.length >= 6 ? <Check size={13} /> : <LockKeyhole size={13} />} At least 6 characters. A longer, unique password is best.</p></div>
            <label>Confirm password<input data-error={confirmPassword && confirmPassword !== password ? "Your passwords do not match." : undefined} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} aria-invalid={confirmPassword.length > 0 && confirmPassword !== password} aria-describedby={confirmPassword ? 'password-match' : undefined} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter your password again" /></label>
            {confirmPassword && <p id="password-match" className={`auth-password-hint auth-match ${confirmPassword === password ? 'is-met' : ''}`} role="status">{confirmPassword === password ? <><Check size={13} /> Passwords match.</> : 'Your passwords do not match yet.'}</p>}
            {role === "student" && <div className="auth-field-row">
              <label>Year Level<select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => <option key={year}>{year}</option>)}</select></label>
              <label>Section<select value={section} onChange={(e) => setSection(e.target.value)}>{["BSIT-S-1A", "BSIT-S-1B", "BSIT-S-2A", "BSIT-S-2B", "BSIT-S-3A", "BSIT-S-3B", "BSIT-S-4A", "BSIT-NS-4A"].map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>}
            <div className={`auth-consent ${termsAccepted ? "consent-accepted" : ""}`}><ShieldCheck size={22} aria-hidden="true" /><div><strong>Academic Honor Code & Policy</strong><p>{termsAccepted ? "Accepted. You're ready to continue." : "Please review the terms before joining."}</p></div><button type="button" onClick={() => setIsTermsModalOpen(true)}>{termsAccepted ? "Review Terms" : "Read & Accept"}</button></div>
            <button type="submit" disabled={!termsAccepted || loading} className="ui-button ui-button-primary auth-submit">{loading ? "Creating Profile..." : "Complete Account Registration"}<ArrowRight size={17} aria-hidden="true" /></button>
          </ValidatedForm>}
          <p className="auth-alternate">{mode === 'login' ? 'New to Quikz?' : 'Already have an account?'} <button type="button" disabled={loading} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create your account' : 'Sign in instead'} <ArrowRight size={13} /></button></p>
        </section>
      </main>
      <footer className="auth-footer"><span>Curiosity is always welcome.</span><div>{onBrowse && <button onClick={onBrowse}>Browse the public subject catalog <ArrowUpRight size={14} aria-hidden="true" /></button>}{onBrowseLessons && <button onClick={onBrowseLessons}>Browse the public lesson directory <ArrowUpRight size={14} aria-hidden="true" /></button>}</div></footer>
      <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} onAccept={() => { setTermsAccepted(true); setErrorMsg(null); }} />
    </div>
  );
};
