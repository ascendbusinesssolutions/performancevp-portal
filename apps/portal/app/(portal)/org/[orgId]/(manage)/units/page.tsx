import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { CheckboxField, RadioGroup, SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th, TreeName } from "@/components/table";
import { Field } from "@/components/ui";
import { peopleCount, unitCount } from "@/lib/copy/common";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { unitsCopy } from "@/lib/copy/units";
import { requireOrgManager } from "@/lib/org/context";
import {
  headcountByUnit,
  loadActivePeople,
  loadMeasurementUnits,
  loadUnits,
} from "@/lib/setup/data";
import { isGroupingState, measurementModel } from "@/lib/setup/measurement";
import {
  asUnitType,
  hasChildren,
  leaderState,
  personName,
  UNIT_TYPES,
  unitTree,
} from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import { addUnit, recordLineage } from "./actions";
import { type MeasurementNotice, MeasurementSection } from "./measurement-section";

const NOTICES: readonly MeasurementNotice[] = ["combined", "undone", "kept", "withdrawn"];

/**
 * Setup step 1, second half: the units, with stable codes, arranged into a hierarchy
 * (PORTAL_BUILD_PLAN.md 7; Online Measurement Specification 6.2). Each unit's leader is shown, with
 * the proposed default where one person could lead it, and what it is measured as. Below them, the
 * measurement units, where units under 10 are combined (Milestone 4b). Merges and splits are
 * recorded here, after people have moved, so trends carry across the restructure.
 */
