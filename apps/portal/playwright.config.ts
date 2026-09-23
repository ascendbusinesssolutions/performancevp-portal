import { defineConfig, devices } from "@playwright/test";

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec next start -p 3000",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
