import { test, expect } from "@playwright/test";

test("dashboard shows both seeded courses", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Software Engineering Praktikum")).toBeVisible();
  await expect(page.getByText("Web Development Project")).toBeVisible();
});

test("courses page lists all accessible courses", async ({ page }) => {
  await page.goto("/courses");
  await expect(
    page.getByRole("link", { name: "Software Engineering Praktikum" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Web Development Project" })
  ).toBeVisible();
});

test("clicking a course navigates to the course settings page", async ({
  page,
}) => {
  await page.goto("/courses");
  await page
    .getByRole("link", { name: "Software Engineering Praktikum" })
    .click();
  await expect(page).toHaveURL(/\/courses\/[^/]+/);
  // Course name appears in sidebar selector, breadcrumbs, and page heading; target the heading
  await expect(
    page.getByRole("heading", { name: "Software Engineering Praktikum" })
  ).toBeVisible();
});

test("course checkpoints page lists seeded checkpoints", async ({ page }) => {
  const courseId = await getSeCoureId(page);
  await page.goto(`/courses/${courseId}/checkpoints`);
  await expect(page.getByText(/Checkpoint 1/)).toBeVisible();
  await expect(page.getByText(/Checkpoint 2/)).toBeVisible();
  await expect(page.getByText(/Checkpoint 3/)).toBeVisible();
});

test("course groups page lists seeded groups", async ({ page }) => {
  const courseId = await getSeCoureId(page);
  await page.goto(`/courses/${courseId}/groups`);
  await expect(page.getByText("Team Alpha")).toBeVisible();
  await expect(page.getByText("Team Beta")).toBeVisible();
});

// Helper — navigates to /courses and extracts the SE course ID from its link href
async function getSeCoureId(page: import("@playwright/test").Page) {
  await page.goto("/courses");
  const link = page.getByRole("link", {
    name: "Software Engineering Praktikum",
  });
  const href = await link.getAttribute("href");
  const courseId = href?.match(/\/courses\/([^/]+)/)?.[1];
  if (!courseId) throw new Error("Could not extract SE course ID from href");
  return courseId;
}
