import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { directoryCopy } from "../lib/copy/directory";
import { COLUMNS } from "../lib/directory/columns";
import { buildWorkbook } from "../lib/directory/test-workbook";
import { readWorkbook } from "../lib/directory/xlsx-read";
import { hydrated, resetPersonas, signInAndEnrol, sql } from "./support";

// WCAG 2.1 AA on the setup screens (PORTAL_UX_BRIEF.md 7; Milestone 4 plan, Section 14): an axe
// scan of every screen, and the readiness check's links reached and followed by keyboard alone
// with the focus visible. The seed's Local Demo Organisation is the subject.

const ADMIN = "admin@local.test";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
let orgId = "";

async function scan(page: Page, screen: string) {
  await hydrated(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = results.violations.map(
    (v) =>
      `${screen}: ${v.id} (${v.impact}) at ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(violations).toEqual([]);
}

test.beforeAll(async () => {
  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  orgId = org!.id;
});

test.beforeEach(async () => {
  await resetPersonas([ADMIN]);
});

test("the sign-in and new-link pages pass an axe scan", async ({ page }) => {
  await page.goto("/login");
  await scan(page, "sign in");
  await page.goto("/auth/new-link?notice=expired");
  await scan(page, "new link");
});

test("every setup screen passes an axe scan", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAndEnrol(page, ADMIN);
  const [ops] = await sql<{ id: string }>(
    `select id from public.business_units where organisation_id = $1 and unit_code = 'OPS'`,
    [orgId],
  );
  const [family] = await sql<{ id: string }>(
    `select id from public.role_families where organisation_id = $1 and name = 'Analyst'`,
    [orgId],
  );
  const [person] = await sql<{ id: string }>(
    `select id from public.employees where organisation_id = $1 and employee_ref = 'L004'`,
    [orgId],
  );
  const screens: Array<[string, string]> = [
    ["hub", `/org/${orgId}/setup`],
    ["organisation", `/org/${orgId}/setup/organisation`],
    ["units", `/org/${orgId}/units`],
    ["unit", `/org/${orgId}/units/${ops!.id}`],
    ["directory", `/org/${orgId}/directory`],
    ["person", `/org/${orgId}/directory/people/${person!.id}`],
    ["new person", `/org/${orgId}/directory/people/new`],
    ["unit context", `/org/${orgId}/context`],
    ["role family", `/org/${orgId}/context/role-families/${family!.id}`],
    ["template", `/org/${orgId}/context/role-families/new?template=sales`],
    ["context of a unit", `/org/${orgId}/context/units/${ops!.id}`],
    ["formal ratings", `/org/${orgId}/formal-ratings`],
    ["readiness", `/org/${orgId}/readiness`],
  ];
  for (const [screen, path] of screens) {
    await page.goto(path);
    await scan(page, screen);
  }

  // The upload preview: the live directory uploaded unchanged, scanned, then discarded.
  await page.goto(`/org/${orgId}/directory`);
  await hydrated(page);
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the template" }).click();
  const template = readWorkbook(
    new Uint8Array(await readFile((await (await downloading).path())!)),
  );
  expect(template.sheets[0]!.rows[0]!.map((c) => c?.value)).toEqual(
    COLUMNS.map((c) => directoryCopy[`header.${c.key}`]),
  );
  const people = await sql<Record<string, string | number | boolean | null>>(
    `select e.employee_ref, e.first_name, e.last_name, e.work_email, u.unit_code, u.name as unit_name,
            t.name as team_name, m.employee_ref as manager_ref, e.role_title, rf.name as role_family_name,
            to_char(e.start_date, 'YYYY-MM-DD') as start_date, e.fte::float8 as fte, e.is_team_leader,
            e.is_leadership_team, e.employment_status, null as formal_rating_label, null as formal_rating_date
     from public.employees e
     join public.business_units u on u.id = e.unit_id
     left join public.teams t on t.id = e.team_id
     left join public.employees m on m.id = e.manager_employee_id
     left join public.role_families rf on rf.id = e.role_family_id
     where e.organisation_id = $1 and e.status = 'active' order by e.employee_ref`,
    [orgId],
  );
  const rows = people.map((p) =>
    COLUMNS.map((c) => (c.kind === "flag" ? (p[c.key] ? "Y" : null) : (p[c.key] ?? null))),
  );
  await page.getByLabel("Choose the file").setInputFiles({
    name: "unchanged.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(
      buildWorkbook([COLUMNS.map((c) => directoryCopy[`header.${c.key}`]), ...rows], {
        sharedStrings: true,
      }),
    ),
  });
  await page.getByRole("button", { name: "Upload a directory" }).click();
  await expect(page.getByRole("heading", { name: "Review the differences" })).toBeVisible();
  await scan(page, "upload preview");
  await page.getByRole("button", { name: "Discard this upload" }).click();
  await expect(page.getByText(directoryCopy["preview.discarded"])).toBeVisible();
});

test("the readiness check's links are reached and followed by keyboard, with the focus visible", async ({
  page,
}) => {
  await signInAndEnrol(page, ADMIN);
  await page.goto(`/org/${orgId}/readiness`);
  await hydrated(page);
  const target = page.getByTestId("check-units").getByRole("link", { name: "Open units" });
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((el) => el === document.activeElement);
  }
  expect(reached).toBe(true);
  const outline = await target.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/org/${orgId}/units#measurement$`));
  await expect(page.getByRole("heading", { name: "Units", level: 1 })).toBeVisible();
});
