/**
 * Types for the engine's input and result.
 *
 * Inputs mirror the workbook's input cells: an empty cell is an absent (optional) property.
 * Results mirror the workbook's calculated cells: a blank cell is `undefined` on a present key.
 * No score is ever null, NaN or 0 by default (Workbook Spec 1.8; DECISIONS.md 1.4).
 */

export const CAPABILITY_CODES = ["C1", "C2", "C3", "C4", "C5"] as const;
export const MOTIVATION_CODES = ["M1", "M2", "M3", "M4"] as const;
export const OPPORTUNITY_CODES = ["O1", "O2", "O3", "O4", "O5"] as const;
export const SYNERGY_CODES = ["S1", "S2", "S3"] as const;
export const SUB_DIMENSION_CODES = [
  ...CAPABILITY_CODES,
  ...MOTIVATION_CODES,
  ...OPPORTUNITY_CODES,
  ...SYNERGY_CODES,
] as const;
export const RANKED_CODES = [
  ...CAPABILITY_CODES,
  ...MOTIVATION_CODES,
  ...OPPORTUNITY_CODES,
] as const;
export const TRIP_WIRE_CODES = ["TW1", "TW2", "TW3"] as const;

export type CapabilityCode = (typeof CAPABILITY_CODES)[number];
export type MotivationCode = (typeof MOTIVATION_CODES)[number];
export type OpportunityCode = (typeof OPPORTUNITY_CODES)[number];
export type SynergyCode = (typeof SYNERGY_CODES)[number];
export type SubDimensionCode = (typeof SUB_DIMENSION_CODES)[number];
/** The fourteen C, M and O sub-dimensions that compete for the binding constraint. */
export type RankedCode = (typeof RANKED_CODES)[number];
export type TripWireCode = (typeof TRIP_WIRE_CODES)[number];
/** One row of the Tier Assignment sheet. */
export type RouteRow = SubDimensionCode | TripWireCode | "DLP";
export const ROUTE_ROWS: readonly RouteRow[] = [
  ...CAPABILITY_CODES,
  ...MOTIVATION_CODES,
  ...TRIP_WIRE_CODES,
  ...OPPORTUNITY_CODES,
  ...SYNERGY_CODES,
  "DLP",
];

