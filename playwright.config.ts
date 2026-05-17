import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Tests share a DB — run sequentially to avoid dirty-read flakiness
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["html"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Runs first: log in once and save session cookies
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // All spec files run with the saved session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // LOCAL_LOGIN_ENABLED shows the credentials form; DATABASE_URL and
    // AUTH_SECRET are inherited from the CI job env or from .env.local locally.
    // AUTH_URL tells Auth.js which host to trust (required in v5).
    env: {
      LOCAL_LOGIN_ENABLED: "true",
      AUTH_URL: "http://localhost:3000",
    },
  },
});
