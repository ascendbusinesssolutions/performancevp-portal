/**
 * The Survey Processing and Scoring Workbook, sheet by sheet, as one function over the intake
 * input. Every intermediate the workbook holds in a cell is on the result, so the parity cell map
 * can read it. The online-only rules are not here; assemble.ts applies them on top.
 */

import { headcounts, type Headcounts } from "./directory";
import { screenResponses, type ScreenedRows } from "./screening";
import type { IntakeInput, MemberResponse, TeamLeaderResponse } from "./types";

export interface SurveyWorkbookResult {
  headcounts: Headcounts;
  /** 7 Screening. */
  screening: {
    members: ScreenedRows<MemberResponse>;
    teamLeaders: ScreenedRows<TeamLeaderResponse>;
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
  return { headcounts: counts, screening: { members, teamLeaders } };
}
