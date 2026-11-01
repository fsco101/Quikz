import { expect, test } from '@playwright/test';

test('landing preview, perspectives, FAQs and public navigation work without an account', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small steps. Big discoveries.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true, animations: 'disabled' });
  const preview = page.getByRole('region', { name: 'Interactive learning preview' });
  await preview.getByRole('button', { name: '02 Practice' }).click();
  await preview.getByRole('button', { name: /Skip straight/ }).click();
  await expect(preview.getByRole('status')).toContainText('Try again');
  await preview.getByRole('button', { name: /Connect it to/ }).click();
  await expect(preview.getByRole('status')).toContainText('Exactly!');
  await preview.getByRole('button', { name: '03 Progress' }).click();
  await expect(preview.getByText('2 of 3 steps')).toBeVisible();
  await page.getByRole('button', { name: 'For faculty', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A clearer picture of your class' })).toBeVisible();
  await page.getByRole('button', { name: 'For students', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A path with purpose' })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Can I explore' }).click();
  await expect(page.getByText('Absolutely. Browse', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Explore lessons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Public lesson directory' })).toBeVisible();
  await page.getByRole('button', { name: 'Subject catalog', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Public subject catalog' })).toBeVisible();
  await page.getByRole('button', { name: 'Quikz home', exact: true }).click();
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await expect(page).toHaveURL(/#\/signup$/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Small steps. Big discoveries.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('account entry supports password visibility, errors, recovery and real login', async ({ page }) => {
  await page.goto('/');
  await page.locator('header').getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Username or Email', { exact: true }).fill('student@quikz.edu');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Sign In to Quikz' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('button', { name: 'Student Demo', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign In to Quikz' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

for (const role of ['student', 'faculty'] as const) {
  test(`${role} registration enforces matching passwords and terms before creating a real account`, async ({ page }) => {
    const unique = `${role}_${Date.now()}`;
    await page.goto('/#/signup');
    if (role === 'faculty') await page.getByRole('button', { name: /Faculty \/ Professor/ }).click();
    await page.getByLabel('First / Full Name').fill('Curious Learner');
    await page.getByLabel('Surname', { exact: true }).fill('Test');
    await page.getByLabel('Username', { exact: true }).fill(unique);
    await page.getByLabel('Institutional Email').fill(`${unique}@test.edu`);
    await page.getByLabel('Password', { exact: true }).fill('NewLearner123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('mismatch');
    await expect(page.getByText('Your passwords do not match yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete Account Registration' })).toBeDisabled();
    await page.getByRole('button', { name: 'Read & Accept' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Read & Accept' })).toBeFocused();
    await page.getByRole('button', { name: 'Read & Accept' }).click();
    await page.getByLabel('Academic Honor Code and Terms content').focus();
    await page.keyboard.press('Control+End');
    await expect(page.getByRole('checkbox')).toBeEnabled();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Accept & Enable Account Creation' }).click();
    await page.getByRole('button', { name: 'Complete Account Registration' }).click();
    await expect(page.getByLabel('Confirm password', { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/#\/signup$/);
    await page.getByLabel('Confirm password', { exact: true }).fill('NewLearner123!');
    await expect(page.getByText('Passwords match.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Complete Account Registration' }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });
}

test('landing and account pages fit small screens and respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/#/login', '/#/signup']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 390) await page.screenshot({ path: `test-results/${route === '/' ? 'landing' : route.slice(3)}-mobile.png`, fullPage: true, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const mode of ['login', 'signup']) {
    await page.goto(`/#/${mode}`);
    await page.screenshot({ path: `test-results/${mode}-desktop.png`, fullPage: true, animations: 'disabled' });
  }
});
