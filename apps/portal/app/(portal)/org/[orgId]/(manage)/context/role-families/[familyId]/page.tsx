import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/button";
import { CheckboxField, SelectField } from "@/components/fields";
import { Glyph } from "@/components/glyph";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { CONTROL_CLASS, Field, Notice } from "@/components/ui";
import { contextCopy } from "@/lib/copy/context";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadRoleFamilies, loadSkills } from "@/lib/setup/data";
import { familyProblems, type FamilyProblem } from "@/lib/setup/frameworks";
import { createClient } from "@/lib/supabase/server";

import { addSkill, retireFamily, retireSkill, updateFamily, updateSkill } from "../../actions";

function problemText(problem: FamilyProblem): string {
  switch (problem.kind) {
    case "tooFew":
      return fill(contextCopy["family.problem.tooFew"], { n: problem.n, min: problem.min });
    case "tooMany":
      return fill(contextCopy["family.problem.tooMany"], { n: problem.n, max: problem.max });
    case "noCritical":
      return contextCopy["family.problem.noCritical"];
    case "noTechnical":
      return contextCopy["family.problem.noTechnical"];
    case "noBehavioural":
      return contextCopy["family.problem.noBehavioural"];
  }
}

const GRID = "grid grid-cols-[minmax(0,1fr)_11rem_5rem_auto_auto] items-center gap-4";

/**
 * One role family: its name, whether it leads people, and its skills, each with its kind and
 * whether it is critical. Skills are removed by retiring them, since ratings are made against them.
 */
export default async function RoleFamilyPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/context/role-families/[familyId]">) {
  const { orgId, familyId } = await params;
  const { notice } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [families, skills, people] = await Promise.all([
    loadRoleFamilies(supabase, orgId),
    loadSkills(supabase, orgId),
    loadActivePeople(supabase, orgId),
  ]);
  const family = families.find((f) => f.id === familyId && f.status === "active");
  if (!family) redirect(`/org/${orgId}/context`);
  const active = skills
    .filter((s) => s.role_family_id === familyId && s.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const problems = familyProblems(familyId, skills);
  const holders = people.filter((p) => p.role_family_id === familyId).length;
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="familyId" value={familyId} />
    </>
  );

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: contextCopy["page.title"], href: `/org/${orgId}/context` },
        ]}
        title={family.name}
        meta={
          <span className="flex items-center gap-2" data-testid="family-status">
            <Glyph kind={problems.length === 0 ? "passed" : "blocker"} />
            {fill(contextCopy["family.count"], { n: active.length })}
            {problems.length === 0
              ? `, ${contextCopy["families.ok"].toLowerCase()}`
              : `: ${problems.map(problemText).join("; ")}`}
          </span>
        }
      />
      {notice === "created" ? <Notice>{contextCopy["family.created"]}</Notice> : null}
      {notice === "saved" ? <Notice>{contextCopy["family.saved"]}</Notice> : null}

      <Section>
        <ActionForm
          action={updateFamily}
          submitLabel={contextCopy["family.save"]}
          className="max-w-xl space-y-4"
        >
          {hidden}
          <Field
            label={contextCopy["family.name"]}
            name="name"
            maxLength={200}
            defaultValue={family.name}
            disabled={!org.writable}
          />
          <CheckboxField
            label={contextCopy["family.peopleLeader"]}
            name="peopleLeader"
            defaultChecked={family.is_people_leader}
            disabled={!org.writable}
          />
        </ActionForm>
      </Section>

      <Section
        id="skills"
        title={contextCopy["family.skills"]}
        intro={contextCopy["family.skills.intro"]}
      >
        <div className="max-w-4xl" data-testid="skills">
          <div
            className={`${GRID} border-b border-grey-20 pb-2 text-xs font-medium tracking-[0.08em] text-grey uppercase`}
          >
            <span>{contextCopy["family.col.skill"]}</span>
            <span>{contextCopy["family.col.kind"]}</span>
            <span>{contextCopy["family.col.critical"]}</span>
            <span />
            <span />
          </div>
          {active.map((skill) => (
            <div key={skill.id} className="flex items-center gap-4 border-b border-grey-20 py-2">
              <ActionForm
                action={updateSkill}
                submitLabel={contextCopy["family.save"]}
                submitName={`${contextCopy["family.save"]} ${skill.name}`}
                compact
                className={`${GRID} flex-1`}
              >
                <input type="hidden" name="organisationId" value={orgId} />
                <input type="hidden" name="skillId" value={skill.id} />
                <input
                  name="name"
                  defaultValue={skill.name}
                  maxLength={200}
                  required
                  aria-label={`${contextCopy["family.col.skill"]} ${skill.name}`}
                  className={CONTROL_CLASS}
                  disabled={!org.writable}
                />
                <select
                  name="kind"
                  defaultValue={skill.kind}
                  aria-label={`${contextCopy["family.col.kind"]} ${skill.name}`}
                  className={CONTROL_CLASS}
                  disabled={!org.writable}
                >
                  <option value="technical">{contextCopy["family.kind.technical"]}</option>
                  <option value="behavioural">{contextCopy["family.kind.behavioural"]}</option>
                </select>
                <input
                  type="checkbox"
                  name="critical"
                  defaultChecked={skill.is_critical}
                  aria-label={`${contextCopy["family.col.critical"]} ${skill.name}`}
                  className="size-4 accent-slate"
                  disabled={!org.writable}
                />
              </ActionForm>
              {org.writable ? (
                <ActionForm
                  action={retireSkill}
                  submitLabel={contextCopy["family.retireSkill"]}
                  submitName={`${contextCopy["family.retireSkill"]} ${skill.name}`}
                  compact
                >
                  <input type="hidden" name="organisationId" value={orgId} />
                  <input type="hidden" name="skillId" value={skill.id} />
                </ActionForm>
              ) : null}
            </div>
          ))}
        </div>

        {org.writable ? (
          <>
            <ActionForm
              action={addSkill}
              submitLabel={contextCopy["family.addSkill"]}
              variant="secondary"
              className="mt-8 max-w-4xl"
            >
              {hidden}
              <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_11rem_auto]">
                <Field label={contextCopy["family.skillName"]} name="name" maxLength={200} />
                <SelectField
                  label={contextCopy["family.col.kind"]}
                  name="kind"
                  options={[
                    { value: "technical", label: contextCopy["family.kind.technical"] },
                    { value: "behavioural", label: contextCopy["family.kind.behavioural"] },
                  ]}
                />
                <CheckboxField label={contextCopy["family.col.critical"]} name="critical" />
              </div>
            </ActionForm>
            <div className="mt-8">
              <LinkButton
                href={`/org/${orgId}/context/role-families/new?family=${familyId}`}
                variant="secondary"
              >
                {contextCopy["family.addFromTemplate"]}
              </LinkButton>
            </div>
          </>
        ) : null}
      </Section>

      {org.writable ? (
        <Section
          id="retire"
          title={contextCopy["family.retire"]}
          intro={contextCopy["family.retire.intro"]}
        >
          {holders > 0 ? (
            <p className="text-sm text-slate">
              {fill(contextCopy["family.retire.blocked"], { n: holders })}
            </p>
          ) : (
            <ActionForm
              action={retireFamily}
              submitLabel={contextCopy["family.retire"]}
              variant="secondary"
            >
              {hidden}
            </ActionForm>
          )}
        </Section>
      ) : null}
    </main>
  );
}
