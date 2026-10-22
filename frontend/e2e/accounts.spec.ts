import { test, expect } from "@playwright/test";
import path from "node:path";
const server = "http://127.0.0.1:5100/api";
test("faculty edits owned modules/quizzes and shared avatars are visible to another faculty", async ({
  page,
  request,
}) => {
  const unique = `OWN${Date.now()}`;
  const logged = await request.post(`${server}/auth/login`, {
    data: { loginIdentifier: "faculty@quikz.edu", password: "Faculty@123" },
  });
  const owner = await logged.json();
  const headers = { Authorization: `Bearer ${owner.token}` };
  const subject = (
    await (
      await request.post(`${server}/subjects`, {
        headers,
        data: {
          name: "Ownership course",
          code: unique,
          term: "1st Semester",
          yearLevel: "1st Year",
        },
      })
    ).json()
  ).subject;
  const module = (
    await (
      await request.post(`${server}/subjects/${subject._id}/modules`, {
        headers,
        data: {
          title: "Owned topic",
          summary: "Topic summary",
          textContent: "Original lesson",
          contentType: "text",
        },
      })
    ).json()
  ).module;
  expect(
    (
      await request.post(`${server}/quizzes`, {
        headers,
        data: {
          subjectId: subject._id,
          moduleId: module._id,
          title: "Owned assessment",
          timePerQuestion: 30,
          timeUnit: "seconds",
          passingPercentage: 75,
          questions: Array.from({ length: 2 }, (_, i) => ({
            questionText: `Check ${i}?`,
            options: ["Correct", "B", "C", "D"],
            correctIndex: 0,
          })),
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/");
  await page.getByRole("button", { name: /Faculty Demo/ }).click();
  await page.getByRole("button", { name: "Sign In to Quikz" }).click();
  await expect(
    page.getByRole("button", { name: "System health", exact: true }),
  ).toHaveCount(0);
  await page.getByText(unique, { exact: true }).click();
  await page.getByRole("button", { name: "Edit module", exact: true }).click();
  await page
    .getByLabel("Module title", { exact: true })
    .fill("Updated owned topic");
  await page
    .getByLabel("Lecture text", { exact: true })
    .fill("Updated lecture from its creator.");
  await page.getByRole("button", { name: "Save module changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated owned topic", exact: true, level: 3 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit quiz", exact: true }).click();
  await expect(page.getByLabel("Quiz title", { exact: true })).toHaveValue(
    "Owned assessment",
  );
  await page
    .getByLabel("Quiz title", { exact: true })
    .fill("Updated owned assessment");
  await page.getByLabel("Passing percentage", { exact: true }).fill("85");
  await page
    .getByLabel("Question 1 text", { exact: true })
    .fill("Updated question?");
  await page.getByRole("button", { name: "Save quiz changes" }).click();
  await expect(
    page.getByText("Published: Updated owned assessment", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page
    .getByLabel("Public bio", { exact: true })
    .fill(`Faculty bio ${unique}`);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile updated.");
  await page
    .getByLabel("Choose avatar", { exact: true })
    .setInputFiles(path.resolve("e2e/fixtures/avatar.png"));
  await page
    .getByRole("button", { name: "Upload avatar", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Avatar updated.");
  await page.screenshot({ path: "test-results/profile.png", fullPage: true });
  const peer = await request.post(`${server}/auth/register`, {
    data: {
      username: `peer_${unique}`,
      email: `peer_${unique}@test.edu`,
      password: "Peer123!",
      fullName: "Peer Professor",
      surname: "Professor",
      role: "faculty",
      termsAccepted: true,
    },
  });
  const peerToken = (await peer.json()).token;
  await page.evaluate(
    (token) => localStorage.setItem("quikz_token", token),
    peerToken,
  );
  await page.reload();
  await page.getByText(unique, { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit module", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit quiz", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Add Topic/ })).toHaveCount(0);
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.getByLabel("Search people").fill(owner.user.username);
  const card = page
    .locator("article")
    .filter({ hasText: `Faculty bio ${unique}` });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();
  expect(
    await card
      .locator("img")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/shared-avatars.png",
    fullPage: true,
  });
});
test("admin manages users, edits own profile and has exclusive health navigation", async ({
  page,
}) => {
  const unique = `managed_${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Admin Demo", exact: true }).click();
  await page.getByRole("button", { name: "Sign In to Quikz" }).click();
  await expect(
    page.getByRole("button", { name: "System health", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "User management", exact: true })
    .click();
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByLabel("User full name", { exact: true }).fill(unique);
  await page.getByLabel("User surname", { exact: true }).fill("Managed");
  await page.getByLabel("User username", { exact: true }).fill(unique);
  await page
    .getByLabel("User email", { exact: true })
    .fill(`${unique}@test.edu`);
  await page.getByLabel("User password", { exact: true }).fill("Managed123!");
  await page.getByLabel("Confirm user accepted terms").check();
  await page.getByRole("button", { name: "Save user", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("User created.");
  await page.getByLabel("Search users").fill(unique);
  await page
    .getByRole("button", { name: `Edit ${unique}`, exact: true })
    .click();
  await page.getByLabel("User role", { exact: true }).selectOption("faculty");
  await page.getByLabel("Account active", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save user", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: unique }),
  ).toContainText("Disabled");
  await page
    .getByRole("button", { name: `Edit ${unique}`, exact: true })
    .click();
  await page.getByLabel("Account active", { exact: true }).check();
  await page.getByLabel("User password", { exact: true }).fill("Reset123!");
  await page.getByRole("button", { name: "Save user", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: unique }),
  ).toContainText("Active");
  await page.screenshot({
    path: "test-results/user-management.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page
    .getByLabel("Public bio", { exact: true })
    .fill("Quikz administrator.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile updated.");
  await page
    .getByRole("button", { name: "System health", exact: true })
    .click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "User management", exact: true })
    .click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: "test-results/user-management-mobile.png",
    fullPage: true,
  });
});
