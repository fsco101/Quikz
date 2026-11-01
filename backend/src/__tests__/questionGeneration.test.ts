import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { generateQuestionDraft, generateQuestionsFromContent } from '../services/questionGenerator.js';
import { extractDocument } from '../services/documentText.js';
import { validateQuestions } from '../services/questionBank.js';

const definitions = `DNA: stores genetic information within living cells.
RNA: carries genetic information between cellular structures.
Chromosome: packages genetic information into organized structures.
Genome: contains genetic information for an entire organism.`;
const namespaces = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:d="http://schemas.openxmlformats.org/drawingml/2006/main"';
const slide = (text: string, hidden = false) => `<p:sld ${namespaces}${hidden ? ' show="0"' : ''}><d:p><d:r><d:t xml:space="preserve">${text}</d:t></d:r></d:p></p:sld>`;

describe('Lecture question quality', () => {
  it('reads common definition formats, Markdown tables, headings, and wrapped descriptions', () => {
    const draft = generateQuestionDraft(`# Cell structures
**Nucleus** — stores hereditary information inside the cell.
• Cell membrane = regulates movement of substances across the cell boundary.
| Term | Description |
| --- | --- |
| Ribosome | builds proteins from amino acid building blocks. |
Vacuole
A compartment that stores water and dissolved substances.
Mitochondrion: an organelle that
releases energy through cellular respiration.
Chloroplasts are organelles responsible for capturing light energy.`);
    expect(draft.report.factsFound).toBe(6);
    expect(draft.questions).toHaveLength(6);
    expect(draft.questions.some(q => q.explanation.startsWith('Mitochondrion: an organelle that releases energy'))).toBe(true);
    expect(draft.report.questionTypes.definition).toBeGreaterThan(0);
    expect(draft.report.questionTypes.identification).toBeGreaterThan(0);
    expect(validateQuestions(draft.questions)).toHaveLength(6);
    for (const question of draft.questions) {
      expect(question.explanation).toContain(question.options[question.correctIndex]);
      expect(question.explanation).toMatch(/Source: Lecture notes, line \d+/);
    }
  });

  it('turns factual statements into sourced blanks without dropping qualifiers or negation', () => {
    const draft = generateQuestionDraft(`DNA may store hereditary information in cells.
Enzymes do not produce energy during chemical reactions.
Chlorophyll absorbs light during the photosynthesis process.
Blood transports oxygen throughout the human body.`);
    expect(draft.report.questionTypes.cloze).toBe(4);
    const qualified = draft.questions.find(q => q.explanation.startsWith('DNA:'))!;
    const negative = draft.questions.find(q => q.explanation.startsWith('Enzymes:'))!;
    expect(qualified.questionText).toContain('_____ may store hereditary information');
    expect(negative.questionText).toContain('_____ do not produce energy');
    expect(qualified.options[qualified.correctIndex]).toBe('DNA');
    expect(negative.options[negative.correctIndex]).toBe('Enzymes');
  });

  it('deduplicates aliases and repeated descriptions and reports differing descriptions for the same term', () => {
    const draft = generateQuestionDraft(`CPU: executes program instructions and arithmetic operations.
Central Processing Unit (CPU): controls the execution of computer instructions.
RAM: stores working data for currently running programs.
RAM: temporarily retains information for active applications.
Working memory: stores working data for currently running programs.
ROM: retains firmware instructions when power is removed.
Cache: keeps frequently requested data close to the processor.`);
    expect(draft.report.factsFound).toBe(4);
    expect(draft.report.duplicatesRemoved).toBe(3);
    expect(draft.report.conflictingDescriptions).toBe(2);
    expect(draft.report.warnings.join(' ')).toContain('the first was kept');
    expect(draft.questions.some(q => q.explanation.startsWith('Central Processing Unit'))).toBe(false);
  });

  it('uses related lecture material as distractors and excludes answer-revealing descriptions', () => {
    const draft = generateQuestionDraft(`${definitions}
Planet: moves around a star along an orbital path.
Comet: releases gas and dust when approaching the sun.
Asteroid: represents a rocky body traveling through space.
Moon: reflects sunlight while orbiting a larger body.
Genetic archive: stores genetic information within living cells and tissues.`, { limit: 1, style: 'definitions' });
    expect(draft.questions[0].questionText).toContain('DNA');
    expect(draft.questions[0].options.every(option => option.includes('genetic information'))).toBe(true);
    expect(draft.questions[0].options).not.toContain('stores genetic information within living cells and tissues.');
  });

  it('ignores pronouns, course instructions, code blocks, and descriptions containing their own answer', () => {
    const draft = generateQuestionDraft(`${definitions}
It is a complicated thing that needs explanation.
Learning objectives: describe the fundamental properties of living things.
What is a fundamental process of a living organism?
Noise: Noise is an unwanted signal during transmission.
\`\`\`
Code: should not become a question inside a code sample.
\`\`\``);
    expect(draft.report.factsFound).toBe(4);
    expect(draft.questions).toHaveLength(4);
    expect(draft.report.skippedLines).toBeGreaterThan(0);
  });

  it('respects style/count settings and samples the beginning, middle, and end of a long lecture', () => {
    const lecture = Array.from({ length: 28 }, (_, i) => `Concept${i}: explains topic${i} through practical examples.`).join('\n');
    const draft = generateQuestionDraft(lecture, { limit: 3, style: 'terms' });
    expect(draft.questions).toHaveLength(3);
    expect(draft.report.questionTypes.identification).toBe(3);
    expect(draft.questions[0].explanation).toMatch(/^Concept0:/);
    expect(draft.questions[2].explanation).toMatch(/^Concept27:/);
    expect(generateQuestionsFromContent(lecture)).toHaveLength(20);
    for (const limit of [0, 21, 1.5, NaN]) expect(() => generateQuestionDraft(lecture, { limit })).toThrow('draft limit');
    expect(() => generateQuestionDraft(lecture, { style: 'invalid' as any })).toThrow('question style');
    expect(() => generateQuestionDraft('x'.repeat(250001))).toThrow('250,000');
    expect(() => generateQuestionDraft('One short line')).toThrow('four distinct definitions');
  });
});

