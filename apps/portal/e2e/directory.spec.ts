import { readFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

import { directoryCopy } from "../lib/copy/directory";
import { COLUMNS, DIRECTORY_UPLOAD_MAX_BYTES } from "../lib/directory/columns";
import { buildWorkbook, type TestCell } from "../lib/directory/test-workbook";
import { readWorkbook } from "../lib/directory/xlsx-read";
import { PASSWORD, resetPersonas, signInAndEnrol, sql } from "./support";

// The directory in the application (Milestone 3 plan, step 9): the template, an upload through the
// preview to the apply, rejected files, who may reach the directory, and the daily job. The seed's
// Local Demo Organisation is the subject; each test leaves its directory as it found it.
const ADMIN = "admin@local.test";
const UNIT_VIEWER = "uv@local.test";
const HEADERS = COLUMNS.map((c) => directoryCopy[`header.${c.key}`]);

let orgId = "";

test.beforeAll(async () => {
  const [org] = await sql<{ id: string }>(
    `select id from public.organisations where name = 'Local Demo Organisation'`,
  );
  orgId = org!.id;
});

test.beforeEach(async () => {
  await resetPersonas([ADMIN, UNIT_VIEWER]);
});

test.afterEach(async () => {
  // Undo the one joiner and the one change the upload test makes.
  await sql(`delete from public.employees where organisation_id = $1 and employee_ref = 'L012'`, [
    orgId,
  ]);
  await sql(
    `update public.employees set fte = 0.6 where organisation_id = $1 and employee_ref = 'L007'`,
    [orgId],
  );
});

/** The live directory as template rows, so an upload built from it changes nothing by itself. */
async function liveRows(): Promise<TestCell[][]> {
  const people = await sql<Record<string, string | number | boolean | null>>(
    `select e.employee_ref, e.first_name, e.last_name, e.work_email, u.unit_code, u.name as unit_name,
            t.name as team_name, m.employee_ref as manager_ref, e.role_title, rf.name as role_family_name,
            to_char(e.start_date, 'YYYY-MM-DD') as start_date, e.fte::float8 as fte, e.is_team_leader,
            e.is_leadership_team, e.employment_status, fr.rating_label as formal_rating_label,
            to_char(fr.rating_date, 'YYYY-MM-DD') as formal_rating_date
     from public.employees e
     join public.business_units u on u.id = e.unit_id
     left join public.teams t on t.id = e.team_id
     left join public.employees m on m.id = e.manager_employee_id
     left join public.role_families rf on rf.id = e.role_family_id
     left join public.formal_ratings fr on fr.employee_id = e.id
     where e.organisation_id = $1 and e.status = 'active'
     order by e.employee_ref`,
    [orgId],
  );
  return people.map((p) =>
    COLUMNS.map((c) => {
      const value = p[c.key];
      if (c.kind === "flag") return value ? "Y" : null;
      return value ?? null;
    }),
  );
}

async function upload(page: Page, name: string, bytes: Uint8Array) {
  await page.getByLabel("Choose the file").setInputFiles({
    name,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(bytes),
  });
  await page.getByRole("button", { name: "Upload a directory" }).click();
}

test("an administrator downloads the template, uploads the directory, reviews the differences and applies them", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signInAndEnrol(page, ADMIN);
  await page.getByRole("link", { name: "Directory" }).click();
  await expect(page).toHaveURL(new RegExp(`/org/${orgId}/directory$`));
  await expect(page.getByTestId("directory-counts")).toContainText("11 active");

  // The template carries the Part 6.1 headers in order, and a Guidance sheet.
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the template" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("PerformanceVP directory template.xlsx");
  const template = readWorkbook(new Uint8Array(await readFile((await download.path())!)));
  expect(template.sheets.map((s) => s.name)).toEqual(["Directory", "Guidance"]);
  expect(template.sheets[0]!.rows[0]!.map((c) => c?.value)).toEqual(HEADERS);

  // The whole directory, with one joiner and one change of FTE.
  const rows = await liveRows();
  const opsRow = rows.find((r) => r[0] === "L004")!;
  const fteIndex = COLUMNS.findIndex((c) => c.key === "fte");
  rows.find((r) => r[0] === "L007")![fteIndex] = 0.8;
  rows.push([
    "L012",
    "Nia",
    "Newstart",
    "nia.newstart@local.test",
    opsRow[4]!,
    opsRow[5]!,
    opsRow[6]!,
    "L002",
    "Analyst",
    "Analyst",
    "2026-09-01",
    1,
    null,
    null,
    null,
    null,
    null,
  ]);
  await upload(page, "directory.xlsx", buildWorkbook([HEADERS, ...rows], { sharedStrings: true }));

  await expect(page).toHaveURL(new RegExp(`/org/${orgId}/directory/uploads/[0-9a-f-]{36}$`));
  await expect(page.getByRole("heading", { name: "Review the differences" })).toBeVisible();
  await expect(page.getByTestId("summary-joiners")).toHaveText("1");
  await expect(page.getByTestId("summary-updates")).toHaveText("1");
  await expect(page.getByTestId("summary-leavers")).toHaveText("0");
  const people = page.getByTestId("preview-people");
  await expect(people).toContainText("L012 Nia Newstart");
  await expect(people).toContainText("FTE from 0.6 to 0.8");
  const uploadId = page.url().split("/").pop()!;

  await page.getByRole("button", { name: "Apply the changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/org/${orgId}/directory\\?notice=applied$`));
  await expect(page.getByText(directoryCopy["preview.applied"])).toBeVisible();
  await expect(page.getByTestId("directory-counts")).toContainText("12 active");

  // The upload is recorded as applied, its preview was logged, and its file is gone from storage.
  const [record] = await sql<{
    status: string;
    removed: boolean;
    stored: string;
    previewed: string;
  }>(
    `select d.status, d.file_removed_at is not null as removed,
            (select count(*) from storage.objects o where o.bucket_id = 'directory-uploads' and o.name = d.storage_path) as stored,
            (select count(*) from public.audit_logs a where a.entity_id = d.id and a.action = 'directory.upload_previewed') as previewed
     from public.directory_uploads d where d.id = $1`,
    [uploadId],
  );
  expect(record).toEqual({ status: "applied", removed: true, stored: "0", previewed: "1" });
});

test("a file whose IDs lost their leading zeros is rejected by row and column, and one that is not a workbook is refused", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signInAndEnrol(page, ADMIN);
  await page.goto(`/org/${orgId}/directory`);

  const rows = await liveRows();
  rows[0]![0] = 123;
  await upload(page, "stripped.xlsx", buildWorkbook([HEADERS, ...rows]));
  await expect(page.getByText(directoryCopy["page.rejected"])).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Row 2, Employee ID:" })).toContainText(
    directoryCopy["error.idNumber"],
  );

  await upload(page, "notes.xlsx", new TextEncoder().encode("employee, name\n1, someone\n"));
  await expect(page.getByText(directoryCopy["error.notXlsx"])).toBeVisible();

  // Over 4 MiB is refused by the route itself, whatever the page allows.
  const oversized = await page.request.post(`/org/${orgId}/directory/upload`, {
    data: Buffer.alloc(DIRECTORY_UPLOAD_MAX_BYTES + 1),
    headers: { "Content-Type": "application/octet-stream", "X-File-Name": "oversized.xlsx" },
  });
  expect(oversized.status()).toBe(413);
  expect((await oversized.json()).errors[0].message).toBe(directoryCopy["error.fileTooLarge"]);

  // The rejected upload is on record with its file removed; the refused one never reached storage.
  const [rejected] = await sql<{ status: string; removed: boolean }>(
    `select status, file_removed_at is not null as removed from public.directory_uploads
     where organisation_id = $1 and file_name = 'stripped.xlsx' order by uploaded_at desc limit 1`,
    [orgId],
  );
  expect(rejected).toEqual({ status: "rejected", removed: true });
  const [refused] = await sql<{ n: string }>(
    `select count(*) as n from public.directory_uploads where organisation_id = $1 and file_name in ('notes.xlsx', 'oversized.xlsx')`,
    [orgId],
  );
  expect(refused!.n).toBe("0");
  const [active] = await sql<{ n: string }>(
    `select count(*) as n from public.employees where organisation_id = $1 and status = 'active'`,
    [orgId],
  );
  expect(active!.n).toBe("11");
});

