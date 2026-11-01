import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const root = "http://127.0.0.1:5100/api";
test("professor previews a class CSV, sends only eligible invitations and students still accept individually", async ({ page, browser, request }) => {
  const code = `CSV${Date.now()}`;
  const accounts: Record<string, any> = {};
  for (const [name, role] of [["professor", "faculty"], ["alpha", "student"], ["beta", "student"]]) {
    const response = await request.post(`${root}/auth/register`, { data: { username: `${name}${code}`, email: `${name}${code}@roster.edu`, password: "Password123!", fullName: `${name} ${code}`, surname: name, role, yearLevel: "1st Year", section: "BSIT-S-1A", termsAccepted: true } });
    expect(response.status()).toBe(201); accounts[name] = await response.json();
  }
  const headers = (name: string) => ({ Authorization: `Bearer ${accounts[name].token}` });
  const course = await request.post(`${root}/subjects`, { headers: headers("professor"), data: { code, name: "CSV private class", term: "1st Semester", yearLevel: "1st Year" } });
  const subject = (await course.json()).subject;
  const lesson = await request.post(`${root}/subjects/${subject._id}/modules`, { headers: headers("professor"), data: { title: "Class-only lesson", summary: "Private course notes", textContent: "Notes for accepted students", contentType: "text" } });
  const module = (await lesson.json()).module;
  const alpha = accounts.alpha.user.email, beta = accounts.beta.user.email;
  const csv = `email,name\r\n${alpha},=2+3\r\n${beta},"Beta, Learner"\r\n${alpha.toUpperCase()},Repeated\r\nnot-an-email,Invalid\r\nmissing${code}@roster.edu,Not registered\r\n`;
  await page.addInitScript((token) => localStorage.setItem("quikz_token", token), accounts.professor.token);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Connections", exact: true }).click();
  await page.getByText("Invite a class from CSV", { exact: true }).click();
  const templateDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV template", exact: true }).click();
  const template = await templateDownload;
  expect(await readFile((await template.path())!, "utf8")).toMatch(/^email,name/);
  await page.getByLabel("Class roster CSV", { exact: true }).setInputFiles({ name: "class.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Preview roster", exact: true }).click();
  const preview = page.getByRole("region", { name: "Roster preview", exact: true });
  await expect(preview.getByRole("button", { name: "Send 2 invitations", exact: true })).toBeEnabled();
  await expect(preview.getByRole("cell", { name: "Ready to invite", exact: true })).toHaveCount(2);
  await expect(preview.getByRole("cell", { name: "Duplicate email", exact: true })).toHaveCount(1);
  await expect(preview.getByRole("cell", { name: "Invalid row", exact: true })).toHaveCount(1);
  await expect(preview.getByRole("cell", { name: "Account unavailable", exact: true })).toHaveCount(1);
  const before = await request.get(`${root}/connections?view=outgoing`, { headers: headers("professor") });
  expect((await before.json()).total).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/roster-preview-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/roster-preview-mobile.png", fullPage: true, animations: "disabled" });
  await preview.getByRole("button", { name: "Send 2 invitations", exact: true }).click();
  const result = page.getByRole("region", { name: "Roster invitation results", exact: true });
  await expect(result.getByRole("cell", { name: "Invitation sent", exact: true })).toHaveCount(2);
  const outgoing = await request.get(`${root}/connections?view=outgoing`, { headers: headers("professor") });
  expect((await outgoing.json()).total).toBe(2);
  expect((await request.get(`${root}/modules/${module._id}`, { headers: headers("alpha") })).status()).toBe(403);
  const reportDownload = page.waitForEvent("download");
  await result.getByRole("button", { name: "Download row report", exact: true }).click();
  const report = await reportDownload;
  const reportText = await readFile((await report.path())!, "utf8");
  expect(reportText).toContain("Invitation sent"); expect(reportText).toContain("Duplicate email");
  expect(reportText).toContain('"\'=2+3"'); // Spreadsheet-safe exported name.
  await page.getByRole("button", { name: "Preview again", exact: true }).click();
  await expect(preview.getByRole("button", { name: "Send 0 invitations", exact: true })).toBeDisabled();
  await expect(preview.getByRole("cell", { name: "Invitation pending", exact: true })).toHaveCount(2);
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await studentContext.addInitScript((token) => localStorage.setItem("quikz_token", token), accounts.alpha.token);
  try {
    const studentPage = await studentContext.newPage(); await studentPage.goto("/");
    await studentPage.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Connections", exact: true }).click();
    await expect(studentPage.getByText("Invite a class from CSV", { exact: true })).toHaveCount(0);
    await studentPage.getByRole("button", { name: "Incoming requests", exact: true }).click();
    await studentPage.getByRole("button", { name: "Accept request", exact: true }).click();
    await expect(studentPage.getByText(/^Connected\. Private lessons/)).toBeVisible();
    expect((await request.get(`${root}/modules/${module._id}`, { headers: headers("alpha") })).status()).toBe(200);
    expect((await request.get(`${root}/modules/${module._id}`, { headers: headers("beta") })).status()).toBe(403);
    const roster = await request.get(`${root}/connections`, { headers: headers("professor") });
    const body = await roster.json(); expect(body.total).toBe(1); expect(body.connections[0].person.email).toBe(alpha);
    // Replacing the file invalidates the old preview and requires a new review.
    await page.getByLabel("Class roster CSV", { exact: true }).setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from("wrong\nvalue\n") });
    await expect(page.getByRole("region", { name: "Roster preview", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Preview roster", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("header must contain email");
  } finally { await studentContext.close(); }
});
