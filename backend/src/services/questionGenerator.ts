import { IQuestion } from "../models/Quiz.js";
import { InputError, shuffle } from "./questionBank.js";
import type { DocumentSection } from './officeText.js';

export type GenerationStyle = 'mixed' | 'definitions' | 'terms';
export type GenerationOptions = { limit?: number; style?: GenerationStyle; sections?: DocumentSection[] };
type Fact = {
  term: string; definition: string; source: string; label: string; line: number;
  kind: 'definition' | 'statement'; aliases: string[]; tokens: Set<string>;
};
type QuestionType = 'definition' | 'identification' | 'cloze';
const stopWords = new Set('a an the and or to of in on for by with from that which it its is are as at into'.split(' '));
const generic = /^(?:learning objectives?|objectives?|table of contents|references|contents|overview|introduction|summary|notes?|example|chapter \d+|module \d+|slide \d+)(?:\s|$)/i;
const pronouns = /^(?:it|they|we|you|this|that|these|those|there|here|what|which|why|when|where|how|today|please)\b/i;
const predicates = 'converts?|produces?|stores?|controls?|transports?|protects?|connects?|measures?|contains?|consists? of|enables?|allows?|provides?|prevents?|maintains?|regulates?|carries|carry|absorbs?|includes?|releases?|moves?|supports?|uses?|requires?';
const statement = new RegExp(`^(.{2,80}?)\\s+((?:(?:can|may|must|will)\\s+|(?:does|do)\\s+not\\s+)?(?:${predicates})\\b.{4,400})$`, 'i');

