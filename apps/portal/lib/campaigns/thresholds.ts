import { constants } from "@performancevp/intake";

import { type CampaignCadence, INTAKE_CADENCE } from "./cadence";

/**
 * The thresholds the close will apply, for the launch preview and monitoring (Milestone 5 plan,
 * 5.1). Every figure comes from the intake's own constants, so what is shown is what is scored:
 * Part A and Part B need 60% of headcount at baseline, annual and event campaigns (D10 for Part B),
 * 8 valid at the half-yearly and 12 at the pulse, never below the anonymity floor of 5; the raised
 * floor of 8 for psychological safety, pay equity and fairness binds only in small units. Team
 * leaders need 70%; the leadership team 75% and at least 3; managers 70% completing.
 */

const { THRESHOLDS, ANONYMITY_FLOOR } = constants;

export type MonitoredAudience =
  "members_part_a" | "members_part_b" | "team_leaders" | "leadership_team" | "managers";

export interface Threshold {
  /** The share of the audience needed, where the rule is a rate. */
  rate: number | null;
  /** The fewest responses that meet it, given the audience's size. */
  needed: number;
  /** Where the raised floor of 8 asks for more than `needed` (Part A only). */
  raisedNeeded: number | null;
}

/** Excel's comparison, as the intake applies it: equal to 15 significant digits. */
function atLeast(a: number, b: number): boolean {
  return Number(a.toPrecision(15)) >= Number(b.toPrecision(15));
}

/** The fewest of `size` that reach `rate`, never below `minimum`. */
function neededFor(rate: number, size: number, minimum: number): number {
  let n = 0;
  while (n < size && !atLeast(n / size, rate)) n += 1;
  return Math.max(n, minimum);
}

export function thresholdFor(
  cadence: CampaignCadence,
  audience: MonitoredAudience,
  size: number,
): Threshold {
  const intake = INTAKE_CADENCE[cadence];
  switch (audience) {
    case "members_part_a":
    case "members_part_b": {
      if (intake === "quarterly" || intake === "half-yearly") {
        const minimum =
          intake === "quarterly" ? THRESHOLDS.pulseMinimumValid : THRESHOLDS.halfYearlyMinimumValid;
        const needed = Math.max(minimum, ANONYMITY_FLOOR.standard);
        const raised = Math.max(minimum, ANONYMITY_FLOOR.raised);
        return {
          rate: null,
          needed,
          raisedNeeded: audience === "members_part_a" && raised > needed ? raised : null,
        };
      }
      const needed = neededFor(THRESHOLDS.allMember, size, ANONYMITY_FLOOR.standard);
      const raised = neededFor(THRESHOLDS.allMember, size, ANONYMITY_FLOOR.raised);
      return {
        rate: THRESHOLDS.allMember,
        needed,
        raisedNeeded: audience === "members_part_a" && raised > needed ? raised : null,
      };
    }
    case "team_leaders":
      return {
        rate: THRESHOLDS.teamLeaders,
        needed: neededFor(THRESHOLDS.teamLeaders, size, 1),
        raisedNeeded: null,
      };
    case "leadership_team":
      return {
        rate: THRESHOLDS.leadership,
        needed: neededFor(THRESHOLDS.leadership, size, THRESHOLDS.leadershipMinimumRespondents),
        raisedNeeded: null,
      };
    case "managers":
      return {
        rate: THRESHOLDS.managers,
        needed: neededFor(THRESHOLDS.managers, size, 1),
        raisedNeeded: null,
      };
  }
}
