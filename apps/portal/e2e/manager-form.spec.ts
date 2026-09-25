import { type Browser, expect, type Page, test } from "@playwright/test";

import { emailText, kestrelEmail, launchBaseline, readyKestrel, scan } from "./campaign-helpers";
import { go, OWNER, shot } from "./setup-helpers";
import { clearMail, hydrated, latestCode, resetPersonas, sql } from "./support";

// Milestone 5, step 6: the manager's rating form and the administrator checklists. A manager signs
// in with a code and rates their direct reports: a rating saves as it is chosen, a 5 and a band of
// 5 or 1 wait for their line of evidence, "Done" moves to the next report, and the form reopens on
// the first report not yet done. On the next campaign the manager's own earlier ratings are shown
// and saved only when the report is confirmed. The administrator completes the checklists. The only
// database writes move the baseline on to review, as its close would.

test.use({ viewport: { width: 1440, height: 900 } });

async function signInWithCode(page: Page, email: string) {
  await page.goto("/login/code");
  await hydrated(page);
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByText("If that address is on a rating list, a code is on its way."),
  ).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(await latestCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

async function manager(
  browser: Browser,
  stamp: number,
  width: number,
  height: number,
): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  await signInWithCode(page, kestrelEmail("D002", stamp));
  await page.getByRole("link", { name: "Your rating forms" }).click();
  await expect(page.getByRole("heading", { name: "Rate your team", level: 1 })).toBeVisible();
  await hydrated(page);
  return page;
}

