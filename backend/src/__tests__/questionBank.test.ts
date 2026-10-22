import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { importQuestionBank } from "../services/questionBank.js";
import { generateQuestionsFromContent } from "../services/questionGenerator.js";
import { extractDocumentText } from "../services/documentText.js";
const facts =
  "Photosynthesis: plants convert light energy into chemical energy.\nRespiration: cells release energy from stored food molecules.\nOsmosis: water moves through a selectively permeable membrane.\nDiffusion: particles move from high concentration to low concentration.";
const bank = Array.from({ length: 4 }, (_, i) => ({
  questionText: `Question ${i + 1}?`,
  options: ["Alpha", "Beta", "Gamma", "Delta"],
  correctIndex: i,
  explanation: "Review this concept.",
}));
describe("Question bank imports and lecture extraction", () => {
  it("imports JSON arrays and wrapped banks with explanations", () => {
    expect(importQuestionBank(JSON.stringify(bank), "json")).toEqual(bank);
    expect(
      importQuestionBank(JSON.stringify({ questions: bank }), "json"),
    ).toEqual(bank);
  });
  it("imports quoted CSV fields, embedded commas and newlines", () => {
    const csv =
      "questionText,optionA,optionB,optionC,optionD,correctIndex,explanation\n" +
      bank
        .map(
          (q) =>
            `"${q.questionText},\ncontinued",Alpha,Beta,Gamma,Delta,${q.correctIndex},"Explanation, with comma"`,
        )
        .join("\n");
    const imported = importQuestionBank(csv, "csv");
    expect(imported[0].questionText).toContain(",\ncontinued");
    expect(imported[0].explanation).toBe("Explanation, with comma");
  });
  it("imports Aiken and rejects missing or invalid answer keys", () => {
    const aiken = bank
      .map(
        (q) =>
          `${q.questionText}\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\nANSWER: ${"ABCD"[q.correctIndex]}`,
      )
      .join("\n\n");
    expect(
      importQuestionBank(aiken, "aiken").map((q) => q.correctIndex),
    ).toEqual([0, 1, 2, 3]);
    expect(() =>
      importQuestionBank(aiken.replace("ANSWER: A", "ANSWER: E"), "aiken"),
    ).toThrow("Question 1");
  });
  it("reports syntax errors and question-indexed validation errors", () => {
    expect(() => importQuestionBank("{broken", "json")).toThrow("syntax");
    expect(() =>
      importQuestionBank(
        JSON.stringify([{ ...bank[0], correctIndex: 4 }, ...bank.slice(1)]),
        "json",
      ),
    ).toThrow("validation");
    expect(() =>
      importQuestionBank('questionText,optionA\n"unterminated', "csv"),
    ).toThrow("syntax");
  });
  it("generates distinct lecture-derived distractors and refuses insufficient source material", () => {
    const generated = generateQuestionsFromContent(facts);
    expect(generated).toHaveLength(4);
    for (const question of generated) {
      expect(new Set(question.options).size).toBe(4);
      expect(question.explanation).toContain(
        question.options[question.correctIndex],
      );
    }
    expect(() => generateQuestionsFromContent("One short line")).toThrow(
      "four distinct definitions",
    );
  });
  it("extracts TXT and MD", async () => {
    expect(await extractDocumentText(Buffer.from(facts), "notes.txt")).toBe(
      facts,
    );
    expect(await extractDocumentText(Buffer.from(facts), "notes.md")).toBe(
      facts,
    );
  });
  it("extracts a real PDF text stream into reviewable quiz questions", async () => {
    const text = await extractDocumentText(
      readFileSync(new URL("./fixtures/lecture.pdf", import.meta.url)),
      "notes.pdf",
    );
    expect(text).toContain("Photosynthesis");
    expect(generateQuestionsFromContent(text)).toHaveLength(4);
  });
  it("extracts slides in numeric order and decodes XML entities", async () => {
    const zip = new JSZip();
    for (const [i, line] of facts.split("\n").entries())
      zip.file(
        `ppt/slides/slide${i + 1}.xml`,
        `<p:sld xmlns:p="p" xmlns:a="a"><a:p><a:r><a:t>${line}</a:t></a:r></a:p></p:sld>`,
      );
    const text = await extractDocumentText(
      await zip.generateAsync({ type: "nodebuffer" }),
      "lecture.pptx",
    );
    expect(text).toBe(facts);
    expect(generateQuestionsFromContent(text)).toHaveLength(4);
  });
  it("extracts DOCX paragraph text", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    );
    zip.file(
      "_rels/.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    );
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${facts
        .split("\n")
        .map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`)
        .join("")}</w:body></w:document>`,
    );
    const text = await extractDocumentText(
      await zip.generateAsync({ type: "nodebuffer" }),
      "lecture.docx",
    );
    expect(text).toContain("Photosynthesis");
    expect(generateQuestionsFromContent(text)).toHaveLength(4);
  });
  it("rejects corrupt, unsupported, and empty documents", async () => {
    await expect(
      extractDocumentText(Buffer.from("broken"), "lecture.pdf"),
    ).rejects.toThrow("Unable to read");
    await expect(
      extractDocumentText(Buffer.from("binary"), "legacy.ppt"),
    ).rejects.toThrow("Supported lecture formats");
    await expect(
      extractDocumentText(Buffer.from(" "), "lecture.txt"),
    ).rejects.toThrow("No readable text");
  });
});