function canonical(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function tokens(value: string) {
  return new Set(canonical(value).split(' ').filter(word => word.length > 1 && !stopWords.has(word)));
}
function similarity(a: Set<string>, b: Set<string>) {
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  return intersection / (a.size + b.size - intersection || 1);
}
function clean(value: string) {
  return value.replace(/[\u200b-\u200d\ufeff\u00ad]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '').replace(/^\s*(?:[-*•‣▪◦]\s+|\d{1,3}[.)]\s+|#{1,6}\s+)/, '')
    .replace(/\s+/g, ' ').trim();
}
function validTerm(term: string) {
  return term.length >= 2 && term.length <= 80 && term.split(/\s+/).length <= 10 &&
    /^[\p{L}\p{N}][\p{L}\p{N}\s()'’/+&.,-]+$/u.test(term) && /\p{L}/u.test(term) &&
    !/\b(?:that|which|whose)\b/i.test(term) && !pronouns.test(term) && !generic.test(term);
}
function aliases(term: string) {
  return [...new Set([term, term.replace(/\s*\([^)]*\)/g, ''), ...[...term.matchAll(/\(([^)]+)\)/g)].map(match => match[1])]
    .map(canonical).filter(alias => alias.length >= 2))];
}
function containsAlias(text: string, names: string[]) {
  const normalized = ` ${canonical(text)} `;
  return names.some(name => normalized.includes(` ${name} `));
}

function parseFact(value: string, label: string, line: number): Fact | undefined {
  let match = value.match(/^(.{2,80}?)\s*(?::\s*|\s+[—–-]\s+|\s*=\s*|\s+(?:is defined as|refers to|represents|means|is|are)\s+)(.{12,400})$/i);
  let kind: Fact['kind'] = 'definition';
  if (!match) { match = value.match(statement); kind = 'statement'; }
  if (!match) return;
  const term = match[1].trim().replace(/^(?:the|an?)\s+/i, '');
  const definition = match[2].trim();
  if (!validTerm(term) || !/\p{L}/u.test(definition) || definition.split(/\s+/).length < 2 ||
    /^(?:definition|description|meaning|function)$/i.test(definition) || definition.length > 400) return;
  const names = aliases(term);
  // A description containing the answer would give identification questions away.
  if (containsAlias(definition, names)) return;
  return { term, definition, source: value, label, line, kind, aliases: names, tokens: tokens(definition) };
}

function readFacts(sections: DocumentSection[]) {
  const facts: Fact[] = [];
  const seenTerms = new Map<string, Fact>();
  const seenDefinitions = new Set<string>();
  let duplicatesRemoved = 0, conflictingDescriptions = 0, skippedLines = 0;
  for (const section of sections) {
    const lines = section.text.replace(/\r\n?/g, '\n').split('\n');
    let inCode = false;
    for (let index = 0; index < lines.length; index++) {
      if (/^\s*```/.test(lines[index])) { inCode = !inCode; continue; }
      if (inCode) continue;
      let value = clean(lines[index]);
      if (!value) continue;
      const table = lines[index].trim().replace(/^\||\|$/g, '').split(/\||\t/).map(clean);
      if (table.length === 2 && !table.some(cell => /^:?-+:?$/.test(cell))) value = `${table[0]}: ${table[1]}`;
      const firstLine = index + 1;
      const next = clean(lines[index + 1] || '');
      const heading = value.replace(/:$/, '');
      // Join a title/description pair only when the body is a descriptive phrase,
      // rather than another heading or an independently identifiable fact.
      if (validTerm(heading) && next && !parseFact(value, '', 0) && !parseFact(next, '', 0) &&
        next.split(/\s+/).length >= 4 && /^(?:[a-z]|[Aa]n?\s|[Tt]he\s)/.test(next)) {
        value = `${heading}: ${next}`;
        index++;
      }
      // Preserve wrapped definitions without swallowing the following topic.
      while (!/[.!?]$/.test(value) && value.length < 350 && index + 1 < lines.length) {
        const continuation = clean(lines[index + 1]);
        if (!/^[a-z]/.test(continuation) || parseFact(continuation, '', 0) || /[:|]/.test(continuation)) break;
        if (value.length + continuation.length > 480) break;
        value += ` ${continuation}`;
        index++;
      }
      let matched = false;
      for (const sentence of value.split(/(?<=[.!?])\s+(?=[A-Z])/)) {
        const fact = parseFact(sentence, section.label, firstLine);
        if (!fact) continue;
        matched = true;
        const definitionKey = canonical(fact.definition).replace(/^(?:a|an|the) /, '');
        const previous = fact.aliases.map(alias => seenTerms.get(alias)).find(Boolean);
        if (previous || seenDefinitions.has(definitionKey)) {
          duplicatesRemoved++;
          if (previous && canonical(previous.definition) !== canonical(fact.definition)) conflictingDescriptions++;
          continue;
        }
        for (const alias of fact.aliases) seenTerms.set(alias, fact);
        seenDefinitions.add(definitionKey);
        facts.push(fact);
      }
      if (!matched) skippedLines++;
    }
  }
  return { facts, duplicatesRemoved, conflictingDescriptions, skippedLines };
}

function distractors(target: Fact, facts: Fact[]) {
  return facts.filter(other => other !== target && !other.aliases.some(alias => target.aliases.includes(alias)) &&
    similarity(other.tokens, target.tokens) < .8 &&
    !containsAlias(other.definition, target.aliases) && !containsAlias(target.definition, other.aliases))
    .map((fact, index) => ({ fact, index, score: similarity(fact.tokens, target.tokens) * 5 +
      (fact.label === target.label ? 1 : 0) + Math.min(fact.definition.length, target.definition.length) / Math.max(fact.definition.length, target.definition.length) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.fact);
}

export function generateQuestionDraft(content: string, settings: GenerationOptions = {}) {
  const limit = settings.limit ?? 20;
  const style = settings.style ?? 'mixed';
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new InputError('Choose a draft limit from 1 to 20 questions.');
  if (!['mixed', 'definitions', 'terms'].includes(style)) throw new InputError('Choose mixed, definitions, or terms for the question style.');
  if (typeof content !== 'string' || !content.trim() || content.length > 250000) throw new InputError('Provide lecture text up to 250,000 characters.');
  const { facts, ...analysis } = readFacts(settings.sections || [{ label: 'Lecture notes', text: content }]);
  if (facts.length < 4) throw new InputError(`Found fewer than four distinct definitions or usable facts (${facts.length} found). Add Term: description lines, two-column term tables, or clear factual sentences. Each needs a different description.`);
  const count = Math.min(limit, facts.length);
  // Sample throughout the lecture instead of always using its first 20 facts.
  const selected = new Set(Array.from({ length: count }, (_, i) => count === 1 ? 0 : Math.round(i * (facts.length - 1) / (count - 1))));
  const ordered = [...selected, ...facts.map((_, i) => i).filter(i => !selected.has(i))];
  const questions: IQuestion[] = [];
  const questionTypes: Record<QuestionType, number> = { definition: 0, identification: 0, cloze: 0 };
  // Bound work when a lecture contains many almost-identical unusable facts.
  for (const index of ordered.slice(0, 100)) {
    const fact = facts[index];
    const alternatives = distractors(fact, facts).slice(0, 3);
    if (alternatives.length < 3) continue;
    const type: QuestionType = style === 'definitions' ? 'definition' : style === 'terms' ? 'identification' :
      fact.kind === 'statement' ? 'cloze' : questions.length % 2 === 0 ? 'definition' : 'identification';
    const answer = type === 'definition' ? fact.definition : fact.term;
    const options = shuffle([answer, ...alternatives.map(other => type === 'definition' ? other.definition : other.term)]);
    const blank = fact.source.replace(new RegExp(fact.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____');
    const questionText = type === 'definition' ? `Which description matches ${fact.term}?` : type === 'identification' ?
      `Which term matches this description from the lecture?\n“${fact.definition}”` :
      `According to the lecture, which term completes this statement?\n“${blank}”`;
    questions.push({ questionText, options, correctIndex: options.indexOf(answer),
      explanation: `${fact.term}: ${fact.definition}\nSource: ${fact.label}, line ${fact.line} — “${fact.source}”` });
    questionTypes[type]++;
    if (questions.length === limit) break;
  }
  if (!questions.length) throw new InputError('The usable facts are too similar to produce four unambiguous choices. Add more distinct descriptions or use manual questions.');
  const warnings: string[] = [];
  if (analysis.conflictingDescriptions) warnings.push(`${analysis.conflictingDescriptions} repeated term(s) had different descriptions; the first was kept. Review these definitions.`);
  if (questions.length < limit) warnings.push(`Created ${questions.length} of up to ${limit} requested questions. More distinct source facts are needed for additional questions.`);
  warnings.push('Generated questions test recall of the source. Check factual accuracy and every answer choice before publishing.');
  return { questions, report: { factsFound: facts.length, ...analysis, requestedCount: limit, generatedCount: questions.length, questionTypes, warnings } };
}

export function generateQuestionsFromContent(content: string, settings: GenerationOptions = {}): IQuestion[] {
  return generateQuestionDraft(content, settings).questions;
}
