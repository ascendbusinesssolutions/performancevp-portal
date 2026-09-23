import { expect, test } from "@playwright/test";

import { consoleCopy } from "../lib/copy/console";
import { setupCopy } from "../lib/copy/setup";
import { PASSWORD, hydrated, resetPersonas, signInAndEnrol, sql } from "./support";

// Who reaches the setup screens (Milestone 4 plan, Section 14). Viewers are sent home from every
// one of them; PerformanceVP staff reach them only under a support session, are told so, and
// everything they do appears in the account owner's record of that session; in grace every setup
// screen is read-only. The database enforces all of it (supabase/tests/database); these check what
// the person sees.

const SUPPORT = "support@pvp.local";
const ADMIN = "admin@local.test";
const ACCOUNT_OWNER = "ao@local.test";
const EXEC = "exec@local.test";
const UNIT_VIEWER = "uv@local.test";
let orgId = "";
let term: { period_start: string; period_end: string };

const SETUP_PATHS = [
  "setup",
  "setup/organisation",
  "units",
  "directory",
  "directory/people/new",
  "context",
  "formal-ratings",
  "readiness",
];

test.beforeAll(async () => {
  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  orgId = org!.id;
  const [row] = await sql<{ period_start: string; period_end: string }>(
    `select to_char(period_start, 'YYYY-MM-DD') as period_start, to_char(period_end, 'YYYY-MM-DD') as period_end
     from public.subscriptions where organisation_id = $1`,
    [orgId],
  );
  term = row!;
});

test.beforeEach(async () => {
  await resetPersonas([SUPPORT, ADMIN, ACCOUNT_OWNER, EXEC, UNIT_VIEWER]);
  await sql(
    `update public.support_sessions set ended_at = now() where ended_at is null
     and staff_user_id in (select id from auth.users where email = $1)`,
    [SUPPORT],
  );
});

test.afterEach(async () => {
  await sql(
    `update public.subscriptions set period_start = $2, period_end = $3 where organisation_id = $1`,
    [orgId, term.period_start, term.period_end],
  );
  await sql(`delete from public.teams where organisation_id = $1 and name = 'Support team'`, [
    orgId,
  ]);
});

for (const viewer of [EXEC, UNIT_VIEWER]) {
  test(`${viewer === EXEC ? "an executive" : "a unit"} viewer is sent home from every setup screen`, async ({
    page,
  }) => {
    await page.goto("/login");
    await hydrated(page);
    await page.getByLabel("Work email").fill(viewer);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
    for (const path of SETUP_PATHS) {
      await page.goto(`/org/${orgId}/${path}`);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
    }
  });
}

test("staff reach setup only under a session, are told so, and what they do is in the account owner's record", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInAndEnrol(page, SUPPORT);
  await page.goto(`/org/${orgId}/units`);
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();

  await page.getByRole("link", { name: "PerformanceVP console" }).click();
  const row = page.getByRole("row", { name: /Local Demo Organisation/ });
  await row.getByLabel("Reason for opening a session").fill("Guided setup of the units");
  await row.getByRole("button", { name: "Open a session" }).click();
  await expect(row.getByRole("link", { name: "Open the organisation" })).toBeVisible();

  const [ops] = await sql<{ id: string }>(
    `select id from public.business_units where organisation_id = $1 and unit_code = 'OPS'`,
    [orgId],
  );
  await page.goto(`/org/${orgId}/units/${ops!.id}`);
  await hydrated(page);
  await expect(page.getByText(/under a PerformanceVP support session that ends at/)).toBeVisible();
  await page.getByLabel("Team name").fill("Support team");
  await page.getByRole("button", { name: "Add the team" }).click();
  await expect(page.getByText(setupCopy["notice.saved"])).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signInAndEnrol(page, ACCOUNT_OWNER);
  await page.goto(`/org/${orgId}/access`);
  // The open session (earlier ones are ended), with the team added under it in its trail.
  const session = page
    .getByRole("listitem")
    .filter({ hasText: /Sam Support, .* open now, Guided setup of the units/ });
  await expect(session).toBeVisible();
  await expect(session.getByText(/row\.insert teams/)).toBeVisible();
});

test("in grace every setup screen can be read and nothing can be changed", async ({ page }) => {
  test.setTimeout(120_000);
  // The term ended ten days ago: inside the 30-day read-only grace period.
  await sql(
    `update public.subscriptions set period_start = current_date - 375, period_end = current_date - 10
     where organisation_id = $1`,
    [orgId],
  );
  await signInAndEnrol(page, ADMIN);
  for (const path of SETUP_PATHS.filter((p) => p !== "directory/people/new")) {
    await page.goto(`/org/${orgId}/${path}`);
    await expect(page.getByText(consoleCopy["access.grace"])).toBeVisible();
  }

  await page.goto(`/org/${orgId}/units`);
  await expect(page.getByLabel("Unit code")).toBeDisabled();
  await page.goto(`/org/${orgId}/directory`);
  await expect(page.getByLabel("Choose the file")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add a person" })).toHaveCount(0);
  await page.goto(`/org/${orgId}/setup/organisation`);
  await expect(page.getByLabel("Organisation name")).toBeDisabled();
});
