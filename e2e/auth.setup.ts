import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "admin");
  await page.fill('input[name="password"]', "admin");
  await page.getByRole("button", { name: "Sign in as Local Admin" }).click();
  // Admin has two courses so /dashboard stays on the course-picker page
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
