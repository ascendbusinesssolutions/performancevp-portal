/**
 * Every constant the intake package uses, annotated with its source. Thresholds and adjustment
 * parameters are read from the Survey Processing Workbook's Reference tab (B5:B20) and the Online
 * Measurement Specification. Where a value must agree with the engine's (the reverse-scoring map,
 * the conversion, the C3 band order), the intake holds its own copy, as both workbooks do, and a
 * test asserts equality with the engine's.
 */

import type { CiiItem, Mi1Item, Tsi3Item } from "@performancevp/engine";

import {
  C5L_ITEMS,
  O1C_ITEMS,
  O2I_ITEMS,
  O3P_ITEMS,
  OI5_ITEMS,
  TW_ITEMS,
  type O2iItem,
  type SurveyItem,
} from "./types";

// ---------------------------------------------------------------------------------------------
// Conversion and reverse scoring (Survey Processing Workbook Reference A23; Survey Blueprint 7.1)
// ---------------------------------------------------------------------------------------------

/** (mean − 1) × 25, the house convention. Survey Blueprint 7.2; Survey Processing Workbook Spec Part 10, note 5. */
export const CONVERSION = { offset: 1, scale: 25 } as const;
export const REVERSE_BASE = 6;

/** Main-survey reverse items (Reference A23) plus the module items the Type C sheet flips (Workbook Spec Part 9). */
export const REVERSE_SCORED_ITEMS: ReadonlySet<SurveyItem> = new Set<SurveyItem>([
  "CII-05",
  "CII-10",
  "CII-15",
  "MI1-04",
  "MI2-05",
  "MI3-04",
  "MI4-04",
  "OI1-03",
  "OI1-06",
  "OI2-04",
  "OI3-05",
  "OI4-03",
  "TSI2-03",
  "TSI3-04",
  "TSI3-05",
  "O1C-05",
  "O2I-03",
  "O2I-04",
  "O2I-06",
  "O3P-04",
]);

// ---------------------------------------------------------------------------------------------
// Reporting thresholds (Reference B5:B13; Cadence Master 7.4; Online Measurement Specification Part 7)
// ---------------------------------------------------------------------------------------------

export const THRESHOLDS = {
  /** All-member response rate at baseline and annual. Reference B5. */
  allMember: 0.6,
  /** Leadership-team response rate. Reference B6; Module Library 3.1. */
  leadership: 0.75,
  /** Leadership-team minimum respondents for an agreement score. Online Measurement Specification 3.3. */
  leadershipMinimumRespondents: 3,
  /** Manager completion. Reference B7; Module Library 4.1. */
  managers: 0.7,
  /** C1 ratings must cover this share of unit FTE. Online Measurement Specification 3.1. */
  c1FteCoverage: 0.7,
  /** Team-leader completion. Reference B8; Module Library 5.1. */
  teamLeaders: 0.7,
  /** CII and O5 per team: response rate and minimum valid respondents. Reference B10, B11. */
  teamRate: 0.7,
  teamMinimumValid: 4,
  /** The unit needs this share of its teams valid. Online Measurement Specification 3.1 and 3.3. */
  teamsValidShare: 0.75,
  /** Valid respondents per unit at the quarterly pulse and the half-yearly check. Reference B12, B13. */
  pulseMinimumValid: 12,
  halfYearlyMinimumValid: 8,
  /** C2: at least one criticality-3 domain at this coverage. Measurement Reference 2.2. */
  c2CriticalDomainCoverage: 0.6,
  /** C3: rated FTE over in-scope FTE. Module Library 4.2; Online Measurement Specification 3.1. */
  c3FteRated: 0.8,
  /** S1: skills data for this share of FTE. Measurement Reference 5.1. */
  s1FteCoverage: 0.75,
} as const;

/** Anonymity floor: 5, raised to 8 for M2, pay equity and fairness. CLAUDE.md Section 4; DECISIONS.md 2.2. */
export const ANONYMITY_FLOOR = { standard: 5, raised: 8 } as const;
export const RAISED_FLOOR_ITEMS: ReadonlySet<string> = new Set(["M2", "TW1", "TW2"]);

// ---------------------------------------------------------------------------------------------
// Screening (Survey Processing Workbook 7 Screening; Online Measurement Specification Part 7)
// ---------------------------------------------------------------------------------------------

/** Straight-lining: the row's forward mean and reverse mean both at or above this, or both at or below the low value. Screening H. */
export const STRAIGHT_LINING = { high: 4, low: 2 } as const;
/** Speed check: below the 5th percentile, nearest rank, only with at least 20 received. Online Measurement Specification Part 7. */
export const SPEED_CHECK = { percentile: 0.05, minimumReceived: 20 } as const;

// ---------------------------------------------------------------------------------------------
// Module parameters
// ---------------------------------------------------------------------------------------------

/** C1: a skill counts as covered at or above this rating. Reference B20; Setup B27. Module Library 4.1. */
export const C1_PROFICIENCY_THRESHOLD = 3;
/** M-O1-LT: 0.60 agreement, 0.40 clarity. Type C Scoring B38; Module Library 3.1. */
export const LT_WEIGHTS = { agreement: 0.6, clarity: 0.4 } as const;

