/**
 * Validity and display thresholds per instrument and cadence (Online Measurement Specification
 * Part 3 and Part 7; Cadence Master 7.4). A survey block reports when its valid respondents
 * reach the higher of the anonymity floor (5; 8 for M2, pay equity and fairness) and the
 * cadence's threshold: 60% response at baseline, annual and event campaigns, 8 valid at the
 * half-yearly check, 12 at the quarterly pulse. Modules and checklists carry their own rules.
 * A block or instrument the campaign did not deploy is "not-deployed", never "insufficient".
 *
 * The workbook rates a block by its first item; a pulse may rotate that item out, so the online
 * count is valid respondents answering any deployed item of the block. The two agree whenever
 * every respondent answers every item.
 */

import { ANONYMITY_FLOOR, THRESHOLDS } from "./constants";
import { ge, isNumber, type Cell } from "./excel";
import { PART_A_BLOCKS } from "./items";
import type { Cadence, InstrumentResult, InstrumentStatus, MemberResponse, TwItem } from "./types";

export type BlockKey = (typeof PART_A_BLOCKS)[number]["key"];

function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** The floor for a block or trip-wire item. */
export function anonymityFloor(key: string): number {
  return key === "M2" || key === "TW-01" || key === "TW-02" || key === "TW1" || key === "TW2"
    ? ANONYMITY_FLOOR.raised
    : ANONYMITY_FLOOR.standard;
}

/** The valid respondents who answered at least one of the items. */
export function respondentsAnswering(
  validRows: readonly MemberResponse[],
  items: readonly string[],
): number {
  let n = 0;
  for (const row of validRows) {
    const answers = row.items as Partial<Record<string, number>>;
    if (items.some((item) => isNumber(answers[item]))) n += 1;
  }
  return n;
}

/** The cadence rule on a survey-derived count and rate, with the floor. */
export function surveyStatus(
  cadence: Cadence,
  validCount: number,
  headcount: number | undefined,
  floor: number,
): { status: InstrumentStatus; responseRate: Cell; reason: string } {
  const responseRate =
    headcount === undefined || headcount === 0 ? undefined : validCount / headcount;
  if (validCount < floor) {
    return {
      status: "insufficient",
      responseRate,
      reason: `${validCount} valid respondents, below the anonymity floor of ${floor}.`,
    };
  }
  if (cadence === "quarterly" || cadence === "half-yearly") {
    const minimum = Math.max(
      floor,
      cadence === "quarterly" ? THRESHOLDS.pulseMinimumValid : THRESHOLDS.halfYearlyMinimumValid,
    );
    if (validCount < minimum) {
      return {
        status: "insufficient",
        responseRate,
        reason: `${validCount} valid respondents, below the ${minimum} required at the ${cadence === "quarterly" ? "quarterly pulse" : "half-yearly check"}.`,
      };
    }
    return { status: "reported", responseRate, reason: `${validCount} valid respondents.` };
  }
  if (responseRate === undefined) {
    return {
      status: "insufficient",
      responseRate,
      reason: "No headcount to rate the response against.",
    };
  }
  if (!ge(responseRate, THRESHOLDS.allMember)) {
    return {
      status: "insufficient",
      responseRate,
      reason: `Response ${percent(responseRate)}, below the 60% required at ${cadence === "event" ? "an event-triggered campaign" : cadence}.`,
    };
  }
  return {
    status: "reported",
    responseRate,
    reason: `Response ${percent(responseRate)}, ${validCount} valid respondents.`,
  };
}

export interface BlockStatus extends InstrumentResult {
  key: BlockKey;
  deployedItems: string[];
}

/** One status per Part A block, on the items the campaign deployed. */
export function blockStatuses(
  cadence: Cadence,
  deployed: ReadonlySet<string>,
  validRows: readonly MemberResponse[],
  headcount: number | undefined,
): BlockStatus[] {
  return PART_A_BLOCKS.map((block) => {
    const deployedItems = block.items.filter((item) => deployed.has(item));
    if (deployedItems.length === 0) {
      return {
        key: block.key,
        deployedItems,
        status: "not-deployed",
        validCount: undefined,
        responseRate: undefined,
        reason: "Not deployed in this campaign.",
      };
    }
    const validCount = respondentsAnswering(validRows, deployedItems);
    const decided = surveyStatus(cadence, validCount, headcount, anonymityFloor(block.key));
    return { key: block.key, deployedItems, validCount, ...decided };
  });
}

/** Each trip-wire item on its own floor, since pay equity and fairness need 8. */
export function tripWireStatuses(
  cadence: Cadence,
  deployed: ReadonlySet<string>,
  validRows: readonly MemberResponse[],
  headcount: number | undefined,
): Record<TwItem, InstrumentResult> {
  const out = {} as Record<TwItem, InstrumentResult>;
  for (const item of ["TW-01", "TW-02", "TW-03"] as const) {
    if (!deployed.has(item)) {
      out[item] = {
        status: "not-deployed",
        validCount: undefined,
        responseRate: undefined,
        reason: "Not deployed in this campaign.",
      };
      continue;
    }
    const validCount = respondentsAnswering(validRows, [item]);
    out[item] = {
      validCount,
      ...surveyStatus(cadence, validCount, headcount, anonymityFloor(item)),
    };
  }
  return out;
}

/** A module scored from a rate against a share threshold, with a minimum count where one applies. */
export function rateStatus(
  deployed: boolean,
  count: number,
  responseRate: Cell,
  threshold: number,
  what: string,
  minimumCount = 0,
): InstrumentResult {
  if (!deployed) {
    return {
      status: "not-deployed",
      validCount: undefined,
      responseRate: undefined,
      reason: "Not deployed in this campaign.",
    };
  }
  if (count < minimumCount) {
    return {
      status: "insufficient",
      validCount: count,
      responseRate,
      reason: `${count} ${what}, below ${minimumCount}.`,
    };
  }
  if (responseRate === undefined) {
    return {
      status: "insufficient",
      validCount: count,
      responseRate,
      reason: `No headcount to rate the ${what} against.`,
    };
  }
  if (!ge(responseRate, threshold)) {
    return {
      status: "insufficient",
      validCount: count,
      responseRate,
      reason: `${percent(responseRate)} of ${what}, below ${percent(threshold)}.`,
    };
  }
  return {
    status: "reported",
    validCount: count,
    responseRate,
    reason: `${percent(responseRate)} of ${what}.`,
  };
}

export function notDeployed(): InstrumentResult {
  return {
    status: "not-deployed",
    validCount: undefined,
    responseRate: undefined,
    reason: "Not deployed in this campaign.",
  };
}

export function insufficient(
  reason: string,
  validCount?: number,
  responseRate?: Cell,
): InstrumentResult {
  return { status: "insufficient", validCount, responseRate, reason };
}

export function reported(
  reason: string,
  validCount?: number,
  responseRate?: Cell,
): InstrumentResult {
  return { status: "reported", validCount, responseRate, reason };
}
