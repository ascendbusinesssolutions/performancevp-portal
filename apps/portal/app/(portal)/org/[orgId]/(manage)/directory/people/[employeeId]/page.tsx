import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/button";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Field, Notice } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import {
  loadActivePeople,
  loadPerson,
  loadRoleFamilies,
  loadTeams,
  loadUnits,
} from "@/lib/setup/data";
import { personName } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import { setPersonRating, setPersonStatus } from "../actions";
import { PersonForm } from "../person-form";

function day(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { dateStyle: "medium" });
}

/**
 * One directory record, edited directly (Online Measurement Specification 6.1): its details, its
 * status, and its formal rating. The rating is identified data, so it is read only when asked for,
 * through the logged function, one person at a time. The id in the URL is the record's opaque id,
 * never the employee ID.
 */
export default async function PersonPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/directory/people/[employeeId]">) {
  const { orgId, employeeId } = await params;
  const { notice, rating } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [person, people, units, teams, families] = await Promise.all([
    loadPerson(supabase, orgId, employeeId),
    loadActivePeople(supabase, orgId),
    loadUnits(supabase, orgId),
    loadTeams(supabase, orgId),
    loadRoleFamilies(supabase, orgId),
  ]);
  if (!person) redirect(`/org/${orgId}/directory`);
  const currentManager =
    person.manager_employee_id && !people.some((p) => p.id === person.manager_employee_id)
      ? await loadPerson(supabase, orgId, person.manager_employee_id)
      : null;

  const showRating = rating === "show";
  const formal = showRating
    ? (
        await supabase.rpc("read_formal_ratings", {
          p_organisation_id: orgId,
          p_purpose: "view",
          p_employee_id: employeeId,
        })
      ).data?.[0]
    : undefined;
  const active = person.status === "active";
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="employeeId" value={employeeId} />
    </>
  );

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: directoryCopy["page.title"], href: `/org/${orgId}/directory` },
        ]}
        title={personName(person)}
        meta={fill(directoryCopy["person.meta"], { ref: person.employee_ref })}
      />
      {notice === "added" ? <Notice>{directoryCopy["person.added"]}</Notice> : null}

      <Section title={directoryCopy["person.details"]}>
        <PersonForm
          orgId={orgId}
          person={person}
          people={people}
          currentManager={currentManager}
          units={units}
          teams={teams}
          families={families.filter((f) => f.status === "active" || f.id === person.role_family_id)}
          writable={org.writable}
        />
      </Section>

      <Section id="status" title={directoryCopy["person.status.title"]}>
        <p className="text-sm text-slate">
          {active ? directoryCopy["person.status.active"] : directoryCopy["person.status.inactive"]}
        </p>
        {org.writable ? (
          <ActionForm
            action={setPersonStatus}
            submitLabel={
              active ? directoryCopy["person.deactivate"] : directoryCopy["person.reactivate"]
            }
            variant="secondary"
          >
            {hidden}
            <input type="hidden" name="status" value={active ? "inactive" : "active"} />
          </ActionForm>
        ) : null}
      </Section>

      <Section
        id="rating"
        title={directoryCopy["person.rating.title"]}
        intro={directoryCopy["person.rating.intro"]}
      >
        {!showRating ? (
          <Link
            className={buttonClass("secondary")}
            href={`/org/${orgId}/directory/people/${employeeId}?rating=show#rating`}
          >
            {directoryCopy["person.rating.show"]}
          </Link>
        ) : (
          <div className="max-w-xl space-y-6">
            <p className="text-sm text-slate" data-testid="formal-rating">
              {formal
                ? fill(directoryCopy["person.rating.current"], {
                    label: formal.rating_label,
                    date: day(formal.rating_date),
                  })
                : directoryCopy["person.rating.none"]}
            </p>
            {org.writable ? (
              <ActionForm
                action={setPersonRating}
                submitLabel={directoryCopy["person.rating.save"]}
              >
                {hidden}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label={directoryCopy["person.rating.label"]}
                    name="label"
                    maxLength={100}
                    defaultValue={formal?.rating_label ?? ""}
                  />
                  <Field
                    label={directoryCopy["person.rating.date"]}
                    name="ratingDate"
                    type="date"
                    defaultValue={formal?.rating_date ?? ""}
                  />
                </div>
              </ActionForm>
            ) : null}
            {org.writable && formal ? (
              <ActionForm
                action={setPersonRating}
                submitLabel={directoryCopy["person.rating.clear"]}
                compact
              >
                {hidden}
                <input type="hidden" name="intent" value="clear" />
              </ActionForm>
            ) : null}
          </div>
        )}
      </Section>
    </main>
  );
}
