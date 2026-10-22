import { IQuestion } from "../models/Quiz.js";
import { InputError, shuffle } from "./questionBank.js";
// Faculty review is required; distractors are definitions from the same lecture.
export function generateQuestionsFromContent(content: string): IQuestion[] {
  const facts = new Map<string, string>();
  const seen = new Set<string>();
  for (const line of content
    .replace(/\*\*/g, "")
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)) {
    const clean = line.replace(/^\s*[-*#\d.)]+\s*/, "").trim();
    const match = clean.match(
      /^(.{2,70}?)\s*(?::|=|\bis defined as\b|\brefers to\b|\brepresents\b|\bis an?\b)\s+(.{12,400})$/i,
    );
    if (match && !seen.has(match[1].trim().toLowerCase())) {
      facts.set(match[1].trim(), match[2].trim());
      seen.add(match[1].trim().toLowerCase());
    }
  }
  const entries = [...facts].filter(
    ([, definition], i, all) =>
      all.findIndex(([, d]) => d.toLowerCase() === definition.toLowerCase()) ===
      i,
  );
  if (entries.length < 4)
    throw new InputError(
      "Found fewer than four distinct definitions. Add lines such as “Term: definition” and generate again.",
    );
  return entries.slice(0, 20).map(([term, definition]) => {
    const options = shuffle([
      definition,
      ...shuffle(entries.filter(([, d]) => d !== definition))
        .slice(0, 3)
        .map(([, d]) => d),
    ]);
    return {
      questionText: `Which definition describes ${term}?`,
      options,
      correctIndex: options.indexOf(definition),
      explanation: `${term}: ${definition}`,
    };
  });
}
