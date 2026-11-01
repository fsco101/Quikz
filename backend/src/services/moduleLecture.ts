import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { UPLOADS_DIR } from '../config/storage.js';
import { Module } from '../models/Module.js';
import { Subject } from '../models/Subject.js';
import { InputError } from './questionBank.js';
import { extractDocument } from './documentText.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function readModuleLecture(moduleId: string, facultyId: string, expectedVersion?: unknown) {
  if (!mongoose.isValidObjectId(moduleId)) throw new InputError('Invalid module ID.');
  const module = await Module.findById(moduleId);
  if (!module) throw new InputError('Module not found.', 404);
  const subject = await Subject.findById(module.subjectId).select('facultyId');
  if (!subject) throw new InputError('Subject not found.', 404);
  if (String(subject.facultyId) !== facultyId || String(module.createdBy || subject.facultyId) !== facultyId) {
    throw new InputError('Only the subject and module owner can generate questions from this attachment.', 403);
  }
  const version = (module as any).__v;
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion !== version)) {
    throw new InputError('Module changed. Reopen Quiz Studio to use its current attachment.', 409);
  }
  if (!module.fileName || !module.fileUrl) throw new InputError('Attach a lecture file to this module before generating from its attachment.');
  const match = module.fileUrl.match(/^\/uploads\/([^/\\]+)$/);
  if (!match || ['.', '..'].includes(match[1])) throw new InputError('The module attachment location is invalid. Upload the attachment again.');

  let buffer: Buffer;
  try {
    const root = await fs.realpath(UPLOADS_DIR);
    const location = await fs.realpath(path.join(root, match[1]));
    if (path.dirname(location) !== root) throw new InputError('The module attachment location is invalid. Upload the attachment again.');
    const handle = await fs.open(location, 'r');
    try {
      const info = await handle.stat();
      if (!info.isFile()) throw new InputError('The module attachment must be a regular file.');
      if (info.size > MAX_FILE_SIZE) throw new InputError('Module attachments used for generation must be no larger than 25 MB.', 413);
      // Allocate only the checked size; never read an unbounded or growing file.
      buffer = Buffer.alloc(info.size);
      let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
        if (!bytesRead) throw new InputError('Module attachment changed while it was being read. Please try again.', 409);
        offset += bytesRead;
      }
      if ((await handle.stat()).size !== info.size) throw new InputError('Module attachment changed while it was being read. Please try again.', 409);
    } finally { await handle.close(); }
  } catch (error: any) {
    if (error instanceof InputError) throw error;
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw new InputError('Module attachment is missing. Upload it again before generating questions.', 404);
    throw new InputError('Unable to read the module attachment. Please retry or upload it again.', 503);
  }

  const document = await extractDocument(buffer, module.fileName);
  return { document, moduleId: String(module._id), subjectId: String(module.subjectId), version, fileName: module.fileName, fileUrl: module.fileUrl };
}

export async function ensureModuleLectureCurrent(source: Awaited<ReturnType<typeof readModuleLecture>>, facultyId: string) {
  const [module, subject] = await Promise.all([
    Module.exists({ _id: source.moduleId, subjectId: source.subjectId, __v: source.version, fileName: source.fileName, fileUrl: source.fileUrl,
      $or: [{ createdBy: facultyId }, { createdBy: { $exists: false } }, { createdBy: null }] }),
    Subject.exists({ _id: source.subjectId, facultyId }),
  ]);
  if (!module || !subject) throw new InputError('Module changed. Reopen Quiz Studio to use its current attachment.', 409);
}
