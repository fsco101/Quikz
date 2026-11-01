import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import JSZip from 'jszip';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Quiz } from '../models/Quiz.js';
import { Module } from '../models/Module.js';
import { UPLOADS_DIR } from '../config/storage.js';
import * as documentText from '../services/documentText.js';

const lecture = `DNA stores hereditary information inside living cells.
Chlorophyll absorbs light during the photosynthesis process.
Blood transports oxygen throughout the human body.
Enzymes regulate reaction rates under suitable conditions.`;

describe('Faculty generation previews', () => {
  let faculty: string, student: string, peer: string, peerId: string, subjectId: string;
  const files: string[] = [];
  const fromModule = (moduleId: string, body = {}, token = faculty) => request(app)
    .post(`/api/quizzes/generate/module/${moduleId}`).set('Authorization', `Bearer ${token}`).send(body);
  async function attachedModule(fileName = 'module-notes.txt', buffer = Buffer.from(lecture)) {
    const response = await request(app).post(`/api/subjects/${subjectId}/modules`).set('Authorization', `Bearer ${faculty}`)
      .field('title', 'Attached source').field('summary', 'Test saved lecture reuse').field('contentType', 'file')
      .field('audience', 'connected').field('textContent', 'These notes must not replace the saved attachment.')
      .attach('file', buffer, fileName);
    expect(response.status).toBe(201);
    const module = (await Module.findById(response.body.module._id))!;
    const location = path.join(UPLOADS_DIR, path.basename(module.fileUrl!));
    files.push(location);
    return { module, location };
  }
  beforeAll(async () => {
    await connectDB();
    for (const role of ['faculty', 'student', 'peer']) {
      const response = await request(app).post('/api/auth/register').send({
        username: `generation_${role}`, email: `${role}@generation.test`, password: 'Generation123!',
        role: role === 'peer' ? 'faculty' : role, fullName: `Generation ${role}`, surname: 'Test', termsAccepted: true,
        yearLevel: '1st Year', section: 'Section A',
      });
      expect(response.status).toBe(201);
      if (role === 'faculty') faculty = response.body.token;
      else if (role === 'student') student = response.body.token;
      else { peer = response.body.token; peerId = response.body.user.id; }
    }
    const subject = await request(app).post('/api/subjects').set('Authorization', `Bearer ${faculty}`)
      .send({ name: 'Attachment generation', code: 'ATTACHGEN', term: '1st Semester', yearLevel: '1st Year' });
    expect(subject.status).toBe(201);
    subjectId = subject.body.subject._id;
  });
  afterAll(async () => {
    for (const file of files) await fs.unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await disconnectDB();
  });

  it('returns a reviewable preview and diagnostics without publishing a quiz', async () => {
    const result = await request(app).post('/api/quizzes/generate').set('Authorization', `Bearer ${faculty}`)
      .send({ content: lecture, questionLimit: 2, questionStyle: 'terms' });
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(2);
    expect(result.body.report.factsFound).toBe(4);
    expect(result.body.report.questionTypes.identification).toBe(2);
    expect(result.body.questions.every((q: any) => q.explanation.includes('Source: Lecture notes'))).toBe(true);
    expect(await Quiz.countDocuments()).toBe(0);
  });

  it('uses an uploaded slide file ahead of pasted text and preserves slide references', async () => {
    const zip = new JSZip();
    for (const [index, text] of lecture.split('\n').entries()) zip.file(`ppt/slides/slide${index + 1}.xml`, `<p:sld xmlns:p="p" xmlns:a="a"><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`);
    const result = await request(app).post('/api/quizzes/generate').set('Authorization', `Bearer ${faculty}`)
      .field('content', 'This must not replace uploaded content.')
      .field('questionLimit', '3').field('questionStyle', 'mixed')
      .attach('file', await zip.generateAsync({ type: 'nodebuffer' }), 'lecture.pptx');
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(3);
    expect(result.body.report.questionTypes.cloze).toBe(3);
    expect(result.body.questions[2].explanation).toContain('Source: Slide 4');
    expect(result.body.report.warnings.join(' ')).toContain('speaker notes');
  });

  it('rejects invalid settings and insufficient source material with actionable errors', async () => {
    for (const patch of [{ questionLimit: 21 }, { questionLimit: 'not-a-number' }, { questionStyle: 'invent-questions' }]) {
      const response = await request(app).post('/api/quizzes/generate').set('Authorization', `Bearer ${faculty}`).send({ content: lecture, ...patch });
      expect(response.status).toBe(400);
    }
    const insufficient = await request(app).post('/api/quizzes/generate').set('Authorization', `Bearer ${faculty}`).send({ content: 'A short heading.' });
    expect(insufficient.status).toBe(400);
    expect(insufficient.body.message).toContain('0 found');
    expect(insufficient.body.message).toContain('two-column term tables');
  });

  it('keeps generation restricted to faculty', async () => {
    expect((await request(app).post('/api/quizzes/generate').send({ content: lecture })).status).toBe(401);
    expect((await request(app).post('/api/quizzes/generate').set('Authorization', `Bearer ${student}`).send({ content: lecture })).status).toBe(403);
  });

  it('reuses a private saved PowerPoint with source references and no second upload or automatic publication', async () => {
    const zip = new JSZip();
    for (const [index, text] of lecture.split('\n').entries()) zip.file(`ppt/slides/slide${index + 1}.xml`, `<p:sld xmlns:p="p" xmlns:a="a"><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`);
    const { module, location } = await attachedModule('saved-lecture.pptx', await zip.generateAsync({ type: 'nodebuffer' }));
    const result = await fromModule(String(module._id), { questionLimit: 3, questionStyle: 'terms', moduleVersion: 0,
      fileUrl: '/etc/passwd', fileName: 'ignored.txt', content: 'Ignore client-supplied file locations.' });
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(3);
    expect(result.body.report.source).toEqual({ type: 'module-attachment', moduleId: String(module._id), moduleVersion: 0, fileName: 'saved-lecture.pptx' });
    expect(result.body.questions[2].explanation).toContain('Source: Slide 4');
    expect(JSON.stringify(result.body)).not.toContain('/uploads/');
    expect((await fs.stat(location)).size).toBeGreaterThan(0);
    expect(await Quiz.countDocuments()).toBe(0);
    expect((await Module.findById(module._id))!.quizId).toBeUndefined();
  });

  it('blocks unauthenticated users, students, and other faculty even for public attachments, while supporting legacy ownership', async () => {
    const { module } = await attachedModule();
    await Module.updateOne({ _id: module._id }, { $set: { audience: 'public' } });
    expect((await request(app).post(`/api/quizzes/generate/module/${module._id}`).send({})).status).toBe(401);
    expect((await fromModule(String(module._id), {}, student)).status).toBe(403);
    expect((await fromModule(String(module._id), {}, peer)).status).toBe(403);
    await Module.updateOne({ _id: module._id }, { $set: { createdBy: peerId } });
    expect((await fromModule(String(module._id))).status).toBe(403);
    await Module.updateOne({ _id: module._id }, { $unset: { createdBy: 1 } });
    expect((await fromModule(String(module._id))).status).toBe(200);
  });

  it('reports missing attachments, unsupported formats, oversized files, and malformed module references', async () => {
    expect((await fromModule('not-an-id')).status).toBe(400);
    expect((await fromModule('000000000000000000000001')).status).toBe(404);
    const empty = await request(app).post(`/api/subjects/${subjectId}/modules`).set('Authorization', `Bearer ${faculty}`)
      .send({ title: 'Notes only', summary: 'No attachment', contentType: 'text' });
    const noFile = await fromModule(empty.body.module._id);
    expect(noFile.status).toBe(400);
    expect(noFile.body.message).toContain('Attach a lecture file');
    const unsupported = await attachedModule('legacy.ppt', Buffer.from('legacy presentation'));
    expect((await fromModule(String(unsupported.module._id))).status).toBe(400);
    const missing = await attachedModule(); await fs.unlink(missing.location);
    expect((await fromModule(String(missing.module._id))).status).toBe(404);
    const oversized = await attachedModule(); await fs.truncate(oversized.location, 25 * 1024 * 1024 + 1);
    expect((await fromModule(String(oversized.module._id))).status).toBe(413);
  });

  it('rejects database path traversal and files resolving outside the upload directory', async () => {
    const { module } = await attachedModule();
    await Module.updateOne({ _id: module._id }, { $set: { fileUrl: '/uploads/../package.json' } });
    expect((await fromModule(String(module._id))).status).toBe(400);
    await Module.updateOne({ _id: module._id }, { $set: { fileUrl: module.fileUrl } });
    const root = await fs.realpath(UPLOADS_DIR);
    const lookup = vi.spyOn(fs, 'realpath').mockResolvedValueOnce(root).mockResolvedValueOnce(path.resolve('package.json'));
    try { expect((await fromModule(String(module._id))).status).toBe(400); }
    finally { lookup.mockRestore(); }
  });

  it('rejects stale versions and edits made while the attachment is being parsed', async () => {
    const { module } = await attachedModule();
    const stale = await fromModule(String(module._id), { moduleVersion: 99 });
    expect(stale.status).toBe(409);
    expect(stale.body.message).toContain('Reopen Quiz Studio');
    const extract = documentText.extractDocument;
    const parsing = vi.spyOn(documentText, 'extractDocument').mockImplementationOnce(async (...args) => {
      await Module.updateOne({ _id: module._id }, { $inc: { __v: 1 } });
      return extract(...args);
    });
    try {
      const concurrent = await fromModule(String(module._id), { moduleVersion: 0 });
      expect(concurrent.status).toBe(409);
      expect(concurrent.body.message).toContain('Module changed');
    } finally { parsing.mockRestore(); }
    expect(await Quiz.countDocuments()).toBe(0);
  });
});