export default async function UnitsPage({ params, searchParams }: PageProps<"/org/[orgId]/units">) {
  const { orgId } = await params;
  const { notice: noticeParam, measurement: measurementParam } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [units, people, measurement] = await Promise.all([
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
  ]);
  const model = measurementModel({ units, people, ...measurement });
  const notice = NOTICES.find((n) => n === noticeParam) ?? null;
  const measuredAs = (unitId: string) => {
    const view = model.ofUnit.get(unitId);
    if (!view) return "";
    if (view.combined) return view.row.name;
    if (isGroupingState(view.state)) return unitsCopy["row.grouping"];
    return view.state === "measured"
      ? unitsCopy["measuredAs.own"]
      : view.state === "short"
        ? unitsCopy["measuredAs.short"]
        : unitsCopy["measuredAs.empty"];
  };
  const tree = unitTree(units);
  const nameOf = new Map(units.map((u) => [u.id, u.name]));
  const counts = headcountByUnit(people);
  const empty = tree
    .map((e) => e.unit)
    .filter((u) => (counts.get(u.id) ?? 0) === 0 && !hasChildren(units, u.id));
  const typeLabel = (type: string | null) => {
    const known = asUnitType(type);
    return known ? unitsCopy[`type.${known}`] : unitsCopy["type.none"];
  };

  const unitOptions = tree.map((e) => ({
    value: e.unit.id,
    label: `${" ".repeat(e.depth)}${e.unit.name} (${e.unit.unit_code})`,
  }));

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={unitsCopy["page.title"]}
        meta={fill(unitsCopy["page.meta"], {
          units: unitCount(tree.length),
          people: peopleCount(people.length),
        })}
      >
        <p className="text-grey">{unitsCopy["page.intro"]}</p>
      </PageHeader>

      {tree.length > 0 ? (
        <Section>
          <Table testId="units">
            <Head>
              <Th>{unitsCopy["col.code"]}</Th>
              <Th>{unitsCopy["col.unit"]}</Th>
              <Th>{unitsCopy["col.type"]}</Th>
              <Th align="right">{unitsCopy["col.people"]}</Th>
              <Th>{unitsCopy["col.measuredAs"]}</Th>
              <Th>{unitsCopy["col.leader"]}</Th>
              <Th />
            </Head>
            <tbody>
              {tree.map(({ unit, depth }) => {
                const leader = leaderState(unit, people);
                return (
                  <Row key={unit.id} testId={`unit-${unit.unit_code}`}>
                    <Td figure muted>
                      {unit.unit_code}
                    </Td>
                    <Td>
                      <TreeName
                        depth={depth}
                        parent={hasChildren(units, unit.id)}
                        below={
                          depth > 0
                            ? fill(unitsCopy["tree.below"], {
                                parent: nameOf.get(unit.parent_unit_id ?? "") ?? "",
                              })
                            : undefined
                        }
                      >
                        {unit.name}
                      </TreeName>
                    </Td>
                    <Td muted>{typeLabel(unit.unit_type)}</Td>
                    <Td figure align="right">
                      {counts.get(unit.id) ?? 0}
                    </Td>
                    <Td muted>{measuredAs(unit.id)}</Td>
                    <Td muted>
                      {leader.kind === "designated"
                        ? leader.person
                          ? personName(leader.person)
                          : unitsCopy["leader.unknown"]
                        : leader.kind === "proposed"
                          ? fill(unitsCopy["leader.proposed"], {
                              name: personName(leader.person),
                            })
                          : leader.kind === "ambiguous"
                            ? fill(unitsCopy["leader.ambiguous"], { n: leader.candidates.length })
                            : (counts.get(unit.id) ?? 0) === 0
                              ? unitsCopy["row.noStaff"]
                              : unitsCopy["leader.none"]}
                    </Td>
                    <Td align="right">
                      <Link
                        className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
                        href={`/org/${orgId}/units/${unit.id}`}
                        aria-label={`${unitsCopy["row.edit"]} ${unit.name}`}
                      >
                        {unitsCopy["row.edit"]}
                      </Link>
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        </Section>
      ) : null}

      {tree.length > 0 ? (
        <MeasurementSection
          orgId={orgId}
          writable={org.writable}
          model={model}
          units={units}
          people={people}
          notice={notice}
          noticeUnitId={typeof measurementParam === "string" ? measurementParam : null}
        />
      ) : null}

      {empty.length > 0 ? (
        <Section id="empty" title={unitsCopy["empty.title"]} intro={unitsCopy["empty.intro"]}>
          <ul className="space-y-2 text-sm">
            {empty.map((u) => (
              <li key={u.id}>
                <Link
                  className="text-slate underline underline-offset-4 hover:text-gold-deep"
                  href={`/org/${orgId}/units/${u.id}`}
                >
                  {u.name}
                </Link>{" "}
                <span className="font-mono text-grey">{u.unit_code}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="add" title={unitsCopy["add.title"]}>
        <ActionForm
          action={addUnit}
          resetOnSuccess
          submitLabel={unitsCopy["add.submit"]}
          className="max-w-3xl"
        >
          <input type="hidden" name="organisationId" value={orgId} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={unitsCopy["add.code"]}
              name="code"
              maxLength={40}
              hint={unitsCopy["add.code.hint"]}
              disabled={!org.writable}
            />
            <Field
              label={unitsCopy["add.name"]}
              name="name"
              maxLength={200}
              disabled={!org.writable}
            />
            <SelectField
              label={unitsCopy["add.parent"]}
              name="parentId"
              disabled={!org.writable}
              options={[{ value: "", label: unitsCopy["add.parent.none"] }, ...unitOptions]}
            />
            <SelectField
              label={unitsCopy["add.type"]}
              name="type"
              hint={unitsCopy["add.type.hint"]}
              disabled={!org.writable}
              options={[
                { value: "", label: unitsCopy["type.none"] },
                ...UNIT_TYPES.map((t) => ({ value: t, label: unitsCopy[`type.${t}`] })),
              ]}
            />
          </div>
        </ActionForm>
      </Section>

      <Section id="lineage" title={unitsCopy["lineage.title"]} intro={unitsCopy["lineage.intro"]}>
        {empty.length === 0 ? (
          <p className="text-sm text-grey">{unitsCopy["lineage.noEmpty"]}</p>
        ) : (
          <ActionForm
            action={recordLineage}
            submitLabel={unitsCopy["lineage.submit"]}
            className="max-w-3xl space-y-6"
          >
            <input type="hidden" name="organisationId" value={orgId} />
            <RadioGroup
              legend={unitsCopy["lineage.kind"]}
              name="kind"
              defaultValue="merge"
              disabled={!org.writable}
              options={[
                { value: "merge", label: unitsCopy["lineage.kind.merge"] },
                { value: "split", label: unitsCopy["lineage.kind.split"] },
              ]}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="text-sm text-grey">{unitsCopy["lineage.predecessors"]}</legend>
                <div className="mt-1">
                  {empty.map((u) => (
                    <CheckboxField
                      key={u.id}
                      name="predecessorIds"
                      value={u.id}
                      disabled={!org.writable}
                      label={`${u.name} (${u.unit_code})`}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm text-grey">{unitsCopy["lineage.successors"]}</legend>
                <div className="mt-1">
                  {tree
                    .filter((e) => (counts.get(e.unit.id) ?? 0) > 0)
                    .map(({ unit }) => (
                      <CheckboxField
                        key={unit.id}
                        name="successorIds"
                        value={unit.id}
                        disabled={!org.writable}
                        label={`${unit.name} (${unit.unit_code})`}
                      />
                    ))}
                </div>
              </fieldset>
            </div>
            <div className="max-w-xs">
              <Field
                label={unitsCopy["lineage.date"]}
                name="effectiveDate"
                type="date"
                disabled={!org.writable}
              />
            </div>
          </ActionForm>
        )}
      </Section>
    </main>
  );
}
