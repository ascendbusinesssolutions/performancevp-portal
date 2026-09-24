import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/button";
import { SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Field } from "@/components/ui";
import { setupCopy } from "@/lib/copy/setup";
import { requireOrgManager } from "@/lib/org/context";
import { createClient } from "@/lib/supabase/server";

import { saveOrganisation } from "./actions";

const SIZE_BANDS = ["under_50", "50_to_200", "200_to_1000", "over_1000"] as const;

/**
 * Setup step 1, first half: the organisation's name and sector metadata (PORTAL_BUILD_PLAN.md 7;
 * Measurement Reference Part 2, 7.1). The units are the second half, on the units screen.
 */
export default async function OrganisationPage({
  params,
}: PageProps<"/org/[orgId]/setup/organisation">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [{ data: organisation }, { data: divisions }] = await Promise.all([
    supabase
      .from("organisations")
      .select("name, anzsic_division, anzsic_class, size_band")
      .eq("id", orgId)
      .maybeSingle(),
    supabase.from("ref_anzsic_divisions").select("code, name").order("sort_order"),
  ]);

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={setupCopy["organisation.title"]}
      >
        <p className="text-grey">{setupCopy["organisation.intro"]}</p>
      </PageHeader>
      <Section>
        <ActionForm
          action={saveOrganisation}
          submitLabel={setupCopy["organisation.save"]}
          className="max-w-xl space-y-5"
        >
          <input type="hidden" name="organisationId" value={orgId} />
          <Field
            label={setupCopy["organisation.name"]}
            name="name"
            defaultValue={organisation?.name ?? org.name}
            maxLength={200}
            disabled={!org.writable}
          />
          <SelectField
            label={setupCopy["organisation.division"]}
            name="division"
            defaultValue={organisation?.anzsic_division ?? ""}
            disabled={!org.writable}
            options={[
              { value: "", label: setupCopy["organisation.division.none"] },
              ...(divisions ?? []).map((d) => ({ value: d.code, label: `${d.code} ${d.name}` })),
            ]}
          />
          <Field
            label={setupCopy["organisation.class"]}
            name="anzsicClass"
            required={false}
            inputMode="numeric"
            maxLength={4}
            defaultValue={organisation?.anzsic_class ?? ""}
            hint={setupCopy["organisation.class.hint"]}
            disabled={!org.writable}
          />
          <SelectField
            label={setupCopy["organisation.sizeBand"]}
            name="sizeBand"
            defaultValue={organisation?.size_band ?? ""}
            disabled={!org.writable}
            options={[
              { value: "", label: setupCopy["organisation.sizeBand.none"] },
              ...SIZE_BANDS.map((b) => ({
                value: b,
                label: setupCopy[`organisation.sizeBand.${b}`],
              })),
            ]}
          />
        </ActionForm>
        <div className="mt-10">
          <LinkButton href={`/org/${orgId}/units`} variant="secondary">
            {setupCopy["organisation.toUnits"]}
          </LinkButton>
        </div>
      </Section>
    </main>
  );
}
