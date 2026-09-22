/**
 * Every constant the engine uses, in one place, each annotated with the workbook cell it was read
 * from and the source document section that defines it. Nothing is duplicated inline elsewhere.
 *
 * Values were read from the production Diagnostic Workbook of 21 September 2026
 * (docs/benchmarks/PerformanceVP-Diagnostic-Workbook.xlsx) and checked against the cited sections.
 * Where the workbook and a document disagree, the workbook is the calculation truth
 * (DECISIONS.md 2.1) and the disagreement is noted here and flagged for the source-document pass.
 */

import type {
  Archetype,
  ComponentKey,
  ComponentName,
  DecisionClass,
  ItemCode,
  RankedCode,
  RouteRow,
  SubDimensionCode,
  TripWireCode,
} from "./types";

// ---------------------------------------------------------------------------------------------
// The equation
// ---------------------------------------------------------------------------------------------

/** Component exponents α, β, γ. Ref B4:B6. Strategy Part 1 (line 49 to 55); Workbook Spec Part 9. */
export const EXPONENTS = { C: 0.35, M: 0.4, O: 0.25 } as const;

/** S = MAX(floor, MIN(floor + range, floor + S_internal/100 × range)). Ref B7:B8. Measurement Reference 5.4 and 9.3. */
export const SYNERGY_FLOOR = 0.85;
export const SYNERGY_RANGE = 0.3;

/** Composite Scoring B30: S_internal when no Synergy sub-dimension is available. Measurement Reference 5.4 (neutral = 50). */
export const SYNERGY_INTERNAL_DEFAULT = 50;

// ---------------------------------------------------------------------------------------------
// Binding-constraint ranking
// ---------------------------------------------------------------------------------------------

/** S_cap, ρ, τ. Ref E4:E6. Workbook Spec Parts 9 and 10; DECISIONS.md 1.2. Evidence-informed defaults. */
export const RANKING = { sCap: 85, rho: 0.3, tau: 8 } as const;

/** The workbook row of each ranked sub-dimension in Composite Scoring H5:S18, used by the tiebreak `R − ROW()/1000000`. */
export const RANKING_ROW: Record<RankedCode, number> = {
  C1: 5,
  C2: 6,
  C3: 7,
  C4: 8,
  C5: 9,
  M1: 10,
  M2: 11,
  M3: 12,
  M4: 13,
  O1: 14,
  O2: 15,
  O3: 16,
  O4: 17,
  O5: 18,
};

/** Composite Scoring S: the divisor of the row fraction. */
export const TIEBREAK_DIVISOR = 1_000_000;

/** Composite Scoring J5:J18 and Tier Assignment A22:A24. The labels the statement string uses, verbatim. */
export const SUB_DIMENSION_LABELS: Record<SubDimensionCode, string> = {
  C1: "C1 - Skill",
  C2: "C2 - Knowledge",
  C3: "C3 - Talent density",
  C4: "C4 - Collective intelligence",
  C5: "C5 - Learning velocity",
  M1: "M1 - Engagement & confidence",
  M2: "M2 - Psychological safety",
  M3: "M3 - Autonomous motivation",
  M4: "M4 - Purpose alignment",
  O1: "O1 - Clarity & decision rights",
  O2: "O2 - Tools & information",
  O3: "O3 - Process & workflow",
  O4: "O4 - Resource adequacy",
  O5: "O5 - Leadership enablement",
  S1: "S1 - Skill complementarity",
  S2: "S2 - Collaboration friction",
  S3: "S3 - Conflict health",
};

export const COMPONENT_OF: Record<SubDimensionCode, ComponentKey> = {
  C1: "C",
  C2: "C",
  C3: "C",
  C4: "C",
  C5: "C",
  M1: "M",
  M2: "M",
  M3: "M",
  M4: "M",
  O1: "O",
  O2: "O",
  O3: "O",
  O4: "O",
  O5: "O",
  S1: "S",
  S2: "S",
  S3: "S",
};

/** Composite Scoring H5:H18 and B44. */
export const COMPONENT_NAMES: Record<"C" | "M" | "O", ComponentName> = {
  C: "Capability",
  M: "Motivation",
  O: "Opportunity",
};

