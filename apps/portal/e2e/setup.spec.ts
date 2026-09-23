import { expect, type Page, test } from "@playwright/test";

import { COLUMNS } from "../lib/directory/columns";
import type { TestCell } from "../lib/directory/test-workbook";
import {
  completeUnitContext,
  fillFamilyFromTemplate,
  go,
  isoDaysAgo,
  OWNER,
  provision,
  shot,
  signInWithFactor,
  uploadFromTemplate,
} from "./setup-helpers";
import { clearMail, hydrated, resetPersonas } from "./support";

// The Milestone 4 exit criterion: a new organisation, provisioned by the Owner in the console,
// reaches a passing readiness check through the portal's screens alone. After provisioning the test
// writes nothing to the database: it reads Mailpit for the invitation, computes TOTP codes, and
// builds the directory file from the downloaded template. The file carries deliberate faults (a
// unit of 9, a second person without a manager, a missing work email); each is fixed by following
// the readiness check's links. Midway the account owner signs out and back in, and the hub shows
// the progress kept.

interface PersonSpec {
  ref: string;
  first: string;
  last: string;
  unit: "GRP" | "OPS" | "CLM" | "SAL";
  manager: string | null;
  family: "People leaders" | "Claims officers" | "Sales";
  teamLeader?: boolean;
  leadership?: boolean;
  email?: boolean;
  rating?: string;
}

const UNIT_NAMES = {
  GRP: "Harbour Freight",
  OPS: "Operations",
  CLM: "Claims",
  SAL: "Sales",
} as const;
const FIRST = [
  "Ava",
  "Ben",
  "Cara",
  "Dev",
  "Eli",
  "Fay",
  "Gus",
  "Hana",
  "Ivo",
  "Jai",
  "Kit",
  "Lea",
];

function people(): PersonSpec[] {
  const list: PersonSpec[] = [
    // The head of the organisation sits in the grouping unit above the three measured units
    // (Online Measurement Specification 6.2): not measured, and still everyone's manager above.
    {
      ref: "H001",
      first: "Olivia",
      last: "Head",
      unit: "GRP",
      manager: null,
      family: "People leaders",
      leadership: true,
    },
    {
      ref: "H002",
      first: "Omar",
      last: "Lead",
      unit: "OPS",
      manager: "H001",
      family: "People leaders",
      leadership: true,
      teamLeader: true,
    },
    {
      ref: "H003",
      first: "Opal",
      last: "Planner",
      unit: "OPS",
      manager: "H001",
      family: "Claims officers",
      leadership: true,
    },
    {
      ref: "H015",
      first: "Chloe",
      last: "Lead",
      unit: "CLM",
      manager: "H001",
      family: "People leaders",
      leadership: true,
      rating: "Top",
    },
    {
      ref: "H016",
      first: "Carl",
      last: "Senior",
      unit: "CLM",
      manager: "H015",
      family: "People leaders",
      leadership: true,
      teamLeader: true,
      rating: "Exceeds",
    },
    {
      ref: "H017",
      first: "Cleo",
      last: "Senior",
      unit: "CLM",
      manager: "H015",
      family: "Claims officers",
      leadership: true,
      rating: "Exceeds",
    },
    {
      ref: "H027",
      first: "Sam",
      last: "Lead",
      unit: "SAL",
      manager: "H001",
      family: "People leaders",
      leadership: true,
      teamLeader: true,
    },
    {
      ref: "H028",
      first: "Sia",
      last: "Senior",
      unit: "SAL",
      manager: "H027",
      family: "Sales",
      leadership: true,
    },
    // The deliberate faults: H030 has no work email, H031 has no manager.
    {
      ref: "H030",
      first: "Nell",
      last: "Noemail",
      unit: "SAL",
      manager: "H027",
      family: "Sales",
      email: false,
    },
    { ref: "H031", first: "Tom", last: "Unmanaged", unit: "SAL", manager: null, family: "Sales" },
  ];
  for (let i = 4; i <= 14; i++) {
    list.push({
      ref: `H${String(i).padStart(3, "0")}`,
      first: FIRST[i % FIRST.length]!,
      last: `Ops${i}`,
      unit: "OPS",
      manager: "H002",
      family: "Claims officers",
    });
  }
  for (let i = 18; i <= 26; i++) {
    list.push({
      ref: `H0${i}`,
      first: FIRST[i % FIRST.length]!,
      last: `Claims${i}`,
      unit: "CLM",
      manager: "H016",
      family: "Claims officers",
      rating: i <= 19 ? "Exceeds" : "Meets",
    });
  }
  for (const i of [29, 32, 33, 34, 35]) {
    list.push({
      ref: `H0${i}`,
      first: FIRST[i % FIRST.length]!,
      last: `Sales${i}`,
      unit: "SAL",
      manager: "H027",
      family: "Sales",
    });
  }
  return list;
}

