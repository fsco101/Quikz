// Exercise the compiled production server against an isolated local MongoDB.
// No deployment credentials or application data are used.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const backend = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'quikz-production-'));
const uploadDir = path.join(temporaryRoot, 'uploads');
let database;
let server;
let serverOutput = '';

async function freePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const stopped = once(server, 'exit');
  const deadline = setTimeout(() => server.kill('SIGKILL'), 28000);
  server.kill('SIGTERM');
  try { await stopped; } finally { clearTimeout(deadline); }
}

try {
  await fs.access(path.join(backend, 'dist', 'server.js'));
  database = await MongoMemoryServer.create({ instance: { port: await freePort(), ip: '127.0.0.1' } });
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const frontendOrigin = 'https://quikz-production-check.example';
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    MONGODB_URI: database.getUri('quikz_production_check'),
    JWT_SECRET: randomBytes(48).toString('hex'),
    UPLOAD_DIR: uploadDir,
    CORS_ORIGINS: frontendOrigin,
    SEED_DEMO_DATA: 'false',
    ADMIN_EMAIL: '',
    ADMIN_PASSWORD: '',
  };

  async function start() {
    serverOutput = '';
    server = spawn(process.execPath, ['dist/server.js'], { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
    server.on('error', error => { serverOutput += error.message; });
    server.stdout.on('data', data => { serverOutput += data; });
    server.stderr.on('data', data => { serverOutput += data; });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error(`Production server exited during startup: ${serverOutput}`);
      try {
        const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) return;
      } catch { /* Wait for startup. */ }
      await delay(100);
    }
    throw new Error(`Production server did not become healthy: ${serverOutput}`);
  }

  async function jsonRequest(route, data, token) {
    const response = await fetch(`${origin}/api${route}`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    assert.equal(response.status, 201, `${route} should create a record`);
    assert.equal(response.headers.get('access-control-allow-origin'), frontendOrigin);
    return response.json();
  }

  await start();
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  const denied = await fetch(`${origin}/api/health`, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(denied.status, 403);
  const preflight = await fetch(`${origin}/api/auth/register`, { method: 'OPTIONS', headers: { Origin: frontendOrigin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), frontendOrigin);
  const catalog = await (await fetch(`${origin}/api/subjects`)).json();
  assert.equal(catalog.subjects.length, 0, 'Production must not seed demo courses by default');

  const account = await jsonRequest('/auth/register', { username: 'production_check', email: 'production-check@example.test', password: randomBytes(18).toString('hex'), fullName: 'Production Check', surname: 'Check', role: 'faculty', termsAccepted: true });
  const subject = (await jsonRequest('/subjects', { name: 'Deployment check', code: 'DEPLOY101', term: '1st Semester', yearLevel: '1st Year' }, account.token)).subject;
  const lecture = 'DNA stores hereditary information inside living cells.\nChlorophyll absorbs light during photosynthesis.\nBlood transports oxygen throughout the human body.\nEnzymes regulate reaction rates under suitable conditions.';
  const form = new FormData();
  form.set('title', 'Persistent attachment');
  form.set('summary', 'Verify upload persistence across API restarts');
  form.set('contentType', 'file');
  form.set('file', new Blob([lecture], { type: 'text/plain' }), 'probe.txt');
  const upload = await fetch(`${origin}/api/subjects/${subject._id}/modules`, { method: 'POST', headers: { Origin: frontendOrigin, Authorization: `Bearer ${account.token}` }, body: form });
  assert.equal(upload.status, 201);
  const module = (await upload.json()).module;
  const stored = await fs.readFile(path.join(uploadDir, path.basename(module.fileUrl)), 'utf8');
  assert.equal(stored, lecture);
  const fileUrl = `${origin}/api/modules/${module._id}/file`;
  assert.equal((await fetch(fileUrl)).status, 401);

  const draftUrl = `${origin}/api/drafts/${encodeURIComponent(`module:${subject._id}:${module._id}`)}`;
  const draftHeaders = { Origin: frontendOrigin, Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' };
  for (const method of ['PUT', 'DELETE']) {
    const options = await fetch(draftUrl, { method: 'OPTIONS', headers: { Origin: frontendOrigin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(options.status, 204);
    assert.equal(options.headers.get('access-control-allow-origin'), frontendOrigin);
    assert.ok(options.headers.get('access-control-allow-methods').includes(method));
  }
  const editorData = { title: 'Unpublished deployment draft', summary: '', contentType: 'text', textContent: 'Recover this from MongoDB after restart', audience: 'connected', removeFile: false, attachmentName: '' };
  const autosaved = await fetch(draftUrl, { method: 'PUT', headers: draftHeaders, body: JSON.stringify({ version: 0, revision: '0', data: editorData }) });
  assert.equal(autosaved.status, 200);
  assert.equal(autosaved.headers.get('access-control-allow-origin'), frontendOrigin);
  assert.equal((await fetch(draftUrl)).status, 401);

  await stopServer();
  await start();
  const recovered = await fetch(draftUrl, { headers: draftHeaders });
  assert.equal(recovered.status, 200, 'Account drafts must survive backend restarts in MongoDB');
  assert.equal(recovered.headers.get('cache-control'), 'no-store');
  const recoveredDraft = await recovered.json();
  assert.equal(recoveredDraft.version, 1);
  assert.deepEqual(recoveredDraft.draft.data, editorData);
  const discarded = await fetch(draftUrl, { method: 'DELETE', headers: draftHeaders, body: JSON.stringify({ version: 1 }) });
  assert.deepEqual(await discarded.json(), { version: 2, draft: null });
  const delayed = await fetch(draftUrl, { method: 'PUT', headers: draftHeaders, body: JSON.stringify({ version: 1, revision: '0', data: editorData }) });
  assert.equal(delayed.status, 409, 'Delayed autosave must not restore a discarded draft');
  const download = await fetch(fileUrl, { headers: { Origin: frontendOrigin, Authorization: `Bearer ${account.token}` } });
  assert.equal(download.status, 200, 'Records, signing secret, and attachment path must survive a restart');
  assert.equal(await download.text(), stored);
  const generated = await fetch(`${origin}/api/quizzes/generate/module/${module._id}`, {
    method: 'POST', headers: { Origin: frontendOrigin, Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionLimit: 2, questionStyle: 'terms', moduleVersion: 0 }),
  });
  assert.equal(generated.status, 200, 'Generation must read the existing attachment from the configured persistent upload directory');
  const draft = await generated.json();
  assert.equal(draft.count, 2);
  assert.equal(draft.report.source.fileName, 'probe.txt');
  assert.equal(draft.report.source.moduleId, module._id);
  console.log('Production smoke check passed: compiled startup, health, CORS/preflight, registration, protected upload, persistent account drafts across restart, draft deletion/version protection, and generation from a saved module attachment.');
} finally {
  await stopServer();
  await database?.stop();
  const relative = path.relative(os.tmpdir(), temporaryRoot);
  if (!relative.startsWith('quikz-production-') || relative.includes(path.sep)) throw new Error('Refusing to clean an unexpected temporary path.');
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
