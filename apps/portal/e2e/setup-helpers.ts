import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, type Page, type TestInfo } from "@playwright/test";

import { directoryCopy } from "../lib/copy/directory";
import { COLUMNS } from "../lib/directory/columns";
import { buildWorkbook, type TestCell } from "../lib/directory/test-workbook";
import { readWorkbook } from "../lib/directory/xlsx-read";
import { hydrated, latestLink, signInAndEnrol, totp } from "./support";

// The steps the setup flows share (e2e/setup.spec.ts, e2e/measurement-units.spec.ts): provisioning
// a new organisation, uploading a directory built from the downloaded template, and filling role
// families and unit context through the screens. None of them writes to the database directly.

export const OWNER = "owner@pvp.local";
/** The password a new account owner sets from their invitation. */
export const NEW_PASSWORD = "Harbour-freight-2026";
export const HEADERS = COLUMNS.map((c) => directoryCopy[`header.${c.key}`]);

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Follows the organisation navigation in the header (breadcrumbs repeat some of its names). */
export async function go(page: Page, name: string) {
  await hydrated(page);
  await page
    .getByRole("navigation", { name: "Organisation" })
    .getByRole("link", { name, exact: true })
    .click();
}

/** Attaches a full-page screenshot, and writes it to E2E_SHOT_DIR when set (for reviews). */
export async function shot(page: Page, info: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: true });
  await info.attach(name, { body, contentType: "image/png" });
  const dir = process.env.E2E_SHOT_DIR;
  if (dir) await writeFile(join(dir, `${name}.png`), body);
}

export async function signInWithFactor(page: Page, email: string, secret: string, after: number) {
  await page.goto("/login");
  await hydrated(page);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/mfa\/challenge$/);
  await page.getByLabel("Code from your app").fill((await totp(secret, after)).code);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();
}

/**
 * The Owner provisions an organisation in the console and invites its account owner, who sets a
 * password from the invitation and enrols an authenticator. Returns the factor's secret and the
 * time window of the last code used.
 */
export async function provision(
  page: Page,
  organisation: string,
  accountOwner: string,
  stamp: number,
): Promise<{ secret: string; window: number }> {
  await signInAndEnrol(page, OWNER);
  await page.getByRole("link", { name: "PerformanceVP console" }).click();
  await page.getByLabel("Organisation name").fill(organisation);
  await page.getByLabel("Term starts").fill(isoDaysAgo(30));
  await page.getByLabel("Term ends").fill(isoDaysAgo(-335));
  await page.getByLabel("Agreement signed").fill(isoDaysAgo(35));
  await page.getByLabel("Invoice reference").fill(`INV-${stamp}`);
  await page.getByLabel("Account owner's work email").fill(accountOwner);
  await page.getByRole("button", { name: "Provision" }).click();
  await expect(page.getByText("Provisioned. The account owner has access")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  // From here on, only the account owner and the screens.
  await page.goto(await latestLink(accountOwner, "invite"));
  await hydrated(page);
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-set$/);
  const secret = await signInAndEnrol(page, accountOwner, NEW_PASSWORD);
  return { secret, window: Math.floor(Date.now() / 30_000) };
}

/**
 * Downloads the directory template, checks its headers, and uploads a file built from it with the
 * given rows, leaving the page on the preview.
 */
export async function uploadFromTemplate(page: Page, rows: TestCell[][], fileName: string) {
  await go(page, "Directory");
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the template" }).click();
  const template = readWorkbook(
    new Uint8Array(await readFile((await (await downloading).path())!)),
  );
  expect(template.sheets[0]!.rows[0]!.map((c) => c?.value)).toEqual(HEADERS);
  const file = buildWorkbook([HEADERS, ...rows], { sharedStrings: true });
  await page.getByLabel("Choose the file").setInputFiles({
    name: fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(file),
  });
  await page.getByRole("button", { name: "Upload a directory" }).click();
  await expect(page.getByRole("heading", { name: "Review the differences" })).toBeVisible();
}

/** The value of the option in a select whose text contains `text` (option labels are indented). */
export async function optionValue(page: Page, label: string, text: string): Promise<string> {
  const value = await page
    .getByLabel(label, { exact: true })
    .locator("option", { hasText: text })
    .getAttribute("value");
  if (!value) throw new Error(`no option "${text}" in ${label}`);
  return value;
}

/** Completes a measurement unit's context through its page on the unit context screen. */
export async function completeUnitContext(page: Page, unitName: string) {
  await go(page, "Unit context");
  await hydrated(page);
  await page.getByRole("link", { name: `Open ${unitName}` }).click();
  await expect(page.getByRole("heading", { name: unitName, level: 1 })).toBeVisible();
  const domains = page.locator("#domains");
  for (const [name, criticality] of [
    ["Policy wording", "3"],
    ["Our products", "2"],
    ["Local regulations", "2"],
  ] as const) {
    await page.getByLabel("Knowledge domain", { exact: true }).fill(name);
    await domains.getByLabel("Criticality", { exact: true }).selectOption(criticality);
    await domains.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("domain-list")).toContainText(name);
  }
  // A combination of units of different types offers one starter list per type; the first will do.
  const starter = page.getByTestId("starter-list").first().getByRole("checkbox");
  for (let i = 0; i < 8; i++) await starter.nth(i).check();
  await page.getByRole("button", { name: "Save the selection" }).first().click();
  await expect(page.getByTestId("decisions-count")).toContainText("8 named; complete.");
  for (const name of ["Intake", "Assessment", "Settlement"]) {
    await page.getByLabel("Process", { exact: true }).fill(name);
    await page.locator("#processes").getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("process-list")).toContainText(name);
  }
  for (const name of ["Core platform", "CRM", "Document store"]) {
    await page.getByLabel("System", { exact: true }).fill(name);
    await page.locator("#systems").getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("system-list")).toContainText(name);
  }
  await expect(page.getByTestId("domains-count")).toContainText("complete");
  await expect(page.getByTestId("processes-count")).toContainText("complete");
  await expect(page.getByTestId("systems-count")).toContainText("complete");
}

/** Fills a role family from a template of the library, optionally dropping one skill. */
export async function fillFamilyFromTemplate(
  page: Page,
  family: string,
  template: string,
  drop?: string,
) {
  await go(page, "Unit context");
  await hydrated(page);
  await page.getByRole("link", { name: `Edit ${family}` }).click();
  await hydrated(page);
  await page.getByRole("link", { name: "Add skills from the template library" }).click();
  await page.getByLabel("Template").selectOption(template);
  await page.getByRole("button", { name: "Continue" }).click();
  if (drop) await page.getByRole("checkbox", { name: `Keep ${drop}` }).uncheck();
  await page.getByRole("button", { name: "Add these skills" }).click();
  await expect(page.getByTestId("family-status")).toContainText("ready");
}
