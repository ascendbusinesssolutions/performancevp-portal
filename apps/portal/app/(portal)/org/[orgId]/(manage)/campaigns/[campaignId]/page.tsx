import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { CampaignAudiences } from "@/components/campaign-audiences";
import { CheckboxField } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { findingLine } from "@/components/readiness-checks";
import { Field, Notice } from "@/components/ui";
import { dayLabel, sydneyDate, timeLabel, windowLaunchedNow } from "@/lib/campaigns/calendar";
import {
  loadCampaign,
  loadChecklistOverview,
  loadFrozenAudiences,
  loadLaunchData,
  loadMonitoring,
  toLaunch,
} from "@/lib/campaigns/data";
import { monitoringModel } from "@/lib/campaigns/monitoring";
import { campaignTitle, cadenceName, stateLine } from "@/lib/campaigns/display";
import { type CampaignBlocker, prepareLaunch } from "@/lib/campaigns/plan";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { peopleCount, unitCount } from "@/lib/copy/common";
import { readinessCopy } from "@/lib/copy/readiness";
import { commonCopy } from "@/lib/copy/common";
import { fill, listOf } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadMeasurementUnits, loadUnits } from "@/lib/setup/data";
import { measurementModel } from "@/lib/setup/measurement";
import { createClient } from "@/lib/supabase/server";

import { CampaignMonitoring } from "./monitoring";
import {
  cancelCampaign,
  launchCampaign,
  saveDraft,
  scheduleCampaign,
  unscheduleCampaign,
} from "../actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";
const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

function blockerLine(orgId: string, blocker: CampaignBlocker) {
  switch (blocker.kind) {
    case "noUnits":
      return campaignsCopy["blocker.noUnits"];
    case "unitsChanged":
      return (
        <>
          {fill(campaignsCopy["blocker.unitsChanged"], { list: listOf(blocker.units, LIST_WORDS) })}{" "}
          <Link className={LINK} href="#edit">
            {campaignsCopy["draft.edit"]}
          </Link>
        </>
      );
    case "windowPassed":
      return campaignsCopy["blocker.windowPassed"];
    case "notMeasured":
      return (
        <>
          {fill(campaignsCopy["blocker.notMeasured"], { unit: blocker.unit.name })}{" "}
          <Link className={LINK} href={`/org/${orgId}/units#measurement`}>
            {readinessCopy["fix.units"]}
          </Link>
        </>
      );
    case "needsFullRun":
      return fill(campaignsCopy["blocker.needsFullRun"], { unit: blocker.unit.name });
    case "busy":
      return fill(campaignsCopy["blocker.busy"], { unit: blocker.unit.name });
  }
}

/**
 * One campaign (Milestone 5 plan, 2.1 to 2.4; copy C1). A draft or scheduled campaign shows its
 * launch preview: who would be asked in each unit and what the close would need, the snapshot
 * notice, and anything that blocks the launch, from the readiness check rerun now and the
 * campaign's own checks. A launched campaign shows who it asked, as it froze them.
 */
