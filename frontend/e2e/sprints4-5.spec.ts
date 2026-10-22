import { test, expect, APIRequestContext } from "@playwright/test";
const server = "http://127.0.0.1:5100";
let subjectId: string,
  facultyToken: string,
  alphaToken: string,
  betaToken: string;
const code = `REPORT${Date.now()}`;
test.beforeAll(async ({ request }) => {
  const login = await request.post(`${server}/api/auth/login`, {
    data: { loginIdentifier: "faculty@quikz.edu", password: "Faculty@123" },
  });
  facultyToken = (await login.json()).token;
  for (const [name, yearLevel, section] of [
    ["alpha", "2nd Year", "Section A"],
    ["beta", "3rd Year", "Section B"],
  ]) {
    const result = await request.post(`${server}/api/auth/register`, {
      data: {
        username: `${name}_${code}`,
        email: `${name}${code}@test.edu`,
        password: "Password123!",
        role: "student",
        fullName: name === "alpha" ? "Ada Alpha" : "Zoe Beta",
        surname: name === "alpha" ? "Alpha" : "Beta",
        yearLevel,
        section,
        termsAccepted: true,
      },
    });
    expect(result.status()).toBe(201);
    if (name === "alpha") alphaToken = (await result.json()).token;
    else betaToken = (await result.json()).token;
  }
  const headers = { Authorization: `Bearer ${facultyToken}` };
  const subject = await request.post(`${server}/api/subjects`, {
    headers,
    data: {
      name: "Reporting and discovery course",
      code,
      term: "2nd Semester",
      yearLevel: "2nd Year",
      description: "A public syllabus for browser verification.",
    },
  });
  subjectId = (await subject.json()).subject._id;
  const module = await request.post(
    `${server}/api/subjects/${subjectId}/modules`,
    {
      headers,
      data: {
        title: "Discoverable foundations",
        summary: "Understand the foundations.",
        textContent: "Unique chlorophyll discovery term in the lecture.",
        contentType: "text",
      },
    },
  );
  const moduleId = (await module.json()).module._id;
  await request.post(`${server}/api/subjects/${subjectId}/modules`, {
    headers,
    data: {
      title: "Advanced discoverable applications",
      summary: "Apply the foundations.",
      textContent: "Protected advanced lecture body.",
      contentType: "text",
    },
  });
  const quiz = await request.post(`${server}/api/quizzes`, {
    headers,
    data: {
      title: "Reporting mastery check",
      subjectId,
      moduleId,
      timeLimitMinutes: 10,
      questions: Array.from({ length: 4 }, (_, i) => ({
        questionText: `Reporting check ${i}?`,
        options: ["Right answer", "Other B", "Other C", "Other D"],
        correctIndex: 0,
      })),
    },
  });
  expect(quiz.status()).toBe(201);
  const quizId = (await quiz.json()).quiz._id;
  const attempt = async (token: string, count: number) => {
    const headers = { Authorization: `Bearer ${token}` },
      sessionToken = `session-${token.slice(-30)}`;
    const started = await request.post(
      `${server}/api/quizzes/${quizId}/attempts`,
      { headers, data: { sessionToken } },
    );
    expect(started.status()).toBe(200);
    const body = await started.json();
    const answers = body.quiz.questions.map((q: any, i: number) =>
      i < count ? q.options.indexOf("Right answer") : -1,
    );
    const result = await request.post(
      `${server}/api/quizzes/${quizId}/attempts/${body.attempt.id}/submit`,
      { headers, data: { sessionToken, answers } },
    );
    expect(result.status()).toBe(200);
  };
  await attempt(alphaToken, 2);
  await attempt(alphaToken, 4);
  await attempt(betaToken, 3);
});
test("faculty filters separated cohorts and downloads both report formats", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    (token) => localStorage.setItem("quikz_token", token),
    facultyToken,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Master gradebook", exact: true })
    .click();
  await page.getByLabel("Gradebook subject").selectOption(subjectId);
  await expect(
    page.getByRole("region", { name: "2nd Year - Section A results" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "3rd Year - Section B results" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "3rd Year - Section B", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "2nd Year - Section A results" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "Zoe Beta Beta", exact: false }),
  ).toBeVisible();
  await page.getByLabel("Result status").selectOption("passed");
  await expect(
    page.getByRole("region", { name: "3rd Year - Section B results" }),
  ).toBeVisible();
  for (const format of ["Excel", "PDF"]) {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Export ${format}`, exact: true })
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(
      `quikz-faculty-results.${format === "Excel" ? "xlsx" : "pdf"}`,
    );
    await file.saveAs(
      `test-results/browser-gradebook.${format === "Excel" ? "xlsx" : "pdf"}`,
    );
  }
  await page
    .getByRole("button", { name: "All cohorts (separate tables)", exact: true })
    .click();
  await page.getByLabel("Result status").selectOption("all");
  await page.getByLabel("Search results").fill("Ada");
  await expect(
    page.getByRole("region", { name: "3rd Year - Section B results" }),
  ).toHaveCount(0);
  await page.getByLabel("Search results").fill("");
  await expect(
    page.getByRole("region", { name: "3rd Year - Section B results" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/master-gradebook.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/master-gradebook-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("student sees only personal attempts and can return to a lesson from directory search", async ({
  page,
}) => {
  await page.addInitScript(
    (token) => localStorage.setItem("quikz_token", token),
    alphaToken,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "My results", exact: true }).click();
  await page.getByLabel("Gradebook subject").selectOption(subjectId);
  await expect(
    page.getByRole("heading", { name: "My quiz results", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "#2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Zoe Beta Beta", exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "System health", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Lesson directory", exact: true })
    .click();
  await page.getByLabel("Search lessons").fill("Unique chlorophyll");
  await expect(page.getByText("1 lesson found", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Open learning path", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Discoverable foundations",
      exact: true,
      level: 3,
    }),
  ).toBeVisible();
});
test("guests search the directory and faculty inspect the live health and audit dashboards", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Browse the public lesson directory",
      exact: true,
    })
    .click();
  await page.getByLabel("Search lessons").fill("Unique chlorophyll");
  await expect(
    page.getByRole("heading", {
      name: "Discoverable foundations",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Directory year level").selectOption("2nd Year");
  await page.getByLabel("Directory term").selectOption("2nd Semester");
  await page.locator("summary").filter({ hasText: code }).click();
  await expect(
    page.getByText("Advanced discoverable applications", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/lesson-directory.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: /Faculty Demo/ }).click();
  await page.getByRole("button", { name: /Sign In to Quikz/ }).click();
  await page
    .getByRole("button", { name: "System health", exact: true })
    .click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Temporary local MongoDB", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Audit action").selectOption("quiz.result_recorded");
  await expect(page.locator("tbody tr").first()).toContainText(
    "quiz.result_recorded",
  );
  await page.screenshot({
    path: "test-results/system-health.png",
    fullPage: true,
  });
});