describe('PowerPoint source fidelity', () => {
  it('follows presentation relationships, handles namespaced runs/entities, and skips hidden slides and notes', async () => {
    const zip = new JSZip();
    zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="1" r:id="r9"/><p:sldId id="2" r:id="r2"/><p:sldId id="3" r:id="r1"/></p:sldIdLst></p:presentation>');
    zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="r9" Type="urn:office/slide" Target="slides/slide9.xml"/><Relationship Id="r2" Type="urn:office/slide" Target="slides/slide2.xml"/><Relationship Id="r1" Type="urn:office/slide" Target="slides/slide1.xml"/></Relationships>');
    zip.file('ppt/slides/slide9.xml', `<p:sld ${namespaces}><d:p><d:r><d:t xml:space="preserve">Fish &amp; </d:t></d:r><d:r><d:t>Chips &#x3C; 10 &amp;lt;</d:t></d:r><d:br/><d:r><d:t>Next line</d:t></d:r></d:p></p:sld>`);
    zip.file('ppt/slides/slide2.xml', slide('Hidden answer guide', true));
    zip.file('ppt/slides/slide1.xml', slide('Last visible slide'));
    zip.file('ppt/notesSlides/notesSlide1.xml', slide('Private speaker notes'));
    const document = await extractDocument(await zip.generateAsync({ type: 'nodebuffer' }), 'lecture.pptx');
    expect(document.sections.map(section => section.label)).toEqual(['Slide 1', 'Slide 3']);
    expect(document.sections[0].text).toBe('Fish & Chips < 10 &lt;\nNext line');
    expect(document.text).not.toMatch(/Hidden answer|Private speaker/);
    expect(document.warnings.join(' ')).toContain('1 hidden');
  });

  it('preserves two-column table relationships as usable facts', async () => {
    const zip = new JSZip();
    const rows = definitions.split('\n').map(line => {
      const [term, description] = line.split(': ');
      return `<d:tr><d:tc><d:p><d:r><d:t>${term}</d:t></d:r></d:p></d:tc><d:tc><d:p><d:r><d:t>${description}</d:t></d:r></d:p></d:tc></d:tr>`;
    }).join('');
    zip.file('ppt/slides/slide1.xml', `<p:sld ${namespaces}><d:tbl>${rows}</d:tbl></p:sld>`);
    const document = await extractDocument(await zip.generateAsync({ type: 'nodebuffer' }), 'table.pptx');
    const draft = generateQuestionDraft(document.text, { sections: document.sections });
    expect(draft.questions).toHaveLength(4);
    expect(draft.questions.every(q => q.explanation.includes('Source: Slide 1'))).toBe(true);
  });

  it('rejects malformed XML, document types, broken relationships, and excessively expanded slide text', async () => {
    for (const xml of [`<p:sld ${namespaces}><d:p>broken</p:sld>`, `<!DOCTYPE root [<!ENTITY x "hidden">]><root>&x;</root>`]) {
      const zip = new JSZip(); zip.file('ppt/slides/slide1.xml', xml);
      await expect(extractDocument(await zip.generateAsync({ type: 'nodebuffer' }), 'bad.pptx')).rejects.toThrow();
    }
    const missing = new JSZip();
    missing.file('ppt/presentation.xml', '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldId r:id="missing"/></p:presentation>');
    missing.file('ppt/_rels/presentation.xml.rels', '<Relationships/>');
    await expect(extractDocument(await missing.generateAsync({ type: 'nodebuffer' }), 'missing.pptx')).rejects.toThrow('missing slide relationship');
    const large = new JSZip(); large.file('ppt/slides/slide1.xml', slide('x'.repeat(4 * 1024 * 1024)));
    await expect(extractDocument(await large.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), 'large.pptx')).rejects.toThrow('Expanded presentation text');
  });
});
