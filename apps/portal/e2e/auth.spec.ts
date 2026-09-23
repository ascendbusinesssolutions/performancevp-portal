import { expect, type Page, test } from "@playwright/test";

import {
  apiClient,
  clearMail,
  latestCode,
  latestLink,
  PASSWORD,
  PUBLISHABLE_KEY,
  resetPersonas,
  sql,
  SUPABASE_URL,
  totp,
} from "./support";

// Sign-in paths (Milestone 3 plan, decision 1 and Section 9), against the dev seed personas.
const ADMIN = "admin@local.test";
const EXEC = "exec@local.test";
const MANAGER = "mgr@local.test";
const ACCOUNT_OWNER = "ao@local.test";

test.beforeEach(async () => {
  await resetPersonas([ADMIN, EXEC, MANAGER, ACCOUNT_OWNER]);
  await clearMail();
});

async function signInWithPassword(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signInWithCode(page: Page, email: string) {
  await page.goto("/login/code");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByText("If that address is on a rating list, a code is on its way."),
  ).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(await latestCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a visitor with no session is sent to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("an executive viewer with no factor lands without a second step", async ({ page }) => {
  await signInWithPassword(page, EXEC);
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
  await expect(page.getByText("Executive viewer", { exact: true })).toBeVisible();
});

test("an administrator must enrol TOTP before anything else, then is challenged at each sign-in", async ({
  page,
}) => {
  // Waits for a fresh 30-second TOTP window before the second code, as Supabase refuses a code twice.
  test.setTimeout(90_000);
  await signInWithPassword(page, ADMIN);
  await expect(page).toHaveURL(/\/mfa\/enrol$/);

  // Blocked at aal1: the signed-in area sends them back.
  await page.goto("/");
  await expect(page).toHaveURL(/\/mfa\/enrol$/);

  await page.getByRole("button", { name: "Show the setup code" }).click();
  const secret = (await page.getByTestId("totp-secret").innerText()).trim();
  const first = await totp(secret);
  await page.getByLabel("Code from your app").fill(first.code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Administrator", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?notice=signed-out$/);

  await signInWithPassword(page, ADMIN);
  await expect(page).toHaveURL(/\/mfa\/challenge$/);
  const second = await totp(secret, first.window);
  await page.getByLabel("Code from your app").fill(second.code);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Administrator", { exact: true })).toBeVisible();
});

test("an administrator cannot get in with an email code", async ({ page }) => {
  await signInWithCode(page, ADMIN);
  await expect(page).toHaveURL(/\/login\?notice=password-required$/);
  await expect(page.getByText("Your role needs a password.")).toBeVisible();
});

test("a manager signs in with an email code", async ({ page }) => {
  await signInWithCode(page, MANAGER);
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByText("Manager", { exact: true })).toBeVisible();
  await expect(page.getByText("Your rating forms open here when a campaign starts.")).toBeVisible();
});

test("the code page answers the same for an address with no account", async ({ page }) => {
  await page.goto("/login/code");
  await page.getByLabel("Work email").fill("nobody@nowhere.test");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByText("If that address is on a rating list, a code is on its way."),
  ).toBeVisible();
});

test("a session that has not completed its factor cannot enrol another to reach aal2", async () => {
  test.skip(PUBLISHABLE_KEY === "", "SUPABASE_PUBLISHABLE_KEY is needed for the API check");
  const client = apiClient();
  await client.auth.signInWithPassword({ email: ACCOUNT_OWNER, password: PASSWORD });
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "first" });
  expect(enrolled.error).toBeNull();
  const first = await totp(enrolled.data!.totp.secret);
  expect(
    (await client.auth.mfa.challengeAndVerify({ factorId: enrolled.data!.id, code: first.code }))
      .error,
  ).toBeNull();

  const fresh = apiClient();
  await fresh.auth.signInWithPassword({ email: ACCOUNT_OWNER, password: PASSWORD });
  const second = await fresh.auth.mfa.enroll({ factorType: "totp", friendlyName: "second" });
  expect(second.error).not.toBeNull();
});

test("a client cannot discard the audit entry of a ratings view by asking for a rollback", async () => {
  test.skip(PUBLISHABLE_KEY === "", "SUPABASE_PUBLISHABLE_KEY is needed for the API check");
  const client = apiClient();
  await client.auth.signInWithPassword({ email: ACCOUNT_OWNER, password: PASSWORD });
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "rollback" });
  const code = await totp(enrolled.data!.totp.secret);
  await client.auth.mfa.challengeAndVerify({ factorId: enrolled.data!.id, code: code.code });
  const { data: session } = await client.auth.getSession();

  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  const count = async () =>
    Number(
      (
        await sql<{ n: string }>(
          `select count(*) as n from public.audit_logs where action = 'ratings.viewed'`,
        )
      )[0]!.n,
    );
  const before = await count();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/read_skill_ratings`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.session!.access_token}`,
      "Content-Type": "application/json",
      Prefer: "tx=rollback",
    },
    body: JSON.stringify({ p_organisation_id: org!.id }),
  });
  expect(response.ok).toBe(true);
  expect(await count()).toBe(before + 1);
});

test("a password link sets a new password, signs out everywhere, and the new password works", async ({
  page,
}) => {
  await page.goto("/auth/reset");
  await page.getByLabel("Work email").fill(EXEC);
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(
    page.getByText("If that address belongs to an account, a link is on its way."),
  ).toBeVisible();

  await page.goto(await latestLink(EXEC, "recovery"));
  await expect(page).toHaveURL(/\/auth\/set-password$/);
  await page.getByLabel("New password", { exact: true }).fill("Another-local-2026");
  await page.getByLabel("Confirm new password").fill("Another-local-2026");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-set$/);

  await page.getByLabel("Work email").fill(EXEC);
  await page.getByLabel("Password").fill("Another-local-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Executive viewer", { exact: true })).toBeVisible();
});

test("a used or unknown password link is refused", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=not-a-real-token&type=recovery");
  await expect(page).toHaveURL(/\/login\?notice=link-expired$/);
});

test("a wrong authenticator code is refused", async ({ page }) => {
  await signInWithPassword(page, ADMIN);
  await page.getByRole("button", { name: "Show the setup code" }).click();
  await page.getByLabel("Code from your app").fill("000000");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("That code did not match.")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/mfa\/enrol$/);
});
