import { test, expect } from "@playwright/test";

test("grading page shows seeded student names", async ({ page }) => {
  const courseId = await getSeCourseId(page);
  await page.goto(`/courses/${courseId}/grading`);

  await expect(page.getByText("Lena Fischer")).toBeVisible();
  await expect(page.getByText("Max Bauer")).toBeVisible();
  await expect(page.getByText("Anna Becker")).toBeVisible();
});

test("grading page has Export CSV button", async ({ page }) => {
  const courseId = await getSeCourseId(page);
  await page.goto(`/courses/${courseId}/grading`);

  await expect(page.getByRole("link", { name: /Export CSV/i })).toBeVisible();
});

test("grading page shows grade categories", async ({ page }) => {
  const courseId = await getSeCourseId(page);
  await page.goto(`/courses/${courseId}/grading`);

  await expect(page.getByText("Code Quality")).toBeVisible();
  await expect(page.getByText("Testing")).toBeVisible();
  await expect(page.getByText("Code Review")).toBeVisible();
});

async function getSeCourseId(page: import("@playwright/test").Page) {
  await page.goto("/courses");
  const link = page.getByRole("link", {
    name: "Software Engineering Praktikum",
  });
  const href = await link.getAttribute("href");
  const courseId = href?.match(/\/courses\/([^/]+)/)?.[1];
  if (!courseId) throw new Error("Could not extract SE course ID from href");
  return courseId;
}