/** Composite Scoring B45: the two fixed fragments of the binding-constraint statement. */
export const STATEMENT_LEAD =
  " is the binding constraint, the highest-priority place a realistic improvement would lift P";
export const STATEMENT_TAIL = " is the lowest-scoring force";

/** Composite Scoring B46. */
export const TRIP_WIRE_OVERRIDE_NOTE =
  "CRITICAL trip-wire finding present - takes priority regardless of P";

/** Composite Scoring B49, B50: validation strings and the typical P range. Workbook Spec Part 10 range checks. */
export const VALIDATION = {
  ok: "OK",
  sOutOfRange: "OUT OF RANGE",
  pOutsideTypical: "outside typical - cross-check",
  pTypicalMin: 45,
  pTypicalMax: 80,
} as const;

// ---------------------------------------------------------------------------------------------
// Weights by archetype
// ---------------------------------------------------------------------------------------------

/**
 * Within-component weights. Ref C15:H31 (columns C to H are the six archetypes in ARCHETYPES order).
 * Cadence Master Part 1.2 and Parts 2 to 5 for the Default set; Workbook Spec Part 9.
 * Only Default is enabled (DECISIONS.md Section 3): the other five do not sum to 1 per component
 * and wait for rebalancing at source. They are held here so the table can be checked against Ref.
 */
export const ARCHETYPE_WEIGHTS: Record<
  Archetype,
  { enabled: boolean; weights: Record<SubDimensionCode, number> }
