import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { CheckboxField, RadioGroup, SelectField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Field, Notice } from "@/components/ui";
import { CADENCES } from "@/lib/campaigns/cadence";
import { addDays } from "@/lib/campaigns/calendar";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { peopleCount } from "@/lib/copy/common";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import { REFERENCE } from "@/lib/reference";
import { loadActivePeople, loadMeasurementUnits, loadUnits } from "@/lib/setup/data";
import { measurementModel } from "@/lib/setup/measurement";
import { createClient } from "@/lib/supabase/server";

import { createCampaign } from "../actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";

/**
 * Starting a campaign (Milestone 5 plan, 2.1 to 2.2 and 3.5): what to run, the event where it is
 * one, which measurement units, and the day it opens. It becomes a draft; nothing is sent until it
 * launches. The event menu is the reference table's menu triggers, in the source's words.
 */
export default async function NewCampaignPage({ params }: PageProps<"/org/[orgId]/campaigns/new">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [units, people, measurement] = await Promise.all([
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
  ]);
  const measured = measurementModel({ units, people, ...measurement }).views.filter(
    (v) => v.state === "measured",
  );
  const events = REFERENCE.event_triggers
    .filter((t) => t.detection === "menu")
    .sort((a, b) => a.position - b.position);

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: campaignsCopy["hub.title"], href: `/org/${orgId}/campaigns` },
        ]}
        title={campaignsCopy["new.title"]}
      >
        <p className="text-grey">{campaignsCopy["new.intro"]}</p>
      </PageHeader>

      <Section>
        {!org.writable ? (
          <Notice>{campaignsCopy["hub.readOnly"]}</Notice>
        ) : measured.length === 0 ? (
          <p className="text-sm text-grey">
            <Link className={LINK} href={`/org/${orgId}/readiness`}>
              {campaignsCopy["new.units.none"]}
            </Link>
          </p>
        ) : (
          <ActionForm
            action={createCampaign}
            submitLabel={campaignsCopy["new.submit"]}
            className="max-w-2xl space-y-8"
          >
            <input type="hidden" name="organisationId" value={orgId} />
            <RadioGroup
              legend={campaignsCopy["new.cadence"]}
              name="cadence"
              defaultValue="baseline"
              options={CADENCES.map((c) => ({
                value: c,
                label: campaignsCopy[`new.cadence.${c}`],
              }))}
            />
            <SelectField
              label={campaignsCopy["new.event"]}
              name="event"
              hint={campaignsCopy["new.event.hint"]}
              options={[
                { value: "", label: campaignsCopy["new.event.none"] },
                ...events.map((t) => ({ value: t.code, label: t.source_trigger })),
              ]}
            />
            <fieldset>
              <legend className="text-sm text-grey">{campaignsCopy["new.units"]}</legend>
              <p className="mt-1 text-xs text-grey">{campaignsCopy["new.units.hint"]}</p>
              <div className="mt-2">
                {measured.map((v) => (
                  <CheckboxField
                    key={v.row.id}
                    name="unit"
                    value={v.row.id}
                    defaultChecked
                    label={`${v.row.name}, ${peopleCount(v.staff)}`}
                  />
                ))}
              </div>
            </fieldset>
            <Field
              label={campaignsCopy["new.opens"]}
              name="opensOn"
              type="date"
              defaultValue={addDays(sydneyToday(), 1)}
              hint={campaignsCopy["new.opens.hint"]}
            />
            <Field
              label={campaignsCopy["new.name"]}
              name="name"
              required={false}
              maxLength={120}
              hint={campaignsCopy["new.name.hint"]}
            />
          </ActionForm>
        )}
      </Section>
    </main>
  );
}
