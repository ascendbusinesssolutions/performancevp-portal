import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { Notice, TextLink } from "@/components/ui";
import { commonCopy } from "@/lib/copy/common";
import { directoryCopy } from "@/lib/copy/directory";
import { fill, listOf } from "@/lib/copy/template";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import { previewCoverage, type UnitRatingSums } from "@/lib/setup/coverage";
import { createClient } from "@/lib/supabase/server";

import { applyUpload, discardUpload } from "./actions";

type Value = string | number | boolean | null | { label: string; date: string };

interface Preview {
  upload_id: string;
  preview_hash: string;
  leaver_confirmation_required: boolean;
  leaver_threshold: number;
  summary: Record<string, number>;
  entitlement: { active_headcount: number; max_employees: number; over_band: boolean } | null;
  people: Array<{
    employee_ref: string;
    first_name: string;
    last_name: string;
    change: "joiner" | "returning" | "leaver" | "update";
    fields: Record<string, { from: Value; to: Value }>;
  }>;
  units: Array<{
    unit_code: string;
    change: "new" | "renamed" | "emptied";
    name_from?: string;
    name_to?: string;
  }>;
  teams: Array<{ unit_code: string; team: string }>;
  role_families: string[];
  formal_rating_coverage: UnitRatingSums[];
}

// PORTAL_COPY_SPEC.md S3: the counts, in the order the person reads them.
const SUMMARY = [
  ["joiners", "preview.joiners"],
  ["returning", "preview.returning"],
  ["leavers", "preview.leavers"],
  ["moves", "preview.moves"],
  ["manager_changes", "preview.managers"],
  ["updates", "preview.updates"],
  ["formal_rating_changes", "preview.ratings"],
  ["new_units", "preview.newUnits"],
  ["renamed_units", "preview.renamedUnits"],
  ["emptied_units", "preview.emptiedUnits"],
  ["new_teams", "preview.newTeams"],
  ["new_role_families", "preview.newFamilies"],
] as const;

const FIELDS = [
  "first_name",
  "last_name",
  "work_email",
  "unit",
  "team",
  "manager",
  "role_title",
  "role_family",
  "start_date",
  "fte",
  "team_leader",
  "leadership_team",
  "employment_status",
  "formal_rating",
] as const;

function show(value: Value): string {
  if (value === null || value === undefined || value === "") return directoryCopy["preview.blank"];
  if (typeof value === "boolean")
    return value ? directoryCopy["preview.yes"] : directoryCopy["preview.no"];
  if (typeof value === "object") return `${value.label} (${value.date})`;
  return String(value);
}

const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

/**
 * The difference preview (Milestone 3 plan, Section 5.3; PORTAL_COPY_SPEC.md S3). Every view is
 * logged by the database because it shows formal ratings. Applying presents the hash of what was
 * shown, so a directory that changed in the meantime is refused rather than overwritten. The
 * formal-rating lines apply the intake package's 12-month rule and 80% test to the file's ratings.
 */
