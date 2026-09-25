import { expect, type Page, test } from "@playwright/test";

import {
  emailText,
  launchBaseline,
  linkFor,
  readyKestrel,
  scan,
  surveyLinks,
} from "./campaign-helpers";
import { OWNER, shot } from "./setup-helpers";
import { clearMail, hydrated, resetPersonas, sql } from "./support";

// Milestone 5, step 5: the respondents, on a phone (390 wide). An administrator launches a baseline
// at a desk; the invitations arrive, one email a person listing each anonymous survey with its own
// link, and a separate email for managers. On the phone a member answers Part A (team question,
// groups of four) and Part B (a process opted out), the leadership team sees the disclosure before
// its decisions, a team leader sees the small-group line, a link works once, and a closed window
// is refused. The only database write is closing the window, as the clock would.

/**
 * Taps an answer button. The radio inside it is visually hidden, as the square button is what a
 * person taps, so the tap goes to its label.
 */
async function tap(radio: ReturnType<Page["getByRole"]>) {
  await radio.locator("xpath=..").click();
  await expect(radio).toBeChecked();
}

/** Answers the questions on the current screen: every one, or only the first. */
async function answerScreen(page: Page, value: number, all: boolean) {
  // The scales: fieldsets whose radios are numbered 1 to 5.
  const groups = page
    .locator("fieldset")
    .filter({ has: page.getByRole("radio", { name: /^[1-5](,|$)/ }) });
  const n = all ? await groups.count() : Math.min(1, await groups.count());
  for (let i = 0; i < n; i++) {
    await tap(groups.nth(i).getByRole("radio", { name: new RegExp(`^${value}(,|$)`) }));
  }
}

/** Moves through the remaining screens, answering as asked, and sends. */
async function finish(page: Page, value: number, all: boolean) {
  for (let screen = 0; screen < 40; screen++) {
    await answerScreen(page, value, all);
    const send = page.getByRole("button", { name: "Send my answers" });
    if (await send.isVisible()) {
      await send.click();
      await expect(
        page.getByRole("heading", { name: "Thank you. Your answers are in." }),
      ).toBeVisible();
      return;
    }
    await page.getByRole("button", { name: "Next" }).click();
  }
  throw new Error("the survey never reached its last screen");
}

