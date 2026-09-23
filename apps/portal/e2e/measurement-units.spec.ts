import { expect, type Page, test } from "@playwright/test";

import { COLUMNS } from "../lib/directory/columns";
import type { TestCell } from "../lib/directory/test-workbook";
import {
  completeUnitContext,
  fillFamilyFromTemplate,
  go,
  OWNER,
  optionValue,
  provision,
  shot,
  uploadFromTemplate,
} from "./setup-helpers";
import { clearMail, hydrated, resetPersonas, signInAndEnrol, sql } from "./support";

// The Milestone 4b exit criterion (Milestone 4b plan, Section 12): a directory with two
// seven-person siblings, a nine-person leaf under a grouping parent, and a six-person unit with an
// eight-person unit below it reaches a passing readiness check by the administrator's choices
// alone. After provisioning the test writes nothing to the database, and after the upload nothing
// in the directory changes: every unit under 10 is settled by a choice on the units screen.
//
//   Tasman Water (TOP: the head and two executives)
//     Asset Planning (A, 7)    Billing (B, 7)
//     Field Division (DIV, 2)  >  Field Crews (LEAF, 9)
//     Treatment (P, 6)         >  Laboratory (C, 8)

type Code = "TOP" | "A" | "B" | "DIV" | "LEAF" | "P" | "C";

const UNITS: Record<Code, { name: string; parent: Code | null; type: string }> = {
  TOP: { name: "Tasman Water", parent: null, type: "other" },
  A: { name: "Asset Planning", parent: "TOP", type: "operations" },
  B: { name: "Billing", parent: "TOP", type: "sales" },
  DIV: { name: "Field Division", parent: "TOP", type: "operations" },
  LEAF: { name: "Field Crews", parent: "DIV", type: "operations" },
  P: { name: "Treatment", parent: "TOP", type: "operations" },
  C: { name: "Laboratory", parent: "P", type: "research_and_development" },
};

interface Person {
  ref: string;
  first: string;
  last: string;
  unit: Code;
  manager: string | null;
  leader?: boolean;
  leadership?: boolean;
  teamLeader?: boolean;
}

const FIRST = ["Ada", "Ben", "Cam", "Dot", "Eli", "Fin", "Gia", "Hal", "Ivy"];

/** A unit's staff: its lead, reporting to `manager`, and the rest reporting to the lead. */
function staff(
  unit: Code,
  n: number,
  manager: string,
  lead: Omit<Person, "unit" | "manager">,
  flagged: number[] = [],
  teamLeaders: number[] = [],
): Person[] {
  return Array.from({ length: n }, (_, i) =>
    i === 0
      ? { ...lead, unit, manager }
      : {
          ref: `${unit}${String(i + 1).padStart(2, "0")}`,
          first: FIRST[i % FIRST.length]!,
          last: `${UNITS[unit].name.split(" ")[0]}${i + 1}`,
          unit,
          manager: lead.ref,
          leadership: flagged.includes(i),
          teamLeader: teamLeaders.includes(i),
        },
  );
}

function people(): Person[] {
  return [
    { ref: "H001", first: "Hana", last: "Head", unit: "TOP", manager: null, leadership: true },
    { ref: "H002", first: "Evan", last: "Exec", unit: "TOP", manager: "H001", leadership: true },
    { ref: "H003", first: "Esme", last: "Exec", unit: "TOP", manager: "H001", leadership: true },
    ...staff("A", 7, "H001", {
      ref: "A01",
      first: "Ari",
      last: "Planner",
      leader: true,
      leadership: true,
      teamLeader: true,
    }),
    ...staff(
      "B",
      7,
      "H001",
      {
        ref: "B01",
        first: "Bea",
        last: "Biller",
        leader: true,
        leadership: true,
        teamLeader: true,
      },
      [1],
    ),
    ...staff(
      "DIV",
      2,
      "H001",
      { ref: "DIV01", first: "Dan", last: "Division", leader: true, leadership: true },
      [1],
    ),
    ...staff("LEAF", 9, "DIV01", {
      ref: "LEAF01",
      first: "Lou",
      last: "Crew",
      leader: true,
      leadership: true,
      teamLeader: true,
    }),
    ...staff(
      "P",
      6,
      "H001",
      { ref: "P01", first: "Pat", last: "Treatment", leader: true, leadership: true },
      [1],
      [2],
    ),
    ...staff("C", 8, "P01", {
      ref: "C01",
      first: "Cy",
      last: "Lab",
      leader: true,
      leadership: true,
      teamLeader: true,
    }),
  ];
}

