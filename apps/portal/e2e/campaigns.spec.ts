import { expect, test } from "@playwright/test";

import { readyKestrel, scan } from "./campaign-helpers";
import { go, OWNER, shot } from "./setup-helpers";
import { clearMail, hydrated, resetPersonas, sql } from "./support";

// Milestone 5, step 4: an administrator starts a baseline, sees who it would ask and what the close
// would need, and launches it; the launch freezes the teams and gives each rating manager a
// sign-in. The calendar proposes the year; a scheduled pulse the readiness refuses at its opening
// goes back to draft with its blockers. The only database writes after provisioning move a
// scheduled opening into the past, as the clock would. The organisation is Kestrel Logistics, from
// e2e/campaign-helpers.ts.

// The review screenshots are 1440 wide, as Milestone 4's are.
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("a baseline is previewed and launched, and the calendar's scheduled pulse is refused at its opening", async ({
  page,
  request,
}, info) => {
  test.setTimeout(300_000);
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "CRON_SECRET is needed for the job route");
  const stamp = Date.now();
  const { org } = await readyKestrel(page, stamp);

  // Readiness passes, with the warning about teams under 4, named for the unit.
  await go(page, "Readiness");
  await expect(page.getByTestId("readiness-passed")).toBeVisible();
  await expect(page.getByTestId("check-teamSize")).toHaveAttribute("data-level", "warning");
  await expect(page.getByTestId("check-teamSize")).toContainText(
    "Dispatch: Dispatch has 1 and South has 3. A team under 4 can never reach the 4 responses a team result needs",
  );

  // A baseline draft, and its preview.
  await go(page, "Campaigns");
  await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
  await expect(page.getByText("No campaign yet.")).toBeVisible();
  await scan(page, "campaigns hub");
  await page.getByRole("link", { name: "Start a campaign" }).click();
  await scan(page, "start a campaign");
  await expect(page.getByRole("checkbox", { name: "Dispatch, 12 people" })).toBeChecked();
  await page.getByRole("button", { name: "Create the draft" }).click();
  await expect(page.getByRole("heading", { name: "Baseline", level: 1 })).toBeVisible();
  await expect(page.getByTestId("campaign-state")).toHaveText("Draft");
  await expect(page.getByTestId("snapshot-notice")).toHaveText(
    "A running campaign keeps the directory it started with.",
  );
  const row = page.getByTestId("audiences-Dispatch");
  const cells = row.getByRole("cell");
  await expect(cells.nth(1)).toHaveText("12needs 8");
  await expect(cells.nth(2)).toHaveText("3");
  await expect(cells.nth(3)).toHaveText("3needs 3");
  await expect(cells.nth(4)).toHaveText("1needs 1");
  await expect(cells.nth(5)).toHaveText("3needs 3");
  await expect(cells.nth(6)).toHaveText("Role architecture, Tools and integration, Capacity facts");
  await expect(page.getByTestId("people-emailed")).toHaveText(
    "12 people receive the anonymous survey.",
  );
  await expect(page.getByTestId("no-blockers")).toBeVisible();
  await scan(page, "launch preview");
  await shot(page, info, "01-launch-preview");

  // Launched now: open today, the teams frozen with their headcounts, the managers given sign-ins.
  await hydrated(page);
  await page.getByRole("button", { name: "Launch now" }).click();
  await expect(page.getByText("Launched. The campaign is open")).toBeVisible();
  await expect(page.getByTestId("campaign-state")).toHaveText(
    /^Open, day 1 of 14 · Closes \w+ \d+ \w+, 5 pm · 1 unit, 12 people · No reminder sent yet\. Next: /,
  );
  await expect(page.getByTestId("monitoring")).toBeVisible();
  expect(
    await sql<{ name: string; kind: string; headcount: number }>(
      `select t.name, t.kind, t.headcount from public.campaign_teams t
       where t.organisation_id = ${org} order by t.position`,
    ),
  ).toEqual([
    { name: "Dispatch", kind: "unit", headcount: 1 },
    { name: "North", kind: "team", headcount: 8 },
    { name: "South", kind: "team", headcount: 3 },
  ]);
  expect(
    await sql<{ n: number }>(
      `select count(*)::integer as n from public.org_memberships
       where organisation_id = ${org} and role = 'manager_respondent' and revoked_at is null`,
    ),
  ).toEqual([{ n: 3 }]);
  await scan(page, "launched campaign");

  // A unit a running campaign measures says so on the units screen.
  await go(page, "Units");
  await expect(page.getByTestId("measurement-DSP")).toContainText("Measured");

  // The calendar proposes the year; the first pulse is scheduled.
  await go(page, "Campaigns");
  await expect(page.getByTestId("proposals").getByRole("listitem")).toHaveCount(4);
  await hydrated(page);
  await page
    .getByRole("button", { name: /^Schedule the Quarterly pulse due/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Quarterly pulse", level: 1 })).toBeVisible();
  await expect(page.getByTestId("campaign-state")).toHaveText(/^Scheduled, opens /);
  await go(page, "Campaigns");
  await expect(page.getByTestId("proposals").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByTestId("campaigns")).toContainText(/Scheduled, opens/);
  await scan(page, "campaigns hub with the calendar");
  await shot(page, info, "03-campaigns-hub");

  // At its opening the job reruns readiness: the baseline still runs and nothing has been
  // released, so the pulse goes back to draft with its blockers.
  await sql(
    `update public.campaigns set opens_at = now() - interval '1 minute'
     where organisation_id = ${org} and status = 'scheduled'`,
  );
  const job = await request.get("/api/jobs/campaigns", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  expect(job.status()).toBe(200);
  expect(((await job.json()) as { opened: { refused: number } }).opened.refused).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Quarterly pulse" }).click();
  await expect(page.getByText("The scheduled launch was refused")).toBeVisible();
  await expect(page.getByTestId("launch-blockers")).toContainText(
    "Another campaign is measuring Dispatch.",
  );
  await expect(page.getByTestId("launch-blockers")).toContainText(
    "Dispatch has no released baseline or annual result to carry forward from.",
  );
  await expect(page.getByRole("button", { name: "Launch now" })).toHaveCount(0);
  await scan(page, "refused draft");
  await shot(page, info, "04-refused-draft");

  // Cancelled, the proposal returns to the calendar.
  await hydrated(page);
  await page.getByRole("button", { name: "Cancel the campaign" }).click();
  await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
  await expect(page.getByTestId("proposals").getByRole("listitem")).toHaveCount(4);
});
