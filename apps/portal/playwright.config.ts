import { defineConfig, devices } from "@playwright/test";

// The local keys and the cron secret, for the checks made against the API and the job route. In CI
// the workflow sets them in the environment instead.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local file: the environment already holds what is needed.
}

/**
 * End-to-end checks of the sign-in paths against the local Supabase stack and the dev seed
 * (supabase/seed.sql). The tests share the database, so they run one at a time. The app is
 * started with `next start`, so run `pnpm build` first; an app already on port 3000 is reused.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /\.phone\.spec\.ts$/ },
    // The survey is tested on a phone before anything else (PORTAL_UX_BRIEF.md 7): 390 wide, touch.
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      testMatch: /\.phone\.spec\.ts$/,
    },
  ],
  webServer: {
    command: "pnpm exec next start -p 3000",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
