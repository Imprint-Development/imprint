import { test, expect } from "@playwright/test";

// Override the project-level storageState — these tests exercise unauthenticated state
test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/login/);
});

test("login page renders the dev credentials form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in as Local Admin" })
  ).toBeVisible();
});

test("valid credentials redirect to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "admin");
  await page.fill('input[name="password"]', "admin");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});
