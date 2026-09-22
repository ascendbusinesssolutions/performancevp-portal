/**
 * The Survey Processing and Scoring Workbook, sheet by sheet, as one function over the intake
 * input. Every intermediate the workbook holds in a cell is on the result, so the parity cell map
 * can read it. The online-only rules are not here; assemble.ts applies them on top.
 */

import { headcounts, type Headcounts } from "./directory";
import { PART_A_ITEMS } from "./items";
import { blockRates, itemMeans, type BlockRate, type ItemMeans } from "./means";
import { screenResponses, type ScreenedRows } from "./screening";
import { teamCii, teamO5, type TeamCii, type TeamO5 } from "./teams";
import type { IntakeInput, MemberResponse, PartAItem, TeamLeaderResponse } from "./types";

export interface SurveyWorkbookResult {
  headcounts: Headcounts;
  /** 7 Screening. */
  screening: {
    members: ScreenedRows<MemberResponse>;
    teamLeaders: ScreenedRows<TeamLeaderResponse>;
  };
  /** 8 Type A Means. */
  typeA: {
    means: ItemMeans<PartAItem>;
    blocks: BlockRate[];
    teamCii: TeamCii[];
    teamO5: TeamO5[];
  };
}

export function runSurveyWorkbook(input: IntakeInput): SurveyWorkbookResult {
  const counts = headcounts(input.snapshot);
  const members = screenResponses(input.responses?.members ?? [], {
    headcount: counts.members,
  });
  const teamLeaders = screenResponses(input.responses?.teamLeaders ?? [], {
    headcount: counts.teamLeaders,
  });

  const deployedA = new Set<string>(input.campaign.deployed.partA ?? []);
  const partAItems = PART_A_ITEMS.filter((item) => deployedA.has(item));
  const typeA = {
    means: itemMeans(members.valid, partAItems),
    blocks: blockRates(members.valid, counts.members, deployedA),
    teamCii: teamCii(members.valid, input.unit.teams, input.snapshot),
    teamO5: teamO5(members.valid, input.unit.teams, input.snapshot),
  };

  return { headcounts: counts, screening: { members, teamLeaders }, typeA };
}
