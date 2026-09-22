/**
 * The Survey Processing and Scoring Workbook, sheet by sheet, as one function over the intake
 * input. Every intermediate the workbook holds in a cell is on the result, so the parity cell map
 * can read it. The online-only rules are not here; assemble.ts applies them on top.
 */

import { headcounts, type Headcounts } from "./directory";
import { managerRows, scoreC1, type C1Result } from "./modules/c1-mgr";
import { scoreC3, type C3Result } from "./modules/c3-mgr";
import { scoreC5, type C5Result } from "./modules/c5-tl";
import { PART_A_ITEMS } from "./items";
import { blockRates, itemMeans, type BlockRate, type ItemMeans } from "./means";
import {
  scoreCascade,
  scoreInformationAccess,
  scoreProcessFriction,
  type PartBModule,
  type ProcessFriction,
} from "./modules/component";
import { scoreLeadership, type LtResult } from "./modules/lt";
import { screenResponses, type ScreenedRows } from "./screening";
import { teamCii, teamO5, type TeamCii, type TeamO5 } from "./teams";
import type { IntakeInput, MemberResponse, PartAItem } from "./types";

export interface SurveyWorkbookResult {
  headcounts: Headcounts;
  /** 7 Screening: the main survey only; the workbook screens nothing else. */
  screening: {
    members: ScreenedRows<MemberResponse>;
  };
  /** 8 Type A Means. */
  typeA: {
    means: ItemMeans<PartAItem>;
    blocks: BlockRate[];
    teamCii: TeamCii[];
    teamO5: TeamO5[];
  };
  /** 9 Type C Scoring. */
  typeC: {
    leadership: LtResult;
    cascade: PartBModule;
    informationAccess: PartBModule;
    processFriction: ProcessFriction;
    c1: C1Result;
    c3: C3Result;
    c5: C5Result;
  };
}

export function runSurveyWorkbook(input: IntakeInput): SurveyWorkbookResult {
  const counts = headcounts(input.snapshot);
  const members = screenResponses(input.responses?.members ?? [], {
    headcount: counts.members,
  });

  const typeA = {
    means: itemMeans(members.valid, PART_A_ITEMS),
    blocks: blockRates(members.valid, counts.members),
    teamCii: teamCii(members.valid, input.unit.teams, input.snapshot),
    teamO5: teamO5(members.valid, input.unit.teams, input.snapshot),
  };

  const rows = managerRows(input.ratings, input.unit.roleFamilies, input.snapshot);
  const typeC = {
    leadership: scoreLeadership(
      input.responses?.leadershipTeam ?? [],
      input.unit.decisionTypes,
      counts.leadershipTeam,
    ),
    cascade: scoreCascade(members.valid, counts.members),
    informationAccess: scoreInformationAccess(members.valid, counts.members),
    processFriction: scoreProcessFriction(members.valid, input.unit.processes),
    c1: scoreC1(rows, input.unit.roleFamilies, input.snapshot, counts.managers),
    c3: scoreC3(rows),
    c5: scoreC5(input.responses?.teamLeaders ?? [], counts.teamLeaders),
  };

  return { headcounts: counts, screening: { members }, typeA, typeC };
}
