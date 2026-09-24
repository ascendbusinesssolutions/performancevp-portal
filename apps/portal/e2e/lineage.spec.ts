import { expect, type Page, test } from "@playwright/test";

import { COLUMNS } from "../lib/directory/columns";
import type { TestCell } from "../lib/directory/test-workbook";
import { go, OWNER, provision, uploadFromTemplate } from "./setup-helpers";
import { clearMail, hydrated, resetPersonas, sql } from "./support";

// Retire-and-lineage on the units screen (Milestone 5 plan, 2.5): a combination a campaign has
// measured is never changed in place. While a campaign holds it, nothing changes; afterwards,
// measuring a grown unit on its own retires the combination with a separate row to each successor,
// and undoing one retires it too; each needs the person to confirm the break in the trend. The test
// marks a combination as measured by writing a campaign that names it, as a launch would.
//
//   Tern Air (TOP: the head)  >  Alpha Ops (A, 12)  and  Beta Ops (B, 5)

const UNITS = { TOP: "Tern Air", A: "Alpha Ops", B: "Beta Ops" } as const;

function rows(): TestCell[][] {
  const people: Array<[string, keyof typeof UNITS, string | null]> = [
    ["T001", "TOP", null],
    ["A001", "A", "T001"],
    ...Array.from({ length: 11 }, (_, i): [string, "A", string] => [
      `A${String(i + 2).padStart(3, "0")}`,
      "A",
      "A001",
    ]),
    ["B001", "B", "T001"],
    ...Array.from({ length: 4 }, (_, i): [string, "B", string] => [
      `B${String(i + 2).padStart(3, "0")}`,
      "B",
      "B001",
    ]),
  ];
  return people.map(([ref, unit, manager]) =>
    COLUMNS.map((c): TestCell => {
      switch (c.key) {
        case "employee_ref":
          return ref;
        case "first_name":
          return "Tern";
        case "last_name":
          return ref;
        case "work_email":
          return `${ref.toLowerCase()}@tern.test`;
        case "unit_code":
          return unit;
        case "unit_name":
          return UNITS[unit];
        case "manager_ref":
          return manager;
        case "role_title":
          return "Crew";
        case "role_family_name":
          return "Crew";
        case "start_date":
          return "2023-01-01";
        case "fte":
          return 1;
        case "employment_status":
          return "Permanent";
        default:
          return null;
      }
    }),
  );
}

async function sitUnder(page: Page, unit: string) {
  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("link", { name: `Edit ${unit}` }).click();
  await expect(page.getByRole("heading", { name: unit, level: 1 })).toBeVisible();
  await hydrated(page);
  await page.getByLabel("Sits under").selectOption({ label: "Tern Air (TOP)" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
}

/** A campaign that names the measurement unit, in the given state, as a launch would leave it. */
async function measuredBy(org: string, code: string, status: "scheduled" | "cancelled") {
  const [campaign] = await sql<{ id: string }>(
    `insert into public.campaigns (organisation_id, cadence, status, opens_at, closes_at, approved_at)
     values ($1, 'baseline', $2, now() + interval '1 day', now() + interval '14 days', now())
     returning id`,
    [org, status],
  );
  await sql(
    `insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
     select $1, $2, id from public.measurement_units where organisation_id = $1 and code = $3`,
    [org, campaign!.id, code],
  );
  return campaign!.id;
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("a measured combination changes only through lineage, and not while a campaign holds it", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const organisation = `Tern Air ${stamp}`;
  await provision(page, organisation, `tern.ao.${stamp}@local.test`, stamp);
  await page.getByRole("link", { name: "Setup", exact: true }).click();
  await uploadFromTemplate(page, rows(), "tern.xlsx");
  await page.getByRole("button", { name: "Apply the changes" }).click();
  await expect(page.getByTestId("directory-counts")).toContainText("18 active");
  await sitUnder(page, UNITS.A);
  await sitUnder(page, UNITS.B);
  const [{ id: org }] = (await sql<{ id: string }>(
    `select id from public.organisations where name = $1`,
    [organisation],
  )) as [{ id: string }];

  // Beta Ops, at 5, is combined with Alpha Ops beside it.
  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("button", { name: "Combine Beta Ops with Alpha Ops" }).click();
  await expect(page.getByText(/^Combined\./)).toBeVisible();

  // A scheduled campaign holds it: nothing about it can change.
  const scheduled = await measuredBy(org, "A+B", "scheduled");
  await page.reload();
  const combination = page.getByTestId("combination-A+B");
  await expect(combination).toContainText(
    "A campaign is measuring Alpha Ops and Beta Ops. It can be changed after that campaign closes.",
  );
  await expect(combination.getByRole("button", { name: "Undo the combination" })).toHaveCount(0);

  // Once no campaign holds it, Alpha Ops, grown past 10, can be measured on its own, with the
  // break in the trend confirmed.
  await sql(`update public.campaigns set status = 'cancelled' where id = $1`, [scheduled]);
  await page.reload();
  await hydrated(page);
  await expect(combination).toContainText("Alpha Ops now has 12 people");
  await expect(combination).toContainText(
    "has results from a campaign, so it is not changed in place",
  );
  const split = combination.getByTestId("split-A");
  await split.getByRole("button", { name: "Measure Alpha Ops on its own" }).click();
  // The confirmation is required: nothing is sent until it is ticked.
  await expect(page.getByText(/^Done\./)).toHaveCount(0);
  await split.getByRole("checkbox", { name: "Record the break in the trend" }).check();
  await split.getByRole("button", { name: "Measure Alpha Ops on its own" }).click();
  await expect(page.getByText("Done. The unit is measured on its own.")).toBeVisible();
  expect(
    await sql<{ predecessor: string; successor: string; kind: string; status: string }>(
      `select p.code as predecessor, s.code as successor, l.kind, p.status
       from public.measurement_unit_lineage l
       join public.measurement_units p on p.id = l.predecessor_id
       join public.measurement_units s on s.id = l.successor_id
       where l.organisation_id = $1 order by s.code`,
      [org],
    ),
  ).toEqual([
    { predecessor: "A+B", successor: "A", kind: "separate", status: "retired" },
    { predecessor: "A+B", successor: "B", kind: "separate", status: "retired" },
  ]);

  // Combined again, measured, then undone: it is retired, not removed.
  await page.getByRole("button", { name: "Combine Beta Ops with Alpha Ops" }).click();
  await expect(page.getByText(/^Combined\./)).toBeVisible();
  await measuredBy(org, "A+B#2", "cancelled");
  await page.reload();
  await hydrated(page);
  const again = page.getByTestId("combination-A+B#2");
  await expect(again).toContainText("Undoing retires it, with its history and context kept");
  await again.getByRole("checkbox", { name: "Record the break in the trend" }).last().check();
  await again.getByRole("button", { name: "Undo the combination" }).click();
  await expect(
    page.getByText(/^Retired\. Its units are measured on their own again/),
  ).toBeVisible();
  expect(
    await sql<{ status: string }>(
      `select status from public.measurement_units where organisation_id = $1 and code = 'A+B#2'`,
      [org],
    ),
  ).toEqual([{ status: "retired" }]);
});