async function start(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("the invitations arrive, and each survey is answered once on a phone", async ({
  browser,
  page,
}, info) => {
  test.setTimeout(300_000);
  const desk = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  const stamp = Date.now();
  const { organisation, org } = await readyKestrel(desk, stamp);
  await launchBaseline(desk);

  // One email a person, listing each survey; the manager's is separate.
  const member = await surveyLinks("d004@kestrel.test", 2);
  expect(member.map((l) => l.line)).toEqual([
    "The survey about Dispatch, about 15 minutes:",
    "A second, shorter survey about Dispatch, about 6 minutes:",
  ]);
  const memberEmail = await emailText("d004@kestrel.test", "A short survey");
  expect(memberEmail).toContain(`PerformanceVP runs this survey on behalf of ${organisation}.`);
  expect(memberEmail).toContain("Each link works once and is yours alone");
  const managerEmail = await emailText("d002@kestrel.test", "Rate your team");
  expect(managerEmail).toContain("Your ratings carry your name");
  expect(managerEmail).toContain("/login/code");

  // Part A: the landing, the team question, groups of four, sent once.
  await start(page, linkFor(member, "The survey about"));
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByRole("heading", { name: "How is work going in Dispatch?" })).toBeVisible();
  await expect(page.getByText(`${organisation} · Dispatch`)).toBeVisible();
  await expect(
    page.getByText("No name, no email, no login. Answers are only shown for groups of 5 or more."),
  ).toBeVisible();
  await expect(
    page.getByText(
      /^71 short questions in \d+ groups\. A second, shorter survey follows separately\.$/,
    ),
  ).toBeVisible();
  await scan(page, "survey landing");
  await shot(page, info, "phone-01-landing");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("heading", { name: "Which team are you part of?" })).toBeVisible();
  await page.getByRole("radio", { name: "North" }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/^Group 1 of \d+$/)).toBeVisible();
  await expect(page.getByText("1 strongly disagree, 5 strongly agree")).toBeVisible();
  await expect(page.locator("fieldset")).toHaveCount(4);
  await answerScreen(page, 4, true);
  await scan(page, "survey item group");
  await shot(page, info, "phone-02-item-group");
  await page.getByRole("button", { name: "Next" }).click();
  await finish(page, 4, true);
  await expect(page.getByText("The same email holds a second, shorter survey")).toBeVisible();
  await scan(page, "survey completion");
  await shot(page, info, "phone-05-completion");

  // The link works once.
  await page.goto(linkFor(member, "The survey about"));
  await expect(
    page.getByRole("heading", { name: "This link has been used, or is not recognised" }),
  ).toBeVisible();

  // Part B: a process the member does not work on is left out.
  await start(page, linkFor(member, "A second, shorter survey"));
  await expect(page.getByText(/^29 short questions in 10 groups\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 4; i++) {
    await answerScreen(page, 3, true);
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("checkbox", { name: "I do not work on this process" }).check();
  await expect(page.locator("fieldset")).toHaveCount(0);
  await page.getByRole("button", { name: "Next" }).click();
  await finish(page, 3, true);

  // The leadership team: the disclosure before the first decision.
  const head = await surveyLinks("d001@kestrel.test", 3);
  await start(page, linkFor(head, "Questions for the leadership team"));
  await expect(page.getByRole("heading", { name: "Who decides what in Dispatch?" })).toBeVisible();
  await expect(
    page.getByText(
      "The leadership team is small enough that complete anonymity cannot be guaranteed.",
      { exact: false },
    ),
  ).toBeVisible();
  await scan(page, "leadership disclosure");
  await shot(page, info, "phone-03-leadership-disclosure");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText(/^Decision 1 of 8$/)).toBeVisible();
  const decides = page.locator("fieldset").filter({ hasText: "Who Decides" });
  await decides.getByRole("radio", { name: "General Manager" }).check();
  await page
    .locator("fieldset")
    .filter({ hasText: "Who Recommends" })
    .getByRole("checkbox", { name: "Dispatcher" })
    .check();
  await tap(page.getByRole("radio", { name: "4" }));
  await scan(page, "leadership decision");
  await shot(page, info, "phone-04-leadership-decision");
  await page.getByRole("button", { name: "Next" }).click();
  await finish(page, 4, false);

  // A team leader, the only one: the small-group line.
  const lead = await surveyLinks("d002@kestrel.test", 4);
  await start(page, linkFor(lead, "Questions for team leaders"));
  await expect(page.getByRole("heading", { name: "How does your team learn?" })).toBeVisible();
  await expect(
    page.getByText("This group is small, so complete anonymity cannot be guaranteed.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await finish(page, 3, true);

  // South, a team of 3: its answers count for the unit and carry no team.
  const south = await surveyLinks("d011@kestrel.test", 2);
  await start(page, linkFor(south, "The survey about"));
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("radio", { name: "South" }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await finish(page, 2, false);

  const stored = await sql<{ audience: string; n: number; teamed: number }>(
    `select r.audience, count(*)::integer as n, count(r.campaign_team_id)::integer as teamed
     from public.survey_responses r where r.organisation_id = ${org}
     group by r.audience order by r.audience`,
  );
  expect(stored).toEqual([
    { audience: "leadership_team", n: 1, teamed: 0 },
    { audience: "members_part_a", n: 2, teamed: 1 },
    { audience: "members_part_b", n: 1, teamed: 0 },
    { audience: "team_leaders", n: 1, teamed: 0 },
  ]);
  expect(
    await sql<{ name: string }>(
      `select t.name from public.survey_responses r join public.campaign_teams t on t.id = r.campaign_team_id
       where r.organisation_id = ${org}`,
    ),
  ).toEqual([{ name: "North" }]);

  // A closed window refuses a link that was never used.
  await sql(
    `update public.campaigns set closes_at = now() - interval '1 second', status = 'closed', closed_at = now()
     where organisation_id = ${org} and status = 'open'`,
  );
  const late = await surveyLinks("d005@kestrel.test", 2);
  await page.goto(linkFor(late, "The survey about"));
  await expect(page.getByRole("heading", { name: "This survey has closed" })).toBeVisible();
});
