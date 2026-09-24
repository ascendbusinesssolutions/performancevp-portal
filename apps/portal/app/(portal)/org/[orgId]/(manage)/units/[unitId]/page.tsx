import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { Field } from "@/components/ui";
import { fill } from "@/lib/copy/template";
import { unitsCopy } from "@/lib/copy/units";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadTeams, loadUnits } from "@/lib/setup/data";
import {
  descendantIds,
  eligibleLeaders,
  hasChildren,
  leaderState,
  personName,
  UNIT_TYPES,
  unitTree,
} from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import { addTeam, renameTeam, retireTeam, retireUnit, setUnitLeader, updateUnit } from "../actions";

/**
 * One unit: its name, type and place in the hierarchy (the code never changes), its leader, its
 * teams, and retirement once no one is left in it.
 */
export default async function UnitPage({ params }: PageProps<"/org/[orgId]/units/[unitId]">) {
  const { orgId, unitId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [units, people, teams] = await Promise.all([
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadTeams(supabase, orgId),
  ]);
  const unit = units.find((u) => u.id === unitId && u.status === "active");
  if (!unit) redirect(`/org/${orgId}/units`);

  const members = people
    .filter((p) => p.unit_id === unitId)
    .sort((a, b) => personName(a).localeCompare(personName(b), "en-AU"));
  const leader = leaderState(unit, people);
  // A member of the unit, or of a unit above it (Online Measurement Specification 6.1).
  const { above } = eligibleLeaders(units, [unitId], people);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const below = descendantIds(units, unitId);
  const parentOptions = unitTree(units)
    .filter((e) => !below.has(e.unit.id))
    .map((e) => ({
      value: e.unit.id,
      label: `${" ".repeat(e.depth)}${e.unit.name} (${e.unit.unit_code})`,
    }));
  const unitTeams = teams
    .filter((t) => t.unit_id === unitId && t.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const teamCount = (teamId: string) => members.filter((p) => p.team_id === teamId).length;
  const leaderDefault =
    leader.kind === "designated"
      ? (unit.unit_leader_employee_id ?? "")
      : leader.kind === "proposed"
        ? leader.person.id
        : "";
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="unitId" value={unitId} />
    </>
  );

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: unitsCopy["page.title"], href: `/org/${orgId}/units` },
        ]}
        title={unit.name}
        meta={fill(unitsCopy["edit.meta"], { code: unit.unit_code, people: members.length })}
      />

      <Section title={unitsCopy["edit.details"]}>
        <ActionForm action={updateUnit} submitLabel={unitsCopy["edit.save"]} className="max-w-3xl">
          {hidden}
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={unitsCopy["add.name"]}
              name="name"
              defaultValue={unit.name}
              maxLength={200}
              hint={fill(unitsCopy["edit.codeNote"], { code: unit.unit_code })}
              disabled={!org.writable}
            />
            <SelectField
              label={unitsCopy["add.type"]}
              name="type"
              defaultValue={unit.unit_type ?? ""}
              hint={unitsCopy["add.type.hint"]}
              disabled={!org.writable}
              options={[
                { value: "", label: unitsCopy["type.none"] },
                ...UNIT_TYPES.map((t) => ({ value: t, label: unitsCopy[`type.${t}`] })),
              ]}
            />
            <SelectField
              label={unitsCopy["add.parent"]}
              name="parentId"
              defaultValue={unit.parent_unit_id ?? ""}
              disabled={!org.writable}
              options={[{ value: "", label: unitsCopy["add.parent.none"] }, ...parentOptions]}
            />
          </div>
        </ActionForm>
      </Section>

      <Section id="leader" title={unitsCopy["leader.title"]} intro={unitsCopy["leader.intro"]}>
        {leader.kind === "proposed" ? (
          <p className="mb-4 max-w-3xl text-sm text-slate">
            {fill(unitsCopy["leader.proposedNote"], { name: personName(leader.person) })}
          </p>
        ) : null}
        {leader.kind === "ambiguous" ? (
          <p className="mb-4 max-w-3xl text-sm text-slate">
            {fill(unitsCopy["leader.ambiguousNote"], { n: leader.candidates.length })}
          </p>
        ) : null}
        {leader.kind === "none" && members.length > 0 ? (
          <p className="mb-4 max-w-3xl text-sm text-slate">{unitsCopy["leader.noneNote"]}</p>
        ) : null}
        <ActionForm
          action={setUnitLeader}
          submitLabel={unitsCopy["leader.save"]}
          className="max-w-md"
        >
          {hidden}
          <SelectField
            label={unitsCopy["leader.field"]}
            name="leaderId"
            defaultValue={leaderDefault}
            disabled={!org.writable}
            options={[
              { value: "", label: unitsCopy["leader.field.none"] },
              ...members.map((p) => ({ value: p.id, label: personName(p) })),
              ...above.map((p) => ({
                value: p.id,
                label: fill(unitsCopy["leader.option.above"], {
                  name: personName(p),
                  unit: unitName.get(p.unit_id) ?? "",
                }),
              })),
            ]}
          />
        </ActionForm>
      </Section>

      <Section id="teams" title={unitsCopy["teams.title"]} intro={unitsCopy["teams.intro"]}>
        {unitTeams.length === 0 ? (
          <p className="text-sm text-grey">{unitsCopy["teams.none"]}</p>
        ) : (
          <Table testId="teams">
            <Head>
              <Th>{unitsCopy["teams.col.team"]}</Th>
              <Th align="right">{unitsCopy["teams.col.people"]}</Th>
              <Th />
            </Head>
            <tbody>
              {unitTeams.map((team) => (
                <Row key={team.id}>
                  <Td>
                    <ActionForm
                      action={renameTeam}
                      submitLabel={unitsCopy["teams.rename"]}
                      compact
                      className="flex items-center gap-4"
                    >
                      {hidden}
                      <input type="hidden" name="teamId" value={team.id} />
                      <input
                        name="name"
                        defaultValue={team.name}
                        aria-label={unitsCopy["teams.col.team"]}
                        maxLength={200}
                        required
                        disabled={!org.writable}
                        className="w-64 rounded-control border border-grey-80 px-2 py-1 text-sm text-slate focus:outline-2 focus:outline-offset-2 focus:outline-slate"
                      />
                    </ActionForm>
                  </Td>
                  <Td figure align="right">
                    {teamCount(team.id)}
                  </Td>
                  <Td align="right">
                    {teamCount(team.id) > 0 ? (
                      <span className="text-sm text-grey">{unitsCopy["teams.retireBlocked"]}</span>
                    ) : (
                      <ActionForm
                        action={retireTeam}
                        submitLabel={unitsCopy["teams.retire"]}
                        compact
                      >
                        {hidden}
                        <input type="hidden" name="teamId" value={team.id} />
                      </ActionForm>
                    )}
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
        )}
        <ActionForm
          action={addTeam}
          resetOnSuccess
          submitLabel={unitsCopy["teams.addSubmit"]}
          variant="secondary"
          className="mt-6 max-w-md"
        >
          {hidden}
          <Field
            label={unitsCopy["teams.add"]}
            name="name"
            maxLength={200}
            disabled={!org.writable}
          />
        </ActionForm>
      </Section>

      <Section id="retire" title={unitsCopy["retire.title"]} intro={unitsCopy["retire.intro"]}>
        {members.length > 0 ? (
          <p className="text-sm text-slate">
            {fill(unitsCopy["retire.blocked"], { people: members.length })}
          </p>
        ) : hasChildren(units, unitId) ? (
          <p className="text-sm text-slate">{unitsCopy["retire.hasChildren"]}</p>
        ) : (
          <ActionForm
            action={retireUnit}
            submitLabel={unitsCopy["retire.submit"]}
            variant="secondary"
          >
            {hidden}
          </ActionForm>
        )}
      </Section>
    </main>
  );
}
