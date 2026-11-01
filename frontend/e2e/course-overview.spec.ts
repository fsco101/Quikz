import { expect, test, APIRequestContext } from "@playwright/test";

const root = "http://127.0.0.1:5100/api";
const question = { questionText: "Which answer demonstrates mastery?",
  options: ["Known answer", "Alternative B", "Alternative C", "Alternative D"], correctIndex: 0 };

async function fixture(request: APIRequestContext) {
  const unique = `PATH${Date.now()}`;
  const login = await request.post(`${root}/auth/login`, { data: {
    loginIdentifier: "faculty@quikz.edu", password: "Faculty@123",
  } });
  const faculty = await login.json();
  const headers = { Authorization: `Bearer ${faculty.token}` };
  const created = await request.post(`${root}/subjects`, { headers, data: {
    name: "Course overview workflow", code: unique, term: "1st Semester", yearLevel: "1st Year",
  } });
  expect(created.status()).toBe(201);
  const { subject } = await created.json();
  const modules = [];
  for (const title of ["First mastery lesson", "Next practice lesson"]) {
    const response = await request.post(`${root}/subjects/${subject._id}/modules`, { headers, multipart: {
      title, summary: "Understand and practice the lesson", audience: "both", contentType: "text", textContent: "Lecture notes for this lesson.",
    } });
    expect(response.status()).toBe(201);
    modules.push((await response.json()).module);
  }
  const quiz = await request.post(`${root}/quizzes`, { headers, data: {
    title: "First mastery end quiz", subjectId: subject._id, moduleId: modules[0]._id,
    questions: [question], timePerQuestion: 60, timeUnit: "seconds",
  } });
  expect(quiz.status()).toBe(201);
  return { unique, subject, modules, faculty, headers };
}

test("student sees earned progress and continues directly to the next unlocked lesson", async ({ page, request }) => {
  const { unique } = await fixture(request);
  const register = await request.post(`${root}/auth/register`, { data: {
    username: `student${Date.now()}`, email: `student${Date.now()}@path.edu`, password: "Password123!",
    fullName: "Learning Student", surname: "Student", role: "student", termsAccepted: true,
    yearLevel: "1st Year", section: "BSIT-S-1A",
  } });
  expect(register.status()).toBe(201);
  const { token } = await register.json();
  await page.addInitScript((value) => localStorage.setItem("quikz_token", value), token);
  await page.goto("/");
  const card = page.getByRole("article", { name: `${unique} course` });
  await expect(card).toContainText("0 of 2 modules mastered");
  await card.getByRole("button", { name: "Start learning", exact: true }).click();
  await expect(page.getByRole("heading", { name: "First mastery lesson", level: 3, exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Start \/ resume end quiz/ }).click();
  await page.getByRole("button", { name: "Start / resume quiz", exact: true }).click();
  await page.getByRole("button", { name: /Known answer/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Submit quiz/ }).click();
  await expect(page.getByRole("heading", { name: "Mastery achieved!" })).toBeVisible();
  await page.getByRole("button", { name: "Return to learning path" }).click();
  await page.reload();
  await expect(card).toContainText("1 of 2 modules mastered");
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "50");
  await page.getByLabel("Course status", { exact: true }).selectOption("completed");
  await expect(card).toHaveCount(0);
  await page.getByLabel("Course status", { exact: true }).selectOption("in-progress");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Continue learning" }).click();
  await expect(page.getByRole("heading", { name: "Next practice lesson", level: 3, exact: true })).toBeVisible();
  await page.reload();
  await page.getByText(unique, { exact: true }).click();
  // Opening the course normally also selects the first unfinished lesson.
  await expect(page.getByRole("heading", { name: "Next practice lesson", level: 3, exact: true })).toBeVisible();
});

test("faculty can find and repair a missing end quiz from the catalog", async ({ page, request }) => {
  const { unique, faculty, subject, modules, headers } = await fixture(request);
  await page.addInitScript((token) => localStorage.setItem("quikz_token", token), faculty.token);
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Teaching overview" })).toBeVisible();
  await page.getByLabel("Course status", { exact: true }).selectOption("needs-quizzes");
  const card = page.getByRole("article", { name: `${unique} course` });
  await expect(card).toContainText("1 of 2 end quizzes ready");
  await card.getByRole("button", { name: "Review missing end quiz" }).click();
  await expect(page.getByRole("heading", { name: "Next practice lesson", level: 3, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create end quiz", exact: true })).toBeVisible();
  const published = await request.post(`${root}/quizzes`, { headers, data: {
    title: "Next practice end quiz", subjectId: subject._id, moduleId: modules[1]._id,
    questions: [question], timePerQuestion: 60, timeUnit: "seconds",
  } });
  expect(published.status()).toBe(201);
  await page.reload();
  await expect(card).toContainText("2 of 2 end quizzes ready");
  await page.getByLabel("Course status", { exact: true }).selectOption("needs-quizzes");
  await expect(card).toHaveCount(0);
  await page.getByLabel("Course status", { exact: true }).selectOption("ready");
  await expect(card).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/course-overview-mobile.png", fullPage: true });
});

test("catalog errors offer retry and overview errors leave courses usable", async ({ page, request }) => {
  const login = await request.post(`${root}/auth/login`, { data: {
    loginIdentifier: "student@quikz.edu", password: "Student@123",
  } });
  const { token } = await login.json();
  await page.addInitScript((value) => localStorage.setItem("quikz_token", value), token);
  await page.route("**/api/subjects", (route) => route.fulfill({ status: 503,
    contentType: "application/json", body: JSON.stringify({ message: "Catalog temporarily unavailable" }) }));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Catalog temporarily unavailable");
  await expect(page.getByText("No Subjects Found", { exact: true })).toHaveCount(0);
  await page.unroute("**/api/subjects");
  await page.route("**/api/subjects/overview", (route) => route.fulfill({ status: 503,
    contentType: "application/json", body: JSON.stringify({ message: "Overview unavailable" }) }));
  await page.getByRole("button", { name: "Retry catalog" }).click();
  await expect(page.getByRole("alert")).toContainText("You can still open your courses");
  await expect(page.getByLabel("Course status", { exact: true })).toBeDisabled();
  await expect(page.getByRole("article", { name: "CS101 course" })).toBeVisible();
  await page.unroute("**/api/subjects/overview");
  await page.getByRole("button", { name: "Retry catalog" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Learning overview" })).toBeVisible();
  await page.getByLabel("Search subjects", { exact: true }).fill("no such course xyz");
  await expect(page.getByText("No Subjects Found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("article", { name: "CS101 course" }).getByRole("button").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Course Learning Path", { exact: true })).toBeVisible();
});