export default async function CampaignPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/campaigns/[campaignId]">) {
  const { orgId, campaignId } = await params;
  const { notice, pending } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const campaign = await loadCampaign(supabase, orgId, campaignId);
  if (!campaign) notFound();
  const now = new Date();
  const title = campaignTitle(campaign);
  const beforeLaunch = campaign.status === "draft" || campaign.status === "scheduled";
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="campaignId" value={campaignId} />
    </>
  );

  const header = (
    <PageHeader
      crumbs={[
        homeCrumb(),
        { label: org.name },
        { label: campaignsCopy["hub.title"], href: `/org/${orgId}/campaigns` },
      ]}
      title={title}
      meta={
        <span data-testid="campaign-state">
          {campaign.name ? `${cadenceName(campaign.cadence, campaign.event_trigger)} · ` : ""}
          {stateLine(campaign, null, now)}
        </span>
      }
    >
      {campaign.opens_at && campaign.closes_at ? (
        <p className="text-grey">
          {fill(campaignsCopy["draft.windowLine"], {
            opens: dayLabel(campaign.opens_at, now),
            openTime: timeLabel(campaign.opens_at),
            closes: dayLabel(campaign.closes_at, now),
            closeTime: timeLabel(campaign.closes_at),
          })}
        </p>
      ) : null}
    </PageHeader>
  );

  if (campaign.status === "open") {
    const [monitoring, checklists] = await Promise.all([
      loadMonitoring(supabase, orgId, campaignId),
      loadChecklistOverview(supabase, orgId, campaignId),
    ]);
    const model = monitoringModel({ cadence: campaign.cadence, ...monitoring });
    const accountsPending = Number(typeof pending === "string" ? pending : 0);
    return (
      <>
        {notice === "launched" ? (
          <div className="pt-6">
            <Notice>
              {campaignsCopy["launched.notice"]}
              {accountsPending > 0
                ? ` ${fill(campaignsCopy["launched.accountsPending"], { n: accountsPending })}`
                : ""}
            </Notice>
          </div>
        ) : null}
        <CampaignMonitoring
          orgId={orgId}
          orgName={org.name}
          campaign={campaign}
          rows={model.rows}
          managers={model.managers}
          people={model.people}
          reminders={monitoring.reminders}
          checklists={checklists}
          writable={org.writable}
          now={now}
        />
      </>
    );
  }

  if (!beforeLaunch) {
    const [audiences, checklists] = await Promise.all([
      loadFrozenAudiences(supabase, orgId, campaignId),
      loadChecklistOverview(supabase, orgId, campaignId),
    ]);
    const accountsPending = Number(typeof pending === "string" ? pending : 0);
    return (
      <main>
        {header}
        {notice === "launched" ? (
          <Notice>
            {campaignsCopy["launched.notice"]}
            {accountsPending > 0
              ? ` ${fill(campaignsCopy["launched.accountsPending"], { n: accountsPending })}`
              : ""}
          </Notice>
        ) : null}
        <Section
          title={campaignsCopy["launched.title"]}
          intro={
            campaign.launched_at
              ? fill(campaignsCopy["launched.meta"], { date: dayLabel(campaign.launched_at, now) })
              : undefined
          }
        >
          <CampaignAudiences cadence={campaign.cadence} units={audiences} testId="audiences" />
          <p className="mt-4 max-w-3xl text-sm text-grey">
            {campaignsCopy["preview.snapshotNote"]}
          </p>
        </Section>
        {checklists.length > 0 ? (
          <Section
            id="checklists"
            title={campaignsCopy["checklists.title"]}
            intro={campaignsCopy["checklists.intro"]}
          >
            <ul
              className="divide-y divide-grey-20 border-y border-grey-20"
              data-testid="checklists"
            >
              {checklists.map(({ code, units }) => {
                const saved = units.filter((u) => u.savedAt).length;
                const name = campaignsCopy[`checklist.${code}`];
                return (
                  <li
                    key={code}
                    className="grid gap-2 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]"
                    data-testid={`checklist-${code}`}
                  >
                    <span className="text-slate">
                      {fill(campaignsCopy["checklists.row"], {
                        checklist: name,
                        units: unitCount(units.length),
                      })}
                    </span>
                    <span className="text-grey">
                      {saved === 0
                        ? campaignsCopy["checklists.status.none"]
                        : saved === units.length
                          ? campaignsCopy["checklists.status.all"]
                          : fill(campaignsCopy["checklists.status.some"], {
                              n: saved,
                              total: units.length,
                            })}
                    </span>
                    <span className="space-x-4 sm:text-right">
                      {units.map((u) => (
                        <Link
                          key={u.campaignUnitId}
                          className={LINK}
                          href={`/org/${orgId}/campaigns/${campaignId}/checklists/${u.campaignUnitId}#${code}`}
                        >
                          {units.length > 1
                            ? u.name
                            : u.savedAt
                              ? campaignsCopy["checklists.review"]
                              : campaignsCopy["checklists.continue"]}
                          <span className="sr-only">
                            {" "}
                            {fill(campaignsCopy["checklists.unitLink"], {
                              checklist: name,
                              unit: u.name,
                            })}
                          </span>
                        </Link>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}
      </main>
    );
  }

  const [data, units, people, measurement] = await Promise.all([
    loadLaunchData(supabase, orgId, campaignId),
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
  ]);
  const preparation = prepareLaunch(data, toLaunch(campaign), now);
  const readinessBlockers = preparation.readiness.checks.filter((c) => c.level === "blocker");
  const measured = measurementModel({ units, people, ...measurement }).views.filter(
    (v) => v.state === "measured" || campaign.measurementUnitIds.includes(v.row.id),
  );
  const launchWindow =
    campaign.opens_at && campaign.closes_at
      ? windowLaunchedNow(campaign.opens_at, campaign.closes_at, now)
      : null;
  const refused =
    campaign.status === "draft" &&
    Array.isArray(campaign.launch_blockers) &&
    campaign.launch_blockers.length > 0;

  return (
    <main>
      {header}
      {refused ? <Notice tone="problem">{campaignsCopy["draft.refused"]}</Notice> : null}

      <Section
        id="preview"
        title={campaignsCopy["preview.title"]}
        intro={campaignsCopy["preview.intro"]}
      >
        <p className="mb-4 font-medium text-slate" data-testid="snapshot-notice">
          {campaignsCopy["preview.snapshot"]}
        </p>
        <CampaignAudiences
          cadence={campaign.cadence}
          units={preparation.preview}
          testId="preview"
        />
        <p className="mt-4 text-sm text-slate" data-testid="people-emailed">
          {fill(campaignsCopy["preview.emailed"], {
            people: peopleCount(preparation.peopleEmailed),
          })}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-grey">
          {campaign.cadence === "baseline" || campaign.cadence === "annual"
            ? campaignsCopy["preview.foot"]
            : campaignsCopy["preview.footPartA"]}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-grey">{campaignsCopy["preview.snapshotNote"]}</p>
      </Section>

      <Section id="blockers" title={campaignsCopy["blockers.title"]}>
        {preparation.ready && org.writable ? (
          <p className="text-sm text-grey" data-testid="no-blockers">
            {campaignsCopy["blockers.none"]}
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-slate" data-testid="launch-blockers">
            {!org.writable ? <li>{campaignsCopy["blocker.readOnly"]}</li> : null}
            {preparation.blockers.map((b, i) => (
              <li key={`campaign-${i}`}>{blockerLine(orgId, b)}</li>
            ))}
            {readinessBlockers.flatMap((check) =>
              check.findings.map((finding, i) => (
                <li key={`${check.key}-${i}`}>
                  <span className="font-medium">{readinessCopy[`check.${check.key}`]}.</span>{" "}
                  {findingLine(orgId, finding)}
                </li>
              )),
            )}
          </ul>
        )}
      </Section>

      {org.writable ? (
        <Section>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
            {campaign.status === "draft" && preparation.ready && launchWindow ? (
              <div>
                <ActionForm action={launchCampaign} submitLabel={campaignsCopy["draft.launch"]}>
                  {hidden}
                  <p className="text-sm text-grey">
                    {fill(campaignsCopy["draft.launchNote"], {
                      date: dayLabel(launchWindow.closesAt, now),
                      time: timeLabel(launchWindow.closesAt),
                    })}
                  </p>
                </ActionForm>
              </div>
            ) : null}
            {campaign.status === "draft" &&
            campaign.opens_at &&
            Date.parse(campaign.opens_at) > now.getTime() ? (
              <div>
                <ActionForm
                  action={scheduleCampaign}
                  submitLabel={campaignsCopy["draft.schedule"]}
                  variant="secondary"
                >
                  {hidden}
                  <p className="text-sm text-grey">
                    {fill(campaignsCopy["draft.scheduleNote"], {
                      date: dayLabel(campaign.opens_at, now),
                      time: timeLabel(campaign.opens_at),
                    })}
                  </p>
                </ActionForm>
              </div>
            ) : null}
            {campaign.status === "scheduled" ? (
              <ActionForm
                action={unscheduleCampaign}
                submitLabel={campaignsCopy["draft.unschedule"]}
                variant="secondary"
              >
                {hidden}
              </ActionForm>
            ) : null}
            <div>
              <ActionForm
                action={cancelCampaign}
                submitLabel={campaignsCopy["draft.cancel"]}
                variant="secondary"
              >
                {hidden}
                <p className="text-sm text-grey">{campaignsCopy["draft.cancelNote"]}</p>
              </ActionForm>
            </div>
          </div>
        </Section>
      ) : null}

      {org.writable && campaign.status === "draft" ? (
        <Section id="edit" title={campaignsCopy["draft.edit"]}>
          <ActionForm
            action={saveDraft}
            submitLabel={campaignsCopy["draft.save"]}
            className="max-w-2xl space-y-6"
          >
            {hidden}
            <fieldset>
              <legend className="text-sm text-grey">{campaignsCopy["new.units"]}</legend>
              <div className="mt-2">
                {measured.map((v) => (
                  <CheckboxField
                    key={v.row.id}
                    name="unit"
                    value={v.row.id}
                    defaultChecked={campaign.measurementUnitIds.includes(v.row.id)}
                    label={`${v.row.name}, ${peopleCount(v.staff)}`}
                  />
                ))}
              </div>
            </fieldset>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label={campaignsCopy["new.opens"]}
                name="opensOn"
                type="date"
                defaultValue={campaign.opens_at ? sydneyDate(campaign.opens_at) : ""}
              />
              <Field
                label={campaignsCopy["draft.closes"]}
                name="closesOn"
                type="date"
                defaultValue={campaign.closes_at ? sydneyDate(campaign.closes_at) : ""}
              />
            </div>
            <Field
              label={campaignsCopy["new.name"]}
              name="name"
              required={false}
              maxLength={120}
              defaultValue={campaign.name ?? ""}
              hint={campaignsCopy["new.name.hint"]}
            />
          </ActionForm>
        </Section>
      ) : null}
    </main>
  );
}