function rows(list: Person[]): TestCell[][] {
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
          return `${p.ref.toLowerCase()}@tasman.test`;
        case "unit_code":
          return p.unit;
        case "unit_name":
          return UNITS[p.unit].name;
        case "team_name":
          return null;
        case "manager_ref":
          return p.manager;
        case "role_title":
          return p.leader || p.unit === "TOP" ? "Manager" : "Officer";
        case "role_family_name":
          return p.leader || p.unit === "TOP" ? "People leaders" : "Field staff";
        case "start_date":
          return "2020-07-01";
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

/** Places a unit in the hierarchy and gives it its type, on its own page. */
async function arrange(page: Page, code: Code) {
  const unit = UNITS[code];
  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("link", { name: `Edit ${unit.name}` }).click();
  await expect(page.getByRole("heading", { name: unit.name, level: 1 })).toBeVisible();
  await hydrated(page);
  if (unit.parent) {
    const parent = UNITS[unit.parent];
    await page
      .getByLabel("Sits under", { exact: true })
      .selectOption(await optionValue(page, "Sits under", `${parent.name} (${unit.parent})`));
  }
  await page.getByLabel("Unit type").selectOption(unit.type);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
}

/**
 * Combines a unit under 10 with one of its candidates, on the units screen, and waits until the
 * screen shows it combined: the unit, no longer under 10, loses its candidates.
 */
async function combine(page: Page, unit: string, candidate: string) {
  await hydrated(page);
  const button = page.getByRole("button", { name: `Combine ${unit} with ${candidate}` });
  await button.click();
  await expect(button).toHaveCount(0);
  await expect(page.getByText(/^Combined\./)).toBeVisible();
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("units under 10 reach a passing readiness check by the administrator's choices alone", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const accountOwner = `tasman.ao.${stamp}@local.test`;
  await provision(page, `Tasman Water ${stamp}`, accountOwner, stamp);

  // The directory, then the hierarchy, types and role families. Nothing here settles a unit's size.
  await page.getByRole("link", { name: "Setup", exact: true }).click();
  await uploadFromTemplate(page, rows(people()), "tasman.xlsx");
  await expect(page.getByTestId("summary-joiners")).toHaveText("42");
  await page.getByRole("button", { name: "Apply the changes" }).click();
  await expect(page.getByTestId("directory-counts")).toContainText("42 active");
  for (const code of ["TOP", "A", "B", "DIV", "P", "LEAF", "C"] as const) await arrange(page, code);
  await fillFamilyFromTemplate(page, "People leaders", "people_leaders");
  await fillFamilyFromTemplate(page, "Field staff", "operations_supervision");

  // The hub keeps the first step open and leads to the units screen.
  await go(page, "Setup");
  await expect(page.getByTestId("step-organisation")).toHaveAttribute("data-state", "next");
  await expect(page.getByTestId("status-organisation")).toHaveText(
    "7 units. 4 need a choice of how they are measured.",
  );

  // The readiness check lists each unit under 10 with what it could be measured with, marking
  // what would still be short, and asks the units with units below them to choose.
  await go(page, "Readiness");
  const units = page.getByTestId("check-units");
  await expect(units).toHaveAttribute("data-level", "blocker");
  await expect(units).toContainText(
    "Field Crews has 9. Nothing under 10 is measured. Combine it with a unit in its branch.",
  );
  await expect(units).toContainText("Field Division, above it: 2 people, 11 together.");
  await expect(units).toContainText("Tasman Water, above Field Division: 3 people, 12 together.");
  await expect(units).toContainText("Billing, beside it: 7 people, 14 together.");
  await expect(units).toContainText(
    "Field Division, beside it: 2 people, 9 together, still short of 10.",
  );
  await expect(units).toContainText("Laboratory has 8.");
  const grouping = page.getByTestId("check-grouping");
  await expect(grouping).toHaveAttribute("data-level", "warning");
  await expect(grouping).toContainText("Tasman Water has 3 of its own and units below it.");
  await expect(grouping).toContainText("Treatment has 6 of its own and units below it.");
  await expect(page.getByTestId("check-context")).toContainText(
    "Checked once a unit has 10 or more.",
  );
  await shot(page, info, "4b-01-readiness-candidates");

  // The choices, made on the units screen the check links to. A combination can be undone.
  await units.getByRole("link", { name: "Open units" }).click();
  await expect(page).toHaveURL(/\/units#measurement$/);
  await shot(page, info, "4b-02-units-candidates");
  await combine(page, "Asset Planning", "Billing");
  await expect(page.getByTestId("combination-A+B")).toContainText(
    "Holds Asset Planning and Billing: 14 people.",
  );
  await hydrated(page);
  await page
    .getByTestId("combination-A+B")
    .getByRole("button", { name: "Undo the combination" })
    .click();
  await expect(page.getByText("Undone. Its units are measured on their own again.")).toBeVisible();
  await expect(page.getByTestId("short-A")).toBeVisible();
  await combine(page, "Asset Planning", "Billing");
  await combine(page, "Field Crews", "Field Division");
  await combine(page, "Laboratory", "Treatment");
  await hydrated(page);
  await page.getByRole("button", { name: "Keep as a grouping unit" }).click();
  await expect(page.getByText("Kept as a grouping unit.")).toBeVisible();

  // Siblings combined choose their leader; a combination that rolls up takes its top unit's.
  const siblings = page.getByTestId("combination-A+B");
  await expect(page.getByTestId("combination-DIV+LEAF")).toContainText(
    "Led by the leader of Field Division",
  );
  await hydrated(page);
  await siblings.getByLabel("Unit leader", { exact: true }).selectOption({ label: "Ari Planner" });
  await siblings.getByRole("button", { name: "Save the unit leader" }).click();
  await expect(siblings.getByText("Saved.")).toBeVisible();
  await expect(page.getByTestId("measurement-short")).toContainText(
    "Every unit has 10 or more, on its own or combined.",
  );
  await shot(page, info, "4b-03-units-combined");

  // Context, defined once for each measurement unit.
  for (const name of [
    "Asset Planning and Billing",
    "Field Division and Field Crews",
    "Treatment and Laboratory",
  ]) {
    await completeUnitContext(page, name);
  }

  // The check passes, with no change to the directory since the upload.
  await go(page, "Readiness");
  await expect(page.getByTestId("readiness-passed")).toBeVisible();
  await expect(page.getByTestId("check-units")).toContainText("3 units of 10 or more.");
  await expect(page.getByTestId("check-grouping")).toContainText(
    "Tasman Water groups the units below it and is not measured.",
  );
  await expect(page.getByTestId("readiness-summary")).toHaveText(
    "Blockers 0 · Warnings 0 · Passed 13",
  );
  await shot(page, info, "4b-04-readiness-passed");
  await go(page, "Setup");
  for (const step of ["organisation", "directory", "context", "readiness"]) {
    await expect(page.getByTestId(`step-${step}`)).toHaveAttribute("data-state", "done");
  }
  await expect(page.getByTestId("status-organisation")).toHaveText("7 units");
});

test("a combination can start from one unit's context, and undoing it gives each unit its own back", async ({
  page,
}) => {
  const ADMIN = "admin@local.test";
  await resetPersonas([ADMIN]);
  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  const orgId = org!.id;
  await signInAndEnrol(page, ADMIN);
  await page.goto(`/org/${orgId}/units`);
  await combine(page, "Operations", "Sales");
  await go(page, "Unit context");
  await hydrated(page);
  await page.getByRole("link", { name: "Open Operations and Sales" }).click();
  await expect(page.getByRole("heading", { name: "Operations and Sales", level: 1 })).toBeVisible();
  await hydrated(page);
  await page.getByRole("button", { name: "Start from the context of Operations" }).click();
  await expect(page.getByTestId("domain-list")).toContainText("Service standards");
  await expect(page.getByRole("button", { name: /^Start from the context of/ })).toHaveCount(0);

  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("button", { name: "Undo the combination" }).click();
  await expect(page.getByText(/^Undone\./)).toBeVisible();
  const [ops] = await sql<{ id: string }>(
    `select mu.id from public.measurement_units mu join public.business_units u on u.id = mu.single_unit_id
     where u.organisation_id = $1 and u.unit_code = 'OPS'`,
    [orgId],
  );
  await page.goto(`/org/${orgId}/context/units/${ops!.id}`);
  await expect(page.getByTestId("domain-list")).toContainText("Service standards");
});
