import { expect, test } from "@playwright/test";
const facts =
  "Photosynthesis: plants convert light energy into chemical energy.\nRespiration: cells release energy from stored food molecules.\nOsmosis: water moves through a selectively permeable membrane.\nDiffusion: particles move from high concentration to low concentration.";
test("faculty publishes a validated quiz; student resumes, passes and unlocks the next module", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await page.getByRole("button", { name: "Faculty Demo" }).click();
  await page.getByRole("button", { name: "Sign In to Quikz" }).click();
  const unique = `BIO${Date.now()}`;
  await page.getByRole("button", { name: /Create New Subject/ }).click();
  await page
    .getByPlaceholder("e.g. Data Structures & Algorithms")
    .fill("Biology assessment course");
  await page.getByPlaceholder("CS102").fill(unique);
  await page
    .getByRole("button", { name: "Create Subject", exact: false })
    .last()
    .click();
  await page.getByText(unique, { exact: true }).click();
  for (const title of ["Biology foundations", "Biology applications"]) {
    await page.getByRole("button", { name: /Add Topic/ }).click();
    await page.locator("input[type=text]").last().fill(title);
    await page
      .locator("textarea")
      .nth(0)
      .fill("Core concepts and definitions.");
    await page.locator("textarea").nth(1).fill(facts);
    await page
      .getByRole("button", { name: /Publish Module to Course/ })
      .click();
  }
  await page.getByText("Biology foundations", { exact: true }).first().click();
  await page.getByRole("button", { name: "Create end quiz" }).click();
  await expect(
    page.getByRole("heading", { name: "Quiz Studio", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Time per question").fill("0");
  await expect(
    page.getByRole("button", { name: "Publish module quiz" }),
  ).toBeDisabled();
  await page.getByLabel("Time per question").fill("2");
  await page.getByLabel("Time unit", { exact: true }).selectOption("minutes");
  await page.getByLabel("Passing percentage").fill("80");
  await page.getByRole("tab", { name: "Generate from lecture" }).click();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(
    page.getByText("Loaded 4 questions.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Import question bank" }).click();
  await page.getByLabel("Question bank file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByRole("alert")).toContainText("Import syntax error");
  const questions = Array.from({ length: 4 }, (_, i) => ({
    questionText: `Biology check ${i + 1}?`,
    options: [
      "Correct concept",
      "Alternative B",
      "Alternative C",
      "Alternative D",
    ],
    correctIndex: 0,
    explanation: "Review the biological concept.",
  }));
  await page.getByLabel("Question bank file").setInputFiles({
    name: "biology.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(questions)),
  });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByLabel("Question 1 text")).toHaveValue(
    "Biology check 1?",
  );
  await page.screenshot({
    path: "test-results/quiz-studio.png",
    fullPage: true,
  });
  await page.getByLabel("Questions per attempt").fill("3");
  await page.getByRole("button", { name: "Publish module quiz" }).click();
  await expect(
    page.getByText("End quiz published.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign Out" }).click();
  await page.getByRole("button", { name: "Student Demo" }).click();
  await page.getByRole("button", { name: "Sign In to Quikz" }).click();
  await page.getByText(unique, { exact: true }).click();
  await page.getByRole("button", { name: /Start \/ resume end quiz/ }).click();
  const started = page.waitForResponse(
    (r) => r.url().includes("/attempts") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start / resume quiz", exact: true })
    .click();
  const firstAttempt = (await (await started).json()).attempt;
  await page.getByRole("button", { name: /Correct concept/ }).click();
  await expect(page.getByText("Answers saved", { exact: false })).toBeVisible();
  // Refresh and re-enter to prove that the server deadline and saved answer survive.
  await page.reload();
  await page.getByText(unique, { exact: true }).click();
  await page.getByRole("button", { name: /Start \/ resume end quiz/ }).click();
  const resumed = page.waitForResponse(
    (r) => r.url().includes("/attempts") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start / resume quiz", exact: true })
    .click();
  const resumedAttempt = (await (await resumed).json()).attempt;
  expect(resumedAttempt.expiresAt).toBe(firstAttempt.expiresAt);
  expect(resumedAttempt.answers.filter((a: number) => a >= 0)).toHaveLength(1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByText(/Focus warning \d+:/)).toBeVisible();
  expect(resumedAttempt.questionExpiresAt).toBe(firstAttempt.questionExpiresAt);
  await expect(
    page.getByRole("button", { name: "Previous", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Go to question 2", { exact: true }),
  ).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    await expect(
      page.getByText(`Question ${i + 1} of 3`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Correct concept/ }).click();
    if (i < 2)
      await page
        .getByRole("button", { name: "Next question", exact: true })
        .click();
  }
  await page.screenshot({
    path: "test-results/quiz-taker.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Submit quiz/ }).click();
  await expect(
    page.getByRole("heading", { name: "Mastery achieved!" }),
  ).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Return to learning path" }).click();
  await page.getByText("Biology applications", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", {
      name: "Biology applications",
      exact: true,
      level: 3,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/module-reader-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("public catalog and mandatory terms gate remain accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Browse the public subject catalog" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Public subject catalog/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: /Create Account/ }).click();
  await expect(
    page.getByRole("button", { name: "Complete Account Registration" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Read & Accept" }).click();
  const checkbox = page.getByRole("checkbox");
  await expect(checkbox).toBeDisabled();
  await page
    .locator(".overflow-y-auto")
    .last()
    .evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  await expect(checkbox).toBeEnabled();
  await checkbox.check();
  await page
    .getByRole("button", { name: "Accept & Enable Account Creation" })
    .click();
  await expect(
    page.getByRole("button", { name: "Complete Account Registration" }),
  ).toBeEnabled();
});

test("advances timed questions and submits saved answers when the final question expires", async ({
  page,
  request,
}) => {
  const login = await request.post("http://127.0.0.1:5100/api/auth/login", {
    data: { loginIdentifier: "faculty@quikz.edu", password: "Faculty@123" },
  });
  const faculty = (await login.json()).token;
  const headers = { Authorization: `Bearer ${faculty}` };
  const unique = `AUTO${Date.now()}`;
  const created = await request.post("http://127.0.0.1:5100/api/subjects", {
    headers,
    data: {
      name: "Automatic submission course",
      code: unique,
      term: "1st Semester",
      yearLevel: "1st Year",
    },
  });
  const subject = (await created.json()).subject;
  const moduleResponse = await request.post(
    `http://127.0.0.1:5100/api/subjects/${subject._id}/modules`,
    {
      headers,
      data: {
        title: "Timed practice",
        summary: "Timer demonstration",
        textContent: "Study the facts here.",
        contentType: "text",
      },
    },
  );
  const module = (await moduleResponse.json()).module;
  const questions = Array.from({ length: 4 }, (_, i) => ({
    questionText: `Timer question ${i}?`,
    options: ["Correct", "B", "C", "D"],
    correctIndex: 0,
  }));
  expect(
    (
      await request.post("http://127.0.0.1:5100/api/quizzes", {
        headers,
        data: {
          title: "Timed quiz",
          subjectId: subject._id,
          moduleId: module._id,
          timePerQuestion: 3,
          timeUnit: "seconds",
          questionCount: 2,
          questions,
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/");
  await page.getByRole("button", { name: "Student Demo" }).click();
  await page.getByRole("button", { name: "Sign In to Quikz" }).click();
  await page.getByText(unique, { exact: true }).click();
  await page.getByRole("button", { name: /Start \/ resume end quiz/ }).click();
  await page
    .getByRole("button", { name: "Start / resume quiz", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^[ABCD] Correct$/, exact: true })
    .click();
  await expect(page.getByText("Answers saved", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Question 2 of 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep practicing" }),
  ).toBeVisible();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Retake module quiz", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Submit quiz/ })).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: /Submit quiz/ }).click();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
});
