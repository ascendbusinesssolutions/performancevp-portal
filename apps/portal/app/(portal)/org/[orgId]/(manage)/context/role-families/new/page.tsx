import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/button";
import { CheckboxField, SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { CONTROL_CLASS, Field } from "@/components/ui";
import { contextCopy } from "@/lib/copy/context";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { loadRoleFamilies, loadTemplates } from "@/lib/setup/data";
import { createClient } from "@/lib/supabase/server";

import { addTemplateSkills, createFamily } from "../../actions";

const BLANK_ROWS = 5;
const OWN_ROWS = 12;

/**
 * A role family from the template library, or of the client's own (Online Measurement Specification
 * 4.5): the administrator keeps, renames or drops each skill and marks its kind and whether it is
 * critical before anything is created. With ?family=, the kept skills are added to an existing role
 * family instead, such as one a directory upload created by name. Query parameters carry template
 * codes and record ids only.
 */
export default async function NewRoleFamilyPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/context/role-families/new">) {
  const { orgId } = await params;
  const { template: templateParam, family: familyParam } = await searchParams;
  const org = await requireOrgManager(orgId);
  if (!org.writable) redirect(`/org/${orgId}/context`);
  const supabase = await createClient();
  const [templates, families] = await Promise.all([
    loadTemplates(supabase),
    loadRoleFamilies(supabase, orgId),
  ]);
  const roleFamilyTemplates = templates.filter((t) => t.kind === "role_family");
  const template = roleFamilyTemplates.find((t) => t.code === templateParam);
  const family =
    typeof familyParam === "string"
      ? families.find((f) => f.id === familyParam && f.status === "active")
      : undefined;

  const title = family
    ? fill(contextCopy["family.addFromTemplateTitle"], { family: family.name })
    : template
      ? contextCopy["family.fromTemplateTitle"]
      : contextCopy["family.newTitle"];
  const crumbs = [
    homeCrumb(),
    { label: org.name },
    { label: contextCopy["page.title"], href: `/org/${orgId}/context` },
  ];

  // Filling an existing family needs a template first.
  if (family && !template) {
    return (
      <main>
        <PageHeader crumbs={crumbs} title={title}>
          <p className="text-grey">{contextCopy["family.addFromTemplate.intro"]}</p>
        </PageHeader>
        <Section>
          <form method="get" className="flex max-w-xl items-end gap-4">
            <input type="hidden" name="family" value={family.id} />
            <div className="flex-1">
              <SelectField
                label={contextCopy["family.template"]}
                name="template"
                options={roleFamilyTemplates.map((t) => ({ value: t.code, label: t.name }))}
              />
            </div>
            <button type="submit" className={buttonClass("secondary")}>
              {contextCopy["family.templateContinue"]}
            </button>
          </form>
        </Section>
      </main>
    );
  }

  const rows = [
    ...(template?.items ?? []).map((item) => ({
      name: item.name,
      kind: item.skill_kind ?? "technical",
      critical: item.is_critical ?? false,
    })),
    ...Array.from({ length: template ? BLANK_ROWS : OWN_ROWS }, () => ({
      name: "",
      kind: "technical",
      critical: false,
    })),
  ];

  return (
    <main>
      <PageHeader
        crumbs={crumbs}
        title={title}
        meta={template?.is_placeholder ? contextCopy["family.placeholder"] : undefined}
      >
        <p className="text-grey">{contextCopy["family.skills.intro"]}</p>
      </PageHeader>
      <Section>
        <ActionForm
          action={family ? addTemplateSkills : createFamily}
          submitLabel={family ? contextCopy["family.addSkills"] : contextCopy["family.create"]}
          className="max-w-4xl space-y-8"
        >
          <input type="hidden" name="organisationId" value={orgId} />
          <input type="hidden" name="familyId" value={family?.id ?? ""} />
          <input type="hidden" name="templateCode" value={template?.code ?? ""} />
          <input type="hidden" name="templateVersion" value={template?.version ?? ""} />
          {family ? null : (
            <div className="grid max-w-2xl gap-4">
              <Field
                label={contextCopy["family.name"]}
                name="name"
                maxLength={200}
                defaultValue={template?.name ?? ""}
              />
              <CheckboxField
                label={contextCopy["family.peopleLeader"]}
                name="peopleLeader"
                defaultChecked={template?.is_people_leader ?? false}
              />
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-medium text-slate">
              {contextCopy["family.skills"]}
            </h2>
            <p className="mt-1 text-sm text-grey">{contextCopy["family.blankRows"]}</p>
            <div className="mt-4">
              <Table testId="skill-rows">
                <Head>
                  <Th>{contextCopy["family.col.keep"]}</Th>
                  <Th>{contextCopy["family.col.skill"]}</Th>
                  <Th>{contextCopy["family.col.kind"]}</Th>
                  <Th>{contextCopy["family.col.critical"]}</Th>
                </Head>
                <tbody>
                  {rows.map((row, i) => (
                    <Row key={i} middle>
                      <Td>
                        <input
                          type="checkbox"
                          name={`skill_${i}_keep`}
                          defaultChecked
                          aria-label={`${contextCopy["family.col.keep"]} ${row.name}`.trim()}
                          className="size-4 accent-slate"
                        />
                      </Td>
                      <Td>
                        <input
                          name={`skill_${i}_name`}
                          defaultValue={row.name}
                          maxLength={200}
                          aria-label={contextCopy["family.col.skill"]}
                          className={`${CONTROL_CLASS} min-w-72`}
                        />
                      </Td>
                      <Td>
                        <select
                          name={`skill_${i}_kind`}
                          defaultValue={row.kind}
                          aria-label={contextCopy["family.col.kind"]}
                          className={CONTROL_CLASS}
                        >
                          <option value="technical">{contextCopy["family.kind.technical"]}</option>
                          <option value="behavioural">
                            {contextCopy["family.kind.behavioural"]}
                          </option>
                        </select>
                      </Td>
                      <Td>
                        <input
                          type="checkbox"
                          name={`skill_${i}_critical`}
                          defaultChecked={row.critical}
                          aria-label={`${contextCopy["family.col.critical"]} ${row.name}`.trim()}
                          className="size-4 accent-slate"
                        />
                      </Td>
                    </Row>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </ActionForm>
      </Section>
    </main>
  );
}
