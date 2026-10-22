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
  const handleDemoFill = (type: 'faculty' | 'student') => {
    setMode('login');
    if (type === 'faculty') {
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
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans selection:bg-[#6063ee] selection:text-white">
      {/* Top Header App Bar */}
      <header className="w-full bg-white border-b border-[#c8c5d0]/50 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#070235] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[#e3dfff]">school</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-[#070235]">Quikz</span>
                <span className="bg-[#eff4ff] text-[#4648d4] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-[#d3e4fe]">
                  EduGateway
                </span>
              </div>
              <p className="text-xs text-[#47464f]">Modular Quiz & Academic Learning Platform</p>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-[#eff4ff] p-1 rounded-xl border border-[#c8c5d0]/50 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-[#4648d4] shadow-sm'
                    : 'text-[#47464f] hover:text-[#0b1c30]'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'register'
                    ? 'bg-white text-[#4648d4] shadow-sm'
                    : 'text-[#47464f] hover:text-[#0b1c30]'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Platform Overview & Demo Accounts */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-[#070235] to-[#1e1b4b] rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[#6063ee]/20 rounded-full blur-2xl"></div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#c4c1fb] text-xs font-semibold mb-4 border border-white/15">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Accredited Mastery System
              </span>

              <h2 className="text-2xl font-black leading-snug tracking-tight mb-3">
                Mastery-Based Learning with Gated Progression
              </h2>
              <p className="text-sm text-[#e3dfff]/80 leading-relaxed mb-6">
                Complete modules sequentially, master lecture materials, and achieve the mandatory <strong className="text-white">75% benchmark</strong> on end-quizzes to unlock subsequent topics.
              </p>

              {/* 75% Badge */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/15 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm">
                    75%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Passing Standard</div>
                    <div className="text-[11px] text-[#e3dfff]/70">Strict threshold required to unlock next modules</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-emerald-400">lock_open</span>
              </div>

              {/* Feature Points */}
              <div className="space-y-2.5 text-xs text-[#e3dfff]/90 pt-2 border-t border-white/15">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                  <span>Sequential Scribd-style module document reader</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                  <span>Kahoot-hybrid quiz maker with 10–20 min countdown timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                  <span>Master gradebook with separated Year Level & Section records</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Credentials Card */}
            <div className="bg-white rounded-2xl border border-[#c8c5d0]/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#070235]">Quick Demo Evaluation</h3>
                  <p className="text-xs text-[#47464f]">1-click login with pre-seeded demo accounts</p>
                </div>
                <span className="material-symbols-outlined text-[#6063ee]">smart_button</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoFill('faculty')}
                  className="p-3 rounded-xl border border-[#c8c5d0] hover:border-[#4648d4] bg-[#f8f9ff] hover:bg-[#eff4ff] text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#070235] group-hover:text-[#4648d4]">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    Faculty Demo
                  </div>
                  <div className="text-[11px] text-[#47464f] mt-1">faculty@quikz.edu</div>
                  <div className="text-[10px] text-[#6063ee] font-semibold mt-0.5">Prof. Marcus Alvarez</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('student')}
                  className="p-3 rounded-xl border border-[#c8c5d0] hover:border-[#4648d4] bg-[#f8f9ff] hover:bg-[#eff4ff] text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#070235] group-hover:text-[#4648d4]">
                    <span className="material-symbols-outlined text-[16px]">local_library</span>
                    Student Demo
                  </div>
                  <div className="text-[11px] text-[#47464f] mt-1">student@quikz.edu</div>
                  <div className="text-[10px] text-[#6063ee] font-semibold mt-0.5">Alex Dela Cruz (3rd Yr)</div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication / Registration Card */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-[#c8c5d0]/50 shadow-sm p-8">
              {/* Card Header */}
              <div className="border-b border-[#c8c5d0]/40 pb-5 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#070235]">
                    {mode === 'login' ? 'Institutional Log In' : 'Institutional Registration Gateway'}
                  </h2>
                  <p className="text-xs text-[#47464f] mt-1">
                    {mode === 'login'
                      ? 'Enter your institutional credentials to access your Quikz workspace.'
                      : 'Complete verification and accept the honor code to initialize your profile.'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#eff4ff] text-[#4648d4] text-xs font-bold border border-[#d3e4fe]">
                  {mode === 'login' ? 'Authentication' : 'Step 1 of 2'}
                </span>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {mode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#070235] mb-1.5">
                      Username or Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. faculty@quikz.edu or prof_alvarez"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/10 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#070235] mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/10 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-[#070235] hover:bg-[#1e1b4b] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">login</span>
                    )}
                    <span>{loading ? 'Authenticating...' : 'Sign In to Quikz'}</span>
                  </button>
                </form>
              ) : (
                /* REGISTRATION FORM */
                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#070235] mb-2">
                      Select Institutional Role <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Faculty Card */}
                      <div
                        onClick={() => setRole('faculty')}
                        className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
                          role === 'faculty'
                            ? 'border-[#4648d4] bg-[#eff4ff] shadow-sm'
                            : 'border-[#c8c5d0]/60 hover:border-[#4648d4]/40 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              role === 'faculty' ? 'bg-[#4648d4] text-white' : 'bg-[#eff4ff] text-[#070235]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">school</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#070235]">Faculty / Professor</div>
                            <p className="text-[11px] text-[#47464f] mt-0.5">Author curricula & manage gradebooks</p>
                          </div>
                        </div>
                        {role === 'faculty' && (
                          <span className="absolute top-3 right-3 material-symbols-outlined text-[#4648d4] text-[18px]">
                            check_circle
                          </span>
                        )}
                      </div>

                      {/* Student Card */}
                      <div
                        onClick={() => setRole('student')}
                        className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
                          role === 'student'
                            ? 'border-[#4648d4] bg-[#eff4ff] shadow-sm'
                            : 'border-[#c8c5d0]/60 hover:border-[#4648d4]/40 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              role === 'student' ? 'bg-[#4648d4] text-white' : 'bg-[#eff4ff] text-[#070235]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">local_library</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#070235]">Student / Learner</div>
                            <p className="text-[11px] text-[#47464f] mt-0.5">Progress through modules & take quizzes</p>
                          </div>
                        </div>
                        {role === 'student' && (
                          <span className="absolute top-3 right-3 material-symbols-outlined text-[#4648d4] text-[18px]">
                            check_circle
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#070235] mb-1">
                        First / Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Maria Clara"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#070235] mb-1">
                        Surname <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Santos"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] text-xs"
                      />
                    </div>
                  </div>

                  {/* Account credentials */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#070235] mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. msantos"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#070235] mb-1">
                        Institutional Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. maria@quikz.edu"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#070235] mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#c8c5d0] focus:outline-none focus:border-[#4648d4] text-xs"
                    />
                  </div>

                  {/* Student Specific Fields */}
                  {role === 'student' && (
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#eff4ff] border border-[#d3e4fe]">
                      <div>
                        <label className="block text-xs font-bold text-[#070235] mb-1">
                          Year Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={yearLevel}
                          onChange={(e) => setYearLevel(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#c8c5d0] bg-white text-xs font-semibold text-[#070235] focus:outline-none focus:border-[#4648d4]"
                        >
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#070235] mb-1">
                          Section <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#c8c5d0] bg-white text-xs font-semibold text-[#070235] focus:outline-none focus:border-[#4648d4]"
                        >
                          <option value="Section A">Section A</option>
                          <option value="Section B">Section B</option>
                          <option value="Section C">Section C</option>
                          <option value="Section D">Section D</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Academic Honor Code & Terms Gate */}
                  <div className="p-4 rounded-xl border border-[#c8c5d0] bg-[#f8f9ff] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          termsAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {termsAccepted ? 'check' : 'policy'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#070235]">Academic Honor Code & Policy</div>
                        <div className="text-[11px] text-[#47464f]">
                          {termsAccepted ? 'Accepted & Verified' : 'Mandatory review required before account creation'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        termsAccepted
                          ? 'border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'bg-[#4648d4] text-white hover:bg-[#3436b8]'
                      }`}
                    >
                      {termsAccepted ? 'Review Terms' : 'Read & Accept'}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!termsAccepted || loading}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      termsAccepted && !loading
                        ? 'bg-[#070235] hover:bg-[#1e1b4b] text-white shadow-md hover:shadow-lg cursor-pointer'
                        : 'bg-[#eff4ff] text-[#47464f]/50 cursor-not-allowed border border-[#c8c5d0]/50'
                    }`}
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    )}
                    <span>{loading ? 'Creating Profile...' : 'Complete Account Registration'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {onBrowse && <div className="pb-6 text-center"><button onClick={onBrowse} className="text-sm font-bold text-[#4648d4] underline">Browse the public subject catalog</button></div>}
      {onBrowseLessons && <div className="pb-6 text-center"><button onClick={onBrowseLessons} className="text-sm font-bold text-[#4648d4] underline">Browse the public lesson directory</button></div>}
      {/* Mandatory Terms & Honor Code Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setErrorMsg(null);
        }}
      />
    </div>
  );
};
