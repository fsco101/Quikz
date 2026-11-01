import React, { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { ModuleItem, Subject } from "../../types/curriculum.js";
import { Quiz, Question } from "../../types/quiz.js";
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
type GenerationReport = {
  factsFound: number; duplicatesRemoved: number; skippedLines: number;
  questionTypes: { definition: number; identification: number; cloze: number };
  warnings: string[];
  source?: { type: 'module-attachment'; moduleId: string; moduleVersion: number; fileName: string };
};
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
  const [duration, setDuration] = useState(30);
  const [timeUnit, setTimeUnit] = useState("seconds");
  const [passingPercentage, setPassingPercentage] = useState(75);
  const [questionCount, setQuestionCount] = useState(4);
  const seconds = duration * (timeUnit === "minutes" ? 60 : 1);
  const [questions, setQuestions] = useState<Question[]>(
    Array.from({ length: 4 }, blank),
  );
  const [mode, setMode] = useState("manual");
  const [content, setContent] = useState(module.textContent || "");
  const [file, setFile] = useState<File | null>(null);
  const [draftLimit, setDraftLimit] = useState(20);
  const [questionStyle, setQuestionStyle] = useState('mixed');
  const [generationReport, setGenerationReport] = useState<GenerationReport | null>(null);
  const hasModuleAttachment = !!(module.fileName && module.fileUrl);
  const supportedAttachment = hasModuleAttachment && /\.(txt|md|pdf|docx|pptx)$/i.test(module.fileName!);
  const [lectureSource, setLectureSource] = useState<'module' | 'other'>(supportedAttachment ? 'module' : 'other');
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(!!module.quizId);
  const [version, setVersion] = useState<number>();
  const [legacyTotal, setLegacyTotal] = useState(false);
  useEffect(() => {
    if (!module.quizId) return;
    let cancelled = false;
    api
      .request<{ quiz: Quiz & { __v: number } }>(
        `/quizzes/${module.quizId._id}`,
      )
      .then(({ quiz }) => {
        if (cancelled) return;
        setTitle(quiz.title);
        setQuestions(quiz.questions);
        setQuestionCount(quiz.questionCount ?? quiz.questions.length);
        setPassingPercentage(quiz.passingPercentage);
        setVersion(quiz.__v);
        setLegacyTotal(!quiz.timePerQuestionSeconds);
        setDuration(quiz.timePerQuestionSeconds ?? quiz.timeLimitMinutes);
        setTimeUnit(quiz.timePerQuestionSeconds ? "seconds" : "minutes");
        setNotice(
          "Editing this quiz. Active attempts and saved results keep their original grading settings.",
        );
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [module.quizId?._id]);
  const edit = (index: number, patch: Partial<Question>) =>
    setQuestions((q) =>
      q.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const valid =
    title.trim() &&
    Number.isFinite(seconds) &&
    seconds >= 1 &&
    seconds <= 86400 &&
    Number.isFinite(passingPercentage) &&
    passingPercentage >= 1 &&
    passingPercentage <= 100 &&
    Number.isInteger(questionCount) &&
    questionCount >= 1 &&
    questionCount <= questions.length &&
    questions.length >= 1 &&
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
    setGenerationReport(null);
    try {
      let endpoint: string;
      let options: RequestInit;
      if (mode === 'lecture' && lectureSource === 'module') {
        endpoint = `/quizzes/generate/module/${encodeURIComponent(module._id)}`;
        options = { method: 'POST', body: JSON.stringify({ questionLimit: draftLimit, questionStyle, moduleVersion: module.__v }) };
      } else {
        const data = new FormData();
        if (file) data.append("file", file);
        else if (mode === "lecture") data.append("content", content);
        else throw new Error("Select a question bank file.");
        if (mode === 'lecture') {
          data.append('questionLimit', String(draftLimit));
          data.append('questionStyle', questionStyle);
        }
        endpoint = `/quizzes/${mode === 'import' ? 'import' : 'generate'}`;
        options = { method: 'POST', body: data };
      }
      const result = await api.request<{ questions: Question[]; report?: GenerationReport }>(
        endpoint, options,
      );
      setQuestions(result.questions);
      setGenerationReport(result.report || null);
      setQuestionCount(result.questions.length);
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
      await api.request(
        module.quizId ? `/quizzes/${module.quizId._id}` : "/quizzes",
        {
          method: module.quizId ? "PATCH" : "POST",
          body: JSON.stringify({
            title,
            subjectId: subject._id,
            moduleId: module._id,
            ...(legacyTotal
              ? { timeLimitMinutes: seconds / 60 }
              : { timePerQuestion: duration, timeUnit }),
            version,
            passingPercentage,
            questionCount,
            questions,
          }),
        },
      );
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
      className="quiz-studio fixed inset-0 !m-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz Studio"
    >
      <form
        onSubmit={publish}
        className="mx-auto max-w-5xl p-4 md:p-8 space-y-6"
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
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
        {legacyTotal && (
          <p className="rounded-xl border bg-white p-4 text-sm">
            This existing quiz uses a total timer.{" "}
            <button
              type="button"
              className="font-bold text-indigo-700 underline"
              onClick={() => {
                setLegacyTotal(false);
                setDuration(30);
                setTimeUnit("seconds");
              }}
            >
              Use per-question timing
            </button>
          </p>
        )}
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
            {legacyTotal ? "Total quiz time" : "Time per question"}
            <input
              aria-label="Time per question"
              type="number"
              min={timeUnit === "minutes" ? 1 / 60 : 1}
              max={timeUnit === "minutes" ? 1440 : 86400}
              step="any"
              className={`${field} mt-2`}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </label>
          <label className="text-sm font-bold">
            Time unit
            <select
              aria-label="Time unit"
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value)}
              className={`${field} mt-2`}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Passing percentage
            <input
              aria-label="Passing percentage"
              type="number"
              min="1"
              max="100"
              step="any"
              required
              className={`${field} mt-2`}
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Number(e.target.value))}
            />
          </label>
          <label className="text-sm font-bold">
            Questions per attempt
            <input
              aria-label="Questions per attempt"
              type="number"
              min="1"
              max="100"
              step="1"
              required
              className={`${field} mt-2`}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
          </label>
          <p className="text-xs text-slate-500 md:col-span-2">
            Each attempt draws the selected number from your reviewed question
            bank ({questions.length} available). Add questions below if you need
            more. Each question has its own timer; advancing locks its answer.
            Module retakes are immediate, with shuffled questions and answer
            choices.
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
                disabled={busy}
                onClick={() => {
                  setMode(value);
                  setFile(null);
                  setError("");
                  setGenerationReport(null);
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
                Include at least four distinct terms or facts. Use definitions,
                term-description tables, or clear sentences such as “DNA stores
                genetic information in cells.” Questions use your lecture text
                and include source references for review.
              </p>
              <fieldset className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <legend className="px-1 text-sm font-bold">Lecture source</legend>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="radio" name="lecture-source" value="module" aria-label="Use module attachment" disabled={busy || !supportedAttachment} checked={lectureSource === 'module'} onChange={() => { setLectureSource('module'); setError(''); }} />
                  <span className="min-w-0"><strong>Use module attachment</strong>
                    <span className="mt-1 block break-all text-xs text-slate-600">{hasModuleAttachment ? module.fileName : 'No attachment on this module yet.'}</span>
                    <span className="mt-1 block text-xs text-slate-600">{supportedAttachment ? 'Generate from the saved file. No second upload needed.' : hasModuleAttachment ? 'Convert this file to TXT, MD, PDF, DOCX, or PPTX and replace the module attachment first.' : 'Add a supported file in Edit module, or use notes below.'}</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="radio" name="lecture-source" value="other" aria-label="Use notes or another file" disabled={busy} checked={lectureSource === 'other'} onChange={() => { setLectureSource('other'); setError(''); }} />
                  <span><strong>Use notes or another file</strong><span className="mt-1 block text-xs text-slate-600">Paste text or upload a different lecture for this draft.</span></span>
                </label>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">Draft question limit
                  <input className={`${field} mt-2`} aria-label="Draft question limit" type="number" min={1} max={20} value={draftLimit} onChange={event => setDraftLimit(Number(event.target.value))} />
                </label>
                <label className="text-sm font-bold">Question style
                  <select className={`${field} mt-2`} aria-label="Question style" value={questionStyle} onChange={event => setQuestionStyle(event.target.value)}>
                    <option value="mixed">Mixed recall questions</option>
                    <option value="definitions">Match descriptions</option>
                    <option value="terms">Identify terms</option>
                  </select>
                </label>
              </div>
              {lectureSource === 'other' && <><label className="block text-sm font-bold">
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
                file takes precedence over pasted text. Visible PowerPoint slide
                text is read in deck order. Scanned images require OCR.
              </p></>}
            </>
          )}
          {mode !== "manual" && (
            <div className="flex flex-wrap items-center gap-4">
              {(mode === 'import' || lectureSource === 'other') && <input
                key={mode}
                aria-label={
                  mode === "import" ? "Question bank file" : "Lecture file"
                }
                type="file"
                disabled={busy}
                accept={
                  mode === "import"
                    ? ".json,.csv,.aiken,.txt"
                    : ".txt,.md,.pdf,.docx,.pptx"
                }
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />}
              <button
                type="button"
                disabled={busy || (mode === 'lecture' && (!Number.isInteger(draftLimit) || draftLimit < 1 || draftLimit > 20))}
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
        {generationReport && <section aria-label="Generation source analysis" className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-slate-700">
          <h3 className="font-bold text-[#070235]">Source analysis</h3>
          {generationReport.source?.type === 'module-attachment' && <p className="mt-2 break-all">Module attachment used: <strong>{generationReport.source.fileName}</strong></p>}
          <p className="mt-2">{generationReport.factsFound} usable facts · {generationReport.duplicatesRemoved} duplicates removed · {generationReport.skippedLines} lines without a usable fact</p>
          <p className="mt-1">Generated mix: {generationReport.questionTypes.definition} description matches, {generationReport.questionTypes.identification} term identifications, {generationReport.questionTypes.cloze} fill-in-the-blank questions.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">{generationReport.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
        </section>}
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
              : "Complete all fields, provide 1–100 questions and valid quiz settings and four distinct options each."}
          </p>
          <button type="submit" disabled={!valid || busy} className={button}>
            {busy
              ? "Working…"
              : module.quizId
                ? "Save quiz changes"
                : "Publish module quiz"}
          </button>
        </footer>
      </form>
    </div>
  );
}
