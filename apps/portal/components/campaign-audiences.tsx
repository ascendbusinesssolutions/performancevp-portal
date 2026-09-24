import type { ReactNode } from "react";

import { Head, Row, Table, Td, Th } from "@/components/table";
import type { CampaignCadence } from "@/lib/campaigns/cadence";
import type { PreviewUnit } from "@/lib/campaigns/plan";
import { type MonitoredAudience, thresholdFor } from "@/lib/campaigns/thresholds";
import { campaignsCopy } from "@/lib/copy/campaigns";
import { fill } from "@/lib/copy/template";

/**
 * Who a campaign asks in each unit, with the number the close will need from each audience
 * (Milestone 5 plan, 2.3 and 5.1): the launch preview, from the directory as it stands, and after
 * launch, from what the campaign froze.
 */

function cell(value: ReactNode, needed: number | null): ReactNode {
  return (
    <>
      <span className="font-mono">{value}</span>
      {needed !== null ? (
        <span className="block text-xs text-grey">
          {fill(campaignsCopy["preview.needs"], { n: needed })}
        </span>
      ) : null}
    </>
  );
}

export function CampaignAudiences({
  cadence,
  units,
  testId,
}: {
  cadence: CampaignCadence;
  units: readonly PreviewUnit[];
  testId?: string;
}) {
  const needs = (audience: MonitoredAudience, size: number) =>
    thresholdFor(cadence, audience, size).needed;
  const notAsked = <span className="text-grey">{campaignsCopy["preview.notAsked"]}</span>;
  return (
    <Table testId={testId}>
      <Head>
        <Th>{campaignsCopy["preview.col.unit"]}</Th>
        <Th align="right">{campaignsCopy["preview.col.members"]}</Th>
        <Th align="right">{campaignsCopy["preview.col.teams"]}</Th>
        <Th align="right">{campaignsCopy["preview.col.managers"]}</Th>
        <Th align="right">{campaignsCopy["preview.col.teamLeaders"]}</Th>
        <Th align="right">{campaignsCopy["preview.col.leadershipTeam"]}</Th>
        <Th>{campaignsCopy["preview.col.checklists"]}</Th>
      </Head>
      <tbody>
        {units.map((u) => (
          <Row key={u.id} testId={`audiences-${u.name}`}>
            <Td>{u.name}</Td>
            <Td align="right">
              {u.audiences.includes("members_part_a") || u.audiences.includes("members_part_b")
                ? cell(u.members, needs("members_part_a", u.members))
                : notAsked}
            </Td>
            <Td align="right" figure>
              {u.teams === 0 ? campaignsCopy["preview.noTeams"] : u.teams}
            </Td>
            <Td align="right">
              {u.audiences.includes("managers")
                ? cell(
                    // Where formal ratings give talent density, managers do not rate it.
                    u.c3Route === "formal" && (cadence === "baseline" || cadence === "annual")
                      ? fill(campaignsCopy["preview.formal"], { n: u.managers })
                      : u.managers,
                    needs("managers", u.managers),
                  )
                : notAsked}
            </Td>
            <Td align="right">
              {u.audiences.includes("team_leaders")
                ? cell(
                    u.teamLeaderFallback
                      ? fill(campaignsCopy["preview.fallback"], { n: u.teamLeaders })
                      : u.teamLeaders,
                    needs("team_leaders", u.teamLeaders),
                  )
                : notAsked}
            </Td>
            <Td align="right">
              {u.audiences.includes("leadership_team")
                ? cell(u.leadershipTeam, needs("leadership_team", u.leadershipTeam))
                : notAsked}
            </Td>
            <Td>
              {u.checklists.length > 0
                ? u.checklists
                    .map((c) => campaignsCopy[`checklist.${c}` as keyof typeof campaignsCopy])
                    .join(", ")
                : notAsked}
            </Td>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}
