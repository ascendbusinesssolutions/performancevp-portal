/**
 * The methodology footer's intake half (Online Measurement Specification Part 8): the route, the
 * instruments deployed with their response rates, the validity exclusions per screened audience
 * with the speed-check statement, the sub-dimensions marked insufficient with the reason, the
 * adjustments recorded, the C3 source and treatment, the carry-forward list, and the standing
 * statements. Gap flags, trip-wire status and confidence come from the engine's result.
 */

import type { SubDimensionCode } from "@performancevp/engine";

import type { Assembly } from "./assemble";
import { DEDUCTION_NOTE } from "./guard";
import { ROUTE_LABEL, STANDING_STATEMENTS } from "./constants";
import type { Methodology, ScreeningSummary } from "./types";

function speedStatement(audience: string, summary: ScreeningSummary): string {
  if (summary.speedCheckApplied) {
    return `The speed check ran for the ${audience} survey (${summary.received} received; cut-off ${summary.speedCutoffSeconds} seconds).`;
  }
  return summary.received === 0
    ? `No ${audience} survey responses were received.`
    : `The speed check did not run for the ${audience} survey (${summary.received} received; it needs 20 with recorded times).`;
}

export function buildMethodology(assembly: Assembly): Methodology {
  const members = assembly.workbook.screening.members.summary;
  const membersPartB = assembly.workbook.screening.membersPartB?.summary;
  const teamLeaders = assembly.teamLeaderScreening.summary;
  const route =
    assembly.c3Route.source === "formal"
      ? `${ROUTE_LABEL}; C3 from formal performance ratings dated ${assembly.c3Route.ratingDate ?? "unknown"}, ${assembly.c3Route.treatment === "as-declared" ? "client-calibrated (self-declared), used as they stand" : "not accepted as calibrated: top band capped at 15%, confidence capped at Medium"}.`
      : `${ROUTE_LABEL}; C3 from M-C3-MGR.`;

  const instruments = Object.entries(assembly.instruments).map(([instrument, status]) => ({
    instrument,
    deployed: status.status !== "not-deployed",
    responseRate: status.responseRate,
    validCount: status.validCount,
  }));

  const insufficiencies = (
    Object.entries(assembly.subDimensions) as Array<
      [SubDimensionCode, Assembly["subDimensions"][SubDimensionCode]]
    >
  )
    .filter(([, s]) => s.status === "insufficient")
    .map(([subDimension, s]) => ({ subDimension, reason: s.reason }));

  const carriedForward = (
    Object.entries(assembly.subDimensions) as Array<
      [SubDimensionCode, Assembly["subDimensions"][SubDimensionCode]]
    >
  )
    .filter(
      ([, s]) =>
        s.status === "carried-forward" ||
        (s.status === "reported" && s.reason.includes("Carried forward:")),
    )
    .map(([subDimension, s]) => ({ subDimension, measuredAt: s.measuredAt as string }));

  const standingStatements = [
    ...STANDING_STATEMENTS,
    ...(membersPartB === undefined
      ? [speedStatement("member", members)]
      : [speedStatement("Part A member", members), speedStatement("Part B member", membersPartB)]),
    ...(assembly.instruments["M-C5-TL"]?.status === "not-deployed"
      ? []
      : [speedStatement("team-leader", teamLeaders)]),
    "The leadership survey is not screened for response validity.",
    ...(assembly.adjustments.some((a) => !a.applied) ? [DEDUCTION_NOTE] : []),
    ...(assembly.c3Route.confidenceCap === undefined
      ? []
      : [
          "C3 confidence is capped at Medium by the formal-ratings acceptance rule; the engine's band stands until the Tier Assignment cap exists.",
        ]),
  ];

  return {
    route,
    instruments,
    exclusions:
      membersPartB === undefined
        ? { members, teamLeaders }
        : { members, membersPartB, teamLeaders },
    insufficiencies,
    adjustments: assembly.adjustments,
    c3: assembly.c3Route,
    carriedForward,
    standingStatements,
  };
}