/** Taps a rating button: the radio inside is visually hidden, so the tap goes to its label. */
async function rate(page: Page, row: string, value: number) {
  const radio = page
    .getByTestId(`rate-${row}`)
    .getByRole("radio", { name: new RegExp(`^${value}(,|$)`) });
  await radio.locator("xpath=..").click();
  await expect(radio).toBeChecked();
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("a manager rates their team, with evidence where it is needed, and the pre-fill is confirmed on the next campaign", async ({
  browser,
  page,
}, info) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const { org } = await readyKestrel(page, stamp);
  await launchBaseline(page);
  expect(await emailText(kestrelEmail("D002", stamp), "Rate your team")).toContain("/login/code");

  // The administrator's checklists.
  await expect(page.getByTestId("checklists").getByRole("listitem")).toHaveCount(3);
  await page
    .getByTestId("checklist-ADM-O1")
    .getByRole("link", { name: /^Continue/ })
    .click();
  await expect(page.getByRole("heading", { name: "Your checklists for Dispatch" })).toBeVisible();
  await hydrated(page);
  const roles = page.locator("#ADM-O1");
  await roles
    .getByRole("group", { name: /^A written position description exists/ })
    .getByRole("radio", { name: "Yes" })
    .check();
  await roles.getByRole("button", { name: "Save Role architecture" }).click();
  await expect(roles.getByText("Saved. The close uses the latest save.")).toBeVisible();
  const capacity = page.locator("#ADM-O4");
  await capacity.getByLabel("Workload to capacity (utilisation), %").fill("92");
  await capacity.getByLabel("Hours worked per FTE per week above standard").fill("1.5");
  await capacity
    .getByLabel("Unplanned absence against the organisation's own 12-month baseline")
    .fill("0");
  await capacity.getByRole("checkbox", { name: "Not applicable" }).check();
  await capacity.getByRole("button", { name: "Save Capacity facts" }).click();
  await expect(capacity.getByText("Saved. The close uses the latest save.")).toBeVisible();
  await scan(page, "checklists");
  await shot(page, info, "07-checklists");
  expect(
    await sql<{ checklist_code: string; answers: unknown }>(
      `select checklist_code, answers from public.checklist_responses where organisation_id = ${org} order by checklist_code`,
    ),
  ).toEqual([
    { checklist_code: "ADM-O1", answers: expect.objectContaining({}) },
    {
      checklist_code: "ADM-O4",
      answers: {
        utilisationPercent: 92,
        overtimeHoursPerFte: 1.5,
        absenceAboveBaselinePercent: 0,
        backlogChangePercent: "not-applicable",
      },
    },
  ]);
  await page.getByRole("link", { name: "Back to the campaign" }).click();
  await expect(page.getByTestId("checklist-ADM-O4")).toContainText("Done");
  await expect(page.getByTestId("checklist-ADM-O2")).toContainText("Not started");

  // The manager signs in with a code and opens the form.
  const mgr = await manager(browser, stamp, 1440, 900);
  await expect(mgr.getByTestId("rating-meta")).toContainText("0 of 7 done.");
  await expect(
    mgr.getByText("These ratings carry your name and your administrators can see them."),
  ).toBeVisible();
  await expect(mgr.getByText("First time rating this team.")).toBeVisible();
  const first = (await mgr.locator("#report-name").textContent()) ?? "";
  const skills = mgr.locator("[data-testid^='rate-']");
  const rows = await skills.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-testid")!.slice("rate-".length)),
  );
  expect(rows).toContain("Policy wording");
  for (const row of rows) await rate(mgr, row, 4);
  await rate(mgr, rows[0]!, 5);
  const evidence = mgr.getByTestId(`rate-${rows[0]}`).getByLabel("A 5 needs one line of evidence");
  await expect(evidence).toBeVisible();
  await evidence.fill("Rebuilt the evening dispatch roster");
  await evidence.press("Enter");
  await mgr
    .getByRole("group", { name: "Overall, this year" })
    .getByText("Exceptional contributor")
    .click();
  await mgr.getByRole("button", { name: /^Done, next:/ }).click();
  await expect(mgr.getByRole("alert").filter({ hasText: "Add one line of evidence" })).toHaveText(
    "Add one line of evidence for each 5, and for a band of 5 or 1, before you go on.",
  );
  await mgr
    .getByLabel("A 5 or a 1 needs one line of evidence.")
    .fill("Carried the team through the depot move");
  await mgr.getByLabel("A 5 or a 1 needs one line of evidence.").press("Enter");
  await expect(mgr.getByText("Saved", { exact: true })).toBeVisible();
  await scan(mgr, "manager form");
  await shot(mgr, info, "05-manager-form");
  await mgr.getByRole("button", { name: /^Done, next:/ }).click();
  await expect(mgr.locator("#report-name")).not.toHaveText(first);
  await expect(mgr.getByTestId("rating-meta")).toContainText("1 of 7 done.");
  await expect(mgr.getByTestId(`report-${first}`)).toContainText("Done");
  const second = (await mgr.locator("#report-name").textContent()) ?? "";

  expect(
    await sql<{ n: number; evidence: number }>(
      `select count(*)::integer as n, count(evidence_note)::integer as evidence from public.skill_ratings
       where organisation_id = ${org}`,
    ),
  ).toEqual([{ n: rows.length - 3, evidence: 1 }]);

  // Come back later: the form reopens on the first report not yet done.
  await mgr.getByRole("link", { name: "Come back later" }).click();
  await mgr.getByRole("link", { name: "Your rating forms" }).click();
  await expect(mgr.locator("#report-name")).toHaveText(second);

  // At tablet width the form stacks, and still passes.
  const tablet = await manager(browser, stamp, 820, 1180);
  await scan(tablet, "manager form, tablet");
  await shot(tablet, info, "06-manager-form-tablet");

  // The next campaign: the baseline has closed and is under review; an annual asks again.
  await sql(
    `update public.campaigns set status = 'closed', closed_at = now() where organisation_id = ${org} and status = 'open'`,
  );
  await sql(
    `update public.campaigns set status = 'under_review' where organisation_id = ${org} and status = 'closed'`,
  );
  await go(page, "Campaigns");
  await hydrated(page);
  await page.getByRole("link", { name: "Start a campaign" }).click();
  await hydrated(page);
  await page.getByRole("radio", { name: /^Annual:/ }).check();
  await page.getByRole("button", { name: "Create the draft" }).click();
  await expect(page.getByRole("heading", { name: "Annual", level: 1 })).toBeVisible();
  await hydrated(page);
  await page.getByRole("button", { name: "Launch now" }).click();
  await expect(page.getByText("Launched. The campaign is open")).toBeVisible();

  const again = await manager(browser, stamp, 1440, 900);
  await again.getByTestId(`report-${first}`).click();
  await expect(
    again.getByText("Last year's ratings shown. Change any that have moved."),
  ).toBeVisible();
  await expect(
    again.getByTestId(`rate-${rows[1]}`).getByRole("radio", { name: /^4,/ }),
  ).toBeChecked();
  const annualSaved = `select count(*)::integer as n from public.skill_ratings r
     join public.rating_sessions s on s.id = r.rating_session_id
     join public.campaigns c on c.id = s.campaign_id
     where c.organisation_id = ${org} and c.cadence = 'annual'`;
  expect(await sql<{ n: number }>(annualSaved)).toEqual([{ n: 0 }]);
  await rate(again, rows[1]!, 3);
  await again.getByRole("button", { name: /^Done, next:/ }).click();
  await expect(again.locator("#report-name")).not.toHaveText(first);
  expect(await sql<{ n: number }>(annualSaved)).toEqual([{ n: rows.length - 3 }]);
});
