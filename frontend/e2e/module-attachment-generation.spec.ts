import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:5100/api';
const lecture = `DNA stores hereditary information inside living cells.
Chlorophyll absorbs light during the photosynthesis process.
Blood transports oxygen throughout the human body.
Enzymes regulate reaction rates under suitable conditions.`;

test('faculty generates from the saved module file, switches sources, and publishes the reviewed draft', async ({ page, request }) => {
  const unique = `FILE${Date.now()}`;
  const registered = await request.post(`${api}/auth/register`, { data: {
    username: unique, email: `${unique}@attachment.test`, password: 'Attachment123!', role: 'faculty',
    fullName: 'Attachment Faculty', surname: 'Faculty', termsAccepted: true,
  } });
  expect(registered.status()).toBe(201);
  const token = (await registered.json()).token;
  const headers = { Authorization: `Bearer ${token}` };
  const subjectResult = await request.post(`${api}/subjects`, { headers, data: {
    name: 'Saved lecture questions', code: unique, term: '1st Semester', yearLevel: '1st Year',
  } });
  expect(subjectResult.status()).toBe(201);
  const subject = (await subjectResult.json()).subject;
  const fileName = 'Already-uploaded-lecture-for-question-generation.txt';
  const moduleResult = await request.post(`${api}/subjects/${subject._id}/modules`, { headers, multipart: {
    title: 'Saved attachment lesson', summary: 'Generate a draft from this existing file', contentType: 'file',
    audience: 'connected', textContent: 'These notes are intentionally insufficient to generate a quiz.',
    file: { name: fileName, mimeType: 'text/plain', buffer: Buffer.from(lecture) },
  } });
  expect(moduleResult.status()).toBe(201);
  const module = (await moduleResult.json()).module;
  await page.addInitScript(value => localStorage.setItem('quikz_token', value), token);
  await page.goto('/');
  await page.getByRole('button', { name: `Open ${unique}: Saved lecture questions`, exact: true }).click();
  await page.getByRole('button', { name: 'Create end quiz', exact: true }).click();
  await page.getByRole('tab', { name: 'Generate from lecture', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Use module attachment', exact: true })).toBeChecked();
  await expect(page.getByLabel('Lecture file', { exact: true })).toHaveCount(0);
  await page.getByLabel('Draft question limit', { exact: true }).fill('3');
  await page.getByLabel('Question style', { exact: true }).selectOption('terms');
  const generatedRequest = page.waitForRequest(req => req.url().endsWith(`/quizzes/generate/module/${module._id}`));
  await page.getByRole('button', { name: 'Generate preview', exact: true }).click();
  const sent = await generatedRequest;
  expect(sent.headers()['content-type']).toContain('application/json');
  expect(sent.postDataJSON()).toEqual({ questionLimit: 3, questionStyle: 'terms', moduleVersion: 0 });
  await expect(page.getByRole('status')).toContainText('Loaded 3 questions.');
  await expect(page.getByRole('region', { name: 'Generation source analysis' })).toContainText(`Module attachment used: ${fileName}`);
  await expect(page.getByLabel('Question 1 explanation', { exact: true })).toHaveValue(new RegExp(fileName));
  expect((await (await request.get(`${api}/modules/${module._id}`, { headers })).json()).module.quizId).toBeUndefined();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/module-source-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('radio', { name: 'Use notes or another file', exact: true }).check();
  await expect(page.getByLabel('Lecture file', { exact: true })).toBeVisible();
  await page.getByLabel('Lecture notes', { exact: true }).fill(lecture);
  await page.getByLabel('Draft question limit', { exact: true }).fill('1');
  const pastedRequest = page.waitForRequest(req => req.url().endsWith('/quizzes/generate'));
  await page.getByRole('button', { name: 'Generate preview', exact: true }).click();
  expect((await pastedRequest).headers()['content-type']).toContain('multipart/form-data');
  await expect(page.getByRole('status')).toContainText('Loaded 1 questions.');
  await expect(page.getByRole('region', { name: 'Generation source analysis' })).not.toContainText('Module attachment used');

  await page.getByRole('radio', { name: 'Use module attachment', exact: true }).check();
  await page.getByLabel('Draft question limit', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Generate preview', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Loaded 3 questions.');
  await page.screenshot({ path: 'test-results/module-source-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Publish module quiz', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit quiz', exact: true })).toBeVisible();
  const savedModule = (await (await request.get(`${api}/modules/${module._id}`, { headers })).json()).module;
  expect(savedModule.quizId._id).toBeTruthy();
  const quiz = (await (await request.get(`${api}/quizzes/${savedModule.quizId._id}`, { headers })).json()).quiz;
  expect(quiz.questions).toHaveLength(3);
  expect(quiz.questions.every((question: { explanation: string }) => question.explanation.includes(fileName))).toBe(true);
});
