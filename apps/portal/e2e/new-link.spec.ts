import { expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { authCopy } from "../lib/copy/auth";
import { clearMail, hydrated, latestLink, MAILPIT, sql, SUPABASE_URL } from "./support";

// "Send me a new link" (PORTAL_BUILD_PLAN.md Milestone 4; Milestone 4 plan, Section 8). An expired
// or used link lands on the page; the page answers the same whatever the address; an invitation
// never taken up is sent again, a confirmed account with a password role gets a password link, and
// an unknown address, a manager, or a repeat inside the cooldown gets nothing. Each new link works.
// The decision itself is proven branch by branch in supabase/tests/database/33_new_link.

const PASSWORD = "New-link-local-2026";
let orgId = "";

function admin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Invites an address as the account owner's access page would, as an executive viewer. */
async function invite(email: string): Promise<string> {
  const { data, error } = await admin().auth.admin.inviteUserByEmail(email, {
    redirectTo: "http://localhost:3000/auth/confirm",
  });
  if (error || !data.user) throw new Error(`invite failed: ${error?.message}`);
  await sql(
    `insert into public.org_memberships (organisation_id, user_id, role) values ($1, $2, 'executive_viewer')`,
    [orgId, data.user.id],
  );
  return data.user.id;
}

async function mailCount(email: string): Promise<number> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  const { messages } = (await search.json()) as { messages: unknown[] };
  return messages.length;
}

async function askForNewLink(page: Page, email: string) {
  await page.goto("/auth/new-link");
  await hydrated(page);
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send me a new link" }).click();
  await expect(page.getByText(authCopy["newLink.sent"])).toBeVisible();
}

async function setPasswordAndSignIn(page: Page, email: string) {
  await expect(page).toHaveURL(/\/auth\/set-password$/);
  await hydrated(page);
  await page.getByLabel("New password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm new password").fill(PASSWORD);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-set$/);
  await hydrated(page);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
}

test.beforeAll(async () => {
  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  orgId = org!.id;
});

test.beforeEach(async () => {
  await clearMail();
});

test.afterEach(async () => {
  await sql(`delete from auth.users where email like 'newlink.%@local.test'`);
});

test("an expired or used link offers a new one, and an invitation never taken up is sent again", async ({
  page,
}) => {
  const email = `newlink.invited.${Date.now()}@local.test`;
  await invite(email);
  await clearMail();

  // A link that no longer works lands on the page, which says so.
  await page.goto("/auth/confirm?token_hash=no-longer-valid&type=invite");
  await expect(page).toHaveURL(/\/auth\/new-link\?notice=expired$/);
  await expect(page.getByText(authCopy["newLink.expired"])).toBeVisible();

  await askForNewLink(page, email);
  await page.goto(await latestLink(email, "invite"));
  await setPasswordAndSignIn(page, email);
});

test("a confirmed account that never set a password is sent a password link", async ({ page }) => {
  const email = `newlink.confirmed.${Date.now()}@local.test`;
  await invite(email);
  // The invitation is opened, which confirms the address, and left before a password is set.
  await page.goto(await latestLink(email, "invite"));
  await expect(page).toHaveURL(/\/auth\/set-password$/);
  await page.context().clearCookies();
  await clearMail();

  await askForNewLink(page, email);
  await page.goto(await latestLink(email, "recovery"));
  await setPasswordAndSignIn(page, email);
});

test("the answer is the same, and nothing is sent, for an unknown address, a manager, and a repeat", async ({
  page,
}) => {
  const unknown = `newlink.nobody.${Date.now()}@local.test`;
  await askForNewLink(page, unknown);
  await askForNewLink(page, "mgr@local.test");

  // A second request for the same account inside the cooldown sends nothing more.
  const email = `newlink.repeat.${Date.now()}@local.test`;
  await invite(email);
  await clearMail();
  await askForNewLink(page, email);
  await latestLink(email, "invite");
  await askForNewLink(page, email);

  // The sending happens after the answer; give it the time a send would take.
  await page.waitForTimeout(2_000);
  expect(await mailCount(unknown)).toBe(0);
  expect(await mailCount("mgr@local.test")).toBe(0);
  expect(await mailCount(email)).toBe(1);
});