function rows(list: PersonSpec[]): TestCell[][] {
  const ratingDate = isoDaysAgo(90);
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
          return p.email === false ? null : `${p.ref.toLowerCase()}@harbour.test`;
        case "unit_code":
          return p.unit;
        case "unit_name":
          return UNIT_NAMES[p.unit];
        case "team_name":
          return null;
        case "manager_ref":
          return p.manager;
        case "role_title":
          return p.family === "People leaders" ? "Team manager" : "Officer";
        case "role_family_name":
          return p.family;
        case "start_date":
          return "2021-03-01";
        case "fte":
          return 1;
        case "is_team_leader":
          return p.teamLeader ? "Y" : null;
        case "is_leadership_team":
          return p.leadership ? "Y" : null;
        case "employment_status":
          return "Permanent";
        case "formal_rating_label":
          return p.rating ?? null;
        case "formal_rating_date":
          return p.rating ? ratingDate : null;
      }
    }),
  );
}

async function setUpUnit(page: Page, unitName: string, type: string, leader: string) {
  await go(page, "Units");
  await hydrated(page);
  await page.getByRole("link", { name: `Edit ${unitName}` }).click();
  await expect(page.getByRole("heading", { name: unitName, level: 1 })).toBeVisible();
  await page.getByLabel("Sits under").selectOption({ label: "Harbour Freight (GRP)" });
  await page.getByLabel("Unit type").selectOption(type);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.getByLabel("Unit leader", { exact: true }).selectOption({ label: leader });
  await page.getByRole("button", { name: "Save the unit leader" }).click();
  await expect(page.locator("#leader").getByText("Saved.")).toBeVisible();
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("a new organisation reaches a passing readiness check through the screens alone", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const organisation = `Harbour Freight ${stamp}`;
  const accountOwner = `harbour.ao.${stamp}@local.test`;

  // The Owner provisions the organisation and invites its account owner; from here on, only the
  // account owner and the screens.
  const provisioned = await provision(page, organisation, accountOwner, stamp);
  const secret = provisioned.secret;
  let window = provisioned.window;

  await page.getByRole("link", { name: "Setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Setup", level: 1 })).toBeVisible();
  await expect(page.getByTestId("step-organisation")).toHaveAttribute("data-state", "next");
  await expect(page.getByTestId("step-campaign")).toHaveAttribute("data-state", "locked");
  await shot(page, info, "01-hub-empty");

  // Step 1: the organisation, then a grouping unit above the units the directory will bring.
  await page.getByRole("link", { name: "Continue setup" }).click();
  await page.getByLabel("Industry (ANZSIC division)").selectOption("I");
  await page.getByLabel("Size, in full-time equivalent staff").selectOption("under_50");
  await page.getByRole("button", { name: "Save the organisation" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.getByRole("link", { name: "Continue to the units" }).click();
  await page.getByLabel("Unit code").fill("GRP");
  await page.getByLabel("Unit name").fill("Harbour Freight");
  await page.getByRole("button", { name: "Add the unit" }).click();
  await expect(page.getByText("Unit added.")).toBeVisible();

  // Step 2: the directory, from the downloaded template.
  await uploadFromTemplate(page, rows(people()), "harbour.xlsx");
  await expect(page.getByTestId("summary-joiners")).toHaveText("35");
  await expect(page.getByTestId("summary-new_units")).toHaveText("3");
  await expect(
    page.getByText("Unit code CLM is new. It will be created as a unit named Claims, 12 people."),
  ).toBeVisible();
  await expect(page.getByTestId("preview-ratings")).toContainText("Coverage by unit: Claims 100%");
  await shot(page, info, "02-preview");
  await page.getByRole("button", { name: "Apply the changes" }).click();
  await expect(page.getByTestId("directory-counts")).toContainText("35 active");

  // Leave and return: the hub keeps the progress.
  await page.getByRole("button", { name: "Sign out" }).click();
  await signInWithFactor(page, accountOwner, secret, window);
  window = Math.floor(Date.now() / 30_000);
  await page.getByRole("link", { name: "Setup", exact: true }).click();
  await expect(page.getByTestId("step-directory")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("status-directory")).toContainText("35 people, uploaded");
  await shot(page, info, "03-hub-returned");

  // Step 1 again: the units under the grouping unit, their types and leaders.
  await setUpUnit(page, "Operations", "operations", "Omar Lead");
  await setUpUnit(page, "Claims", "professional_services", "Chloe Lead");
  await setUpUnit(page, "Sales", "sales", "Sam Lead");

  // Step 3: role families from the template library, trimmed, and each unit's context.
  await fillFamilyFromTemplate(page, "Claims officers", "customer_service", "De-escalation");
  await fillFamilyFromTemplate(page, "People leaders", "people_leaders");
  await fillFamilyFromTemplate(page, "Sales", "sales");
  // Context is asked of measured units: Sales, at 9, has its context once it has 10.
  for (const unit of ["Operations", "Claims"]) await completeUnitContext(page, unit);

  // Step 4: the formal ratings Claims carries, mapped and declared calibrated.
  await go(page, "Formal ratings");
  await page.getByLabel("Talent band Top").selectOption("5");
  await page.getByLabel("Talent band Exceeds").selectOption("4");
  await page.getByLabel("Talent band Meets").selectOption("3");
  await page.getByLabel("Yes. Managers' ratings were compared").check();
  await page.getByRole("button", { name: "Save the mapping" }).click();
  await expect(page.getByTestId("mapping-decision")).toHaveText("Mapped, and declared calibrated.");
  await expect(page.getByTestId("route-CLM")).toContainText("Formal ratings");
  await expect(page.getByTestId("route-OPS")).toContainText("Managers' ratings");

  // Step 5: the readiness check names the three faults in the file, and offers Sales the units it
  // could be measured with. Harbour Freight, holding the head, waits for the grouping choice.
  await go(page, "Readiness");
  await expect(page.getByTestId("check-units")).toHaveAttribute("data-level", "blocker");
  await expect(page.getByTestId("check-units")).toContainText(
    "Sales has 9. Nothing under 10 is measured. Combine it with a unit in its branch.",
  );
  await expect(page.getByTestId("check-units")).toContainText(
    "Claims, beside it: 12 people, 21 together.",
  );
  await expect(page.getByTestId("check-grouping")).toHaveAttribute("data-level", "warning");
  await expect(page.getByTestId("check-grouping")).toContainText(
    "Harbour Freight has 1 of its own and units below it.",
  );
  await expect(page.getByTestId("check-managers")).toHaveAttribute("data-level", "blocker");
  await expect(page.getByTestId("check-managers")).toContainText(
    "2 without: Olivia Head and Tom Unmanaged.",
  );
  await expect(page.getByTestId("check-workEmails")).toHaveAttribute("data-level", "blocker");
  await expect(page.getByTestId("check-leadershipTeam")).toHaveAttribute("data-level", "warning");
  await expect(page.getByTestId("check-roleFamilies")).toHaveAttribute("data-level", "passed");
  await expect(page.getByTestId("check-context")).toHaveAttribute("data-level", "passed");
  await expect(page.getByTestId("check-formalRatings")).toHaveAttribute("data-level", "passed");
  await expect(page.getByTestId("readiness-summary")).toHaveText(
    "Blockers 3 · Warnings 2 · Passed 8",
  );
  await shot(page, info, "04-readiness-blocked");

  // Each fault is fixed by following its link.
  await page.getByTestId("check-managers").getByRole("link", { name: "Tom Unmanaged" }).click();
  await page.getByLabel("Manager's employee ID").fill("H027");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible();

  await go(page, "Readiness");
  await page.getByTestId("check-workEmails").getByRole("link", { name: "Nell Noemail" }).click();
  await page.getByLabel("Work email").fill("h030@harbour.test");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible();

  await go(page, "Readiness");
  await page.getByTestId("check-units").getByRole("link", { name: "Sales" }).click();
  // The link opens the directory filtered to Sales; a person moves in from Operations.
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: " Operations" });
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("link", { name: /^Edit .* Ops14$/ }).click();
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: " Sales (SAL)" });
  await page.getByLabel("Manager's employee ID").fill("H027");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible();
  await completeUnitContext(page, "Sales");

  // The check passes.
  await go(page, "Readiness");
  await expect(page.getByTestId("readiness-passed")).toBeVisible();
  await expect(page.getByTestId("check-units")).toContainText("All 3 units.");
  await expect(page.getByTestId("readiness-summary")).toHaveText(
    "Blockers 0 · Warnings 2 · Passed 11",
  );
  await shot(page, info, "05-readiness-passed");
  await go(page, "Setup");
  for (const step of ["organisation", "directory", "context", "formalRatings", "readiness"]) {
    await expect(page.getByTestId(`step-${step}`)).toHaveAttribute("data-state", "done");
  }
  await expect(page.getByTestId("status-campaign")).toHaveText(
    "Ready. The readiness check has passed.",
  );
  await shot(page, info, "06-hub-ready");
});
