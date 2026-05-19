import { test, expect } from "@playwright/test";

test("admin can access the admin panel", async ({ page }) => {
  await page.goto("/admin");
  // Should land on the admin page, not be redirected away
  await expect(page).toHaveURL(/\/admin/);
  // "Local Admin" also appears in the sidebar user widget; .first() avoids strict-mode violation
  await expect(page.getByText("Local Admin").first()).toBeVisible();
});

test("admin user table shows seeded lecturer accounts", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("prof.mueller@university.edu")).toBeVisible();
  await expect(page.getByText("dr.schmidt@university.edu")).toBeVisible();
});
