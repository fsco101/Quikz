import { parse } from "csv-parse/sync";
import { IQuestion } from "../models/Quiz.js";
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: string[],
  ) {
    super(message);
  }
}
export function validateQuestions(input: unknown): IQuestion[] {
  if (!Array.isArray(input) || input.length < 4 || input.length > 100)
    throw new InputError(
      "Provide between 4 and 100 questions (4 allows an exact 75% benchmark).",
    );
  const errors: string[] = [];
  input.forEach((q, i) => {
    const prefix = `Question ${i + 1}`;
    if (!q || typeof q.questionText !== "string" || !q.questionText.trim())
      errors.push(`${prefix}: questionText is required.`);
    if (
      !q ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((o: unknown) => typeof o !== "string" || !o.trim())
    )
      errors.push(`${prefix}: exactly four nonempty options are required.`);
    else if (
      new Set(q.options.map((o: string) => o.trim().toLowerCase())).size !== 4
    )
      errors.push(`${prefix}: options must be distinct.`);
    if (
      !q ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex > 3
    )
      errors.push(`${prefix}: correctIndex must be an integer from 0 to 3.`);
    if (q?.explanation !== undefined && typeof q.explanation !== "string")
      errors.push(`${prefix}: explanation must be text.`);
  });
  if (errors.length)
    throw new InputError("Question bank has validation errors.", 400, errors);
  return input.map((q) => ({
    questionText: q.questionText.trim(),
    options: q.options.map((o: string) => o.trim()),
    correctIndex: q.correctIndex,
    explanation: q.explanation?.trim() || "",
  }));
}
export function importQuestionBank(
  content: string,
  format: string,
): IQuestion[] {
  let questions: unknown;
  try {
    if (format === "json") {
      const data = JSON.parse(content.replace(/^\uFEFF/, ""));
      questions = Array.isArray(data) ? data : data.questions;
    } else if (format === "csv") {
      const rows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      }) as Record<string, string>[];
      questions = rows.map((row: Record<string, string>) => ({
        questionText: row.questionText,
        options: [row.optionA, row.optionB, row.optionC, row.optionD],
        correctIndex: row.correctIndex?.trim() ? Number(row.correctIndex) : NaN,
        explanation: row.explanation || "",
      }));
    } else if (format === "aiken" || format === "txt") {
      questions = content
        .trim()
        .split(/\r?\n\s*\r?\n/)
        .map((block, index) => {
          const lines = block.split(/\r?\n/).map((s) => s.trim());
          const answer = lines.pop()?.match(/^ANSWER:\s*([A-D])$/i);
          const options = lines.slice(-4).map((line, i) => {
            const match = line.match(/^([A-D])[.)]\s+(.+)$/i);
            if (!match || match[1].toUpperCase() !== "ABCD"[i])
              throw new Error(
                `Question ${index + 1}: expected options A through D in order.`,
              );
            return match[2];
          });
          if (!answer || options.length !== 4)
            throw new Error(
              `Question ${index + 1}: missing ANSWER: A-D or four options.`,
            );
          return {
            questionText: lines.slice(0, -4).join(" "),
            options,
            correctIndex: "ABCD".indexOf(answer[1].toUpperCase()),
            explanation: "",
          };
        });
    } else throw new Error("Use JSON, CSV, or Aiken (.aiken/.txt).");
  } catch (err: any) {
    throw new InputError(`Import syntax error: ${err.message}`);
  }
  return validateQuestions(questions);
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
