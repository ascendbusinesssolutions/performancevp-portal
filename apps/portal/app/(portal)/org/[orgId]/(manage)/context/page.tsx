import { constants } from "@performancevp/intake";
import Link from "next/link";

import { LinkButton } from "@/components/button";
import { Glyph } from "@/components/glyph";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { contextCopy } from "@/lib/copy/context";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import {
  headcountByUnit,
  loadActivePeople,
  loadRoleFamilies,
  loadSkills,
  loadTemplates,
  loadUnitContext,
  loadUnits,
} from "@/lib/setup/data";
import {
  contextCounts,
  familyProblems,
  type FamilyProblem,
  incompleteParts,
} from "@/lib/setup/frameworks";
import { unitTree } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

const SETUP = constants.SETUP;

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

/**
 * Setup step 3: unit context (PORTAL_BUILD_PLAN.md 7; Online Measurement Specification 3.1, 3.3,
 * 4.3 and 4.5). The role families with whether each is ready, the template library to start from,
 * and every unit with people in it, with its context counts against the setup rules.
 */
export default async function ContextPage({ params }: PageProps<"/org/[orgId]/context">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [families, skills, people, units, context, templates] = await Promise.all([
    loadRoleFamilies(supabase, orgId),
    loadSkills(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadUnits(supabase, orgId),
    loadUnitContext(supabase, orgId),
    loadTemplates(supabase),
  ]);
  const active = families
    .filter((f) => f.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const peopleIn = (familyId: string) => people.filter((p) => p.role_family_id === familyId).length;
  const counts = headcountByUnit(people);
  const staffed = unitTree(units).filter((e) => (counts.get(e.unit.id) ?? 0) > 0);
  const roleFamilyTemplates = templates.filter((t) => t.kind === "role_family");

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={contextCopy["page.title"]}
      >
        <p className="text-grey">{contextCopy["page.intro"]}</p>
      </PageHeader>

      <Section
        id="families"
        title={contextCopy["families.title"]}
        intro={fill(contextCopy["families.intro"], {
          min: SETUP.skillsPerRoleFamily.min,
          max: SETUP.skillsPerRoleFamily.max,
        })}
        aside={
          org.writable ? (
            <LinkButton href={`/org/${orgId}/context/role-families/new`} variant="secondary">
              {contextCopy["families.own"]}
            </LinkButton>
          ) : null
        }
      >
        {active.length === 0 ? (
          <p className="text-sm text-grey">{contextCopy["families.none"]}</p>
        ) : (
          <Table testId="families">
            <Head>
              <Th>{contextCopy["families.col.family"]}</Th>
              <Th align="right">{contextCopy["families.col.skills"]}</Th>
              <Th align="right">{contextCopy["families.col.people"]}</Th>
              <Th>{contextCopy["families.col.status"]}</Th>
              <Th />
            </Head>
            <tbody>
              {active.map((f) => {
                const problems = familyProblems(f.id, skills);
                const n = skills.filter(
                  (s) => s.role_family_id === f.id && s.status === "active",
                ).length;
                return (
                  <Row key={f.id} testId={`family-${f.name}`}>
                    <Td>{f.name}</Td>
                    <Td figure align="right">
                      {n}
                    </Td>
                    <Td figure align="right">
                      {peopleIn(f.id)}
                    </Td>
                    <Td>
                      <span className="flex items-start gap-2">
                        <Glyph kind={problems.length === 0 ? "passed" : "blocker"} />
                        <span>
                          {problems.length === 0
                            ? contextCopy["families.ok"]
                            : problems.map(problemText).join("; ")}
                        </span>
                      </span>
                    </Td>
                    <Td align="right">
                      <Link
                        className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
                        href={`/org/${orgId}/context/role-families/${f.id}`}
                        aria-label={`${contextCopy["families.edit"]} ${f.name}`}
                      >
                        {contextCopy["families.edit"]}
                      </Link>
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        )}

        {org.writable ? (
          <div className="mt-10">
            <h3 className="font-display text-lg font-medium text-slate">
              {contextCopy["families.fromTemplate"]}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-grey">
              {contextCopy["families.fromTemplate.intro"]}
            </p>
            <ul className="mt-4 grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {roleFamilyTemplates.map((t) => (
                <li key={t.code}>
                  <Link
                    className="text-slate underline underline-offset-4 hover:text-gold-deep"
                    href={`/org/${orgId}/context/role-families/new?template=${t.code}`}
                  >
                    {t.name}
                  </Link>{" "}
                  <span className="font-mono text-xs text-grey">{t.items.length}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section
        id="units"
        title={contextCopy["units.title"]}
        intro={fill(contextCopy["units.intro"], {
          domains: fill(contextCopy["range"], SETUP.knowledgeDomainsPerUnit),
          decisions: fill(contextCopy["range"], SETUP.decisionTypesPerUnit),
          processes: SETUP.criticalProcessesPerUnit,
          systems: fill(contextCopy["range"], SETUP.primarySystemsPerUnit),
        })}
      >
        {staffed.length === 0 ? (
          <p className="text-sm text-grey">{contextCopy["units.none"]}</p>
        ) : (
          <Table testId="unit-context">
            <Head>
              <Th>{contextCopy["units.col.unit"]}</Th>
              <Th align="right">{contextCopy["units.col.domains"]}</Th>
              <Th align="right">{contextCopy["units.col.decisions"]}</Th>
              <Th align="right">{contextCopy["units.col.processes"]}</Th>
              <Th align="right">{contextCopy["units.col.systems"]}</Th>
              <Th>{contextCopy["units.col.status"]}</Th>
              <Th />
            </Head>
            <tbody>
              {staffed.map(({ unit }) => {
                const c = contextCounts(unit.id, context);
                const complete = incompleteParts(c).length === 0;
                return (
                  <Row key={unit.id} testId={`context-${unit.unit_code}`}>
                    <Td>{unit.name}</Td>
                    <Td figure align="right">
                      {c.domains}
                    </Td>
                    <Td figure align="right">
                      {c.decisions}
                    </Td>
                    <Td figure align="right">
                      {c.processes}
                    </Td>
                    <Td figure align="right">
                      {c.systems}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Glyph kind={complete ? "passed" : "todo"} />
                        {complete
                          ? contextCopy["units.status.complete"]
                          : contextCopy["units.status.incomplete"]}
                      </span>
                    </Td>
                    <Td align="right">
                      <Link
                        className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
                        href={`/org/${orgId}/context/units/${unit.id}`}
                        aria-label={`${contextCopy["units.open"]} ${unit.name}`}
                      >
                        {contextCopy["units.open"]}
                      </Link>
                    </Td>
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
