import Link from "next/link";
import type { ReactNode } from "react";

import { ActionForm } from "@/components/action-form";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { REMINDER_DAYS } from "@/lib/campaigns/cadence";
import {
  dayLabel,
  dayOfWindow,
  daysSpanned,
  nextReminder,
  sydneyDate,
  timeLabel,
} from "@/lib/campaigns/calendar";
import type { ChecklistUnitStatus, Campaign, ReminderRow } from "@/lib/campaigns/data";
import { campaignTitle } from "@/lib/campaigns/display";
import type { ChecklistCode } from "@/lib/campaigns/checklist-answers";
import {
  type Cell,
  MONITORED,
  type MonitoringRow,
  type OutstandingManager,
} from "@/lib/campaigns/monitoring";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { commonCopy, peopleCount, unitCount } from "@/lib/copy/common";
import { fill, listOf } from "@/lib/copy/template";

import { closeNow, extendWeek, remindManagers, requestReminder } from "../actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";
const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

function threshold(cell: Cell | undefined, leadership: boolean): string {
  if (!cell) return "";
  if (cell.rate === null) return fill(campaignsCopy["monitor.needsCount"], { n: cell.needed });
  const pct = `${Math.round(cell.rate * 100)}%`;
  return leadership
    ? fill(campaignsCopy["monitor.needsLeadership"], { pct })
    : fill(campaignsCopy["monitor.needsRate"], { pct });
}

function CellView({ cell }: { cell: Cell }) {
  if (!cell.asked) return <span className="text-grey">{campaignsCopy["monitor.notAsked"]}</span>;
  const tone = cell.below ? "text-band-amber" : "text-slate";
  const count = fill(campaignsCopy["monitor.of"], { n: cell.received, total: cell.size });
  const pct = cell.size === 0 ? 0 : Math.round((cell.received / cell.size) * 100);
  let second: ReactNode = null;
  if (cell.note === "leadershipMinimum") second = campaignsCopy["monitor.leadershipMinimum"];
  else if (cell.below) second = fill(campaignsCopy["monitor.more"], { n: cell.more });
  else if (cell.note === "fallback") second = campaignsCopy["monitor.fallback"];
  return (
    <div className={tone}>
      {cell.rate === null ? (
        <span className="font-mono text-lg">{count}</span>
      ) : (
        <>
          <span className="font-mono text-lg">{fill(campaignsCopy["monitor.pct"], { pct })}</span>{" "}
          <span className="text-[13px] text-grey">{count}</span>
        </>
      )}
      {second ? <span className="block text-xs">{second}</span> : null}
    </div>
  );
}

/**
 * The monitoring screen of an open campaign (Milestone 5 plan, 5.1; copy C1 to C4; layout notes of
 * 24 September 2026): the state line, the table of units against audiences with the thresholds the
 * close will apply, the managers outstanding with their reminders, the checklists and what happens
 * at close. Counts only.
 */