> = {
  Default: {
    enabled: true,
    weights: {
      C1: 0.35,
      C2: 0.15,
      C3: 0.2,
      C4: 0.2,
      C5: 0.1,
      M1: 0.5,
      M2: 0.2,
      M3: 0.15,
      M4: 0.15,
      O1: 0.3,
      O2: 0.25,
      O3: 0.2,
      O4: 0.1,
      O5: 0.15,
      S1: 0.3,
      S2: 0.4,
      S3: 0.3,
    },
  },
  "Knowledge-intensive": {
    enabled: false,
    weights: {
      C1: 0.4,
      C2: 0.15,
      C3: 0.25,
      C4: 0.25,
      C5: 0.15,
      M1: 0.45,
      M2: 0.25,
      M3: 0.2,
      M4: 0.15,
      O1: 0.3,
      O2: 0.3,
      O3: 0.15,
      O4: 0.1,
      O5: 0.15,
      S1: 0.35,
      S2: 0.45,
      S3: 0.35,
    },
  },
  "Operations-heavy": {
    enabled: false,
    weights: {
      C1: 0.35,
      C2: 0.1,
      C3: 0.15,
      C4: 0.15,
      C5: 0.05,
      M1: 0.55,
      M2: 0.15,
      M3: 0.1,
      M4: 0.1,
      O1: 0.25,
      O2: 0.25,
      O3: 0.3,
      O4: 0.15,
      O5: 0.15,
      S1: 0.25,
      S2: 0.35,
      S3: 0.25,
    },
  },
  "Customer-facing service": {
    enabled: false,
    weights: {
      C1: 0.35,
      C2: 0.2,
      C3: 0.2,
      C4: 0.2,
      C5: 0.1,
      M1: 0.55,
      M2: 0.2,
      M3: 0.15,
      M4: 0.15,
      O1: 0.35,
      O2: 0.25,
      O3: 0.2,
      O4: 0.15,
      O5: 0.2,
      S1: 0.3,
      S2: 0.4,
      S3: 0.3,
    },
  },
  "Public sector / regulated": {
    enabled: false,
    weights: {
      C1: 0.3,
      C2: 0.25,
      C3: 0.15,
      C4: 0.2,
      C5: 0.05,
      M1: 0.5,
      M2: 0.2,
      M3: 0.2,
      M4: 0.2,
      O1: 0.3,
      O2: 0.2,
      O3: 0.25,
      O4: 0.1,
      O5: 0.15,
      S1: 0.3,
      S2: 0.35,
      S3: 0.3,
    },
  },
  Healthcare: {
    enabled: false,
    weights: {
      C1: 0.35,
      C2: 0.25,
      C3: 0.2,
      C4: 0.25,
      C5: 0.1,
      M1: 0.5,
      M2: 0.3,
      M3: 0.2,
      M4: 0.25,
      O1: 0.3,
      O2: 0.3,
      O3: 0.25,
      O4: 0.15,
      O5: 0.15,
      S1: 0.3,
      S2: 0.4,
      S3: 0.3,
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Survey conversion
// ---------------------------------------------------------------------------------------------

/** Items the workbook flips with 6 − mean. Ref A64; Workbook Spec Part 9; Survey Blueprint item tables. */
export const REVERSE_SCORED_ITEMS: ReadonlySet<ItemCode> = new Set<ItemCode>([
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
]);

/** score = (adjusted mean − 1) × 25. Workbook Spec 1.5 and Part 15 note 4; Survey Blueprint Part 7; Measurement Reference 1.3. */
export const CONVERSION = { offset: 1, scale: 25 } as const;

/** Reverse scoring: adjusted = 6 − mean. Workbook Spec Part 15 note 3. */
export const REVERSE_BASE = 6;

// ---------------------------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------------------------

/** C1 tenure moderator. Capability Inputs D11. Measurement Reference 2.1 (lines 215 to 219). */
export const C1_TENURE = {
  juniorBelowMonths: 18,
  juniorFactor: 0.95,
  experiencedAboveMonths: 96,
  experiencedFactor: 1.05,
  neutralFactor: 1,
} as const;

/** C2 critical-domain coverage check. Capability Inputs D23. Measurement Reference 2.2. */
export const C2_COVERAGE_CHECK = { criticality: 3, minimumCoverage: 0.6 } as const;
export const C2_COVERAGE_TEXT = { ok: "OK", insufficient: "INSUFFICIENT COVERAGE" } as const;

/** C3 band weights, band 5 to band 1. Capability Inputs C28:C32. Measurement Reference 2.3. */
export const C3_BAND_WEIGHTS = { band5: 100, band4: 80, band3: 60, band2: 35, band1: 0 } as const;

/** C4 CII sub-construct weights (Clarity, Trust, Flow). Capability Inputs D56. Measurement Reference 2.4. */
export const C4_WEIGHTS = { clarity: 0.35, trust: 0.35, flow: 0.3 } as const;
/** CII item groups, in sheet order. Capability Inputs B53:B55. */
export const CII_GROUPS = {
  clarity: ["CII-01", "CII-02", "CII-03", "CII-04", "CII-05"],
  trust: ["CII-06", "CII-07", "CII-08", "CII-09", "CII-10"],
  flow: ["CII-11", "CII-12", "CII-13", "CII-14", "CII-15"],
} as const;

/** C5 blend of indicators and module when both exist. Capability Inputs D63. Measurement Reference 2.5. */
export const C5_BLEND = { indicators: 0.6, module: 0.4 } as const;

// ---------------------------------------------------------------------------------------------
// Motivation and trip-wires
// ---------------------------------------------------------------------------------------------

/** Trip-wire critical threshold: score below 60. Motivation Inputs D52:D54. Measurement Reference 8.4; Strategy 3.3.1. */
export const TRIP_WIRE_THRESHOLD = 60;
export const TRIP_WIRE_FLAG = "CRITICAL FINDING";

export const TRIP_WIRE_NAMES: Record<TripWireCode, string> = {
  TW1: "Pay equity",
  TW2: "Fairness",
  TW3: "Basic conditions",
};

// ---------------------------------------------------------------------------------------------
// Opportunity
// ---------------------------------------------------------------------------------------------

/** O1 structural layer: 0.40 M-O1-LT + 0.30 role architecture + 0.30 M-O1-CASCADE. Opportunity Inputs D8. Measurement Reference 4.1. */
export const O1_STRUCTURAL_WEIGHTS = {
  decisionRights: 0.4,
  roleArchitecture: 0.3,
  cascade: 0.3,
} as const;
/** O2 structural layer: 0.35 tool inventory + 0.40 M-O2-IA + 0.25 integration. Opportunity Inputs D29. Measurement Reference 4.2. */
export const O2_STRUCTURAL_WEIGHTS = {
  toolInventory: 0.35,
  informationAccess: 0.4,
  integration: 0.25,
} as const;

/** Audit-perception gap rule: |gap| above 15 fires the flag and the perception score feeds the composite. Opportunity Inputs D22, D23 and peers. Measurement Reference 8.1; Workbook Spec 1.4 and 6.6; DECISIONS.md 1.1. */
export const GAP_THRESHOLD = 15;
export const O_GAP_FLAG = "GAP - report separately";

/** O4: capacity analysis and perception blended equally. Opportunity Inputs D67. Measurement Reference 4.4; Workbook Spec 6.4. */
export const O4_BLEND = 0.5;

// ---------------------------------------------------------------------------------------------
// Synergy
// ---------------------------------------------------------------------------------------------

/** S1 = 0.40 breadth + 0.35 depth + 0.25 distribution. Synergy Inputs D8. Measurement Reference 5.1. */
export const S1_WEIGHTS = { breadth: 0.4, depth: 0.35, distribution: 0.25 } as const;

/** S2 telemetry bands. Synergy Inputs C12:C15. Measurement Reference 5.2. Each band is [upper bound exclusive, score]; the last entry is the floor. */
export const S2_TELEMETRY_BANDS = {
  meetingHoursPerIc: [
    [15, 100],
    [20, 80],
    [25, 60],
    [30, 40],
  ] as const,
  meetingHoursPerIcFloor: 20,
  meetingHoursPerManager: [
    [25, 100],
    [35, 75],
    [45, 50],
  ] as const,
  meetingHoursPerManagerFloor: 25,
  fragmentedTimeRatio: [
    [0.5, 100],
    [0.65, 75],
    [0.8, 50],
  ] as const,
  fragmentedTimeRatioFloor: 25,
  afterHoursHours: [
    [2, 100],
    [5, 75],
    [10, 50],
  ] as const,
  afterHoursHoursFloor: 25,
} as const;

/** S2 = 0.5 telemetry composite + 0.5 perception where both exist. Synergy Inputs D26. Measurement Reference 5.2. */
export const S2_BLEND = 0.5;
/** Synergy Inputs D25. Measurement Reference 8.2 applied to S2. */
export const S2_GAP_FLAG = "GAP - diagnostic finding";

/** False consensus: TSI3-01 and TSI3-02 converted below 60 and M2 above 75. Synergy Inputs D37. Measurement Reference 8.3. */
export const FALSE_CONSENSUS = { taskConflictBelow: 60, safetyAbove: 75 } as const;
export const FALSE_CONSENSUS_FLAG = "FALSE CONSENSUS - suppressed disagreement";

// ---------------------------------------------------------------------------------------------
// Behavioural triangulators
// ---------------------------------------------------------------------------------------------

/** Behavioural Triangulators C11. Measurement Reference 8.2. */
export const M1_GAP_FLAG = "GAP - key finding";

// ---------------------------------------------------------------------------------------------
// Decision Latency Protocol
// ---------------------------------------------------------------------------------------------

/** Class weights for the overall DLS. Ref B9:B11. Measurement Reference 6.5. */
export const DLP_CLASS_WEIGHTS: Record<DecisionClass, number> = {
  Operational: 0.4,
  Tactical: 0.35,
  Strategic: 0.25,
};

/** Class norm percentiles in days (p25, p50, p75, p90). Ref B35:E37. Measurement Reference 6.5 and 6.7; a seeded reference set. */
export const DLP_NORMS: Record<DecisionClass, readonly [number, number, number, number]> = {
  Operational: [1, 3, 7, 14],
  Tactical: [5, 12, 22, 35],
  Strategic: [30, 60, 100, 150],
};

/** Minimum decisions per class. DLP E49:E51. Measurement Reference 6.3. */
export const DLP_MINIMUM_SAMPLE: Record<DecisionClass, number> = {
  Operational: 10,
  Tactical: 5,
  Strategic: 3,
};

/** Methodology Footer C24: overall DLS below 50 is a critical finding. */
export const DLS_CRITICAL_THRESHOLD = 50;

/** DLP rows 5 to 47. The workbook's capacity; the fixture generator refuses more. */
export const DLP_ROW_CAPACITY = 43;

// ---------------------------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------------------------

/**
 * Confidence decay thresholds in complete months since vintage: High when at or below the first,
 * Medium when at or below the second, otherwise Low. Ref B41:C61; Tier Assignment E.
 * Cadence Master Part 7 and each sub-dimension's decay rule. Where the Cadence Master narrative
 * differs from Ref, the engine mirrors Ref and the difference is noted for the source-document pass:
 * C5 (Ref 2/6; Cadence Master: stale after a 60-day feed lapse), O4 (Ref 6/8; Cadence Master: survey
 * 6 months, capacity data 1 month), DLP (Ref 3/6 for all classes; Cadence Master 3/6/12 by class),
 * and the Cadence Master's third "Low at N months" step, which Ref does not carry.
 */
export const CONFIDENCE_THRESHOLDS: Record<RouteRow, { high: number; medium: number }> = {
  C1: { high: 12, medium: 14 },
  C2: { high: 12, medium: 14 },
  C3: { high: 12, medium: 15 },
  C4: { high: 6, medium: 8 },
  C5: { high: 2, medium: 6 },
  M1: { high: 3, medium: 4 },
  M2: { high: 3, medium: 4 },
  M3: { high: 12, medium: 14 },
  M4: { high: 12, medium: 14 },
  TW1: { high: 3, medium: 4 },
  TW2: { high: 3, medium: 4 },
  TW3: { high: 3, medium: 4 },
  O1: { high: 6, medium: 8 },
  O2: { high: 6, medium: 8 },
  O3: { high: 6, medium: 8 },
  O4: { high: 6, medium: 8 },
  O5: { high: 3, medium: 4 },
  S1: { high: 12, medium: 14 },
  S2: { high: 3, medium: 4 },
  S3: { high: 6, medium: 8 },
  DLP: { high: 3, medium: 6 },
};

/** Composite Scoring B51 reads these seventeen rows for P confidence: trip-wires and DLP are excluded. */
export const P_CONFIDENCE_ROWS: readonly SubDimensionCode[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "M1",
  "M2",
  "M3",
  "M4",
  "O1",
  "O2",
  "O3",
  "O4",
  "O5",
  "S1",
  "S2",
  "S3",
];

// ---------------------------------------------------------------------------------------------
// Bands, footer and report data
// ---------------------------------------------------------------------------------------------

/** Report Data D: above 75 Green, at least 50 Amber, else Red; Neutral when blank. Strategy 4.6 display rules. */
export const BANDS = { greenAbove: 75, amberAtLeast: 50 } as const;

/** Methodology Footer C13. */
export const TIER_MIX_RATINGS = {
  tier3Dominant: "Tier-3-dominant; methodology disclosed",
  tier1Dominant: "Tier-1 dominant",
  mixed: "Mixed",
} as const;

/** Methodology Footer C17:C22. */
export const GAP_FLAG_NONE = "none";

/** Methodology Footer C24. */
export const CRITICAL_FINDINGS = {
  none: "No critical findings identified",
  breached: (name: string) => `${name} trip-wire breached; `,
  notMeasured: (name: string) => `${name} trip-wire not measured; `,
  decisionLatency: "Decision latency critical (overall DLS below 50); ",
} as const;

/** Methodology Footer C25 and Sector Classification C14. */
export const INTERNAL_COMPARISON_TEXT = "No comparison applied - set not yet large enough";

/** Methodology Footer C41. */
export const EXCLUSIONS = {
  none: "No sub-dimensions suppressed; full weight set applied; no responses excluded beyond validity screening",
  some: (count: number) =>
    `Sub-dimensions suppressed for insufficient data: ${count} (weights reallocated proportionally; see Tier Assignment)`,
} as const;

/** Methodology Footer C43. */
export const NON_STANDARD_NONE = "None recorded";

/** Tier Assignment B5:B24: the twenty rows the tier-mix counts cover (DLP excluded). */
export const TIER_MIX_ROWS: readonly RouteRow[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "M1",
  "M2",
  "M3",
  "M4",
  "TW1",
  "TW2",
  "TW3",
  "O1",
  "O2",
  "O3",
  "O4",
  "O5",
  "S1",
  "S2",
  "S3",
];
