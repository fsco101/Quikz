import React, { useState } from "react";
import { api } from "../../services/api.js";
import { ModuleItem, Subject } from "../../types/curriculum.js";
import { Question } from "../../types/quiz.js";
const blank = (): Question => ({
  questionText: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});
const field =
  "w-full rounded-xl border border-[#c8c5d0] bg-white px-3 py-2 text-sm focus:border-[#6063ee] focus:outline-none";
const button =
  "rounded-xl bg-[#4648d4] px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
export function QuizStudio({
  subject,
  module,
  onClose,
  onPublished,
}: {
  subject: Subject;
  module: ModuleItem;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [title, setTitle] = useState(`${module.title} — End Quiz`);
  const [minutes, setMinutes] = useState(15);
  const [questions, setQuestions] = useState<Question[]>(
    Array.from({ length: 4 }, blank),
  );
  const [mode, setMode] = useState("manual");
  const [content, setContent] = useState(module.textContent || "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const edit = (index: number, patch: Partial<Question>) =>
    setQuestions((q) =>
      q.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const valid =
    title.trim() &&
    Number.isFinite(minutes) &&
    minutes >= 10 &&
    minutes <= 20 &&
    questions.length >= 4 &&
    questions.length <= 100 &&
    questions.every(
      (q) =>
        q.questionText.trim() &&
        q.options.length === 4 &&
        q.options.every((o) => o.trim()) &&
        new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex! >= 0 &&
        q.correctIndex! < 4,
    );
  const load = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      if (file) data.append("file", file);
      else if (mode === "lecture") data.append("content", content);
      else throw new Error("Select a question bank file.");
      const result = await api.request<{ questions: Question[] }>(
        `/quizzes/${mode === "import" ? "import" : "generate"}`,
        { method: "POST", body: data },
      );
      setQuestions(result.questions);
      setNotice(
        `Loaded ${result.questions.length} questions. Review the answer keys and explanations below before publishing.`,
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      await api.request("/quizzes", {
        method: "POST",
        body: JSON.stringify({
          title,
          subjectId: subject._id,
          moduleId: module._id,
          timeLimitMinutes: minutes,
          questions,
        }),
      });
      onPublished();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const template = (format: string) => {
    const samples = Array.from({ length: 4 }, (_, i) => ({
      questionText: `Sample question ${i + 1}?`,
      options: ["Correct answer", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      explanation: "Explain the correct answer here.",
    }));
    const text =
      format === "json"
        ? JSON.stringify(samples, null, 2)
        : format === "csv"
          ? "questionText,optionA,optionB,optionC,optionD,correctIndex,explanation\n" +
            samples
              .map(
                (q) =>
                  `${q.questionText},${q.options.join(",")},0,${q.explanation}`,
              )
              .join("\n")
          : samples
              .map(
                (q) =>
                  `${q.questionText}\nA. Correct answer\nB. Option B\nC. Option C\nD. Option D\nANSWER: A`,
              )
              .join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `quikz-template.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="fixed inset-0 !m-0 z-50 overflow-y-auto bg-[#f8f9ff]"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz Studio"
    >
      <form
        onSubmit={publish}
        className="mx-auto max-w-5xl p-4 md:p-8 space-y-6"
      >
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6063ee]">
              {subject.code} / Faculty workspace
            </p>
            <h1 className="text-3xl font-black text-[#070235]">Quiz Studio</h1>
            <p className="mt-1 text-sm text-slate-600">
              Build, review, and publish the assessment for this module.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border px-4 py-2"
          >
            Close studio
          </button>
        </header>
        <section className="rounded-2xl border bg-white p-5 grid gap-4 md:grid-cols-[1fr_200px]">
          <label className="text-sm font-bold">
            Quiz title
            <input
              aria-label="Quiz title"
              className={`${field} mt-2`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="text-sm font-bold">
            Time limit (10–20 min)
            <input
              aria-label="Time limit in minutes"
              type="number"
              min="10"
              max="20"
              step="any"
              className={`${field} mt-2`}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
          </label>
          <p className="text-xs text-slate-500 md:col-span-2">
            Passing mark: 75% · 4–100 questions · Four options per question ·
            Module quizzes can be retaken immediately. Answer choices shuffle
            for each attempt.
          </p>
        </section>
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Creation mode"
          >
            {[
              ["manual", "Manual builder"],
              ["import", "Import question bank"],
              ["lecture", "Generate from lecture"],
            ].map(([value, label]) => (
              <button
                role="tab"
                aria-selected={mode === value}
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setFile(null);
                  setError("");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === value ? "bg-[#070235] text-white" : "bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "import" && (
            <>
              <p className="text-sm text-slate-600">
                Upload JSON, CSV, or Aiken. JSON/CSV answer indexes start at 0;
                Aiken uses ANSWER: A–D. Import replaces the current draft after
                validation.
              </p>
              <div className="flex gap-4 text-sm">
                {["json", "csv", "aiken"].map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => template(f)}
                    className="text-[#4648d4] underline"
                  >
                    {f.toUpperCase()} template
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === "lecture" && (
            <>
              <p className="text-sm text-slate-600">
                Use at least four distinct definitions, such as “Photosynthesis:
                the process plants use to convert light into energy.” Generated
                questions use other lecture definitions as distractors. Review
                all wording and keys.
              </p>
              <label className="block text-sm font-bold">
                Lecture notes
                <textarea
                  aria-label="Lecture notes"
                  className={`${field} mt-2`}
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <p className="text-xs text-slate-500">
                Or upload TXT, MD, PDF, DOCX, or PPTX (25 MB max). An attached
                file takes precedence over pasted text. Scanned PDFs require
                OCR.
              </p>
            </>
          )}
          {mode !== "manual" && (
            <div className="flex flex-wrap items-center gap-4">
              <input
                key={mode}
                aria-label={
                  mode === "import" ? "Question bank file" : "Lecture file"
                }
                type="file"
                accept={
                  mode === "import"
                    ? ".json,.csv,.aiken,.txt"
                    : ".txt,.md,.pdf,.docx,.pptx"
                }
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={load}
                className={button}
              >
                {busy
                  ? "Processing…"
                  : mode === "import"
                    ? "Validate & preview"
                    : "Generate preview"}
              </button>
            </div>
          )}
        </section>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 whitespace-pre-line"
          >
            {error}
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800"
          >
            {notice}
          </p>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#070235]">
            Question preview{" "}
            <span className="text-sm text-slate-500">({questions.length})</span>
          </h2>
          <button
            type="button"
            className={button}
            disabled={busy || questions.length >= 100}
            onClick={() => setQuestions((q) => [...q, blank()])}
          >
            + Add question
          </button>
        </div>
        {questions.map((q, i) => (
          <section
            key={i}
            className="rounded-2xl border bg-white p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Question {i + 1}</h3>
              <button
                aria-label={`Remove question ${i + 1}`}
                type="button"
                disabled={busy}
                onClick={() =>
                  setQuestions((qs) => qs.filter((_, index) => index !== i))
                }
                className="text-sm text-red-600"
              >
                Remove
              </button>
            </div>
            <label className="block text-sm">
              Question text
              <textarea
                aria-label={`Question ${i + 1} text`}
                required
                className={`${field} mt-1`}
                value={q.questionText}
                onChange={(e) => edit(i, { questionText: e.target.value })}
              />
            </label>
            <fieldset>
              <legend className="text-xs text-slate-500 mb-2">
                Select the correct answer, then edit the four options.
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                {q.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-2 rounded-xl border p-2 ${q.correctIndex === index ? "border-emerald-400 bg-emerald-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`answer-${i}`}
                      aria-label={`Question ${i + 1} correct answer ${"ABCD"[index]}`}
                      checked={q.correctIndex === index}
                      onChange={() => edit(i, { correctIndex: index })}
                    />
                    <span className="font-bold text-xs">{"ABCD"[index]}</span>
                    <input
                      required
                      aria-label={`Question ${i + 1} option ${"ABCD"[index]}`}
                      className="w-full bg-transparent text-sm p-1 outline-none"
                      value={option}
                      onChange={(e) =>
                        edit(i, {
                          options: q.options.map((o, j) =>
                            j === index ? e.target.value : o,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              Explanation
              <textarea
                aria-label={`Question ${i + 1} explanation`}
                className={`${field} mt-1`}
                value={q.explanation}
                onChange={(e) => edit(i, { explanation: e.target.value })}
              />
            </label>
          </section>
        ))}
        <footer className="sticky bottom-0 rounded-2xl bg-[#070235] p-4 flex flex-wrap items-center justify-between gap-3 text-white">
          <p className="text-sm">
            {valid
              ? "Ready for faculty review and publication."
              : "Complete all fields, provide 4–100 questions and four distinct options each."}
          </p>
          <button type="submit" disabled={!valid || busy} className={button}>
            {busy ? "Working…" : "Publish module quiz"}
          </button>
        </footer>
      </form>
    </div>
  );
}
