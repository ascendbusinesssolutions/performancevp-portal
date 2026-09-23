import { expect, type Page, test } from "@playwright/test";

import { clearMail, latestLink, PASSWORD, resetPersonas, sql, totp } from "./support";

// The PerformanceVP console and the account owner's access page (Milestone 3 plan, step 8).
const OWNER = "owner@pvp.local";
const SUPPORT = "support@pvp.local";
const ACCOUNT_OWNER = "ao@local.test";

test.beforeEach(async () => {
  await resetPersonas([OWNER, SUPPORT, ACCOUNT_OWNER]);
  await sql(
    `update public.support_sessions set ended_at = now() where ended_at is null
     and staff_user_id in (select id from auth.users where email = any($1))`,
    [[OWNER, SUPPORT]],
  );
  await clearMail();
});

/** Signs in with a password and enrols TOTP (every persona here needs it); returns the secret. */
async function signInAndEnrol(page: Page, email: string, password = PASSWORD): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/mfa\/enrol$/);
  await page.getByRole("button", { name: "Show the setup code" }).click();
  const secret = (await page.getByTestId("totp-secret").innerText()).trim();
  await page.getByLabel("Code from your app").fill((await totp(secret)).code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
  return secret;
}

test("the Owner provisions an organisation and its account owner sets up their account", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const organisation = `Provisioned ${stamp} Pty Ltd`;
  const newOwner = `new.owner.${stamp}@local.test`;

  await signInAndEnrol(page, OWNER);
  await page.getByRole("link", { name: "PerformanceVP console" }).click();
  await page.getByLabel("Organisation name").fill(organisation);
  await page.getByLabel("Term starts").fill("2026-09-01");
  await page.getByLabel("Term ends").fill("2027-08-31");
  await page.getByLabel("Agreement signed").fill("2026-08-25");
  await page.getByLabel("Invoice reference").fill(`INV-${stamp}`);
  await page.getByLabel("Account owner's work email").fill(newOwner);
  await page.getByRole("button", { name: "Provision" }).click();
  await expect(page.getByText("Provisioned. The account owner has access")).toBeVisible();
  await expect(page.getByRole("cell", { name: organisation })).toBeVisible();

  // The account owner follows the invitation, sets a password, signs in and enrols.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto(await latestLink(newOwner, "invite"));
  await expect(page).toHaveURL(/\/auth\/set-password$/);
  await page.getByLabel("New password", { exact: true }).fill("Owner-of-new-2026");
  await page.getByLabel("Confirm new password").fill("Owner-of-new-2026");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-set$/);
  await signInAndEnrol(page, newOwner, "Owner-of-new-2026");
  await expect(page.getByRole("cell", { name: organisation })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Account owner" })).toBeVisible();

  const [audit] = await sql<{ n: string }>(
    `select count(*) as n from public.audit_logs a join public.organisations o on o.id = a.organisation_id
     where o.name = $1 and a.action = 'organisation.provisioned' and a.actor_kind = 'owner'`,
    [organisation],
  );
  expect(Number(audit!.n)).toBe(1);
});

test("a support session appears on the account owner's page, with the staff member's name and reason", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signInAndEnrol(page, SUPPORT);
  await page.getByRole("link", { name: "PerformanceVP console" }).click();
  const row = page.getByRole("row", { name: /Local Demo Organisation/ });
  await row.getByLabel("Reason for opening a session").fill("Helping load the first directory");
  await row.getByRole("button", { name: "Open a session" }).click();
  await expect(row.getByRole("link", { name: "Open the organisation" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signInAndEnrol(page, ACCOUNT_OWNER);
  await page.getByRole("link", { name: "Access and people" }).click();
  await expect(
    page.getByText(/Sam Support, .* open now, Helping load the first directory/),
  ).toBeVisible();
});

test("the account owner gives someone access, and an invitation is sent", async ({ page }) => {
  test.setTimeout(90_000);
  const invitee = `viewer.${Date.now()}@local.test`;
  await signInAndEnrol(page, ACCOUNT_OWNER);
  await page.getByRole("link", { name: "Access and people" }).click();
  await page.getByLabel("Work email").fill(invitee);
  await page.getByLabel("Role").selectOption("executive_viewer");
  await page.getByRole("button", { name: "Give access" }).click();
  await expect(page.getByText("Access granted.")).toBeVisible();
  // The invitation creates the account at once, so the person is listed with access already.
  await expect(page.getByRole("cell", { name: invitee })).toBeVisible();
  expect(await latestLink(invitee, "invite")).toContain("type=invite");
});
