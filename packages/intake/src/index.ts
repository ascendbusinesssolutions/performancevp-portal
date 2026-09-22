/**
 * @performancevp/intake
 *
 * The intake package: turns raw survey rows, identified ratings, administrator checklists and
 * formal performance ratings into a complete engine input plus the aggregates the recommendations
 * rules read and the methodology metadata for the footer. It mirrors the Survey Processing and
 * Scoring Workbook for every module that workbook scores and implements the online-only rules.
 *
 * Authority: the Online Measurement Specification, the Survey Processing Workbook Spec and the
 * Tier 3 Module Library in docs/source-ip/; the Northwind worked example in docs/benchmarks/.
 * Depends on the engine's input types only (PORTAL_BUILD_PLAN.md 1.3). Pure: no IO, no clock.
 */

import { buildAggregates } from "./aggregates";
import { assemble, type Assembly } from "./assemble";
import { buildMethodology } from "./methodology";
import type { IntakeInput, IntakeResult, TeamResult } from "./types";

export * from "./types";
export * as constants from "./constants";
export { assemble, type Assembly, type SubDimensionStatus } from "./assemble";
export {
  screenResponses,
  screenRow,
  speedCutoff,
  type RowScreen,
  type ScreenedRows,
} from "./screening";
export { runSurveyWorkbook, type SurveyWorkbookResult } from "./workbook";
export { itemMeans, blockRates } from "./means";
export { teamCii, teamO5 } from "./teams";
export { applyTeamRules, weightedItemMeans } from "./team-rules";
export { scoreLeadership } from "./modules/lt";
export { scoreCascade, scoreInformationAccess, scoreProcessFriction } from "./modules/component";
export { managerRows, scoreC1 } from "./modules/c1-mgr";
export { scoreC2 } from "./modules/c2-mgr";
export { scoreC3 } from "./modules/c3-mgr";
export { scoreC5, leaderScore } from "./modules/c5-tl";
export { scoreAdmO1, scoreAdmO2, scoreAdmO4 } from "./checklists";
export { ratingDeduction, highRatingShare, c3Adjustments } from "./guard";
export { evaluateFormalRatings, selectC3Route, isCurrent } from "./c3-route";
export { medianTenureMonths } from "./tenure";
export { scoreS1, gini } from "./s1";
export { blockStatuses, tripWireStatuses, surveyStatus } from "./thresholds";
export { buildAggregates } from "./aggregates";
export { buildMethodology } from "./methodology";
export { headcounts, unitFte, teamFte, roleFamilyFte } from "./directory";

/** Recorded on every stored calculation run as intake_version. 1.0.0: the Milestone 2 exit criteria met on 22 September 2026. */
export const INTAKE_VERSION = "1.0.0";

/** The intake end to end for one unit and one campaign. */
export function assembleUnit(input: IntakeInput): IntakeResult {
  const assembly = assemble(input);
  return resultFrom(input, assembly);
}

export function resultFrom(input: IntakeInput, assembly: Assembly): IntakeResult {
  const teams: TeamResult[] = assembly.teams.statuses.map((status) => {
    const cii = assembly.workbook.typeA.teamCii.find((t) => t.teamId === status.teamId);
    const aggregate = assembly.teams.o5Teams.find((t) => t.name === status.name);
    return {
      teamId: status.teamId,
      name: status.name,
      fte: status.fte,
      validCount: status.validCount,
      responseRate: status.responseRate,
      valid: status.valid,
      ciiItems: cii?.means ?? {},
      m1: undefined,
      m2: undefined,
      o5: aggregate?.score,
    };
  });
  const aggregates = buildAggregates(input, assembly);
  for (const team of teams) {
    const row = aggregates.teams.find((t) => t.teamId === team.teamId);
    if (row !== undefined) {
      team.m1 = row.m1;
      team.m2 = row.m2;
    }
  }
  const methodology = buildMethodology(assembly);
  return {
    engineInput: assembly.engineInput,
    screening: {
      members: assembly.workbook.screening.members.summary,
      teamLeaders: assembly.teamLeaderScreening.summary,
    },
    instruments: assembly.instruments,
    teams,
    aggregates,
    adjustments: assembly.adjustments,
    c3Route: assembly.c3Route,
    insufficiencies: methodology.insufficiencies,
    methodology,
    intakeVersion: INTAKE_VERSION,
  };
}
