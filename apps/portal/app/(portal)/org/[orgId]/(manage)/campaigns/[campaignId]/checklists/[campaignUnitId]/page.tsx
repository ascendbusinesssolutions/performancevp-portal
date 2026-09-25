import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { CheckboxField, RadioGroup, SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Field, Notice } from "@/components/ui";
import { dayLabel, timeLabel } from "@/lib/campaigns/calendar";
import {
  type ChecklistCode,
  FACT_KEY,
  fieldName,
  optionOf,
} from "@/lib/campaigns/checklist-answers";
import { loadCampaign, loadChecklistUnit } from "@/lib/campaigns/data";
import { campaignTitle } from "@/lib/campaigns/display";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { REFERENCE } from "@/lib/reference";
import { createClient } from "@/lib/supabase/server";

import { saveChecklist } from "../../../actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";

function facts(code: ChecklistCode) {
  return REFERENCE.checklist_facts
    .filter((f) => f.checklist_code === code)
    .sort((a, b) => a.position - b.position);
}

/** The source's choices for a fact, first letter capitalised for the form. */
function choices(fact: string) {
  return REFERENCE.checklist_values
    .filter((v) => v.fact_code === fact)
    .sort((a, b) => a.position - b.position)
    .map((v) => ({ value: v.option, label: v.label.charAt(0).toUpperCase() + v.label.slice(1) }));
}

/**
 * One unit's administrator checklists in a campaign (Online Measurement Specification 4.2 to 4.3a;
 * Milestone 5 plan, 3.4): role architecture per role family in the unit, tools and integration per
 * primary system, and the capacity facts. The wording and choices are the source's. Each save is a
 * new version and the close uses the latest; the form starts from this campaign's last save, or
 * from the unit's answers in its previous campaign. Staff under a session may enter them too.
 */
export default async function ChecklistPage({
  params,
}: PageProps<"/org/[orgId]/campaigns/[campaignId]/checklists/[campaignUnitId]">) {
  const { orgId, campaignId, campaignUnitId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [campaign, unit] = await Promise.all([
    loadCampaign(supabase, orgId, campaignId),
    loadChecklistUnit(supabase, orgId, campaignUnitId),
  ]);
  if (!campaign || !unit) notFound();
  const open = campaign.status === "open" && org.writable;

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: campaignsCopy["hub.title"], href: `/org/${orgId}/campaigns` },
          { label: campaignTitle(campaign), href: `/org/${orgId}/campaigns/${campaignId}` },
        ]}
        title={fill(campaignsCopy["checklist.title"], { unit: unit.name })}
        meta={
          campaign.closes_at
            ? fill(campaignsCopy["checklist.meta"], {
                campaign: campaignTitle(campaign),
                date: dayLabel(campaign.closes_at),
                time: timeLabel(campaign.closes_at),
              })
            : undefined
        }
      >
        <p className="text-grey">{campaignsCopy["checklists.intro"]}</p>
      </PageHeader>
      {campaign.status !== "open" ? <Notice>{campaignsCopy["checklist.closed"]}</Notice> : null}

      {unit.codes.map((code) => {
        const saved = unit.latest[code];
        const defaults = saved?.answers ?? unit.previous[code] ?? {};
        const subjects =
          code === "ADM-O1" ? unit.roleFamilies : code === "ADM-O2" ? unit.systems : [];
        const hidden = (
          <>
            <input type="hidden" name="organisationId" value={orgId} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="campaignUnitId" value={campaignUnitId} />
            <input type="hidden" name="checklist" value={code} />
            {subjects.map((s) => (
              <input key={s.id} type="hidden" name="subject" value={s.id} />
            ))}
          </>
        );
        return (
          <Section
            key={code}
            id={code}
            title={campaignsCopy[`checklist.${code}`]}
            intro={
              code === "ADM-O4"
                ? campaignsCopy["checklist.intro.ADM-O4"]
                : fill(campaignsCopy[`checklist.intro.${code}`], { unit: unit.name })
            }
          >
            {!saved && unit.previous[code] ? (
              <p className="mb-4 text-sm text-grey">{campaignsCopy["checklist.prefilled"]}</p>
            ) : null}
            <ActionForm
              action={saveChecklist}
              submitLabel={campaignsCopy["checklist.save"]}
              submitName={fill(campaignsCopy["checklist.saveName"], {
                checklist: campaignsCopy[`checklist.${code}`],
              })}
              className="max-w-3xl"
            >
              {hidden}
              {code === "ADM-O4" ? (
                <div className="space-y-5">
                  {facts(code).map((fact) => {
                    const key = FACT_KEY[fact.code]!;
                    const value = defaults[key];
                    return (
                      <div key={fact.code} className="space-y-2">
                        <Field
                          label={fact.wording}
                          name={key}
                          inputMode="decimal"
                          required={false}
                          disabled={!open}
                          defaultValue={value === "not-applicable" ? "" : optionOf(value)}
                        />
                        {fact.response_kind === "percent_or_na" ? (
                          <CheckboxField
                            label={campaignsCopy["checklist.notApplicable"]}
                            name={`${key}:na`}
                            defaultChecked={value === "not-applicable"}
                            disabled={!open}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y divide-grey-20 border-y border-grey-20">
                  {subjects.map((subject) => {
                    const answers = (defaults[subject.id] ?? {}) as Record<string, unknown>;
                    return (
                      <fieldset key={subject.id} className="space-y-4 py-5">
                        <legend className="float-left mb-2 w-full font-medium text-slate">
                          {subject.name}
                        </legend>
                        {facts(code).map((fact) => {
                          const key = FACT_KEY[fact.code]!;
                          const name = fieldName(subject.id, key);
                          const value = optionOf(answers[key]);
                          return fact.response_kind === "integration" ? (
                            <SelectField
                              key={fact.code}
                              label={fact.wording}
                              name={name}
                              defaultValue={value}
                              disabled={!open}
                              options={[
                                { value: "", label: campaignsCopy["checklist.unanswered"] },
                                ...choices(fact.code),
                              ]}
                            />
                          ) : (
                            <RadioGroup
                              key={fact.code}
                              legend={fact.wording}
                              name={name}
                              defaultValue={value}
                              required={false}
                              disabled={!open}
                              options={choices(fact.code)}
                            />
                          );
                        })}
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </ActionForm>
          </Section>
        );
      })}

      <Section>
        <Link className={LINK} href={`/org/${orgId}/campaigns/${campaignId}`}>
          {campaignsCopy["checklist.back"]}
        </Link>
      </Section>
    </main>
  );
}
