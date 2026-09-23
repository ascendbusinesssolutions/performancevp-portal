import { constants } from "@performancevp/intake";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActionForm } from "@/components/action-form";
import { CheckboxField, SelectField } from "@/components/fields";
import { Glyph } from "@/components/glyph";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { CONTROL_CLASS, Field } from "@/components/ui";
import { contextCopy } from "@/lib/copy/context";
import { fill } from "@/lib/copy/template";
import { unitsCopy } from "@/lib/copy/units";
import { requireOrgManager } from "@/lib/org/context";
import {
  headcountByUnit,
  loadActivePeople,
  loadTemplates,
  loadUnitContext,
  loadUnits,
  singleMeasurementUnitId,
  type Template,
} from "@/lib/setup/data";
import { contextCounts, lacksCriticalDomain, type NamedRow } from "@/lib/setup/frameworks";
import { asUnitType } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import {
  addDomain,
  addUnitItem,
  retireUnitItem,
  saveDecisionSelection,
  setDomainCriticality,
} from "../../actions";

const SETUP = constants.SETUP;

function needed(n: number, rule: number | { min: number; max: number }): string {
  const met = typeof rule === "number" ? n === rule : n >= rule.min && n <= rule.max;
  const need = met
    ? contextCopy["need.met"]
    : typeof rule === "number"
      ? fill(contextCopy["need.exact"], { n: rule })
      : fill(contextCopy["need.range"], rule);
  return fill(contextCopy["unit.count"], { n, needed: need });
}

function Prompts({ template }: { template: Template | undefined }) {
  if (!template || template.items.length === 0) return null;
  return (
    <aside className="text-sm">
      <h3 className="text-xs font-medium tracking-[0.08em] text-grey uppercase">
        {contextCopy["unit.prompts"]}
      </h3>
      <ul className="mt-2 space-y-2 text-slate">
        {template.items.map((item) => (
          <li key={item.position}>{item.name}</li>
        ))}
      </ul>
    </aside>
  );
}

/** A section with its count against the rule on the left and the prompts on the right. */
function Part({
  id,
  title,
  intro,
  count,
  complete,
  prompts,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  count: string;
  complete: boolean;
  prompts?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Section id={id} title={title} intro={intro}>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p
            className="mb-4 flex items-center gap-2 text-sm text-slate"
            data-testid={`${id}-count`}
          >
            <Glyph kind={complete ? "passed" : "todo"} />
            {count}
          </p>
          {children}
        </div>
        {prompts}
      </div>
    </Section>
  );
}

/**
 * One unit's context (Online Measurement Specification 3.1, 3.3, 4.1 and 4.3): its knowledge
 * domains with their criticality, its decision types from the starter list for its type and its
 * own, its three critical processes and its primary systems, each against the setup rule.
 */
