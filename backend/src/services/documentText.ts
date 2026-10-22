import path from "node:path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";
import { InputError } from "./questionBank.js";
export async function extractDocumentText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  let text = "";
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
      const zip = await JSZip.loadAsync(buffer);
      const slides = Object.keys(zip.files)
        .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const parts = await Promise.all(
        slides.map(async (name) => {
          const xml = await zip.files[name].async("string");
          return [...xml.matchAll(/<a:p[\s>][\s\S]*?<\/a:p>/g)]
            .map((p) =>
              [...p[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
                .map((m) => m[1])
                .join(""),
            )
            .join("\n");
        }),
      );
      text = parts
        .join("\n")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
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
  return text;
}