/** C3 statistical adjustment. Reference B16:B19; Module Library 4.2; Online Measurement Specification 4.4. */
export const C3_ADJUSTMENT = {
  band5CapShare: 0.25,
  skewMeanTrigger: 3.5,
  skewShift: 0.2,
  band1FloorShare: 0.05,
} as const;
export const C3_BANDS = [1, 2, 3, 4, 5] as const;

/** The inflation guard for C1 and C2. Online Measurement Specification 4.4. */
export const INFLATION_GUARD = {
  highShareTrigger: 0.5,
  highRatingFrom: 4,
  deductionPoints: 7.5,
} as const;

/** Formal ratings as the C3 input. Online Measurement Specification 6.4; Measurement Reference 2.3. */
export const FORMAL_RATINGS = {
  currencyMonths: 12,
  coverageShare: 0.8,
  calibratedTopBandMax: 0.25,
  calibratedBottomBandMin: 0.05,
  uncalibratedTopBandCap: 0.15,
  confidenceCap: "Medium",
} as const;

/** ADM-O2 response values. Online Measurement Specification 4.3. */
export const ADM_O2 = {
  ti3: { yes: 1, partly: 0.5, no: 0 },
  int1: { automated: 100, scheduled: 60, manual: 20, "not-connected": 0 },
} as const;

/**
 * ADM-O4 bands. Online Measurement Specification 4.3a. Each band is [upper bound inclusive, score];
 * a value exactly on a boundary takes the higher-scoring band, which the inclusive bound encodes.
 */
export const ADM_O4 = {
  minimumFacts: 3,
  /** CF-1: utilisation, percent. 80 to 95 = 100; 95 to 105 or 70 to 80 = 75; 105 to 115 or 60 to 70 = 55; else 25. */
  utilisation: (v: number): number => {
    if (v >= 80 && v <= 95) return 100;
    if ((v >= 70 && v < 80) || (v > 95 && v <= 105)) return 75;
    if ((v >= 60 && v < 70) || (v > 105 && v <= 115)) return 55;
    return 25;
  },
  /** CF-2: hours above standard. Up to 1 = 100; 1 to 2 = 85; 2 to 4 = 65; 4 to 6 = 45; above 6 = 20. */
  overtime: (v: number): number => (v <= 1 ? 100 : v <= 2 ? 85 : v <= 4 ? 65 : v <= 6 ? 45 : 20),
  /** CF-3: absence above baseline, percent. At or below 0 = 100; up to 10 = 75; 10 to 25 = 55; above = 25. */
  absence: (v: number): number => (v <= 0 ? 100 : v <= 10 ? 75 : v <= 25 ? 55 : 25),
  /** CF-4: backlog change, percent. Within 5 = 100; 5 to 25 = 55; above 25 = 25. */
  backlog: (v: number): number => (v <= 5 ? 100 : v <= 25 ? 55 : 25),
  /** CF-5: vacancy rate, percent. Up to 3 = 100; 3 to 6 = 85; 6 to 10 = 65; 10 to 15 = 45; above = 20. */
  vacancy: (v: number): number => (v <= 3 ? 100 : v <= 6 ? 85 : v <= 10 ? 65 : v <= 15 ? 45 : 20),
} as const;

/** S1 depth target: ceiling(FTE / 10), minimum 2. Measurement Reference 5.1. */
export const S1_DEPTH = { perFte: 10, minimum: 2 } as const;

// ---------------------------------------------------------------------------------------------
// Item groups
// ---------------------------------------------------------------------------------------------

export const CII_GROUPS = {
  clarity: ["CII-01", "CII-02", "CII-03", "CII-04", "CII-05"],
  trust: ["CII-06", "CII-07", "CII-08", "CII-09", "CII-10"],
  flow: ["CII-11", "CII-12", "CII-13", "CII-14", "CII-15"],
} as const satisfies Record<string, readonly CiiItem[]>;

/** Online Recommendations Specification 9.2 item groups. */
export const MI1_GROUPS = {
  engagement: ["MI1-01", "MI1-02", "MI1-03", "MI1-04"],
  teamConfidence: ["MI1-05", "MI1-06"],
  pride: ["MI1-07", "MI1-08"],
} as const satisfies Record<string, readonly Mi1Item[]>;
export const TSI3_GROUPS = {
  task: ["TSI3-01", "TSI3-02", "TSI3-03"],
  relationship: ["TSI3-04", "TSI3-05"],
} as const satisfies Record<string, readonly Tsi3Item[]>;
export const O2I_GROUPS = {
  access: ["O2I-01", "O2I-02", "O2I-03"],
  use: ["O2I-04", "O2I-05", "O2I-06"],
} as const satisfies Record<string, readonly O2iItem[]>;

export { TW_ITEMS, OI5_ITEMS, O1C_ITEMS, O2I_ITEMS, O3P_ITEMS, C5L_ITEMS };

/** The trip-wire item codes against the engine's trip-wire keys. */
export const TW_TO_ENGINE = { "TW-01": "TW1", "TW-02": "TW2", "TW-03": "TW3" } as const;

/** Methodology footer standing statements. Online Measurement Specification Part 8. */
export const ROUTE_LABEL = "Online, self-administered, Tier 3 instruments";
export const STANDING_STATEMENTS = [
  "Manager ratings and structural checklists are self-reported and not independently validated.",
  "Decision latency is not measured on the online route; it is measured in the consultant-led Diagnostic.",
] as const;