test("a unit viewer cannot reach the directory, its template or its upload route", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(UNIT_VIEWER);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your access" })).toBeVisible();

  await page.goto(`/org/${orgId}/directory`);
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get(`/org/${orgId}/directory/template`)).status()).toBe(403);
  const posted = await page.request.post(`/org/${orgId}/directory/upload`, {
    data: Buffer.from(buildWorkbook([HEADERS])),
    headers: { "Content-Type": "application/octet-stream" },
  });
  expect(posted.status()).toBe(403);
});

test("the daily job refuses a caller without the cron secret and records each run", async ({
  request,
}) => {
  const secret = process.env.CRON_SECRET;
  test.skip(!secret, "CRON_SECRET is needed for the job route");
  expect((await request.get("/api/jobs/daily")).status()).toBe(401);
  expect(
    (
      await request.get("/api/jobs/daily", { headers: { Authorization: "Bearer not-the-secret" } })
    ).status(),
  ).toBe(401);

  const [before] = await sql<{ n: string }>(
    `select count(*) as n from public.audit_logs where action = 'job.daily_completed'`,
  );
  const response = await request.get("/api/jobs/daily", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ errors: [] });
  const [after] = await sql<{ n: string }>(
    `select count(*) as n from public.audit_logs where action = 'job.daily_completed'`,
  );
  expect(Number(after!.n)).toBe(Number(before!.n) + 1);
});
