import path from "node:path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { extractPowerPoint, ExtractedDocument } from './officeText.js';
import { InputError } from "./questionBank.js";
export async function extractDocument(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedDocument> {
  const ext = path.extname(filename).toLowerCase();
  let text = "";
  let extracted: ExtractedDocument | undefined;
  try {
    if ([".txt", ".md"].includes(ext)) text = buffer.toString("utf8");
    else if (ext === ".pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === ".docx")
      text = (await mammoth.extractRawText({ buffer })).value;
    else if (ext === ".pptx") {
      extracted = await extractPowerPoint(buffer);
      text = extracted.text;
    } else
      throw new InputError(
        "Supported lecture formats: TXT, MD, PDF, DOCX, PPTX. Convert legacy DOC/PPT files first.",
      );
  } catch (err) {
    if (err instanceof InputError) throw err;
    throw new InputError(
      "Unable to read this document. Check its format and try an unencrypted file.",
    );
  }
  if (!text.trim())
    throw new InputError(
      "No readable text found. Scanned documents need OCR before upload.",
    );
  if (text.length > 250000)
    throw new InputError(
      "Lecture text exceeds 250,000 characters. Upload a shorter extract.",
    );
  return extracted || { text, sections: [{ label: filename.slice(0, 100), text }], warnings: [] };
}

export async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  return (await extractDocument(buffer, filename)).text;
}
