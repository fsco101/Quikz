import { test, expect } from "@playwright/test";

const api = "http://127.0.0.1:5100/api";
test("email acceptance controls private uploads, roster privacy and student-specific results", async ({ page, browser, request }) => {
  const code = `LINK${Date.now()}`;
  const users: Record<string, any> = {};
  for (const [name, role] of [["professor", "faculty"], ["student", "student"], ["peer", "student"]]) {
    const response = await request.post(`${api}/auth/register`, { data: {
      username: `${name}${code}`, email: `${name}${code}@connection.edu`, password: "Password123!", role,
      fullName: `${name} ${code}`, surname: name, yearLevel: "1st Year", section: "BSIT-S-1A", termsAccepted: true,
    } });
    expect(response.status()).toBe(201); users[name] = await response.json();
  }
  const auth = (name: string) => ({ Authorization: `Bearer ${users[name].token}` });
  const subjectResponse = await request.post(`${api}/subjects`, { headers: auth("professor"), data: { name: "Connected learning course", code, yearLevel: "1st Year", term: "1st Semester" } });
  expect(subjectResponse.status()).toBe(201);
  const subject = (await subjectResponse.json()).subject;
  await page.addInitScript((token) => localStorage.setItem("quikz_token", token), users.professor.token);
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${code}: Connected learning course`, exact: true }).click();
  await page.getByRole("button", { name: /Add Topic \/ Module/ }).click();
  await expect(page.getByLabel("Module audience")).toHaveValue("connected");
  await page.getByLabel("Module title", { exact: true }).fill(`Private topic ${code}`);
  await page.getByLabel("Module summary", { exact: true }).fill("For accepted students only");
  await page.getByLabel("Lecture text", { exact: true }).fill("Private connection lecture");
  await page.getByRole("button", { name: /Publish Module to Course/ }).click();
  await expect(page.getByRole("heading", { name: `Private topic ${code}`, level: 3, exact: true })).toBeVisible();
  const modulesResponse = await request.get(`${api}/subjects/${subject._id}/modules`, { headers: auth("professor") });
  const module = (await modulesResponse.json()).modules[0];
  const quizResponse = await request.post(`${api}/quizzes`, { headers: auth("professor"), data: {
    title: `Connection quiz ${code}`, subjectId: subject._id, moduleId: module._id, timePerQuestion: 60, timeUnit: "seconds",
    questions: [{ questionText: "Choose mastery", options: ["Right answer", "B", "C", "D"], correctIndex: 0 }],
  } });
  expect(quizResponse.status()).toBe(201); const quiz = (await quizResponse.json()).quiz;
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Connections", exact: true }).click();
  await page.getByLabel("Student email", { exact: true }).fill(users.student.user.email);
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByRole("article", { name: `${users.student.user.fullName} connection` })).toContainText("Awaiting acceptance");
  expect((await request.get(`${api}/modules/${module._id}`, { headers: auth("student") })).status()).toBe(403);
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await studentContext.addInitScript((token) => localStorage.setItem("quikz_token", token), users.student.token);
  const studentPage = await studentContext.newPage();
  try {
    await studentPage.goto("/");
    await studentPage.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Connections", exact: true }).click();
    await studentPage.getByRole("button", { name: "Incoming requests", exact: true }).click();
    await studentPage.getByRole("button", { name: "Accept request", exact: true }).click();
    await expect(studentPage.getByText(/^Connected\. Private lessons/)).toBeVisible();
    await studentPage.getByRole("button", { name: "My professors", exact: true }).click();
    await expect(studentPage.getByRole("article")).toContainText(users.professor.user.email);
    await studentPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await studentPage.screenshot({ path: "test-results/connections-student-mobile.png", fullPage: true, animations: "disabled" });
    expect(await studentPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "My students", exact: true }).click();
    await expect(page.getByRole("article")).toContainText(users.student.user.email);
    await expect(page.getByRole("article")).not.toContainText(users.peer.user.email);
    await page.screenshot({ path: "test-results/connections-faculty-desktop.png", fullPage: true, animations: "disabled" });

    const sessionToken = `connection-attempt-${Date.now()}`;
    const started = await request.post(`${api}/quizzes/${quiz._id}/attempts`, { headers: auth("student"), data: { sessionToken } });
    expect(started.status()).toBe(200); const attempt = await started.json();
    const answer = attempt.quiz.questions[0].options.indexOf("Right answer");
    const submitted = await request.post(`${api}/quizzes/${quiz._id}/attempts/${attempt.attempt.id}/submit`, { headers: auth("student"), data: { sessionToken, answers: [answer], questionIndex: 0 } });
    expect(submitted.status()).toBe(200);
    await studentPage.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "My results", exact: true }).click();
    await expect(studentPage.getByRole("heading", { name: "My quiz results", exact: true })).toBeVisible();
    await expect(studentPage.getByRole("cell", { name: `Connection quiz ${code}`, exact: true })).toBeVisible();
    const peerReport = await request.get(`${api}/gradebook?studentId=${users.student.user.id}`, { headers: auth("peer") });
    expect((await peerReport.json()).summary.attempts).toBe(0);
    await studentPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await studentPage.screenshot({ path: "test-results/connections-my-results-mobile.png", fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await page.getByRole("button", { name: "Confirm disconnect", exact: true }).click();
    await expect(page.getByText(/^Connection removed\./)).toBeVisible();
    expect((await request.get(`${api}/modules/${module._id}`, { headers: auth("student") })).status()).toBe(403);
    expect((await request.get(`${api}/gradebook`, { headers: auth("professor") })).status()).toBe(200);
    expect((await (await request.get(`${api}/gradebook`, { headers: auth("professor") })).json()).summary.attempts).toBe(0);
    expect((await (await request.get(`${api}/gradebook`, { headers: auth("student") })).json()).summary.attempts).toBe(1);

    // A deliberate audience edit makes a lesson discoverable without exposing
    // student records or restoring the removed connection.
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Learning path", exact: true }).click();
    await page.getByRole("button", { name: `Open ${code}: Connected learning course`, exact: true }).click();
    await page.getByRole("button", { name: "Edit module", exact: true }).click();
    await page.getByLabel("Module audience").selectOption("both");
    await page.getByRole("button", { name: /Save module changes/ }).click();
    await expect(page.getByText("Shared with connected students and public learners", { exact: true })).toBeVisible();
    const publicDirectory = await request.get(`${api}/directory?search=${encodeURIComponent(`Private topic ${code}`)}`);
    expect((await publicDirectory.json()).total).toBe(1);
    expect((await request.get(`${api}/modules/${module._id}`, { headers: auth("peer") })).status()).toBe(200);
  } finally { await studentContext.close(); }
});
