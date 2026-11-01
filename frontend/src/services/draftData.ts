import { Question } from "../types/quiz.js";

export type ModuleDraft = {
  title: string; summary: string; contentType: "text" | "file" | "presentation";
  textContent: string; audience: string; removeFile: boolean; attachmentName: string;
};
export type QuizDraft = {
  title: string; duration: number; timeUnit: string; passingPercentage: number; questionCount: number;
  questions: Question[]; mode: string; content: string; draftLimit: number; questionStyle: string;
  lectureSource: "module" | "other"; legacyTotal: boolean; attachmentName: string;
};
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const strings = (data: Record<string, any>, keys: string[]) => keys.every(key => typeof data[key] === "string");
export function isModuleDraft(value: unknown): value is ModuleDraft {
  return object(value) && strings(value, ["title", "summary", "textContent", "attachmentName"])
    && ["text", "file", "presentation"].includes(value.contentType)
    && ["connected", "public", "both"].includes(value.audience) && typeof value.removeFile === "boolean";
}
export function isQuizDraft(value: unknown): value is QuizDraft {
  return object(value) && strings(value, ["title", "content", "attachmentName"])
    && ["duration", "passingPercentage", "questionCount", "draftLimit"].every(key => typeof value[key] === "number" && Number.isFinite(value[key]))
    && ["seconds", "minutes"].includes(value.timeUnit) && ["manual", "import", "lecture"].includes(value.mode)
    && ["mixed", "definitions", "terms"].includes(value.questionStyle) && ["module", "other"].includes(value.lectureSource)
    && typeof value.legacyTotal === "boolean" && Array.isArray(value.questions) && value.questions.length <= 100
    && value.questions.every((q: unknown) => object(q) && typeof q.questionText === "string"
      && Array.isArray(q.options) && q.options.length === 4 && q.options.every((option: unknown) => typeof option === "string")
      && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
      && (q.explanation === undefined || typeof q.explanation === "string"));
}