export default async function UnitContextPage({
  params,
}: PageProps<"/org/[orgId]/context/units/[unitId]">) {
  const { orgId, unitId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [units, people, context, templates, measurementUnitId] = await Promise.all([
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadUnitContext(supabase, orgId),
    loadTemplates(supabase),
    singleMeasurementUnitId(supabase, orgId, unitId),
  ]);
  const unit = units.find((u) => u.id === unitId && u.status === "active");
  if (!unit || !measurementUnitId) redirect(`/org/${orgId}/context`);

  // The unit's own measurement unit, until the context screens are keyed on measurement units
  // (Milestone 4b, step 4).
  const counts = contextCounts(measurementUnitId, context);
  const mine = <R extends NamedRow>(rows: readonly R[]) =>
    rows
      .filter((r) => r.measurement_unit_id === measurementUnitId && r.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const domains = mine(context.domains);
  const decisions = mine(context.decisions);
  const processes = mine(context.processes);
  const systems = mine(context.systems);
  const unitType = asUnitType(unit.unit_type);
  const starter = templates.find((t) => t.kind === "decision_types" && t.unit_type === unitType);
  const starterNames = new Set((starter?.items ?? []).map((i) => i.name.toLowerCase()));
  const activeNames = new Set(decisions.map((d) => d.name.toLowerCase()));
  const own = decisions.filter((d) => !starterNames.has(d.name.toLowerCase()));
  const prompt = (kind: string) => templates.find((t) => t.kind === kind);
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="unitId" value={unitId} />
    </>
  );

  const removeButton = (kind: string, rowId: string, name: string) =>
    org.writable ? (
      <ActionForm
        action={retireUnitItem}
        submitLabel={contextCopy["unit.remove"]}
        submitName={`${contextCopy["unit.remove"]} ${name}`}
        compact
      >
        <input type="hidden" name="organisationId" value={orgId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="rowId" value={rowId} />
      </ActionForm>
    ) : null;

  const list = (kind: string, rows: readonly NamedRow[], empty: string) =>
    rows.length === 0 ? (
      <p className="text-sm text-grey">{empty}</p>
    ) : (
      <ul className="max-w-xl" data-testid={`${kind}-list`}>
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-6 border-b border-grey-20 py-2 text-sm text-slate"
          >
            <span>{r.name}</span>
            {removeButton(kind, r.id, r.name)}
          </li>
        ))}
      </ul>
    );

  const addForm = (kind: string, label: string) =>
    org.writable ? (
      <ActionForm
        action={addUnitItem}
        resetOnSuccess
        submitLabel={contextCopy["unit.add"]}
        variant="secondary"
        className="mt-6 max-w-xl"
      >
        {hidden}
        <input type="hidden" name="kind" value={kind} />
        <Field label={label} name="name" maxLength={200} />
      </ActionForm>
    ) : null;

  const typeLabel = unitType ? unitsCopy[`type.${unitType}`] : unitsCopy["type.none"];

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: contextCopy["page.title"], href: `/org/${orgId}/context` },
        ]}
        title={unit.name}
        meta={fill(contextCopy["unit.meta"], {
          people: headcountByUnit(people).get(unitId) ?? 0,
          type: typeLabel,
        })}
      />

      <Part
        id="domains"
        title={contextCopy["domains.title"]}
        intro={fill(contextCopy["domains.intro"], SETUP.knowledgeDomainsPerUnit)}
        count={needed(counts.domains, SETUP.knowledgeDomainsPerUnit)}
        complete={
          counts.domains >= SETUP.knowledgeDomainsPerUnit.min &&
          counts.domains <= SETUP.knowledgeDomainsPerUnit.max &&
          !lacksCriticalDomain(counts)
        }
        prompts={<Prompts template={prompt("knowledge_domain_prompts")} />}
      >
        {lacksCriticalDomain(counts) ? (
          <p className="mb-4 flex items-start gap-2 text-sm text-slate">
            <Glyph kind="warning" />
            {contextCopy["domains.needCritical"]}
          </p>
        ) : null}
        {domains.length === 0 ? (
          <p className="text-sm text-grey">{contextCopy["domains.none"]}</p>
        ) : (
          <ul className="max-w-xl" data-testid="domain-list">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-6 border-b border-grey-20 py-2 text-sm text-slate"
              >
                <span className="flex-1">{d.name}</span>
                <ActionForm
                  action={setDomainCriticality}
                  submitLabel={contextCopy["family.save"]}
                  submitName={`${contextCopy["family.save"]} ${d.name}`}
                  compact
                  className="flex items-center gap-3"
                >
                  <input type="hidden" name="organisationId" value={orgId} />
                  <input type="hidden" name="rowId" value={d.id} />
                  <select
                    name="criticality"
                    defaultValue={String(d.criticality)}
                    aria-label={`${contextCopy["domains.criticality"]} ${d.name}`}
                    className={`${CONTROL_CLASS} w-40 py-1`}
                    disabled={!org.writable}
                  >
                    <option value="1">{contextCopy["domains.criticality.1"]}</option>
                    <option value="2">{contextCopy["domains.criticality.2"]}</option>
                    <option value="3">{contextCopy["domains.criticality.3"]}</option>
                  </select>
                </ActionForm>
                {removeButton("domain", d.id, d.name)}
              </li>
            ))}
          </ul>
        )}
        {org.writable ? (
          <ActionForm
            action={addDomain}
            resetOnSuccess
            submitLabel={contextCopy["unit.add"]}
            variant="secondary"
            className="mt-6 max-w-xl"
          >
            {hidden}
            <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
              <Field label={contextCopy["domains.name"]} name="name" maxLength={200} />
              <SelectField
                label={contextCopy["domains.criticality"]}
                name="criticality"
                defaultValue="2"
                options={[
                  { value: "1", label: contextCopy["domains.criticality.1"] },
                  { value: "2", label: contextCopy["domains.criticality.2"] },
                  { value: "3", label: contextCopy["domains.criticality.3"] },
                ]}
              />
            </div>
          </ActionForm>
        ) : null}
      </Part>

      <Part
        id="decisions"
        title={contextCopy["decisions.title"]}
        intro={fill(contextCopy["decisions.intro"], SETUP.decisionTypesPerUnit)}
        count={needed(counts.decisions, SETUP.decisionTypesPerUnit)}
        complete={
          counts.decisions >= SETUP.decisionTypesPerUnit.min &&
          counts.decisions <= SETUP.decisionTypesPerUnit.max
        }
      >
        {starter ? (
          <ActionForm
            action={saveDecisionSelection}
            submitLabel={contextCopy["decisions.saveSelection"]}
            className="max-w-xl"
          >
            {hidden}
            <fieldset>
              <legend className="text-sm text-grey">
                {fill(contextCopy["decisions.starter"], { type: typeLabel })}
              </legend>
              <div className="mt-2" data-testid="starter-list">
                {starter.items.map((item) => (
                  <div key={item.position}>
                    <input type="hidden" name="offered" value={item.name} />
                    <CheckboxField
                      label={item.name}
                      name="chosen"
                      value={item.name}
                      defaultChecked={activeNames.has(item.name.toLowerCase())}
                      disabled={!org.writable}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          </ActionForm>
        ) : (
          <p className="text-sm text-grey">{contextCopy["decisions.starterNone"]}</p>
        )}
        <h3 className="mt-8 text-sm font-medium text-slate">{contextCopy["decisions.own"]}</h3>
        <div className="mt-2">{list("decision", own, contextCopy["decisions.none"])}</div>
        {addForm("decision", contextCopy["decisions.name"])}
      </Part>

      <Part
        id="processes"
        title={contextCopy["processes.title"]}
        intro={fill(contextCopy["processes.intro"], { n: SETUP.criticalProcessesPerUnit })}
        count={needed(counts.processes, SETUP.criticalProcessesPerUnit)}
        complete={counts.processes === SETUP.criticalProcessesPerUnit}
        prompts={<Prompts template={prompt("process_prompts")} />}
      >
        {list("process", processes, contextCopy["processes.none"])}
        {processes.length >= SETUP.criticalProcessesPerUnit ? (
          <p className="mt-4 text-sm text-grey">
            {fill(contextCopy["processes.full"], { n: processes.length })}
          </p>
        ) : (
          addForm("process", contextCopy["processes.name"])
        )}
      </Part>

      <Part
        id="systems"
        title={contextCopy["systems.title"]}
        intro={fill(contextCopy["systems.intro"], SETUP.primarySystemsPerUnit)}
        count={needed(counts.systems, SETUP.primarySystemsPerUnit)}
        complete={
          counts.systems >= SETUP.primarySystemsPerUnit.min &&
          counts.systems <= SETUP.primarySystemsPerUnit.max
        }
        prompts={<Prompts template={prompt("system_prompts")} />}
      >
        {list("system", systems, contextCopy["systems.none"])}
        {addForm("system", contextCopy["systems.name"])}
      </Part>
    </main>
  );
}
