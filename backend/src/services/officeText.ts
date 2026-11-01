import JSZip from 'jszip';
import path from 'node:path';
import { Readable } from 'node:stream';
import { SaxesParser, SaxesTagNS } from 'saxes';
import { InputError } from './questionBank.js';

export type DocumentSection = { label: string; text: string };
export type ExtractedDocument = { text: string; sections: DocumentSection[]; warnings: string[] };

function attribute(tag: SaxesTagNS, name: string) {
  return Object.values(tag.attributes).find(attr => attr.local === name)?.value;
}

function parseXml(xml: string, handlers: { open?: (tag: SaxesTagNS) => void; close?: (tag: SaxesTagNS) => void; text?: (text: string) => void }) {
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0;
  parser.on('doctype', () => { throw new InputError('Office documents containing XML document types are not supported.'); });
  parser.on('opentag', tag => {
    if (++depth > 128) throw new InputError('This Office document is too complex. Export a simpler copy.');
    handlers.open?.(tag);
  });
  parser.on('closetag', tag => { handlers.close?.(tag); depth--; });
  parser.on('text', text => handlers.text?.(text));
  parser.on('cdata', text => handlers.text?.(text));
  parser.write(xml).close();
}

export async function extractPowerPoint(buffer: Buffer): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(buffer);
  if (Object.keys(zip.files).length > 5000) throw new InputError('This presentation has too many archived parts. Upload a smaller extract.');
  let expandedBytes = 0;
  async function xmlFile(name: string) {
    const entry = zip.file(name);
    if (!entry) throw new InputError('The presentation contains a missing slide or relationship. Export a new PPTX copy.');
    const stream = new Readable().wrap(entry.nodeStream('nodebuffer'));
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of stream) {
        bytes += chunk.length;
        expandedBytes += chunk.length;
        if (bytes > 4 * 1024 * 1024 || expandedBytes > 20 * 1024 * 1024) {
          throw new InputError('Expanded presentation text is too large. Upload a shorter presentation.');
        }
        chunks.push(chunk);
      }
    } finally { stream.destroy(); }
    return Buffer.concat(chunks).toString('utf8');
  }

  let slides: string[];
  if (zip.file('ppt/presentation.xml')) {
    const ids: string[] = [];
    parseXml(await xmlFile('ppt/presentation.xml'), { open: tag => {
      if (tag.local === 'sldId') {
        const relation = Object.values(tag.attributes).find(attr => attr.local === 'id' && attr.prefix);
        if (relation) ids.push(relation.value);
      }
    } });
    const relationships = new Map<string, string>();
    parseXml(await xmlFile('ppt/_rels/presentation.xml.rels'), { open: tag => {
      if (tag.local !== 'Relationship' || !attribute(tag, 'Type')?.endsWith('/slide') || attribute(tag, 'TargetMode') === 'External') return;
      const target = attribute(tag, 'Target') || '';
      const resolved = path.posix.resolve('/ppt', target).slice(1);
      if (!/^ppt\/slides\/[^/]+\.xml$/.test(resolved)) throw new InputError('The presentation contains an invalid slide relationship.');
      relationships.set(attribute(tag, 'Id') || '', resolved);
    } });
    slides = ids.map(id => {
      const target = relationships.get(id);
      if (!target) throw new InputError('The presentation contains a missing slide relationship.');
      return target;
    });
  } else {
    slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  if (slides.length > 500) throw new InputError('Upload no more than 500 slides at a time.');
  const sections: DocumentSection[] = [];
  let hidden = 0, empty = 0, textLength = 0;
  for (const [index, name] of slides.entries()) {
    const lines: string[] = [];
    let paragraph = '', inText = false, isHidden = false;
    let row: string[] | undefined, cell: string[] | undefined;
    const drawing = (tag: SaxesTagNS) => tag.uri.includes('drawingml') || tag.uri === 'a';
    parseXml(await xmlFile(name), {
      open: tag => {
        if (tag.local === 'sld' && ['0', 'false'].includes(attribute(tag, 'show') || '')) isHidden = true;
        if (!drawing(tag)) return;
        if (tag.local === 'tr') row = [];
        if (tag.local === 'tc') cell = [];
        if (tag.local === 'p') paragraph = '';
        if (tag.local === 't') inText = true;
        if (tag.local === 'br') paragraph += '\n';
        if (tag.local === 'tab') paragraph += '\t';
      },
      text: text => { if (inText) paragraph += text; },
      close: tag => {
        if (!drawing(tag)) return;
        if (tag.local === 't') inText = false;
        if (tag.local === 'p') {
          const value = paragraph.replace(/[\t \u00a0]+/g, ' ').trim();
          if (value) (cell || lines).push(value);
        }
        if (tag.local === 'tc') { row?.push(cell?.join(' ') || ''); cell = undefined; }
        if (tag.local === 'tr') {
          if (row?.length === 2) lines.push(`${row[0]}: ${row[1]}`);
          else if (row?.length) lines.push(row.join(' | '));
          row = undefined;
        }
      },
    });
    if (isHidden) { hidden++; continue; }
    const text = lines.join('\n');
    if (!text.trim()) { empty++; continue; }
    textLength += text.length;
    if (textLength > 250000) throw new InputError('Lecture text exceeds 250,000 characters. Upload a shorter extract.');
    sections.push({ label: `Slide ${index + 1}`, text });
  }
  const warnings = ['Only visible slide text is read; images, diagrams, and speaker notes are not interpreted.'];
  if (hidden) warnings.push(`${hidden} hidden slide(s) skipped.`);
  if (empty) warnings.push(`${empty} slide(s) contained no readable text.`);
  return { text: sections.map(section => section.text).join('\n\n'), sections, warnings };
}
