import { redirect } from "next/navigation";

import { Notice, TextLink } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { parseErrors } from "@/lib/directory/errors";
import { createClient } from "@/lib/supabase/server";

import { UploadForm } from "./upload-form";

const LIST_LIMIT = 200;
const STATUSES = ["staged", "rejected", "applied", "discarded", "expired"] as const;

function when(value: string): string {
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string): string {
  return (STATUSES as readonly string[]).includes(status)
    ? directoryCopy[`status.${status as (typeof STATUSES)[number]}`]
    : status;
}

/**
 * The directory (Milestone 3 plan, Section 9): the template, the upload, the recent uploads and
 * the people. For administrators, the account owner and staff under an open support session;
 * the database decides who that is. Individual edits arrive with the setup screens (Milestone 4).
 */
export default async function DirectoryPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/directory">) {
  const { orgId } = await params;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_manage_directory", {
    p_organisation_id: orgId,
  });
  if (allowed !== true) redirect("/");

  const [organisation, active, inactive, people, units, uploads] = await Promise.all([
    supabase.from("organisations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "active"),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("status", "inactive"),
    supabase
      .from("employees")
      .select("id, employee_ref, first_name, last_name, unit_id, manager_employee_id, fte")
      .eq("organisation_id", orgId)
      .eq("status", "active")
      .order("employee_ref")
      .limit(LIST_LIMIT),
    supabase.from("business_units").select("id, unit_code, name").eq("organisation_id", orgId),
    supabase
      .from("directory_uploads")
      .select("id, file_name, row_count, status, uploaded_at, errors")
      .eq("organisation_id", orgId)
      .order("uploaded_at", { ascending: false })
      .limit(10),
  ]);

  const unit = new Map((units.data ?? []).map((u) => [u.id, u]));
  const byId = new Map((people.data ?? []).map((p) => [p.id, p.employee_ref]));
  const missingManagers = [
    ...new Set(
      (people.data ?? [])
        .map((p) => p.manager_employee_id)
        .filter((id): id is string => !!id && !byId.has(id)),
    ),
  ];
  if (missingManagers.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, employee_ref")
      .eq("organisation_id", orgId)
      .in("id", missingManagers);
    for (const m of managers ?? []) byId.set(m.id, m.employee_ref);
  }

  return (
    <main className="mt-10 space-y-14">
      <div>
        <p className="text-sm text-grey">{organisation.data?.name}</p>
        <h1 className="font-display text-3xl font-medium text-slate">
          {directoryCopy["page.title"]}
        </h1>
        <p className="mt-3 max-w-2xl text-grey">{directoryCopy["page.intro"]}</p>
        <p className="mt-4 text-sm text-slate" data-testid="directory-counts">
          <span className="font-mono">{active.count ?? 0}</span> {directoryCopy["page.active"]},{" "}
          <span className="font-mono">{inactive.count ?? 0}</span> {directoryCopy["page.inactive"]}
        </p>
      </div>

      {notice === "applied" ? <Notice>{directoryCopy["preview.applied"]}</Notice> : null}
      {notice === "discarded" ? <Notice>{directoryCopy["preview.discarded"]}</Notice> : null}

      <section className="space-y-6">
        <p>
          {/* A plain link: the route answers with the workbook as an attachment. */}
          <a
            href={`/org/${orgId}/directory/template`}
            className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
          >
            {directoryCopy["page.template"]}
          </a>
        </p>
        <UploadForm organisationId={orgId} />
      </section>

      <section>
        <h2 className="font-display text-xl text-slate">{directoryCopy["page.uploads"]}</h2>
        {(uploads.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-grey">{directoryCopy["page.noUploads"]}</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead className="text-grey">
              <tr className="border-b border-grey-20">
                <th className="py-2 font-normal">{directoryCopy["page.col.file"]}</th>
                <th className="py-2 font-normal">{directoryCopy["page.col.rows"]}</th>
                <th className="py-2 font-normal">{directoryCopy["page.col.status"]}</th>
                <th className="py-2 font-normal">{directoryCopy["page.col.when"]}</th>
              </tr>
            </thead>
            <tbody>
              {(uploads.data ?? []).map((u) => {
                const errors = parseErrors(u.errors);
                return (
                  <tr key={u.id} className="border-b border-grey-20 align-top">
                    <td className="py-3 text-slate">{u.file_name}</td>
                    <td className="py-3 font-mono text-grey">{u.row_count}</td>
                    <td className="py-3 text-grey">
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
                    </td>
                    <td className="py-3 text-grey">{when(u.uploaded_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-slate">{directoryCopy["page.people"]}</h2>
        {(people.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-grey">{directoryCopy["page.noPeople"]}</p>
        ) : (
          <>
            <table className="mt-4 w-full border-collapse text-left text-sm">
              <thead className="text-grey">
                <tr className="border-b border-grey-20">
                  <th className="py-2 font-normal">{directoryCopy["page.col.id"]}</th>
                  <th className="py-2 font-normal">{directoryCopy["page.col.name"]}</th>
                  <th className="py-2 font-normal">{directoryCopy["page.col.unit"]}</th>
                  <th className="py-2 font-normal">{directoryCopy["page.col.manager"]}</th>
                  <th className="py-2 font-normal">{directoryCopy["page.col.fte"]}</th>
                </tr>
              </thead>
              <tbody>
                {(people.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-grey-20">
                    <td className="py-2 font-mono text-slate">{p.employee_ref}</td>
                    <td className="py-2 text-slate">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-2 text-grey">{unit.get(p.unit_id)?.name}</td>
                    <td className="py-2 font-mono text-grey">
                      {p.manager_employee_id ? (byId.get(p.manager_employee_id) ?? "") : ""}
                    </td>
                    <td className="py-2 font-mono text-grey">{p.fte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(active.count ?? 0) > LIST_LIMIT ? (
              <p className="mt-3 text-sm text-grey">{directoryCopy["page.listLimit"]}</p>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