export function CampaignMonitoring({
  orgId,
  orgName,
  campaign,
  rows,
  managers,
  people,
  reminders,
  checklists,
  writable,
  now,
}: {
  orgId: string;
  orgName: string;
  campaign: Campaign;
  rows: MonitoringRow[];
  managers: OutstandingManager[];
  people: number;
  reminders: ReminderRow[];
  checklists: Array<{ code: ChecklistCode; units: ChecklistUnitStatus[] }>;
  writable: boolean;
  now: Date;
}) {
  const hidden = (
    <>
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="campaignId" value={campaign.id} />
    </>
  );
  const opensAt = campaign.opens_at ?? now.toISOString();
  const closesAt = campaign.closes_at ?? now.toISOString();
  const sent = reminders.filter((r) => r.sent_at);
  const next = nextReminder(
    REMINDER_DAYS[campaign.cadence],
    opensAt,
    closesAt,
    now,
    reminders.filter((r) => r.kind === "automatic").map((r) => r.reminder_day ?? 0),
  );
  const sentDates = listOf([...new Set(sent.map((r) => dayLabel(r.sent_at!, now)))], LIST_WORDS);
  const reminderLine =
    sent.length === 0
      ? next
        ? fill(campaignsCopy["monitor.remindersNone"], { next: dayLabel(next, now) })
        : ""
      : next
        ? fill(campaignsCopy["monitor.reminders"], { dates: sentDates, next: dayLabel(next, now) })
        : fill(campaignsCopy["monitor.remindersAll"], { dates: sentDates });
  const meta = [
    fill(campaignsCopy["monitor.state"], {
      d: dayOfWindow(opensAt, now),
      total: daysSpanned(sydneyDate(opensAt), sydneyDate(closesAt)),
    }),
    fill(campaignsCopy["monitor.closes"], {
      date: dayLabel(closesAt, now),
      time: timeLabel(closesAt),
    }),
    fill(campaignsCopy["monitor.size"], {
      units: unitCount(rows.length),
      people: peopleCount(people),
    }),
    reminderLine,
  ].filter(Boolean);
  const metaText = meta.join(" · ");
  const first = rows[0];
  const managerLine = (m: OutstandingManager) =>
    [
      listOf(m.units, LIST_WORDS),
      m.rated === 0
        ? fill(campaignsCopy["monitor.managers.rowNone"], { reports: m.reports })
        : fill(campaignsCopy["monitor.managers.row"], { reports: m.reports, rated: m.rated }),
    ].join(" · ");

  return (
    <main>
      <div className="relative">
        <PageHeader
          crumbs={[
            homeCrumb(),
            { label: orgName },
            { label: campaignsCopy["hub.title"], href: `/org/${orgId}/campaigns` },
          ]}
          title={campaignTitle(campaign)}
          meta={<span data-testid="campaign-state">{metaText}</span>}
        />
        {writable ? (
          <div className="flex flex-wrap items-start gap-3 pb-6 lg:absolute lg:top-16 lg:right-0 lg:max-w-md lg:justify-end lg:pb-0">
            <ActionForm
              action={requestReminder}
              submitLabel={campaignsCopy["monitor.remind"]}
              variant="secondary"
            >
              {hidden}
            </ActionForm>
            <ActionForm
              action={extendWeek}
              submitLabel={campaignsCopy["monitor.extend"]}
              variant="secondary"
            >
              {hidden}
            </ActionForm>
          </div>
        ) : null}
      </div>

      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-medium text-slate">
            {campaignsCopy["monitor.response.title"]}
          </h2>
          <p className="text-sm text-grey">{campaignsCopy["monitor.countsOnly"]}</p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" data-testid="monitoring">
            <thead>
              <tr className="border-b border-grey-20 align-bottom">
                <th
                  scope="col"
                  className="py-3 pr-6 text-xs font-medium tracking-wide text-grey uppercase"
                >
                  {campaignsCopy["monitor.col.unit"]}
                </th>
                {MONITORED.map((a) => (
                  <th
                    key={a}
                    scope="col"
                    className="py-3 pr-6 text-xs font-medium tracking-wide text-grey uppercase"
                  >
                    {campaignsCopy[`monitor.col.${a}`]}
                    <span className="block font-mono text-[11px] tracking-normal normal-case">
                      {threshold(first?.cells[a], a === "leadership_team")}
                    </span>
                  </th>
                ))}
                <th
                  scope="col"
                  className="py-3 text-xs font-medium tracking-wide text-grey uppercase"
                >
                  {campaignsCopy["monitor.col.checklists"]}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.campaignUnitId}
                  className="border-b border-grey-20 align-top"
                  data-testid={`monitor-${row.name}`}
                >
                  <th scope="row" className="py-4 pr-6 font-normal text-slate">
                    {row.name}
                  </th>
                  {MONITORED.map((a) => (
                    <td key={a} className="py-4 pr-6">
                      <CellView cell={row.cells[a]} />
                    </td>
                  ))}
                  <td className="py-4">
                    {!row.checklists.asked ? (
                      <span className="text-grey">{campaignsCopy["monitor.notAsked"]}</span>
                    ) : row.checklists.open.length === 0 ? (
                      <span className="text-slate">{campaignsCopy["monitor.checklistsDone"]}</span>
                    ) : (
                      <Link
                        className="text-band-amber underline underline-offset-4"
                        href={`/org/${orgId}/campaigns/${campaign.id}/checklists/${row.campaignUnitId}#${row.checklists.open[0]}`}
                      >
                        {campaignsCopy[`checklist.${row.checklists.open[0]!}`]}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-grey">{campaignsCopy["monitor.foot"]}</p>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div data-testid="managers-outstanding">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl font-medium text-slate">
                {campaignsCopy["monitor.managers.title"]}{" "}
                <span className="font-mono text-lg text-grey">{managers.length}</span>
              </h2>
              {writable && managers.length > 0 ? (
                <ActionForm
                  action={remindManagers}
                  submitLabel={campaignsCopy["monitor.managers.remindAll"]}
                  compact
                >
                  {hidden}
                </ActionForm>
              ) : null}
            </div>
            {managers.length === 0 ? (
              <p className="mt-4 text-sm text-grey">{campaignsCopy["monitor.managers.none"]}</p>
            ) : (
              <ul className="mt-4 divide-y divide-grey-20 border-y border-grey-20">
                {managers.map((m) => (
                  <li
                    key={m.sessionId}
                    className="flex flex-wrap items-start justify-between gap-4 py-3 text-sm"
                  >
                    <div>
                      <p className="text-slate">{m.name}</p>
                      <p className="text-grey">{managerLine(m)}</p>
                    </div>
                    {writable ? (
                      <ActionForm
                        action={remindManagers}
                        submitLabel={campaignsCopy["monitor.managers.remind"]}
                        submitName={fill(campaignsCopy["monitor.managers.remindName"], {
                          name: m.name,
                        })}
                        compact
                      >
                        {hidden}
                        <input type="hidden" name="sessionId" value={m.sessionId} />
                      </ActionForm>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-grey">{campaignsCopy["monitor.managers.fixed"]}</p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-slate">
              {campaignsCopy["checklists.title"]}
            </h2>
            <ul
              className="mt-4 divide-y divide-grey-20 border-y border-grey-20"
              data-testid="checklists"
            >
              {checklists.map(({ code, units }) => {
                const saved = units.filter((u) => u.savedAt).length;
                const name = campaignsCopy[`checklist.${code}`];
                return (
                  <li
                    key={code}
                    className="flex flex-wrap items-baseline justify-between gap-4 py-3 text-sm"
                    data-testid={`checklist-${code}`}
                  >
                    <span className="text-slate">
                      {fill(campaignsCopy["checklists.row"], {
                        checklist: name,
                        units: unitCount(units.length),
                      })}
                    </span>
                    <span className={saved === units.length ? "text-grey" : "text-band-amber"}>
                      {saved === 0
                        ? campaignsCopy["checklists.status.none"]
                        : saved === units.length
                          ? campaignsCopy["checklists.status.all"]
                          : fill(campaignsCopy["checklists.status.some"], {
                              n: saved,
                              total: units.length,
                            })}
                    </span>
                    <span className="space-x-4">
                      {units.map((u) => (
                        <Link
                          key={u.campaignUnitId}
                          className={LINK}
                          href={`/org/${orgId}/campaigns/${campaign.id}/checklists/${u.campaignUnitId}#${code}`}
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
            <div className="mt-6 border border-grey-40 p-4">
              <h3 className="font-medium text-slate">{campaignsCopy["monitor.close.title"]}</h3>
              <p className="mt-1 text-sm text-slate">{campaignsCopy["monitor.close.body"]}</p>
            </div>
          </div>
        </div>
      </Section>

      {writable ? (
        <Section>
          <ActionForm
            action={closeNow}
            submitLabel={campaignsCopy["monitor.closeNow"]}
            variant="secondary"
          >
            {hidden}
            <p className="max-w-3xl text-sm text-grey">{campaignsCopy["monitor.closeNowNote"]}</p>
          </ActionForm>
        </Section>
      ) : null}
    </main>
  );
}