export default async function UploadPreviewPage({
  params,
}: PageProps<"/org/[orgId]/directory/uploads/[uploadId]">) {
  const { orgId, uploadId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data: upload } = await supabase
    .from("directory_uploads")
    .select("organisation_id, file_name, status")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload || upload.organisation_id !== orgId) redirect(`/org/${orgId}/directory`);

  const crumbs = [
    homeCrumb(),
    { label: org.name },
    { label: directoryCopy["page.title"], href: `/org/${orgId}/directory` },
  ];
  const back = (
    <p className="mt-6">
      <TextLink href={`/org/${orgId}/directory`}>{directoryCopy["preview.back"]}</TextLink>
    </p>
  );
  if (upload.status !== "staged") {
    return (
      <main>
        <PageHeader crumbs={crumbs} title={directoryCopy["preview.title"]} />
        <Notice>{directoryCopy["preview.noLongerStaged"]}</Notice>
        {back}
      </main>
    );
  }

  const [{ data, error }, { data: units }] = await Promise.all([
    supabase.rpc("directory_upload_preview", { p_upload_id: uploadId }),
    supabase.from("business_units").select("unit_code, name").eq("organisation_id", orgId),
  ]);
  if (error || !data) redirect(`/org/${orgId}/directory`);
  const preview = data as unknown as Preview;
  const emptied = preview.units.some((u) => u.change === "emptied");

  const nameOfCode = new Map<string, string>();
  for (const u of units ?? []) nameOfCode.set(u.unit_code.toLowerCase(), u.name);
  for (const u of preview.units) {
    if (u.name_to) nameOfCode.set(u.unit_code.toLowerCase(), u.name_to);
  }
  const unitLabel = (code: string) => nameOfCode.get(code.toLowerCase()) ?? code;
  const peopleInCode = new Map(
    preview.formal_rating_coverage.map((u) => [u.unit_code.toLowerCase(), u.people]),
  );
  const coverage = previewCoverage(preview.formal_rating_coverage, sydneyToday());
  const below = coverage.units.filter((u) => !u.qualifies).map((u) => unitLabel(u.unit_code));

  return (
    <main>
      <PageHeader crumbs={crumbs} title={directoryCopy["preview.title"]} meta={upload.file_name}>
        <p className="font-medium text-slate">{directoryCopy["preview.nothingChanges"]}</p>
      </PageHeader>

      <Section title={directoryCopy["preview.summary"]}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,26rem)_1fr]">
          <dl
            className="grid grid-cols-[1fr_max-content] gap-x-8 gap-y-1 text-sm"
            data-testid="preview-summary"
          >
            {SUMMARY.map(([key, label]) => (
              <div key={key} className="contents">
                <dt className="border-b border-grey-20 py-1 text-grey">{directoryCopy[label]}</dt>
                <dd
                  className="border-b border-grey-20 py-1 text-right font-mono text-slate"
                  data-testid={`summary-${key}`}
                >
                  {preview.summary[key] ?? 0}
                </dd>
              </div>
            ))}
            <dt className="mt-3 text-grey">{directoryCopy["preview.entitlement"]}</dt>
            <dd className="mt-3 text-right font-mono text-slate">{preview.summary.rows ?? 0}</dd>
            {preview.entitlement ? (
              <>
                <dt className="text-grey">{directoryCopy["preview.band"]}</dt>
                <dd className="text-right font-mono text-slate">
                  {preview.entitlement.max_employees}
                </dd>
              </>
            ) : null}
          </dl>
          <div className="max-w-xl space-y-2 text-sm text-slate">
            {preview.units
              .filter((u) => u.change === "new")
              .map((u) => (
                <p key={u.unit_code}>
                  {fill(directoryCopy["preview.newUnitLine"], {
                    code: u.unit_code,
                    name: u.name_to ?? u.unit_code,
                    n: peopleInCode.get(u.unit_code.toLowerCase()) ?? 0,
                  })}
                </p>
              ))}
            {(preview.summary.leavers ?? 0) > 0 ? (
              <p>{directoryCopy["preview.leaversNote"]}</p>
            ) : null}
            <p>{directoryCopy["preview.snapshotNote"]}</p>
            {emptied ? <p>{directoryCopy["preview.emptiedNote"]}</p> : null}
            {!preview.entitlement ? (
              <p className="text-grey">{directoryCopy["preview.noBand"]}</p>
            ) : null}
            {preview.entitlement?.over_band ? (
              <Notice tone="problem">{directoryCopy["preview.overBand"]}</Notice>
            ) : null}
          </div>
        </div>
      </Section>

      {coverage.withRating > 0 ? (
        <Section title={directoryCopy["preview.ratings.title"]}>
          <div className="max-w-3xl space-y-2 text-sm text-slate" data-testid="preview-ratings">
            <p>
              {fill(directoryCopy["preview.ratings.present"], {
                n: coverage.withRating,
                total: coverage.total,
                current: coverage.current,
              })}
            </p>
            <p>
              {fill(directoryCopy["preview.ratings.coverage"], {
                list: coverage.units
                  .map((u) =>
                    fill(directoryCopy["preview.ratings.unitShare"], {
                      unit: unitLabel(u.unit_code),
                      pct: Math.floor((u.share ?? 0) * 100),
                    }),
                  )
                  .join(", "),
              })}
            </p>
            <p>
              {directoryCopy["preview.ratings.use"]}{" "}
              {below.length > 0
                ? fill(directoryCopy["preview.ratings.below"], {
                    list: listOf(below, LIST_WORDS, 8),
                  })
                : null}
            </p>
            <p className="text-grey">{directoryCopy["preview.ratings.mapping"]}</p>
          </div>
        </Section>
      ) : null}

      <Section title={directoryCopy["preview.people"]}>
        {preview.people.length === 0 ? (
          <p className="text-sm text-grey">{directoryCopy["preview.noPeopleChanges"]}</p>
        ) : (
          <Table testId="preview-people">
            <Head>
              <Th>{directoryCopy["preview.col.person"]}</Th>
              <Th>{directoryCopy["preview.col.change"]}</Th>
            </Head>
            <tbody>
              {preview.people.map((p) => (
                <Row key={p.employee_ref}>
                  <Td>
                    <span className="font-mono text-grey">{p.employee_ref}</span> {p.first_name}{" "}
                    {p.last_name}
                  </Td>
                  <Td>
                    <span>{directoryCopy[`preview.change.${p.change}`]}</span>
                    {p.change === "update" || p.change === "returning" ? (
                      <ul className="mt-1 space-y-0.5 text-grey">
                        {FIELDS.filter((f) => p.fields[f]).map((f) => (
                          <li key={f}>
                            {directoryCopy[`preview.field.${f}`]} {directoryCopy["preview.from"]}{" "}
                            <span className="text-slate">{show(p.fields[f]!.from)}</span>{" "}
                            {directoryCopy["preview.to"]}{" "}
                            <span className="text-slate">{show(p.fields[f]!.to)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      {preview.units.length + preview.teams.length + preview.role_families.length > 0 ? (
        <Section title={directoryCopy["preview.units"]}>
          <ul className="space-y-1 text-sm text-slate">
            {preview.units.map((u) => (
              <li key={`${u.unit_code}-${u.change}`}>
                <span className="font-mono text-grey">{u.unit_code}</span>{" "}
                {directoryCopy[`preview.unit.${u.change}`]}:{" "}
                {u.change === "renamed"
                  ? `${u.name_from} ${directoryCopy["preview.to"]} ${u.name_to}`
                  : (u.name_to ?? u.name_from)}
              </li>
            ))}
            {preview.teams.map((t) => (
              <li key={`${t.unit_code}-${t.team}`}>
                {directoryCopy["preview.team"]}{" "}
                <span className="font-mono text-grey">{t.unit_code}</span>: {t.team}
              </li>
            ))}
            {preview.role_families.map((name) => (
              <li key={name}>
                {directoryCopy["preview.family"]}: {name}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section>
        <div className="flex max-w-2xl flex-col gap-6">
          <ActionForm action={applyUpload} submitLabel={directoryCopy["preview.apply"]}>
            <input type="hidden" name="organisationId" value={orgId} />
            <input type="hidden" name="uploadId" value={uploadId} />
            <input type="hidden" name="previewHash" value={preview.preview_hash} />
            {preview.leaver_confirmation_required ? (
              <>
                <Notice tone="problem">
                  {fill(directoryCopy["preview.leaversThreshold"], {
                    n: preview.summary.leavers ?? 0,
                    threshold: preview.leaver_threshold,
                  })}
                </Notice>
                <label className="flex items-start gap-3 text-sm text-slate">
                  <input
                    type="checkbox"
                    name="confirmLeavers"
                    required
                    className="mt-0.5 size-4 accent-slate"
                  />
                  <span>{directoryCopy["preview.confirmLeavers"]}</span>
                </label>
              </>
            ) : null}
          </ActionForm>
          <ActionForm action={discardUpload} submitLabel={directoryCopy["preview.discard"]} compact>
            <input type="hidden" name="organisationId" value={orgId} />
            <input type="hidden" name="uploadId" value={uploadId} />
          </ActionForm>
        </div>
        {back}
      </Section>
    </main>
  );
}
