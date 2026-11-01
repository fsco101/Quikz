import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

const root = 'http://127.0.0.1:5100/api';
const questions = [{ questionText: 'Original question?', options: ['Correct', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Original explanation' }];
async function setup(page: Page, request: APIRequestContext, published = false) {
  const unique = `draft_${Date.now()}`;
  const registered = await request.post(`${root}/auth/register`, { data: {
    username: unique, email: `${unique}@test.edu`, password: 'Draft123!',
    fullName: 'Draft Faculty', surname: 'Faculty', role: 'faculty', termsAccepted: true,
  } });
  expect(registered.status()).toBe(201);
  const { token, user } = await registered.json();
  const headers = { Authorization: `Bearer ${token}` };
  const created = await request.post(`${root}/subjects`, { headers, data: { code: unique, name: 'Draft course', term: '1st Semester', yearLevel: '1st Year' } });
  expect(created.status()).toBe(201);
  const subject = (await created.json()).subject;
  const lesson = await request.post(`${root}/subjects/${subject._id}/modules`, { headers, data: { title: 'Draft lesson', summary: 'Original summary', contentType: 'text', textContent: 'Original notes' } });
  expect(lesson.status()).toBe(201);
  const module = (await lesson.json()).module;
  let quiz: any;
  if (published) {
    const response = await request.post(`${root}/quizzes`, { headers, data: { title: 'Original quiz', subjectId: subject._id, moduleId: module._id, questions, questionCount: 1, timePerQuestion: 30, timeUnit: 'seconds' } });
    expect(response.status()).toBe(201);
    quiz = (await response.json()).quiz;
  }
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('quikz_token', value), token);
  await page.reload();
  const openCourse = async () => page.getByRole('button', { name: new RegExp(`Open ${unique.toUpperCase()}:`) }).click();
  await openCourse();
  return { user, token, headers, subject, module, quiz, openCourse };
}
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('quikz:draft:v1:')));
const saved = (page: Page) => expect(page.getByLabel('Draft autosave')).toContainText('Draft synced to your account');

