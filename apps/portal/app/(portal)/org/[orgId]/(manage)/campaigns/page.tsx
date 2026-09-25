import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/button";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { Notice } from "@/components/ui";
import { dateLabel, proposedOpening, sydneyDate, windowFrom } from "@/lib/campaigns/calendar";
import { loadCampaigns, loadProposals } from "@/lib/campaigns/data";
import { cadenceName, campaignTitle, stateLine, windowLine } from "@/lib/campaigns/display";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { commonCopy } from "@/lib/copy/common";
import { fill, listOf } from "@/lib/copy/template";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import { loadMeasurementUnits } from "@/lib/setup/data";
import { createClient } from "@/lib/supabase/server";

import { decideProposal } from "./actions";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";
const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

/**
 * The campaigns hub (Milestone 5 plan, 2.1 and 2.2): the calendar's proposals, each scheduled or
 * dismissed by an administrator, and every campaign with its state (copy C1).
 */
export default async function CampaignsPage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/campaigns">) {
  const { orgId } = await params;
  const { notice } = await searchParams;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [campaigns, proposals, { measurementUnits }] = await Promise.all([
    loadCampaigns(supabase, orgId),
    loadProposals(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
  ]);
  const unitName = new Map(measurementUnits.map((m) => [m.id, m.name]));
  const names = (ids: readonly string[]) =>
    listOf(
      ids.map((id) => unitName.get(id) ?? "").sort((a, b) => a.localeCompare(b, "en-AU")),
      LIST_WORDS,
    );
  const today = sydneyToday();

  return (
    <main>
      <PageHeader crumbs={[homeCrumb(), { label: org.name }]} title={campaignsCopy["hub.title"]}>
        <p className="text-grey">{campaignsCopy["hub.intro"]}</p>
        {org.writable ? (
          <div className="mt-6">
            <LinkButton href={`/org/${orgId}/campaigns/new`}>
              {campaignsCopy["hub.start"]}
            </LinkButton>
          </div>
        ) : (
          <div className="mt-6">
            <Notice>{campaignsCopy["hub.readOnly"]}</Notice>
          </div>
        )}
      </PageHeader>

      <Section
        id="calendar"
        title={campaignsCopy["calendar.title"]}
        intro={campaignsCopy["calendar.intro"]}
      >
        {notice === "dismissed" ? <Notice>{campaignsCopy["calendar.dismissed"]}</Notice> : null}
        {proposals.length === 0 ? (
          <p className="text-sm text-grey">{campaignsCopy["calendar.none"]}</p>
        ) : (
          <ul className="divide-y divide-grey-20 border-y border-grey-20" data-testid="proposals">
            {proposals.map((p) => {
              const anchor = campaigns.find((c) => c.id === p.anchor_campaign_id);
              const cadence = cadenceName(p.cadence);
              const due = dateLabel(p.due_on);
              const opensOn = proposedOpening(today, p.due_on);
              const closesOn = sydneyDate(windowFrom(p.cadence, opensOn).closesAt);
              const hidden = (decision: "approve" | "dismiss") => (
                <>
                  <input type="hidden" name="organisationId" value={orgId} />
                  <input type="hidden" name="proposalId" value={p.id} />
                  <input type="hidden" name="cadence" value={p.cadence} />
                  <input type="hidden" name="dueOn" value={p.due_on} />
                  <input type="hidden" name="decision" value={decision} />
                </>
              );
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2 py-4"
                  data-testid={`proposal-${p.cadence}-${p.due_on}`}
                >
                  <div className="text-sm">
                    <p className="font-medium text-slate">
                      {fill(campaignsCopy["calendar.due"], { cadence, date: due })}
                    </p>
                    {anchor ? (
                      <p className="mt-1 text-grey">
                        {fill(campaignsCopy["calendar.units"], {
                          list: names(anchor.measurementUnitIds),
                        })}
                      </p>
                    ) : null}
                    <p className="mt-1 text-grey">
                      {fill(campaignsCopy["calendar.scheduleNote"], {
                        date: dateLabel(opensOn),
                        close: dateLabel(closesOn),
                      })}
                    </p>
                  </div>
                  {org.writable ? (
                    <div className="flex items-center gap-6">
                      <ActionForm
                        action={decideProposal}
                        submitLabel={campaignsCopy["calendar.schedule"]}
                        submitName={fill(campaignsCopy["calendar.scheduleName"], {
                          cadence,
                          date: due,
                        })}
                        variant="secondary"
                      >
                        {hidden("approve")}
                      </ActionForm>
                      <ActionForm
                        action={decideProposal}
                        submitLabel={campaignsCopy["calendar.dismiss"]}
                        submitName={fill(campaignsCopy["calendar.dismissName"], {
                          cadence,
                          date: due,
                        })}
                        compact
                      >
                        {hidden("dismiss")}
                      </ActionForm>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={campaignsCopy["list.title"]}>
        {campaigns.length === 0 ? (
          <p className="text-sm text-grey">{campaignsCopy["hub.none"]}</p>
        ) : (
          <Table testId="campaigns">
            <Head>
              <Th>{campaignsCopy["col.campaign"]}</Th>
              <Th>{campaignsCopy["col.units"]}</Th>
              <Th>{campaignsCopy["col.window"]}</Th>
              <Th>{campaignsCopy["col.state"]}</Th>
            </Head>
            <tbody>
              {campaigns.map((c) => (
                <Row key={c.id} testId={`campaign-${c.id}`}>
                  <Td>
                    <Link className={LINK} href={`/org/${orgId}/campaigns/${c.id}`}>
                      {campaignTitle(c)}
                    </Link>
                  </Td>
                  <Td muted>{names(c.measurementUnitIds)}</Td>
                  <Td muted>{windowLine(c)}</Td>
                  <Td>{stateLine(c)}</Td>
                </Row>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </main>
  );
}
