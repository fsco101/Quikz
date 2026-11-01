import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

const root = 'http://127.0.0.1:5100/api';
async function faculty(page: Page, request: APIRequestContext) {
  const unique = `validate_${Date.now()}`;
  const response = await request.post(`${root}/auth/register`, { data: {
    username: unique, email: `${unique}@test.edu`, password: 'Validation123!',
    fullName: 'Validation Faculty', surname: 'Faculty', role: 'faculty', termsAccepted: true,
  } });
  expect(response.status()).toBe(201);
  const { token } = await response.json();
  await page.addInitScript(value => localStorage.setItem('quikz_token', value), token);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  return { unique, headers: { Authorization: `Bearer ${token}` } };
}

test('login blocks blank and whitespace-only fields, focuses errors, and clears feedback after corrections', async ({ page }) => {
  const submitted: string[] = [];
  page.on('request', req => { if (req.url().endsWith('/auth/login')) submitted.push(req.url()); });
  await page.goto('/#/login');
  await page.getByLabel('Username or Email', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Sign In to Quikz', exact: true }).click();
  await expect(page.getByLabel('Username or Email', { exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('This field is required.');
  await page.screenshot({ path: 'test-results/login-validation.png', fullPage: true });
  const input = page.getByLabel('Username or Email', { exact: true });
  expect(await input.getAttribute('aria-describedby')).toBeTruthy();
  await input.fill('student@quikz.edu');
  await page.getByLabel('Password', { exact: true }).fill('Student@123');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(submitted).toHaveLength(0);
  await page.getByRole('button', { name: 'Sign In to Quikz', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(submitted).toHaveLength(1);
});

test('registration validates username, email, multibyte passwords and dependent confirmation', async ({ page }) => {
  await page.goto('/#/signup');
  await page.getByLabel('First / Full Name', { exact: true }).fill('Validation User');
  await page.getByLabel('Username', { exact: true }).fill('invalid username');
  await page.getByLabel('Institutional Email', { exact: true }).fill('person@invalid');
  await page.getByLabel('Password', { exact: true }).fill('é'.repeat(37));
  await page.getByLabel('Confirm password', { exact: true }).fill('different');
  await page.getByLabel('First / Full Name', { exact: true }).focus();
  await expect(page.getByRole('alert')).toContainText('3–40 letters');
  await expect(page.getByRole('alert')).toContainText('valid email address');
  await expect(page.getByRole('alert')).toContainText('72 bytes');
  await expect(page.getByRole('alert')).toContainText('passwords do not match');
  await page.getByLabel('Username', { exact: true }).fill('valid_username');
  await page.getByLabel('Institutional Email', { exact: true }).fill('person@school.edu');
  await page.getByLabel('Password', { exact: true }).fill('Validation123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Validation123!');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Password', { exact: true }).fill('Changed123!');
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveAttribute('aria-invalid', 'true');
});

test('profile, avatar and password validation prevent invalid requests and allow a corrected save', async ({ page, request }) => {
  const { unique } = await faculty(page, request);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  const submitted: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET' && req.url().includes('/users/me')) submitted.push(req.url()); });
  await page.getByLabel('Full name', { exact: true }).fill('  ');
  await page.getByLabel('Username', { exact: true }).fill('invalid name');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toBeFocused();
  await page.getByLabel('Full name', { exact: true }).fill('Updated Faculty');
  await page.getByLabel('Username', { exact: true }).fill(unique);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Profile updated.');
  expect(submitted).toHaveLength(1);
  await page.getByLabel('Choose avatar', { exact: true }).setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await page.getByRole('button', { name: 'Upload avatar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('supported file');
  await page.getByLabel('Choose avatar', { exact: true }).setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await page.getByRole('button', { name: 'Upload avatar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('up to 5 MB');
  await page.getByLabel('Current password', { exact: true }).fill('Validation123!');
  await page.getByLabel('New password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Change password and sign out', exact: true }).click();
  await expect(page.getByLabel('New password', { exact: true })).toBeFocused();
  await page.getByLabel('New password', { exact: true }).fill('      ');
  await expect(page.getByRole('alert').filter({ hasText: 'non-space character' })).toBeVisible();
  expect(submitted).toHaveLength(1);
});

test('curriculum forms and quiz preview validate separately from publication', async ({ page, request }) => {
  const { unique } = await faculty(page, request);
  await page.getByRole('button', { name: 'Create New Subject', exact: true }).click();
  await page.getByLabel('Subject name', { exact: true }).fill(' ');
  await page.getByRole('button', { name: 'Create Subject', exact: true }).click();
  await expect(page.getByLabel('Subject name', { exact: true })).toBeFocused();
  await page.getByLabel('Subject name', { exact: true }).fill('Validation Course');
  await page.getByLabel('Subject code', { exact: true }).fill(unique);
  await page.getByRole('button', { name: 'Create Subject', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`Open ${unique.toUpperCase()}:`) }).click();
  await page.getByRole('button', { name: /Add.*Module/i }).click();
  await page.getByLabel('Module title', { exact: true }).fill('Validation Lesson');
  await page.getByLabel('Module summary', { exact: true }).fill('Validation summary');
  await page.getByRole('button', { name: 'Document / PDF', exact: true }).click();
  await page.getByRole('button', { name: 'Publish Module to Course', exact: true }).click();
  await expect(page.getByLabel('Module attachment', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Lecture Text', exact: true }).click();
  await page.getByRole('button', { name: 'Publish Module to Course', exact: true }).click();
  await page.getByRole('button', { name: 'Create end quiz', exact: true }).click();
  await page.getByRole('tab', { name: 'Generate from lecture', exact: true }).click();
  await page.getByLabel('Draft question limit', { exact: true }).fill('1.5');
  await page.getByRole('button', { name: 'Generate preview', exact: true }).click();
  await expect(page.getByLabel('Draft question limit', { exact: true })).toBeFocused();
  await page.getByLabel('Draft question limit', { exact: true }).fill('1');
  await page.getByLabel('Lecture notes', { exact: true }).fill('DNA stores hereditary information inside living cells.\nChlorophyll absorbs light during the photosynthesis process.\nBlood transports oxygen throughout the human body.\nEnzymes regulate reaction rates under suitable conditions.');
  await page.getByRole('button', { name: 'Generate preview', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loaded' })).toContainText('Loaded 1 questions.');
  await page.getByLabel('Question 1 option B', { exact: true }).fill(await page.getByLabel('Question 1 option A', { exact: true }).inputValue());
  await page.getByRole('button', { name: 'Publish module quiz', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Each answer option must be distinct.');
});

test('connection and gradebook inputs block invalid email and inverted score ranges', async ({ page, request }) => {
  await faculty(page, request);
  await page.getByRole('button', { name: 'Connections', exact: true }).click();
  await page.locator('#connection-email').fill('bad@invalid');
  await page.locator('#connection-email').press('Enter');
  await expect(page.locator('#connection-email')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Master gradebook', exact: true }).click();
  await page.getByLabel('Minimum score', { exact: true }).fill('80');
  await page.getByLabel('Maximum score', { exact: true }).fill('20');
  await expect(page.getByRole('alert')).toContainText('Minimum score cannot exceed maximum score.');
  await page.getByLabel('Maximum score', { exact: true }).fill('90');
  await expect(page.locator('#gradebook-filter-error')).toHaveCount(0);
});

test('admin account creation validates required consent and account fields before sending', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Username or Email', { exact: true }).fill('admin@quikz.edu');
  await page.getByLabel('Password', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: 'Sign In to Quikz', exact: true }).click();
  await page.getByRole('button', { name: 'User management', exact: true }).click();
  await page.getByRole('button', { name: 'Create user', exact: true }).click();
  let submitted = 0;
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/admin/users')) submitted++; });
  await page.getByLabel('User full name', { exact: true }).fill(' ');
  await page.getByLabel('User surname', { exact: true }).fill('User');
  await page.getByLabel('User username', { exact: true }).fill('invalid name');
  await page.getByLabel('User email', { exact: true }).fill('bad@invalid');
  await page.getByLabel('User password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Save user', exact: true }).click();
  await expect(page.getByLabel('User full name', { exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('Confirm this before continuing.');
  expect(submitted).toBe(0);
});
