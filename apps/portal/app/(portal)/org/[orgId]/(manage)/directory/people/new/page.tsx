import { homeCrumb, PageHeader, Section } from "@/components/page";
import { directoryCopy } from "@/lib/copy/directory";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadRoleFamilies, loadTeams, loadUnits } from "@/lib/setup/data";
import { createClient } from "@/lib/supabase/server";

import { PersonForm } from "../person-form";

/** Adds one person to the directory (Online Measurement Specification 6.1). */
export default async function NewPersonPage({
  params,
}: PageProps<"/org/[orgId]/directory/people/new">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [people, units, teams, families] = await Promise.all([
    loadActivePeople(supabase, orgId),
    loadUnits(supabase, orgId),
    loadTeams(supabase, orgId),
    loadRoleFamilies(supabase, orgId),
  ]);

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: directoryCopy["page.title"], href: `/org/${orgId}/directory` },
        ]}
        title={directoryCopy["person.newTitle"]}
      />
      <Section>
        <PersonForm
          orgId={orgId}
          person={null}
          people={people}
          units={units}
          teams={teams}
          families={families.filter((f) => f.status === "active")}
          writable={org.writable}
        />
      </Section>
    </main>
  );
}