test('module drafts recover after refresh, discard resets fields, and publication clears storage', async ({ page, request }) => {
  const fixture = await setup(page, request);
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Recovered module');
  await page.getByLabel('Module summary', { exact: true }).fill('Recovered summary');
  await page.getByLabel('Lecture text', { exact: true }).fill('Recovered lecture notes');
  await saved(page);
  await page.reload();
  await fixture.openCourse();
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Recovered module');
  await expect(page.getByLabel('Lecture text', { exact: true })).toHaveValue('Recovered lecture notes');
  await expect(page.getByLabel('Draft autosave')).toContainText('Draft restored');
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('');
  expect(await draftKeys(page)).toHaveLength(0);
  await page.getByLabel('Module title', { exact: true }).fill('Published module');
  await page.getByLabel('Module summary', { exact: true }).fill('Published summary');
  await page.getByRole('button', { name: 'Publish Module to Course', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add Topic / Learning Module', exact: true })).toHaveCount(0);
  expect(await draftKeys(page)).toHaveLength(0);
  const modules = await (await request.get(`${root}/subjects/${fixture.subject._id}/modules`, { headers: fixture.headers })).json();
  expect(modules.modules.some((module: any) => module.title === 'Published module')).toBe(true);
});

test('closing immediately flushes module changes and recovered files must be reselected', async ({ page, request }) => {
  await setup(page, request);
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Last keystroke');
  await page.getByLabel('Module attachment', { exact: true }).setInputFiles({ name: 'lecture.txt', mimeType: 'text/plain', buffer: Buffer.from('lecture') });
  await page.getByRole('button', { name: 'Close form', exact: true }).click();
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Last keystroke');
  await expect(page.getByLabel('Draft autosave')).toContainText('Reselect “lecture.txt”');
  await expect(page.getByLabel('Module attachment', { exact: true })).toHaveValue('');
});

test('quiz edits restore after the server load, and saving clears the draft', async ({ page, request }) => {
  const fixture = await setup(page, request, true);
  await page.getByRole('button', { name: 'Edit quiz', exact: true }).click();
  await expect(page.getByLabel('Quiz title', { exact: true })).toHaveValue('Original quiz');
  await page.getByLabel('Quiz title', { exact: true }).fill('Recovered assessment');
  await page.getByLabel('Question 1 text', { exact: true }).fill('Recovered question?');
  await page.getByLabel('Passing percentage', { exact: true }).fill('85');
  await saved(page);
  await page.reload();
  await fixture.openCourse();
  // Delay server hydration to ensure it cannot overwrite a recovered draft.
  await page.route(`**/api/quizzes/${fixture.quiz._id}`, async route => {
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Edit quiz', exact: true }).click();
  await expect(page.getByLabel('Quiz title', { exact: true })).toHaveValue('Recovered assessment');
  await expect(page.getByLabel('Question 1 text', { exact: true })).toHaveValue('Recovered question?');
  await expect(page.getByLabel('Passing percentage', { exact: true })).toHaveValue('85');
  await page.unroute(`**/api/quizzes/${fixture.quiz._id}`);
  await page.getByRole('button', { name: 'Save quiz changes', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Quiz Studio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit quiz', exact: true })).toBeVisible();
  expect(await draftKeys(page)).toHaveLength(0);
  const quiz = (await (await request.get(`${root}/quizzes/${fixture.quiz._id}`, { headers: fixture.headers })).json()).quiz;
  expect(quiz.title).toBe('Recovered assessment');
});

test('a newer server module pauses recovery until a copy is chosen', async ({ page, request }) => {
  const fixture = await setup(page, request);
  await page.getByRole('button', { name: 'Edit module', exact: true }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Local copy');
  await saved(page);
  await page.getByRole('button', { name: 'Close form', exact: true }).click();
  const updated = await request.patch(`${root}/modules/${fixture.module._id}`, { headers: fixture.headers, data: { title: 'Newer server copy', version: fixture.module.__v } });
  expect(updated.status()).toBe(200);
  await page.reload();
  await fixture.openCourse();
  await page.getByRole('button', { name: 'Edit module', exact: true }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Newer server copy');
  await expect(page.getByLabel('Draft autosave')).toContainText('server version has changed');
  await expect(page.getByRole('button', { name: 'Save module changes', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Restore saved draft', exact: true }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Local copy');
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Newer server copy');
  expect(await draftKeys(page)).toHaveLength(0);
});

test('corrupt drafts and unavailable browser storage do not prevent editing or publication', async ({ page, request }) => {
  const fixture = await setup(page, request);
  const key = `quikz:draft:v1:${fixture.user.id}:module:${fixture.subject._id}:new`;
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel('Draft autosave')).toContainText('Changes autosave to your account');
  await page.route('**/api/drafts/**', route => route.abort());
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.getByLabel('Module title', { exact: true }).fill('Published despite storage outage');
  await page.getByLabel('Module summary', { exact: true }).fill('Save through the API');
  await expect(page.getByLabel('Draft autosave')).toContainText('Could not save');
  await page.getByRole('button', { name: 'Publish Module to Course', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add Topic / Learning Module', exact: true })).toHaveCount(0);
});

test('drafts belong to their account and module', async ({ page, request }) => {
  const fixture = await setup(page, request);
  await page.getByRole('button', { name: 'Edit module', exact: true }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Private account draft');
  await saved(page);
  const keys = await draftKeys(page);
  expect(keys[0]).toContain(`:${fixture.user.id}:module:${fixture.subject._id}:${fixture.module._id}`);
  await page.getByRole('button', { name: 'Close form', exact: true }).click();
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Close form', exact: true }).click();
  const other = await request.post(`${root}/auth/login`, { data: { loginIdentifier: 'faculty@quikz.edu', password: 'Faculty@123' } });
  const { token } = await other.json();
  await page.evaluate(token => localStorage.setItem('quikz_token', token), token);
  await page.reload();
  // Another faculty can open the public course, but has no owner editing actions.
  expect(await draftKeys(page)).toEqual(keys);
  await expect(page.getByRole('button', { name: 'Create New Subject', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Open CS101:/ }).click();
  await page.getByRole('button', { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('');
});

test('a fresh browser restores account drafts and concurrent device saves require a choice', async ({ page, request, browser }) => {
  const fixture = await setup(page, request);
  await page.getByRole('button', { name: 'Edit module', exact: true }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Account draft from device A');
  await saved(page);
  const second = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    const other = await second.newPage();
    await other.goto('/');
    await other.evaluate(token => localStorage.setItem('quikz_token', token), fixture.token);
    expect(await draftKeys(other)).toHaveLength(0);
    await other.reload();
    await other.getByRole('button', { name: new RegExp(`Open ${fixture.subject.code}:`) }).click();
    await other.getByRole('button', { name: 'Edit module', exact: true }).click();
    await expect(other.getByLabel('Module title', { exact: true })).toHaveValue('Account draft from device A');
    await expect(other.getByLabel('Draft autosave')).toContainText('restored from your account');
    await other.getByLabel('Module title', { exact: true }).fill('Newer draft from device B');
    await saved(other);
    await page.getByLabel('Module title', { exact: true }).fill('Concurrent device A edits');
    await expect(page.getByLabel('Draft autosave')).toContainText('Autosave is paused');
    await expect(page.getByRole('button', { name: 'Save module changes', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Restore saved draft', exact: true }).click();
    await expect(page.getByLabel('Module title', { exact: true })).toHaveValue('Newer draft from device B');
    const server = (await (await request.get(`${root}/modules/${fixture.module._id}`, { headers: fixture.headers })).json()).module;
    expect(server.title).toBe('Draft lesson');
  } finally { await second.close(); }
});

test('an interrupted account sync retains the local copy and retries successfully', async ({ page, request }) => {
  await setup(page, request);
  await page.getByRole('button', { name: 'Edit module', exact: true }).click();
  await expect(page.getByLabel('Module title', { exact: true })).toBeEnabled();
  await page.route('**/api/drafts/**', route => route.request().method() === 'PUT' ? route.abort() : route.continue());
  await page.getByLabel('Module title', { exact: true }).fill('Network interruption draft');
  await expect(page.getByLabel('Draft autosave')).toContainText('Account sync is unavailable');
  expect(await draftKeys(page)).toHaveLength(1);
  await page.unroute('**/api/drafts/**');
  await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await saved(page);
});

test('a failed quiz load keeps the saved draft intact until the server can be read', async ({ page, request }) => {
  const fixture = await setup(page, request, true);
  await page.getByRole('button', { name: 'Edit quiz', exact: true }).click();
  await page.getByLabel('Quiz title', { exact: true }).fill('Keep this assessment draft');
  await saved(page);
  await page.getByRole('button', { name: 'Close studio', exact: true }).click();
  await page.route(`**/api/quizzes/${fixture.quiz._id}`, route => route.abort());
  await page.getByRole('button', { name: 'Edit quiz', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Close and reopen');
  expect(await draftKeys(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Close studio', exact: true }).click();
  await page.unroute(`**/api/quizzes/${fixture.quiz._id}`);
  await page.getByRole('button', { name: 'Edit quiz', exact: true }).click();
  await expect(page.getByLabel('Quiz title', { exact: true })).toHaveValue('Keep this assessment draft');
});
