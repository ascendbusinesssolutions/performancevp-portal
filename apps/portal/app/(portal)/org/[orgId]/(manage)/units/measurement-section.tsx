import { constants } from "@performancevp/intake";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { SelectField } from "@/components/fields";
import { Section } from "@/components/page";
import { candidateLine } from "@/components/readiness-checks";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { Field, Notice } from "@/components/ui";
import { commonCopy, peopleCount } from "@/lib/copy/common";
import { fillNodes } from "@/lib/copy/nodes";
import { fill, listOf } from "@/lib/copy/template";
import { unitsCopy } from "@/lib/copy/units";
import { headcountByUnit, type Person } from "@/lib/setup/data";
import {
  branchOk,
  candidates,
  isGroupingState,
  measurementLeader,
  type MeasurementModel,
  type MeasurementView,
} from "@/lib/setup/measurement";
import { candidateRef } from "@/lib/setup/readiness";
import { eligibleLeaders, personName, type UnitRow } from "@/lib/setup/units";

import {
  combineUnits,
  keepGrouping,
  renameCombination,
  setCombinationLeader,
  splitOut,
  undoCombination,
} from "./measurement-actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";
const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

export type MeasurementNotice = "combined" | "undone" | "kept" | "withdrawn" | "split" | "retired";

const MIN_STAFF = constants.SETUP.minUnitStaff;

/** The confirmation a change that breaks a trend needs (Milestone 5 plan, 2.5). */
function LineageConfirm() {
  return (
    <label className="mt-2 flex items-start gap-3 text-sm text-slate">
      <input
        type="checkbox"
        name="confirmLineage"
        required
        className="mt-0.5 size-4 shrink-0 accent-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate"
      />
      <span>{unitsCopy["measurement.lineageConfirm"]}</span>
    </label>
  );
}

/** A unit under 10 with units below it, and people of its own to measure: a choice to make. */
function undecided(view: MeasurementView): boolean {
  return view.state === "grouping" && view.staff > 0;
}

function statusOf(model: MeasurementModel, view: MeasurementView): string {
  if (!branchOk(model, view)) return unitsCopy["measurement.status.broken"];
  switch (view.state) {
    case "grouping":
      // A grouping unit with nobody of its own has nothing to measure, so no choice to make.
      return view.staff > 0
        ? unitsCopy["measurement.status.grouping"]
        : unitsCopy["measurement.status.groupingKept"];
    case "groupingKept":
      return unitsCopy["measurement.status.groupingKept"];
    default:
      return unitsCopy[`measurement.status.${view.state}`];
  }
}

function leaderText(view: MeasurementView, people: readonly Person[]): string {
  if (isGroupingState(view.state)) return "";
  const leader = measurementLeader(view, people);
  if (leader.kind === "designated" || leader.kind === "proposed") {
    if (!leader.person) return unitsCopy["leader.unknown"];
    const name = personName(leader.person);
    if (leader.source === "rollUp" && view.top) {
      return fill(unitsCopy["measurement.leader.rollUp"], { name, unit: view.top.name });
    }
    return leader.kind === "proposed" ? fill(unitsCopy["leader.proposed"], { name }) : name;
  }
  if (leader.kind === "ambiguous") {
    return fill(unitsCopy["leader.ambiguous"], { n: leader.candidates.length });
  }
  return view.staff === 0 ? unitsCopy["row.noStaff"] : unitsCopy["leader.none"];
}

/**
 * The measurement units section of the units screen (Online Measurement Specification 6.2;
 * Milestone 4b plan, Section 6): every measurement unit with what it holds, the units under 10
 * with the units each could be measured with, the grouping choice, and each combination's name,
 * leader and undo. The readiness check links here. A unit with campaign results changes only
 * through lineage, once the person confirms the break in its trend, and a unit a running campaign
 * measures does not change at all (Milestone 5 plan, 2.5).
 */
