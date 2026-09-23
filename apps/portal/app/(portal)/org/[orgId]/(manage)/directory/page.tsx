import Link from "next/link";

import { LinkButton, buttonClass } from "@/components/button";
import { SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { Notice, TextLink } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { parseErrors } from "@/lib/directory/errors";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadUnits } from "@/lib/setup/data";
import { personName, unitTree } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import { PeopleTable, type PersonListRow } from "./people-table";
import { UploadForm } from "./upload-form";

const STATUSES = ["staged", "rejected", "applied", "discarded", "expired"] as const;
const MISSING = ["manager", "email", "role_family"] as const;
type Missing = (typeof MISSING)[number];

function when(value: string): string {
  return new Date(value).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  });
}

function statusLabel(status: string): string {
  const known = STATUSES.find((s) => s === status);
  return known ? directoryCopy[`status.${known}`] : status;
}

/**
 * Setup step 2: the directory (PORTAL_BUILD_PLAN.md 7; Online Measurement Specification 6.1). The
 * template, the upload and its difference preview (Milestone 3), the recent uploads, and the people,
 * filtered by unit or by what is missing and edited one at a time. Only fixed keys and unit ids
 * reach the query string; finding a person by name happens in the browser.
 */
export default async function DirectoryPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/directory">) {
  const { orgId } = await params;
  const { notice, unit: unitParam, missing: missingParam } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();

  const [inactive, people, units, uploads] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "inactive"),
    loadActivePeople(supabase, orgId),
    loadUnits(supabase, orgId),
    supabase
      .from("directory_uploads")
      .select("id, file_name, row_count, status, uploaded_at, errors")
      .eq("organisation_id", orgId)
      .order("uploaded_at", { ascending: false })
      .limit(10),
  ]);

  const byId = new Map(people.map((p) => [p.id, p]));
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const tree = unitTree(units);
  const unitFilter =
    typeof unitParam === "string" && units.some((u) => u.id === unitParam) ? unitParam : "";
  const missing = MISSING.find((m) => m === missingParam) as Missing | undefined;
  const isMissing = (p: (typeof people)[number]): boolean => {
    if (missing === "manager") return !p.manager_employee_id || !byId.has(p.manager_employee_id);
    if (missing === "email") return !p.work_email;
    if (missing === "role_family") return !p.role_family_id;
    return true;
  };
  const rows: PersonListRow[] = people
    .filter((p) => (unitFilter === "" || p.unit_id === unitFilter) && isMissing(p))
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name, "en-AU") ||
        a.first_name.localeCompare(b.first_name, "en-AU"),
    )
    .map((p) => ({
      id: p.id,
      ref: p.employee_ref,
      name: personName(p),
      unit: unitName.get(p.unit_id) ?? "",
      manager: p.manager_employee_id ? (byId.get(p.manager_employee_id)?.employee_ref ?? "") : "",
      fte: p.fte,
      teamLeader: p.is_team_leader,
      leadershipTeam: p.is_leadership_team,
    }));
  const staged = (uploads.data ?? []).find((u) => u.status === "staged");

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={directoryCopy["page.title"]}
        meta={
          <span data-testid="directory-counts">
            {fill(directoryCopy["page.meta"], {
              active: people.length,
              inactive: inactive.count ?? 0,
            })}
          </span>
        }
      >
        <p className="text-grey">{directoryCopy["page.intro"]}</p>
      </PageHeader>

      {notice === "applied" ? <Notice>{directoryCopy["preview.applied"]}</Notice> : null}
      {notice === "discarded" ? <Notice>{directoryCopy["preview.discarded"]}</Notice> : null}
      {staged ? (
        <Notice tone="problem">
          {directoryCopy["page.awaiting"]}{" "}
          <Link
            className="underline underline-offset-4 hover:text-gold-deep"
            href={`/org/${orgId}/directory/uploads/${staged.id}`}
          >
            {directoryCopy["page.awaitingLink"]}
          </Link>
        </Notice>
      ) : null}

      <Section id="upload">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <p>
              {/* A plain link: the route answers with the workbook as an attachment. */}
              <a href={`/org/${orgId}/directory/template`} className={buttonClass("secondary")}>
                {directoryCopy["page.template"]}
              </a>
            </p>
            <p className="max-w-md text-sm text-grey">{directoryCopy["page.ratingRule"]}</p>
          </div>
          {org.writable ? <UploadForm organisationId={orgId} /> : null}
        </div>
      </Section>

      <Section
        id="people"
        title={directoryCopy["page.people"]}
        aside={
          org.writable ? (
            <LinkButton href={`/org/${orgId}/directory/people/new`} variant="secondary">
              {directoryCopy["page.addPerson"]}
            </LinkButton>
          ) : null
        }
      >
        <form method="get" className="mb-8 flex flex-wrap items-end gap-4">
          <div className="w-64">
            <SelectField
              label={directoryCopy["people.filter.unit"]}
              name="unit"
              defaultValue={unitFilter}
              options={[
                { value: "", label: directoryCopy["people.filter.allUnits"] },
                ...tree.map((e) => ({
                  value: e.unit.id,
                  label: `${" ".repeat(e.depth)}${e.unit.name}`,
                })),
              ]}
            />
          </div>
          <div className="w-80">
            <SelectField
              label={directoryCopy["people.filter.missing"]}
              name="missing"
              defaultValue={missing ?? ""}
              options={[
                { value: "", label: directoryCopy["people.filter.everyone"] },
                ...MISSING.map((m) => ({ value: m, label: directoryCopy[`people.filter.${m}`] })),
              ]}
            />
          </div>
          <button type="submit" className={buttonClass("secondary")}>
            {directoryCopy["people.filter.apply"]}
          </button>
        </form>
        {people.length === 0 ? (
          <p className="text-sm text-grey">{directoryCopy["page.noPeople"]}</p>
        ) : (
          <PeopleTable orgId={orgId} rows={rows} />
        )}
        {(inactive.count ?? 0) > 0 ? (
          <p className="mt-6 text-sm text-grey">{directoryCopy["page.inactiveNote"]}</p>
        ) : null}
      </Section>

      <Section id="uploads" title={directoryCopy["page.uploads"]}>
        {(uploads.data ?? []).length === 0 ? (
          <p className="text-sm text-grey">{directoryCopy["page.noUploads"]}</p>
        ) : (
          <Table>
            <Head>
              <Th>{directoryCopy["page.col.file"]}</Th>
              <Th align="right">{directoryCopy["page.col.rows"]}</Th>
              <Th>{directoryCopy["page.col.status"]}</Th>
              <Th>{directoryCopy["page.col.when"]}</Th>
            </Head>
            <tbody>
              {(uploads.data ?? []).map((u) => {
                const errors = parseErrors(u.errors);
                return (
                  <Row key={u.id}>
                    <Td>{u.file_name}</Td>
                    <Td figure muted align="right">
                      {u.row_count}
                    </Td>
                    <Td muted>
                      {u.status === "staged" ? (
                        <TextLink href={`/org/${orgId}/directory/uploads/${u.id}`}>
                          {directoryCopy["page.review"]}
                        </TextLink>
                      ) : (
                        statusLabel(u.status)
                      )}
                      {u.status === "rejected" && errors.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-xs">
                          {errors.slice(0, 5).map((e, index) => (
                            <li key={index}>
                              {e.row > 0
                                ? `${directoryCopy["page.errorRow"]} ${e.row}, ${e.column}: `
                                : ""}
                              {e.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Td>
                    <Td muted>{when(u.uploaded_at)}</Td>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        )}
      </Section>
    </main>
  );
}
