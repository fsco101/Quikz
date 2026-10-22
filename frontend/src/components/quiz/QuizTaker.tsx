import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.js";
import { Attempt, Quiz, Submission } from "../../types/quiz.js";
const colors = ["bg-rose-600", "bg-blue-600", "bg-amber-600", "bg-emerald-600"];
export function QuizTaker({
  quizId,
  onClose,
}: {
  quizId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [blurs, setBlurs] = useState(0);
  const [result, setResult] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const token = useRef("");
  const answersRef = useRef<number[]>([]);
  const deadline = useRef(0);
  const submitting = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const completed = useRef(false);
  const endpoint = attempt ? `/quizzes/${quizId}/attempts/${attempt.id}` : "";
  useEffect(() => {
    const key = `quikz_session_${user?.id}_${quizId}`;
    token.current = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, token.current);
  }, [quizId, user]);
  const acceptResult = (submission: Submission) => {
    completed.current = true;
    setResult(submission);
    setError("");
  };
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.request<{ quiz: Quiz; attempt: Attempt }>(
        `/quizzes/${quizId}/attempts`,
        {
          method: "POST",
          body: JSON.stringify({ sessionToken: token.current }),
        },
      );
      deadline.current =
        performance.now() +
        Math.max(
          0,
          Date.parse(res.attempt.expiresAt) - Date.parse(res.attempt.serverNow),
        );
      answersRef.current = res.attempt.answers;
      completed.current = false;
      setResult(null);
      setPosition(0);
      setAnswers(res.attempt.answers);
      setRemaining(Math.ceil((deadline.current - performance.now()) / 1000));
      setBlurs(res.attempt.blurCount);
      setQuiz(res.quiz);
      setAttempt(res.attempt);
      setSaved("Answers saved");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const save = (blur = false) => {
    if (!attempt || submitting.current || completed.current) return;
    const draft = [...answersRef.current];
    setSaved("Saving…");
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await api.request<{
          submission?: Submission;
          blurCount: number;
        }>(endpoint, {
          method: "PATCH",
          body: JSON.stringify({
            sessionToken: token.current,
            answers: draft,
            blur,
          }),
        });
        if (res.submission) acceptResult(res.submission);
        else {
          setBlurs(res.blurCount);
          setSaved("Answers saved");
        }
      })
      .catch((err: Error) => {
        setSaved("Save failed — your answers remain in this tab.");
        setError(err.message);
      });
  };
  const submit = async () => {
    if (!attempt || submitting.current || completed.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await queue.current;
      if (completed.current) return;
      const res = await api.request<{ submission: Submission }>(
        `${endpoint}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionToken: token.current,
            answers: answersRef.current,
          }),
        },
      );
      acceptResult(res.submission);
    } catch (err: any) {
      setError(
        `${err.message} Your attempt is preserved. Retry submission below.`,
      );
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!attempt || result) return;
    let autoSubmitted = false;
    const timer = window.setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - performance.now()) / 1000),
      );
      setRemaining(seconds);
      if (!seconds && !autoSubmitted) {
        autoSubmitted = true;
        void submitRef.current();
      }
    }, 250);
    let away = false;
    const lostFocus = () => {
      if (!away) {
        away = true;
        setBlurs((n) => n + 1);
        saveRef.current(true);
      }
    };
    const focus = () => {
      if (!document.hidden) away = false;
    };
    const visibility = () => {
      if (document.hidden) lostFocus();
      else focus();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!completed.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("blur", lostFocus);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("blur", lostFocus);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [attempt, result]);
  const option = (index: number) => {
    if (remaining <= 0 || busy) return;
    const updated = answersRef.current.map((value, i) =>
      i === position ? index : value,
    );
    answersRef.current = updated;
    setAnswers(updated);
    save();
  };
  const q = quiz?.questions[position];
  const answered = answers.filter((a) => a >= 0).length;
  return (
    <div
      className="fixed inset-0 !m-0 z-50 overflow-y-auto bg-[#070235] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz assessment"
    >
      <div className="mx-auto max-w-5xl p-5 md:p-10 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
              Quikz / Assessment
            </p>
            <h1 className="text-xl md:text-3xl font-black">
              {quiz?.title || "End-of-module quiz"}
            </h1>
          </div>
          {(!attempt || result) && (
            <button
              className="rounded-xl border border-white/30 px-4 py-2"
              onClick={onClose}
            >
              Return to lesson
            </button>
          )}
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-300/50 bg-red-950 p-4 text-sm whitespace-pre-line"
          >
            {error}
          </p>
        )}
        {result ? (
          <section className="rounded-3xl bg-white p-10 text-center text-[#070235] space-y-5">
            <span className="material-symbols-outlined text-6xl">
              {result.passed ? "workspace_premium" : "menu_book"}
            </span>
            <h2 className="text-3xl font-black">
              {result.passed ? "Mastery achieved!" : "Keep practicing"}
            </h2>
            <p className="text-6xl font-black text-[#4648d4]">
              {Number(result.percentage.toFixed(2))}%
            </p>
            <p>
              {result.score} of {result.totalQuestions} correct · Passing mark
              75%
            </p>
            <p>
              {result.passed
                ? "Your result is saved. The next module is now unlocked."
                : quiz?.moduleId
                  ? "Your result is saved. You can retake this module quiz immediately with reshuffled answer choices."
                  : `Your result is saved. Review the lecture before your next attempt${result.retryAfter ? `, available after ${new Date(result.retryAfter).toLocaleTimeString()}` : ""}.`}
            </p>
            <p className="text-sm text-slate-500">
              Focus warnings recorded: {result.blurCount}
            </p>
            {quiz?.moduleId && (
              <button
                disabled={busy}
                onClick={start}
                className="rounded-xl bg-[#4648d4] px-6 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? "Starting retake…" : "Retake module quiz"}
              </button>
            )}
            <button
              className="rounded-xl bg-[#4648d4] px-6 py-3 font-bold text-white"
              onClick={onClose}
            >
              Return to learning path
            </button>
          </section>
        ) : !attempt ? (
          <section className="rounded-3xl bg-white/10 p-8 space-y-5">
            <h2 className="text-2xl font-bold">
              Ready to check your understanding?
            </h2>
            <p>
              Score at least 75% to unlock the next module. Your faculty has set
              a 10–20 minute time limit. The countdown begins when you start and
              continues if you refresh or leave this page.
            </p>
            <p>
              Only one quiz session can be active at a time. Tab changes and
              loss of window focus record an integrity warning. Answers save as
              you select them; saved answers are submitted when time expires.
            </p>
            <p className="text-indigo-200 text-sm">
              If you previously started in this tab, this button resumes your
              existing timer.
            </p>
            <button
              disabled={busy}
              onClick={start}
              className="rounded-xl bg-[#6063ee] px-6 py-3 font-bold disabled:opacity-50"
            >
              {busy ? "Opening session…" : "Start / resume quiz"}
            </button>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/10 p-4">
              <div>
                <p className="font-bold">
                  Question {position + 1} of {quiz!.questions.length}
                </p>
                <p className="text-xs text-indigo-200">
                  {answered} answered · {saved}
                </p>
              </div>
              <div
                className={`relative h-20 w-20 ${remaining <= 120 ? "animate-pulse text-rose-300" : "text-indigo-200"}`}
                role="timer"
                aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
              >
                <svg
                  viewBox="0 0 80 80"
                  className="absolute inset-0 -rotate-90"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    opacity=".2"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="220"
                    strokeDashoffset={
                      220 * (1 - remaining / (quiz!.timeLimitMinutes * 60))
                    }
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono font-bold">
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
            {blurs > 0 && (
              <p
                role="status"
                className="rounded-xl bg-amber-400/20 p-3 text-sm text-amber-100"
              >
                Focus warning {blurs}: stay in the quiz window while your
                assessment is active.
              </p>
            )}
            <section className="space-y-5">
              <h2 className="rounded-2xl bg-white p-8 text-center text-xl md:text-2xl font-bold text-[#070235]">
                {q?.questionText}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {q?.options.map((answer, index) => (
                  <button
                    key={index}
                    disabled={busy || remaining <= 0}
                    aria-pressed={answers[position] === index}
                    onClick={() => option(index)}
                    className={`${colors[index]} min-h-28 rounded-2xl p-5 text-left flex items-center gap-4 font-bold transition-transform hover:scale-[1.01] disabled:opacity-60 ${answers[position] === index ? "ring-4 ring-white ring-offset-4 ring-offset-[#070235]" : ""}`}
                  >
                    <span className="text-2xl opacity-80">
                      {["A", "B", "C", "D"][index]}
                    </span>
                    <span>{answer}</span>
                    {answers[position] === index && (
                      <span className="ml-auto" aria-label="Selected">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
            <nav className="flex flex-wrap gap-2" aria-label="Questions">
              {answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => setPosition(index)}
                  aria-label={`Go to question ${index + 1}${answer >= 0 ? ", answered" : ""}`}
                  aria-current={position === index ? "step" : undefined}
                  className={`rounded-lg w-9 h-9 text-sm font-bold ${position === index ? "bg-white text-[#070235]" : answer >= 0 ? "bg-emerald-600" : "bg-white/10"}`}
                >
                  {index + 1}
                </button>
              ))}
            </nav>
            <footer className="flex flex-wrap gap-3 items-center justify-between">
              <button
                disabled={position === 0}
                onClick={() => setPosition((p) => p - 1)}
                className="rounded-xl border px-4 py-2 disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex gap-3">
                {position < quiz!.questions.length - 1 && (
                  <button
                    onClick={() => setPosition((p) => p + 1)}
                    className="rounded-xl border px-4 py-2"
                  >
                    Next question
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={submit}
                  className="rounded-xl bg-white px-5 py-2 font-bold text-[#070235] disabled:opacity-40"
                >
                  {busy
                    ? "Saving result…"
                    : remaining <= 0
                      ? "Retry submission"
                      : `Submit quiz (${answered}/${answers.length})`}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