export const ARCHETYPES = [
  "Default",
  "Knowledge-intensive",
  "Operations-heavy",
  "Customer-facing service",
  "Public sector / regulated",
  "Healthcare",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export type Route = "Tier 1" | "Tier 2" | "Tier 3" | "Insufficient data";
export type ConfidenceBand = "High" | "Medium" | "Low" | "n/a" | "-";
export type Band = "Green" | "Amber" | "Red" | "Neutral";
export type DecisionClass = "Operational" | "Tactical" | "Strategic";
export type ComponentName = "Capability" | "Motivation" | "Opportunity";
export type ComponentKey = "C" | "M" | "O" | "S";
/** A calendar date as YYYY-MM-DD. The engine never reads a clock. */
export type IsoDate = string;

/** An Excel error value, carried where the workbook can show one. */
export interface ExcelError {
  readonly excelError: "#DIV/0!" | "#NUM!" | "#VALUE!";
}

export const CII_ITEMS = [
  "CII-01",
  "CII-02",
  "CII-03",
  "CII-04",
  "CII-05",
  "CII-06",
  "CII-07",
  "CII-08",
  "CII-09",
  "CII-10",
  "CII-11",
  "CII-12",
  "CII-13",
  "CII-14",
  "CII-15",
] as const;
export const MI1_ITEMS = [
  "MI1-01",
  "MI1-02",
  "MI1-03",
  "MI1-04",
  "MI1-05",
  "MI1-06",
  "MI1-07",
  "MI1-08",
] as const;
export const MI2_ITEMS = ["MI2-01", "MI2-02", "MI2-03", "MI2-04", "MI2-05"] as const;
export const MI3_ITEMS = ["MI3-01", "MI3-02", "MI3-03", "MI3-04", "MI3-05"] as const;
export const MI4_ITEMS = ["MI4-01", "MI4-02", "MI4-03", "MI4-04"] as const;
export const OI1_ITEMS = [
  "OI1-01",
  "OI1-02",
  "OI1-03",
  "OI1-04",
  "OI1-05",
  "OI1-06",
  "OI1-07",
  "OI1-08",
] as const;
export const OI2_ITEMS = ["OI2-01", "OI2-02", "OI2-03", "OI2-04"] as const;
export const OI3_ITEMS = ["OI3-01", "OI3-02", "OI3-03", "OI3-04", "OI3-05"] as const;
export const OI4_ITEMS = ["OI4-01", "OI4-02", "OI4-03"] as const;
export const TSI2_ITEMS = ["TSI2-01", "TSI2-02", "TSI2-03"] as const;
export const TSI3_ITEMS = ["TSI3-01", "TSI3-02", "TSI3-03", "TSI3-04", "TSI3-05"] as const;

export type CiiItem = (typeof CII_ITEMS)[number];
export type Mi1Item = (typeof MI1_ITEMS)[number];
export type Mi2Item = (typeof MI2_ITEMS)[number];
export type Mi3Item = (typeof MI3_ITEMS)[number];
export type Mi4Item = (typeof MI4_ITEMS)[number];
export type Oi1Item = (typeof OI1_ITEMS)[number];
export type Oi2Item = (typeof OI2_ITEMS)[number];
export type Oi3Item = (typeof OI3_ITEMS)[number];
export type Oi4Item = (typeof OI4_ITEMS)[number];
export type Tsi2Item = (typeof TSI2_ITEMS)[number];
export type Tsi3Item = (typeof TSI3_ITEMS)[number];
export type ItemCode =
  | CiiItem
  | Mi1Item
  | Mi2Item
  | Mi3Item
  | Mi4Item
  | Oi1Item
  | Oi2Item
  | Oi3Item
  | Oi4Item
  | Tsi2Item
  | Tsi3Item;

/** Raw item means (1 to 5, un-flipped) keyed by item code. An item not deployed is absent. */
export type ItemMeans<K extends ItemCode> = Partial<Record<K, number>>;

// ---------------------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------------------

/** Engagement Metadata D11:D21. */
export interface EngagementMetadata {
  clientName?: string;
  unitName?: string;
  unitFte?: number;
  sector?: string;
  subSector?: string;
  sizeBand?: string;
  unitType?: string;
  /** D18. Required: it selects the weight column. Only Default is enabled. */
  archetype: Archetype;
  /** D19. The as-at date that confidence bands are measured against. */
  engagementDate?: IsoDate;
  leadAnalyst?: string;
  diagnosticReference?: string;
}

/** One row of Tier Assignment: B (tier), C (source), D (vintage), F (notes). */
export interface RouteAssignment {
  tier?: Route;
  source?: string;
  vintage?: IsoDate;
  notes?: string;
}

/** Capability Inputs rows 7 to 9. */
export interface RoleFamilyInput {
  name?: string;
  fte?: number;
  skillsRequired?: number;
  confirmedProficiencies?: number;
}
export interface C1Inputs {
  families?: RoleFamilyInput[];
  /** D10, months. */
  medianTenureMonths?: number;
  /** D13, the M-C1-MGR finished score (Type C). */
  moduleScore?: number;
}
/** Capability Inputs rows 19 to 22. */
export interface KnowledgeDomainInput {
  name?: string;
  criticality?: number;
  meanScore?: number;
  coverage?: number;
}
export interface C2Inputs {
  domains?: KnowledgeDomainInput[];
}
/** Capability Inputs B28:B32, in band order 5 to 1. */
export interface C3Inputs {
  band5?: number;
  band4?: number;
  band3?: number;
  band2?: number;
  band1?: number;
}
export interface SurveyInputs<K extends ItemCode> {
  items?: ItemMeans<K>;
  responseRate?: number;
}
export interface C5Inputs {
  /** B59:B61, indicators 0 to 100. */
  timeToCompetence?: number;
  adoption?: number;
  cycleImprovement?: number;
  /** B62, the M-C5-TL finished score. */
  moduleScore?: number;
}
export interface CapabilityInputs {
  c1?: C1Inputs;
  c2?: C2Inputs;
  c3?: C3Inputs;
  c4?: SurveyInputs<CiiItem>;
  c5?: C5Inputs;
}

export interface M1Inputs extends SurveyInputs<Mi1Item> {
  /** D5, the platform engagement composite (Type C). */
  platformComposite?: number;
}
export interface MotivationInputs {
  m1?: M1Inputs;
  m2?: SurveyInputs<Mi2Item>;
  m3?: SurveyInputs<Mi3Item>;
  m4?: SurveyInputs<Mi4Item>;
  /** Motivation Inputs B52:B54, raw means. */
  tripWires?: Partial<Record<TripWireCode, number>>;
}

export interface O1Inputs extends SurveyInputs<Oi1Item> {
  /** D5, M-O1-LT. */
  decisionRightsScore?: number;
  /** D6, role-architecture review (online: ADM-O1). */
  roleArchitectureScore?: number;
  /** D7, M-O1-CASCADE. */
  cascadeScore?: number;
}
export interface O2Inputs extends SurveyInputs<Oi2Item> {
  /** D26. */
  toolInventoryScore?: number;
  /** D27, M-O2-IA. */
  informationAccessScore?: number;
  /** D28. */
  integrationScore?: number;
}
export interface O3Inputs extends SurveyInputs<Oi3Item> {
  /** D43, M-O3-PF. */
  processFrictionScore?: number;
}
export interface O4Inputs extends SurveyInputs<Oi4Item> {
  /** D59. */
  capacityAnalysisScore?: number;
}
/** Opportunity Inputs rows 71 to 74. */
export interface TeamInput {
  name?: string;
  fte?: number;
  score?: number;
}
export interface O5Inputs {
  teams?: TeamInput[];
}
export interface OpportunityInputs {
  o1?: O1Inputs;
  o2?: O2Inputs;
  o3?: O3Inputs;
  o4?: O4Inputs;
  o5?: O5Inputs;
}

export interface S1Inputs {
  /** Synergy Inputs D5:D7. */
  coverageBreadth?: number;
  coverageDepth?: number;
  distribution?: number;
}
/** Synergy Inputs B12:B15, raw telemetry. */
export interface TelemetryInputs {
  meetingHoursPerIc?: number;
  meetingHoursPerManager?: number;
  fragmentedTimeRatio?: number;
  afterHoursHours?: number;
}
export interface S2Inputs extends SurveyInputs<Tsi2Item> {
  telemetry?: TelemetryInputs;
}
export interface SynergyInputs {
  s1?: S1Inputs;
  s2?: S2Inputs;
  s3?: SurveyInputs<Tsi3Item>;
}

/** DLP rows 5 to 47. */
export interface DecisionInput {
  id?: string;
  class?: DecisionClass;
  latencyDays?: number;
  description?: string;
}
export interface DlpInputs {
  decisions?: DecisionInput[];
}

/** Behavioural Triangulators C5:C8, already converted to 0 to 100. */
export interface TriangulatorInputs {
  voluntaryTurnover?: number;
  unplannedAbsence?: number;
  enps?: number;
  goalAchievement?: number;
}

export interface AnalystEvidenceInputs {
  /** Analyst Evidence C13, the one evidence field the footer prints. */
  nonStandardDefinitions?: string;
}

export interface UnitMeasurementInput {
  engagement: EngagementMetadata;
  routes?: Partial<Record<RouteRow, RouteAssignment>>;
  capability?: CapabilityInputs;
  motivation?: MotivationInputs;
  opportunity?: OpportunityInputs;
  synergy?: SynergyInputs;
  dlp?: DlpInputs;
  behaviouralTriangulators?: TriangulatorInputs;
  analystEvidence?: AnalystEvidenceInputs;
}

// ---------------------------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------------------------

export interface SubDimensionResult {
  code: SubDimensionCode;
  component: ComponentKey;
  label: string;
  /** The sub-dimension score cell, or blank. */
  score: number | undefined;
  /** Composite Scoring D: 1 when the score is numeric. */
  available: boolean;
  /** Composite Scoring C: the archetype weight. */
  weight: number;
  /** The weight after reallocation across the available sub-dimensions (ranking block L). */
  normalisedWeight: number;
  /** Report Data D. */
  band: Band;
  /** Tier Assignment E. */
  confidence: ConfidenceBand;
}

export interface RoleFamilyResult {
  coverageRatio: number | undefined;
  familyScore: number | undefined;
  fteValid: number;
  contribution: number;
}
export interface KnowledgeDomainResult {
  coverageAdjusted: number | undefined;
  criticalityValid: number;
  weighted: number;
}
export interface TwoLayerResult {
  structural: number | undefined;
  perception: number | undefined;
  /** structural − perception; blank when either layer is blank. */
  gap: number | undefined;
  gapFlag: string;
  /** The sub-dimension score: the mean of the layers, or the perception score where the flag fires. */
  score: number | undefined;
}
export interface TripWireResult {
  score: number | undefined;
  flag: string;
}

export interface CapabilityDetail {
  c1: {
    families: RoleFamilyResult[];
    tenureModerator: number;
    tier12Score: number | undefined;
  };
  c2: {
    domains: KnowledgeDomainResult[];
    coverageCheck: "OK" | "INSUFFICIENT COVERAGE";
  };
  c3: {
    bandShares: Record<"band5" | "band4" | "band3" | "band2" | "band1", number | undefined>;
  };
  c4: {
    clarity: number | undefined;
    trust: number | undefined;
    flow: number | undefined;
  };
}
export interface MotivationDetail {
  m1: { tier3Score: number | undefined };
  tripWires: Record<TripWireCode, TripWireResult>;
}
export interface OpportunityDetail {
  o1: TwoLayerResult;
  o2: TwoLayerResult;
  o3: TwoLayerResult;
  o4: { perception: number | undefined };
  o5: { contributions: number[] };
}
export interface SynergyDetail {
  s2: {
    telemetryConverted: Record<keyof TelemetryInputs, number | undefined>;
    behaviouralComposite: number | undefined;
    perception: number | undefined;
    gap: number | undefined;
    gapFlag: string;
  };
  s3: { falseConsensusFlag: string };
}
export interface TriangulatorResult {
  composite: number | undefined;
  m1Gap: number | undefined;
  m1GapFlag: string;
}

export interface ComponentScores {
  C: number | undefined;
  M: number | undefined;
  O: number | undefined;
  /** Composite Scoring B30: defaults to 50 when no S sub-dimension is available. */
  sInternal: number;
  /** Composite Scoring B31. */
  S: number;
  /** Composite Scoring B32. */
  P: number | undefined;
  /** Composite Scoring SUM(F) per component: the sum of the available weights. */
  weightSums: Record<ComponentKey, number>;
}

/** One row of the ranking block, Composite Scoring K:S. */
export interface PriorityRow {
  code: RankedCode;
  component: ComponentName;
  label: string;
  score: number | undefined;
  normalisedWeight: number;
  componentScore: number | undefined;
  exponent: number;
  /** O: realistic improvement, ρ × MAX(0, S_cap − score). */
  deltaS: number | undefined;
  /** P: realistic P gain. Excel shows #DIV/0! when the component score is 0. */
  deltaP: number | ExcelError | undefined;
  /** Q: relative weakness. */
  rel: number | undefined;
  /** R: Priority. */
  priority: number | undefined;
  /** S: Priority less the row fraction, the sort key. */
  sortKey: number | undefined;
}
export interface TopSixRow {
  rank: number;
  component: ComponentName | "";
  label: string;
  rawScore: number | undefined;
  realisticPGain: number | undefined;
  priority: number | undefined;
}
export interface RankingResult {
  rows: PriorityRow[];
  topSix: TopSixRow[];
  /** Composite Scoring B44. */
  bindingComponent: ComponentName | "";
  /** Composite Scoring B45, verbatim. */
  statement: string;
  /** Composite Scoring B46. */
  tripWireOverride: string;
}

export interface ValidationResult {
  /** B49. */
  sInRange: string;
  /** B50. */
  pTypical: string;
  /** B51. */
  pConfidence: ConfidenceBand | "";
}

export interface DecisionResult {
  latencyScore: number | undefined;
}
export interface DlpClassResult {
  dls: number | undefined;
  sample: number;
  warning: string;
}
export interface DlpResult {
  decisions: DecisionResult[];
  operational: DlpClassResult;
  tactical: DlpClassResult;
  strategic: DlpClassResult;
  overall: number | undefined;
  sampleN: number;
  longestFive: Array<{
    class: DecisionClass | "";
    description: string;
    latencyDays: number | undefined;
  }>;
}

export interface MethodologyResult {
  clientUnit: string;
  unitFte: number | undefined;
  archetype: Archetype;
  engagementDate: IsoDate | undefined;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tierMixRating: string;
  pConfidence: ConfidenceBand | "";
  gapFlags: {
    m1SurveyBehavioural: string;
    falseConsensus: string;
    s2TelemetryPerception: string;
    o1: string;
    o2: string;
    o3: string;
  };
  criticalFindings: string;
  internalComparison: string;
  responseRates: Record<
    "C4" | "M1" | "M2" | "M3" | "M4" | "O1" | "O2" | "O3" | "O4" | "S2" | "S3",
    number | undefined
  >;
  exclusionsSummary: string;
  nonStandardDefinitions: string;
}

export interface ReportDataResult {
  pBand: Band;
  cBand: Band;
  mBand: Band;
  oBand: Band;
  /** Report Data C12. */
  tripWireOverride: string;
  comparisonRow: {
    unit: string;
    P: number | undefined;
    pBand: Band;
    C: number | undefined;
    M: number | undefined;
    O: number | undefined;
    S: number;
    topBindingSubDimension: string;
  };
}

export interface UnitMeasurementResult {
  subDimensions: Record<SubDimensionCode, SubDimensionResult>;
  capability: CapabilityDetail;
  motivation: MotivationDetail;
  opportunity: OpportunityDetail;
  synergy: SynergyDetail;
  triangulators: TriangulatorResult;
  components: ComponentScores;
  ranking: RankingResult;
  validation: ValidationResult;
  dlp: DlpResult;
  /** Tier Assignment E for every route row, including trip-wires and DLP. */
  confidence: Record<RouteRow, ConfidenceBand>;
  methodology: MethodologyResult;
  reportData: ReportDataResult;
}
