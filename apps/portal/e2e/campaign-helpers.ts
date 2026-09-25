import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

import { COLUMNS } from "../lib/directory/columns";
import type { TestCell } from "../lib/directory/test-workbook";
import {
  completeUnitContext,
  fillFamilyFromTemplate,
  go,
  provision,
  uploadFromTemplate,
} from "./setup-helpers";
import { hydrated, MAILPIT } from "./support";

// The campaign specs share one small organisation brought to a passing readiness check through
// the screens (e2e/campaigns.spec.ts, e2e/survey.phone.spec.ts):
//
//   Dispatch (DSP, 12): the head in no team, North of 8 with its team leader, South of 3.

interface Person {
  ref: string;
  first: string;
  last: string;
  team: "North" | "South" | null;
  manager: string | null;
  leadership?: boolean;
  teamLeader?: boolean;
}

export const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** WCAG 2.1 AA on each campaign screen (PORTAL_UX_BRIEF.md 7; Milestone 5 plan, 8.4). */
export async function scan(page: Page, screen: string) {
  await hydrated(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    results.violations.map(
      (v) => `${screen}: ${v.id} at ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
  ).toEqual([]);
}

export function people(): Person[] {
  const list: Person[] = [
    { ref: "D001", first: "Kara", last: "Head", team: null, manager: null, leadership: true },
    {
      ref: "D002",
      first: "Liam",
      last: "North",
      team: "North",
      manager: "D001",
      leadership: true,
      teamLeader: true,
    },
    { ref: "D003", first: "Mae", last: "South", team: "South", manager: "D001", leadership: true },
  ];
  for (let i = 4; i <= 10; i++) {
    list.push({
      ref: `D${String(i).padStart(3, "0")}`,
      first: "Nia",
      last: `North${i}`,
      team: "North",
      manager: "D002",
    });
  }
  for (const i of [11, 12]) {
    list.push({ ref: `D0${i}`, first: "Otto", last: `South${i}`, team: "South", manager: "D003" });
  }
  return list;
}

/** A person's work email, unique to the run, since every run makes a new organisation. */
export function kestrelEmail(ref: string, stamp: number): string {
  return `${ref.toLowerCase()}.${stamp}@kestrel.test`;
}

export function rows(list: Person[], stamp: number): TestCell[][] {
  return list.map((p) =>
    COLUMNS.map((c): TestCell => {
      switch (c.key) {
        case "employee_ref":
          return p.ref;
        case "first_name":
          return p.first;
        case "last_name":
          return p.last;
        case "work_email":
          return kestrelEmail(p.ref, stamp);
        case "unit_code":
          return "DSP";
        case "unit_name":
          return "Dispatch";
        case "team_name":
          return p.team;
        case "manager_ref":
          return p.manager;
        case "role_title":
          return p.manager === null ? "General Manager" : "Dispatcher";
        case "role_family_name":
          return "Dispatch officers";
        case "start_date":
          return "2022-02-01";
        case "fte":
          return 1;
        case "is_team_leader":
          return p.teamLeader ? "Y" : null;
        case "is_leadership_team":
          return p.leadership ? "Y" : null;
        case "employment_status":
          return "Permanent";
        case "formal_rating_label":
        case "formal_rating_date":
          return null;
      }
    }),
  );
}

/**
 * Provisions Kestrel Logistics and brings Dispatch to a passing readiness check through the
 * screens. Returns the organisation's name and a SQL expression for its id.
 */
export async function readyKestrel(
  page: Page,
  stamp: number,
): Promise<{ organisation: string; org: string }> {
  const organisation = `Kestrel Logistics ${stamp}`;
  await provision(page, organisation, `kestrel.ao.${stamp}@local.test`, stamp);
  await page.getByRole("link", { name: "Setup", exact: true }).click();
  await uploadFromTemplate(page, rows(people(), stamp), "kestrel.xlsx");
  await page.getByRole("button", { name: "Apply the changes" }).click();
  await expect(page.getByTestId("directory-counts")).toContainText("12 active");
  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("link", { name: "Edit Dispatch" }).click();
  await expect(page.getByRole("heading", { name: "Dispatch", level: 1 })).toBeVisible();
  await hydrated(page);
  await page.getByLabel("Unit type").selectOption("operations");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await fillFamilyFromTemplate(page, "Dispatch officers", "customer_service");
  await completeUnitContext(page, "Dispatch");
  return {
    organisation,
    org: `(select id from public.organisations where name = '${organisation}')`,
  };
}

/** Creates a baseline draft for Dispatch and launches it now, leaving the page on the campaign. */
export async function launchBaseline(page: Page): Promise<void> {
  await go(page, "Campaigns");
  await hydrated(page);
  await page.getByRole("link", { name: "Start a campaign" }).click();
  await hydrated(page);
  await page.getByRole("button", { name: "Create the draft" }).click();
  await expect(page.getByRole("heading", { name: "Baseline", level: 1 })).toBeVisible();
  await hydrated(page);
  await page.getByRole("button", { name: "Launch now" }).click();
  await expect(page.getByText("Launched. The campaign is open")).toBeVisible();
}

/**
 * The survey links in the newest survey email to an address, each with the line above it, which
 * names the survey ("The survey about Dispatch, ..."). Paths only, ready for page.goto.
 */
export async function surveyLinks(
  email: string,
  count: number,
): Promise<Array<{ line: string; path: string }>> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"A short survey"`)}`,
    );
    const { messages } = (await search.json()) as { messages: Array<{ ID: string }> };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const links = [
        ...Text.matchAll(/([^\n]+)\n(https?:\/\/[^\s/]+)(\/s#t=v1\.[A-Za-z0-9_-]{43})/g),
      ].map((m) => ({ line: m[1]!, path: m[3]! }));
      if (links.length >= count) return links;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no survey email with ${count} links arrived for ${email}`);
}

/** The link of the survey whose line starts with the words given. */
export function linkFor(links: Array<{ line: string; path: string }>, starts: string): string {
  const found = links.find((l) => l.line.startsWith(starts));
  if (!found) throw new Error(`no survey link for "${starts}"`);
  return found.path;
}

/** The text of the newest email to an address whose subject contains the words given. */
export async function emailText(email: string, subject: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"${subject}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: Array<{ ID: string }> };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      return ((await message.json()) as { Text: string }).Text;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no email "${subject}" arrived for ${email}`);
}
