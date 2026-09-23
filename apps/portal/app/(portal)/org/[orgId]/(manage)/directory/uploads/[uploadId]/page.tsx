import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { Notice, TextLink } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { createClient } from "@/lib/supabase/server";

import { applyUpload, discardUpload } from "./actions";

type Value = string | number | boolean | null | { label: string; date: string };

interface Preview {
  upload_id: string;
  preview_hash: string;
  leaver_confirmation_required: boolean;
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

/**
 * The difference preview (Milestone 3 plan, Section 5.3; PORTAL_COPY_SPEC.md S3). Every view is
 * logged by the database because it shows formal ratings. Applying presents the hash of what was
 * shown, so a directory that changed in the meantime is refused rather than overwritten.
 */
export default async function UploadPreviewPage({
  params,
}: PageProps<"/org/[orgId]/directory/uploads/[uploadId]">) {
  const { orgId, uploadId } = await params;
  const supabase = await createClient();
  const { data: upload } = await supabase
    .from("directory_uploads")
    .select("organisation_id, file_name, status")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload || upload.organisation_id !== orgId) redirect(`/org/${orgId}/directory`);

  const back = (
    <p className="mt-6">
      <TextLink href={`/org/${orgId}/directory`}>{directoryCopy["preview.back"]}</TextLink>
    </p>
  );
  if (upload.status !== "staged") {
    return (
      <main className="mt-10">
        <h1 className="font-display text-3xl font-medium text-slate">
          {directoryCopy["preview.title"]}
        </h1>
        <div className="mt-6">
          <Notice>{directoryCopy["preview.noLongerStaged"]}</Notice>
        </div>
        {back}
      </main>
    );
  }

  const { data, error } = await supabase.rpc("directory_upload_preview", { p_upload_id: uploadId });
  if (error || !data) redirect(`/org/${orgId}/directory`);
  const preview = data as unknown as Preview;
  const emptied = preview.units.some((u) => u.change === "emptied");

  return (
    <main className="mt-10 space-y-12">
      <div>
        <p className="text-sm text-grey">{upload.file_name}</p>
        <h1 className="font-display text-3xl font-medium text-slate">
          {directoryCopy["preview.title"]}
        </h1>
        <p className="mt-3 max-w-2xl text-grey">{directoryCopy["preview.nothingChanges"]}</p>
      </div>

      <section>
        <h2 className="font-display text-xl text-slate">{directoryCopy["preview.summary"]}</h2>
        <dl
          className="mt-4 grid max-w-md grid-cols-[1fr_max-content] gap-x-8 gap-y-1 text-sm"
          data-testid="preview-summary"
        >
          {SUMMARY.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="text-grey">{directoryCopy[label]}</dt>
              <dd className="text-right font-mono text-slate" data-testid={`summary-${key}`}>
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
        {!preview.entitlement ? (
          <p className="mt-3 text-sm text-grey">{directoryCopy["preview.noBand"]}</p>
        ) : null}
        {preview.entitlement?.over_band ? (
          <div className="mt-4 max-w-2xl">
            <Notice tone="problem">{directoryCopy["preview.overBand"]}</Notice>
          </div>
        ) : null}
        <div className="mt-4 max-w-2xl space-y-1 text-sm text-grey">
          {(preview.summary.leavers ?? 0) > 0 ? (
            <p>{directoryCopy["preview.leaversNote"]}</p>
          ) : null}
          <p>{directoryCopy["preview.snapshotNote"]}</p>
          {emptied ? <p>{directoryCopy["preview.emptiedNote"]}</p> : null}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-slate">{directoryCopy["preview.people"]}</h2>
        {preview.people.length === 0 ? (
          <p className="mt-3 text-sm text-grey">{directoryCopy["preview.noPeopleChanges"]}</p>
        ) : (
          <table
            className="mt-4 w-full border-collapse text-left text-sm"
            data-testid="preview-people"
          >
            <thead className="text-grey">
              <tr className="border-b border-grey-20">
                <th className="py-2 font-normal">{directoryCopy["preview.col.person"]}</th>
                <th className="py-2 font-normal">{directoryCopy["preview.col.change"]}</th>
              </tr>
            </thead>
            <tbody>
              {preview.people.map((p) => (
                <tr key={p.employee_ref} className="border-b border-grey-20 align-top">
                  <td className="py-2 text-slate">
                    <span className="font-mono text-grey">{p.employee_ref}</span> {p.first_name}{" "}
                    {p.last_name}
                  </td>
                  <td className="py-2 text-slate">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {preview.units.length + preview.teams.length + preview.role_families.length > 0 ? (
        <section>
          <h2 className="font-display text-xl text-slate">{directoryCopy["preview.units"]}</h2>
          <ul className="mt-4 space-y-1 text-sm text-slate">
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
        </section>
      ) : null}

      <section className="flex max-w-2xl flex-col gap-8">
        <ActionForm action={applyUpload} submitLabel={directoryCopy["preview.apply"]}>
          <input type="hidden" name="organisationId" value={orgId} />
          <input type="hidden" name="uploadId" value={uploadId} />
          <input type="hidden" name="previewHash" value={preview.preview_hash} />
          {preview.leaver_confirmation_required ? (
            <>
              <Notice tone="problem">{directoryCopy["preview.leaversWarning"]}</Notice>
              <label className="block text-sm text-slate">
                <input type="checkbox" name="confirmLeavers" required />{" "}
                {directoryCopy["preview.confirmLeavers"]}
              </label>
            </>
          ) : null}
        </ActionForm>
        <ActionForm action={discardUpload} submitLabel={directoryCopy["preview.discard"]} compact>
          <input type="hidden" name="organisationId" value={orgId} />
          <input type="hidden" name="uploadId" value={uploadId} />
        </ActionForm>
      </section>
      {back}
    </main>
  );
}
