import { expect, test } from "@playwright/test";

import {
  emailText,
  kestrelEmail,
  launchBaseline,
  linkFor,
  readyKestrel,
  scan,
  surveyLinks,
} from "./campaign-helpers";
import { OWNER, shot } from "./setup-helpers";
import { clearMail, hydrated, MAILPIT, resetPersonas, sql } from "./support";

// Milestone 5, step 7: monitoring, reminders and the five-minute job. An open campaign shows what
// has been received against what the close will need, counts only. A reminder goes only to those
// who still have a part to answer, listing only those parts; administrators may send one a day. A
// manager is reminded once a day. The campaign can be extended, and the job closes it when its close
// passes. The only database write moves the close into the past, as the clock would.

test.use({ viewport: { width: 1440, height: 900 } });

/** How many reminders have reached an address. */
async function remindersTo(email: string): Promise<number> {
  const search = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"A reminder: the survey"`)}`,
  );
  return ((await search.json()) as { messages: unknown[] }).messages.length;
}

test.beforeEach(async () => {
  await resetPersonas([OWNER]);
  await clearMail();
});

test("monitoring counts what has been received, reminders reach only those still to answer, and the job closes", async ({
  page,
  request,
}, info) => {
  test.setTimeout(300_000);
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "CRON_SECRET is needed for the job route");
  const stamp = Date.now();
  const { org } = await readyKestrel(page, stamp);
  await launchBaseline(page);

  // One member answers Part A through the public route.
  const answered = await surveyLinks(kestrelEmail("D004", stamp), 2);
  const token = linkFor(answered, "The survey about").split("#t=")[1]!;
  const opened = (await (await request.post("/api/survey/open", { data: { token } })).json()) as {
    stamp: string;
  };
  const submitted = await request.post("/api/survey/submit", {
    data: {
      token,
      audience: "members_part_a",
      stamp: opened.stamp,
      answers: { items: { "CII-01": 4, "CII-02": 5 } },
    },
  });
  expect(submitted.status()).toBe(200);

  // Monitoring: counts against the thresholds the close will apply.
  await page.reload();
  await hydrated(page);
  const row = page.getByTestId("monitor-Dispatch");
  const partA = row.getByRole("cell").nth(0);
  await expect(partA).toContainText("8%");
  await expect(partA).toContainText("1 of 12");
  await expect(partA).toContainText("7 more needed");
  await expect(page.getByTestId("monitoring")).toContainText("needs 60%");
  await expect(page.getByTestId("monitoring")).toContainText("needs 75%, 3+");
  await expect(page.getByText("Counts only. No response is linked to a person.")).toBeVisible();
  await expect(page.getByTestId("managers-outstanding")).toContainText("3");
  await expect(page.getByTestId("managers-outstanding")).toContainText("7 reports, none rated");
  await scan(page, "monitoring");
  await shot(page, info, "02-monitoring");

  // A reminder now: to those still to answer, listing only the parts they have not answered.
  await page.getByRole("button", { name: "Send a reminder now" }).click();
  await expect(
    page.getByText("A reminder is going to everyone who still has a part"),
  ).toBeVisible();
  await expect.poll(() => remindersTo(kestrelEmail("D005", stamp))).toBe(1);
  const partial = await emailText(kestrelEmail("D004", stamp), "A reminder: the survey");
  expect(partial).toContain("A second, shorter survey about Dispatch");
  expect(partial).not.toContain("The survey about Dispatch");
  const reminded = await sql<{ emails: number; kind: string }>(
    `select emails, kind from public.campaign_reminders where organisation_id = ${org}`,
  );
  expect(reminded).toEqual([{ emails: 12, kind: "manual" }]);
  await page.reload();
  await hydrated(page);
  await page.getByRole("button", { name: "Send a reminder now" }).click();
  await expect(page.getByText("A reminder went less than a day ago.")).toBeVisible();

  // A manager, once a day.
  await page.getByRole("button", { name: "Remind Liam North" }).click();
  await expect(page.getByText("Reminder sent.")).toBeVisible();
  expect(await emailText(kestrelEmail("D002", stamp), "A reminder: rate your team")).toContain(
    "not rated yet",
  );
  await page.reload();
  await hydrated(page);
  await page.getByRole("button", { name: "Remind Liam North" }).click();
  await expect(
    page.getByText("Everyone outstanding was reminded less than a day ago."),
  ).toBeVisible();

  // Extended by a week, then closed by the job once its close has passed.
  await page.reload();
  await hydrated(page);
  await page.getByRole("button", { name: "Extend by a week" }).click();
  await expect(page.getByText(/^Extended\. It now closes \w+ \d+ \w+, 5 pm\.$/)).toBeVisible();
  await sql(
    `update public.campaigns set closes_at = now() - interval '1 second' where organisation_id = ${org} and status = 'open'`,
  );
  const job = await request.get("/api/jobs/campaigns", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  expect(job.status()).toBe(200);
  expect(((await job.json()) as { closed: number }).closed).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByTestId("campaign-state")).toHaveText(/^Closed \w+ \d+ \w+, under review$/);
  const audited = await sql<{ n: number }>(
    `select count(*)::integer as n from public.audit_logs
     where action = 'job.campaigns_completed' and occurred_at > now() - interval '1 minute'`,
  );
  expect(audited[0]!.n).toBeGreaterThan(0);
});