export function MeasurementSection({
  orgId,
  writable,
  model,
  units,
  people,
  notice,
  noticeUnitId,
  measured,
  running,
}: {
  orgId: string;
  writable: boolean;
  model: MeasurementModel<UnitRow>;
  units: readonly UnitRow[];
  people: readonly Person[];
  notice: MeasurementNotice | null;
  noticeUnitId: string | null;
  /** Measurement units a campaign has named. */
  measured: ReadonlySet<string>;
  /** Measurement units a scheduled, open or scoring campaign holds fixed. */
  running: ReadonlySet<string>;
}) {
  const headcount = headcountByUnit(people);
  const short = model.views.filter((v) => v.state === "short" || undecided(v));
  const kept = model.views.filter((v) => v.state === "groupingKept");
  const combinations = model.views.filter((v) => v.combined);
  const hidden = (view: MeasurementView) => (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="measurementUnitId" value={view.row.id} />
    </>
  );
  const noticed = notice === "combined" ? model.views.find((v) => v.row.id === noticeUnitId) : null;

  return (
    <Section
      id="measurement"
      title={unitsCopy["measurement.title"]}
      intro={unitsCopy["measurement.intro"]}
    >
      {notice === "combined" && noticed ? (
        <Notice>
          {fill(unitsCopy["measurement.notice.combined"], {
            name: noticed.row.name,
            list: listOf(
              noticed.units.map((u) => u.name),
              LIST_WORDS,
            ),
            people: peopleCount(noticed.staff),
          })}
        </Notice>
      ) : notice && notice !== "combined" ? (
        <Notice>{unitsCopy[`measurement.notice.${notice}`]}</Notice>
      ) : null}

      <Table testId="measurement-units">
        <Head>
          <Th>{unitsCopy["measurement.col.code"]}</Th>
          <Th>{unitsCopy["measurement.col.unit"]}</Th>
          <Th>{unitsCopy["measurement.col.holds"]}</Th>
          <Th align="right">{unitsCopy["measurement.col.people"]}</Th>
          <Th>{unitsCopy["measurement.col.status"]}</Th>
          <Th>{unitsCopy["measurement.col.leader"]}</Th>
        </Head>
        <tbody>
          {model.views.map((view) => (
            <Row key={view.row.id} testId={`measurement-${view.row.code}`}>
              <Td figure muted>
                {view.row.code}
              </Td>
              <Td>{view.row.name}</Td>
              <Td muted>
                {listOf(
                  view.units.map((u) => u.name),
                  LIST_WORDS,
                )}
              </Td>
              <Td figure align="right">
                {view.staff}
              </Td>
              <Td>{statusOf(model, view)}</Td>
              <Td muted>{leaderText(view, people)}</Td>
            </Row>
          ))}
        </tbody>
      </Table>

      <div className="mt-10" data-testid="measurement-short">
        <h3 className="font-display text-lg font-medium text-slate">
          {unitsCopy["measurement.short.title"]}
        </h3>
        {short.length === 0 ? (
          <p className="mt-2 text-sm text-grey">{unitsCopy["measurement.short.none"]}</p>
        ) : (
          <>
            <p className="mt-2 max-w-3xl text-sm text-grey">
              {unitsCopy["measurement.short.intro"]}
            </p>
            <ul className="mt-4 divide-y divide-grey-20 border-y border-grey-20">
              {short.map((view) => {
                const offered = candidates(
                  model,
                  view,
                  undecided(view) ? ["below"] : undefined,
                ).filter((c) => !running.has(c.view.row.id));
                return (
                  <li key={view.row.id} className="py-4" data-testid={`short-${view.row.code}`}>
                    <p className="text-sm font-medium text-slate">
                      {fill(unitsCopy["measurement.short.heading"], {
                        unit: view.row.name,
                        people: peopleCount(view.staff),
                      })}
                    </p>
                    {undecided(view) ? (
                      <p className="mt-1 max-w-3xl text-sm text-grey">
                        {unitsCopy["measurement.short.grouping"]}
                      </p>
                    ) : null}
                    {measured.has(view.row.id) ? (
                      <p className="mt-1 max-w-3xl text-sm text-grey">
                        {fill(unitsCopy["measurement.lineageNote"], { name: view.row.name })}
                      </p>
                    ) : null}
                    {running.has(view.row.id) ? (
                      <p className="mt-1 text-sm text-grey">
                        {fill(unitsCopy["measurement.running"], { name: view.row.name })}
                      </p>
                    ) : offered.length === 0 ? (
                      <p className="mt-1 text-sm text-grey">
                        {unitsCopy["measurement.short.noCandidates"]}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {offered.map((c) => (
                          <li
                            key={c.view.row.id}
                            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-slate"
                          >
                            <span>{candidateLine(candidateRef(c))}</span>
                            {writable ? (
                              <ActionForm
                                action={combineUnits}
                                submitLabel={unitsCopy["measurement.combine"]}
                                submitName={fill(unitsCopy["measurement.combine.name"], {
                                  unit: view.row.name,
                                  candidate: c.view.row.name,
                                })}
                                compact
                              >
                                {hidden(view)}
                                <input type="hidden" name="candidateId" value={c.view.row.id} />
                                {measured.has(c.view.row.id) && !measured.has(view.row.id) ? (
                                  <p className="mt-1 max-w-3xl text-sm text-grey">
                                    {fill(unitsCopy["measurement.lineageNote"], {
                                      name: c.view.row.name,
                                    })}
                                  </p>
                                ) : null}
                                {measured.has(view.row.id) || measured.has(c.view.row.id) ? (
                                  <LineageConfirm />
                                ) : null}
                              </ActionForm>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    {writable && undecided(view) ? (
                      <ActionForm
                        action={keepGrouping}
                        submitLabel={unitsCopy["measurement.keep"]}
                        variant="secondary"
                      >
                        {hidden(view)}
                        <input type="hidden" name="keep" value="true" />
                      </ActionForm>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {kept.length > 0 ? (
        <div className="mt-10" data-testid="measurement-kept">
          <h3 className="font-display text-lg font-medium text-slate">
            {unitsCopy["measurement.kept.title"]}
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-grey">{unitsCopy["measurement.kept.intro"]}</p>
          <ul className="mt-4 space-y-2">
            {kept.map((view) => (
              <li
                key={view.row.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-slate"
              >
                <span>
                  {fill(unitsCopy["measurement.short.heading"], {
                    unit: view.row.name,
                    people: peopleCount(view.staff),
                  })}
                </span>
                {writable ? (
                  <ActionForm
                    action={keepGrouping}
                    submitLabel={unitsCopy["measurement.withdraw"]}
                    submitName={fill(unitsCopy["measurement.withdraw.name"], {
                      unit: view.row.name,
                    })}
                    compact
                  >
                    {hidden(view)}
                    <input type="hidden" name="keep" value="false" />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {combinations.length > 0 ? (
        <div className="mt-10" data-testid="measurement-combinations">
          <h3 className="font-display text-lg font-medium text-slate">
            {unitsCopy["measurement.combination.title"]}
          </h3>
          <ul className="mt-4 divide-y divide-grey-20 border-y border-grey-20">
            {combinations.map((view) => {
              const leader = measurementLeader(view, people);
              const { inside, above } = eligibleLeaders(
                units,
                view.units.map((u) => u.id),
                people,
              );
              const unitName = new Map(units.map((u) => [u.id, u.name]));
              const leaderDefault =
                leader.kind === "designated"
                  ? (view.row.unit_leader_employee_id ?? "")
                  : leader.kind === "proposed"
                    ? leader.person.id
                    : "";
              return (
                <li
                  key={view.row.id}
                  className="space-y-4 py-6"
                  data-testid={`combination-${view.row.code}`}
                >
                  <div>
                    <p className="font-medium text-slate">
                      {view.row.name}{" "}
                      <span className="font-mono text-sm text-grey">{view.row.code}</span>
                    </p>
                    <p className="mt-1 text-sm text-grey">
                      {fill(unitsCopy["measurement.combination.holds"], {
                        list: listOf(
                          view.units.map((u) => u.name),
                          LIST_WORDS,
                        ),
                        people: peopleCount(view.staff),
                      })}
                    </p>
                    {!branchOk(model, view) ? (
                      <p className="mt-1 text-sm text-slate">
                        {unitsCopy["measurement.combination.broken"]}
                      </p>
                    ) : null}
                  </div>

                  <ActionForm
                    action={renameCombination}
                    submitLabel={unitsCopy["measurement.combination.saveName"]}
                    className="max-w-md"
                  >
                    {hidden(view)}
                    <Field
                      label={unitsCopy["measurement.combination.nameField"]}
                      name="name"
                      defaultValue={view.row.name}
                      maxLength={200}
                      disabled={!writable}
                    />
                  </ActionForm>

                  {view.top ? (
                    <p className="max-w-3xl text-sm text-slate">
                      {fillNodes(unitsCopy["measurement.combination.rollUp"], {
                        unit: (
                          <Link className={LINK} href={`/org/${orgId}/units/${view.top.id}#leader`}>
                            {view.top.name}
                          </Link>
                        ),
                      })}
                    </p>
                  ) : (
                    <div>
                      <p className="mb-2 max-w-3xl text-sm text-slate">
                        {unitsCopy["measurement.combination.leaderNote"]}
                      </p>
                      <ActionForm
                        action={setCombinationLeader}
                        submitLabel={unitsCopy["measurement.combination.saveLeader"]}
                        className="max-w-md"
                      >
                        {hidden(view)}
                        <SelectField
                          label={unitsCopy["leader.field"]}
                          name="leaderId"
                          defaultValue={leaderDefault}
                          disabled={!writable}
                          options={[
                            { value: "", label: unitsCopy["leader.field.none"] },
                            ...inside.map((p) => ({ value: p.id, label: personName(p) })),
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
                    </div>
                  )}

                  {writable && running.has(view.row.id) ? (
                    <p className="max-w-3xl text-sm text-grey">
                      {fill(unitsCopy["measurement.running"], { name: view.row.name })}
                    </p>
                  ) : null}

                  {writable && !running.has(view.row.id) && measured.has(view.row.id)
                    ? view.units
                        .filter((u) => (headcount.get(u.id) ?? 0) >= MIN_STAFF)
                        .map((u) => (
                          <div key={u.id} data-testid={`split-${u.unit_code}`}>
                            <p className="max-w-3xl text-sm text-grey">
                              {fill(
                                unitsCopy[
                                  view.units.length > 2
                                    ? "measurement.splitNote"
                                    : "measurement.splitNoteRest"
                                ],
                                { unit: u.name, people: peopleCount(headcount.get(u.id) ?? 0) },
                              )}{" "}
                              {fill(unitsCopy["measurement.lineageNote"], { name: view.row.name })}
                            </p>
                            <ActionForm
                              action={splitOut}
                              submitLabel={unitsCopy["measurement.split"]}
                              submitName={fill(unitsCopy["measurement.split.name"], {
                                unit: u.name,
                              })}
                              variant="secondary"
                            >
                              {hidden(view)}
                              <input type="hidden" name="unitId" value={u.id} />
                              <LineageConfirm />
                            </ActionForm>
                          </div>
                        ))
                    : null}

                  {writable && !running.has(view.row.id) ? (
                    <div>
                      <p className="max-w-3xl text-sm text-grey">
                        {measured.has(view.row.id)
                          ? fill(unitsCopy["measurement.combination.retireNote"], {
                              name: view.row.name,
                            })
                          : fill(unitsCopy["measurement.combination.undoNote"], {
                              name: view.row.name,
                            })}
                      </p>
                      <ActionForm
                        action={undoCombination}
                        submitLabel={unitsCopy["measurement.combination.undo"]}
                        variant="secondary"
                      >
                        {hidden(view)}
                        {measured.has(view.row.id) ? <LineageConfirm /> : null}
                      </ActionForm>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
