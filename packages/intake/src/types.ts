/**
 * Types for the intake package's input and result.
 *
 * The input is what the campaign engine holds at close: raw survey rows per audience, the
 * identified manager ratings, the administrator checklists, the directory snapshot, the unit
 * context, the campaign definition and, for carry-forward, the prior cycle's engine input.
 * The result is the engine's input plus everything the footer and the recommendations rules need.
 * A missing input is an absent property, never zero (Workbook Spec 1.8; DECISIONS.md 1.4).
 */

import type {
  CiiItem,
  IsoDate,
  Mi1Item,
  Mi2Item,
  Mi3Item,
  Mi4Item,
  Oi1Item,
  Oi2Item,
  Oi3Item,
  Oi4Item,
  RouteRow,
  SubDimensionCode,
  Tsi2Item,
  Tsi3Item,
  UnitMeasurementInput,
} from "@performancevp/engine";

export type Cadence = "baseline" | "quarterly" | "half-yearly" | "annual" | "event";

// ---------------------------------------------------------------------------------------------
// Item codes. The intake holds its own lists, as the Survey Processing workbook lists its own
// columns; the engine's item types constrain each entry and a test asserts the sequences agree.
// ---------------------------------------------------------------------------------------------

function items<T extends string>(prefix: string, count: number): readonly T[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}` as T,
  );
}

export const CII_ITEMS: readonly CiiItem[] = items("CII", 15);
export const MI1_ITEMS: readonly Mi1Item[] = items("MI1", 8);
export const MI2_ITEMS: readonly Mi2Item[] = items("MI2", 5);
export const MI3_ITEMS: readonly Mi3Item[] = items("MI3", 5);
export const MI4_ITEMS: readonly Mi4Item[] = items("MI4", 4);
export const OI1_ITEMS: readonly Oi1Item[] = items("OI1", 8);
export const OI2_ITEMS: readonly Oi2Item[] = items("OI2", 4);
export const OI3_ITEMS: readonly Oi3Item[] = items("OI3", 5);
export const OI4_ITEMS: readonly Oi4Item[] = items("OI4", 3);
export const TSI2_ITEMS: readonly Tsi2Item[] = items("TSI2", 3);
export const TSI3_ITEMS: readonly Tsi3Item[] = items("TSI3", 5);

export const TW_ITEMS = ["TW-01", "TW-02", "TW-03"] as const;
export const OI5_ITEMS = ["OI5-01", "OI5-02", "OI5-03"] as const;
export const O1C_ITEMS = ["O1C-01", "O1C-02", "O1C-03", "O1C-04", "O1C-05"] as const;
export const O2I_ITEMS = ["O2I-01", "O2I-02", "O2I-03", "O2I-04", "O2I-05", "O2I-06"] as const;
export const O3P_ITEMS = ["O3P-01", "O3P-02", "O3P-03", "O3P-04", "O3P-05", "O3P-06"] as const;
export const C5L_ITEMS = [
  "C5L-01",
  "C5L-02",
  "C5L-03",
  "C5L-04",
  "C5L-05",
  "C5L-06",
  "C5L-07",
  "C5L-08",
  "C5L-09",
  "C5L-10",
  "C5L-11",
  "C5L-12",
] as const;

export type TwItem = (typeof TW_ITEMS)[number];
export type Oi5Item = (typeof OI5_ITEMS)[number];
export type O1cItem = (typeof O1C_ITEMS)[number];
export type O2iItem = (typeof O2I_ITEMS)[number];
export type O3pItem = (typeof O3P_ITEMS)[number];
export type C5lItem = (typeof C5L_ITEMS)[number];

/** Part A: the Diagnostic Survey items (Survey Blueprint Part 6). */
export type PartAItem =
  | CiiItem
  | Mi1Item
  | Mi2Item
  | Mi3Item
  | Mi4Item
  | TwItem
  | Oi1Item
  | Oi2Item
  | Oi3Item
  | Oi4Item
  | Oi5Item
  | Tsi2Item
  | Tsi3Item;
/** Part B: the all-member modules (Module Library Part 2), with O3P items carried per process. */
export type PartBItem = O1cItem | O2iItem;
/** Any survey item the intake screens or averages. */
export type SurveyItem = PartAItem | PartBItem | O3pItem | C5lItem;

// ---------------------------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------------------------

/** One anonymous survey row. Responses are 1 to 5; a skipped item is absent. */
export interface SurveyRow<K extends string = string> {
  /** A row identifier for traceability in the result; never a person. */
  id?: string;
  items: Partial<Record<K, number>>;
  /** Seconds from opening to submitting, where the platform recorded it. */
  completionSeconds?: number;
}

/**
 * One member's survey: Part A and, where deployed, Part B on one row, as the workbook's Import
 * Main lays them out (C:DB). Screening reads the whole row, process items included.
 */
export interface MemberResponse extends SurveyRow<PartAItem | PartBItem> {
  /** The non-identifying team selector (Survey Blueprint 6.1). */
  teamId?: string;
  /** M-O3-PF answers per named process. */
  processes?: Array<{ processId: string; items: Partial<Record<O3pItem, number>> }>;
}

export type TeamLeaderResponse = SurveyRow<C5lItem>;

/**
 * One leadership-team answer row: one respondent on one decision type (M-O1-LT), as the
 * workbook's Import Leadership holds it. Role answers are free labels; a blank is absent.
 */
export interface LeadershipRow {
  respondentId: string;
  decisionTypeId: string;
  recommend?: string;
  agree?: string;
  perform?: string;
  input?: string;
  decides?: string;
  /** 1 to 5. */
  clarity?: number;
}

export interface Responses {
  /** Part A, or Part A and Part B on one row as the workbook lays them out. */
  members?: MemberResponse[];
  /**
   * Part B submitted as its own survey with its own token (Online Measurement Specification Part 2),
   * never linked to a Part A row. Screened on its own, so its speed check compares Part B times with
   * Part B times, and scored with the Part B items of `members` (intake 1.2.0). Absent, nothing
   * changes: the workbook fixtures carry Part B on the members' rows.
   */
  membersPartB?: MemberResponse[];
  teamLeaders?: TeamLeaderResponse[];
  leadershipTeam?: LeadershipRow[];
}

// ---------------------------------------------------------------------------------------------
// Identified ratings (aggregated here; never reported below unit level)
// ---------------------------------------------------------------------------------------------

export interface SkillRating {
  managerRef: string;
  employeeRef: string;
  skillId: string;
  /** 1 Novice to 5 Expert. */
  rating: number;
}
export interface KnowledgeRating {
  managerRef: string;
  employeeRef: string;
  domainId: string;
  rating: number;
}
export interface TalentBand {
  managerRef: string;
  employeeRef: string;
  /** 1 to 5. */
  band: number;
}
/** A manager counts as having responded once any rating of theirs exists, as the workbook counts raters. */
export interface Ratings {
  skills?: SkillRating[];
  knowledge?: KnowledgeRating[];
  talentBands?: TalentBand[];
}

// ---------------------------------------------------------------------------------------------
// Administrator checklists (Online Measurement Specification 4.2, 4.3, 4.3a)
// ---------------------------------------------------------------------------------------------

export interface AdmO1Response {
  roleFamilyId: string;
  ra1: boolean;
  ra2: boolean;
  ra3: boolean;
}
export type Ti3Answer = "yes" | "partly" | "no";
export type Int1Answer = "automated" | "scheduled" | "manual" | "not-connected" | "excluded";
export interface AdmO2Response {
  systemId: string;
  ti1: boolean;
  ti2: boolean;
  ti3: Ti3Answer;
  int1: Int1Answer;
}
export interface AdmO4Response {
  /** CF-1, percent. */
  utilisationPercent?: number;
  /** CF-2, hours per FTE per week above standard. */
  overtimeHoursPerFte?: number;
  /** CF-3, percent above the organisation's 12-month baseline. */
  absenceAboveBaselinePercent?: number;
  /** CF-4, percent change over three months; "not-applicable" is excluded. */
  backlogChangePercent?: number | "not-applicable";
  /** CF-5, percent. */
  vacancyRatePercent?: number;
}
export interface Checklists {
  admO1?: AdmO1Response[];
  admO2?: AdmO2Response[];
  admO4?: AdmO4Response;
}

// ---------------------------------------------------------------------------------------------
// Unit context, directory snapshot, formal ratings, campaign, prior cycle
// ---------------------------------------------------------------------------------------------

/** Headcounts and FTE come from the directory snapshot, never from the context. */
export interface Team {
  id: string;
  name: string;
}
export interface Skill {
  id: string;
  name: string;
  critical: boolean;
  kind: "technical" | "behavioural";
}
export interface RoleFamily {
  id: string;
  name: string;
  skills: Skill[];
  /** A people-leader family, for the C1 pattern rule. */
  peopleLeader?: boolean;
}
export interface KnowledgeDomain {
  id: string;
  name: string;
  criticality: 1 | 2 | 3;
}
export interface UnitContext {
  name: string;
  clientName?: string;
  sector?: string;
  subSector?: string;
  sizeBand?: string;
  unitType?: string;
  teams: Team[];
  roleFamilies: RoleFamily[];
  knowledgeDomains: KnowledgeDomain[];
  systems: Array<{ id: string; name: string }>;
  processes: Array<{ id: string; name: string }>;
  decisionTypes: Array<{ id: string; name: string }>;
}

/** One directory record as frozen at launch. */
export interface Member {
  employeeRef: string;
  teamId?: string;
  roleFamilyId?: string;
  fte: number;
  startDate?: IsoDate;
  teamLeader?: boolean;
  leadershipTeam?: boolean;
  managerRef?: string;
  formalRating?: { label: string; date: IsoDate };
}
export interface Snapshot {
  members: Member[];
  /**
   * The leadership-team and team-leader audiences as frozen at launch, by employee reference,
   * members of the unit or not (intake 1.2.0). They are the response-rate denominators for M-O1-LT
   * and M-C5-TL. A leader from a unit above belongs to an audience without being a member, and a
   * unit leader who takes the team-leader module because no team leader is flagged is not flagged
   * (Online Measurement Specification 6.1). Absent, the members' flags count, as in the workbook.
   */
  audiences?: { leadershipTeam?: string[]; teamLeaders?: string[] };
}

export interface FormalRatings {
  /** The client's rating labels mapped onto the five bands. */
  scaleMap: Array<{ label: string; band: 1 | 2 | 3 | 4 | 5 }>;
  /** The client's declaration that the ratings went through cross-manager calibration. */
  calibrated: boolean;
}

export interface Deployment {
  partA?: PartAItem[];
  partB?: { items: PartBItem[]; processIds: string[] };
  teamLeaders?: boolean;
  leadershipTeam?: boolean;
  managers?: { c1: boolean; c2: boolean; c3: boolean };
  checklists?: Array<"ADM-O1" | "ADM-O2" | "ADM-O4">;
}

export interface Campaign {
  cadence: Cadence;
  launchDate: IsoDate;
  /** The as-at date the engine measures confidence against. */
  closeDate: IsoDate;
  deployed: Deployment;
}

/** The prior cycle's engine input, for sub-dimensions this cadence does not refresh. */
export interface PriorCycle {
  engineInput: UnitMeasurementInput;
  measuredAt: Partial<Record<RouteRow, IsoDate>>;
}

export interface IntakeInput {
  campaign: Campaign;
  unit: UnitContext;
  snapshot: Snapshot;
  responses?: Responses;
  ratings?: Ratings;
  checklists?: Checklists;
  formalRatings?: FormalRatings;
  prior?: PriorCycle;
}

// ---------------------------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------------------------

/** The screened survey audiences; the leadership survey and the manager modules are not screened. */
export type Audience = "members" | "membersPartB" | "teamLeaders";

export interface ScreeningSummary {
  received: number;
  valid: number;
  excluded: number;
  /** Excluded over received; blank when nothing was received. */
  exclusionRate: number | undefined;
  /** Rows failing each check; a row can fail more than one. */
  reasons: { straightLining: number; patterning: number; speed: number };
  /** True when at least 20 responses were received, so the speed check ran. */
  speedCheckApplied: boolean;
  /** The 5th-percentile cut-off in seconds, when the speed check ran. */
  speedCutoffSeconds: number | undefined;
  /** "CHECK: responses exceed headcount" or "ok", as the workbook reports it. */
  headcountReconciliation: string | undefined;
}

export type InstrumentStatus = "reported" | "insufficient" | "not-deployed";

export interface InstrumentResult {
  status: InstrumentStatus;
  validCount: number | undefined;
  responseRate: number | undefined;
  /** The rule that decided the status, for the footer. */
  reason: string;
}

export interface TeamResult {
  teamId: string;
  name: string;
  /** From the snapshot: the response-rate denominator and the O5 and C4 weight, as the workbook's Setup FTE is. */
  fte: number;
  validCount: number;
  responseRate: number | undefined;
  /** 4 valid respondents and 70% response. */
  valid: boolean;
  ciiItems: Partial<Record<CiiItem, number>>;
  m1: number | undefined;
  m2: number | undefined;
  o5: number | undefined;
}

export interface Adjustment {
  subDimension: SubDimensionCode;
  rule: string;
  /** Points, or the counts moved, as the rule expresses it. */
  amount: number;
  applied: boolean;
  note: string;
}

export interface C3RouteRecord {
  source: "module" | "formal" | "none";
  ratingDate: IsoDate | undefined;
  /** Rated FTE over unit FTE on the chosen route. */
  coverage: number | undefined;
  treatment: "as-declared" | "uncalibrated-capped" | "module" | "none";
  confidenceCap: "Medium" | undefined;
}

export interface Aggregates {
  /** MI1 engagement (01 to 04) and team confidence (05, 06), converted; blank unless both confidence items were deployed. */
  m1Engagement: number | undefined;
  m1TeamConfidence: number | undefined;
  /** M-O2-IA items 01 to 03 and 04 to 06, converted. */
  o2IaAccess: number | undefined;
  o2IaUse: number | undefined;
  /** TSI3 task (01 to 03) and relationship (04, 05), converted after reverse scoring. */
  s3TaskConflict: number | undefined;
  s3RelationshipConflict: number | undefined;
  /** Per-process friction scores. */
  processFriction: Array<{ processId: string; score: number | undefined }>;
  decisionRights: number | undefined;
  cascade: number | undefined;
  toolInventory: number | undefined;
  integration: number | undefined;
  informationAccess: number | undefined;
  capacityFacts: number | undefined;
  /** Critical skills with no proficient member. */
  criticalSkillsUncovered: string[];
  /** C1 coverage by skill kind per role family, with the people-leader flag. */
  c1CoverageByKind: Array<{
    roleFamilyId: string;
    peopleLeader: boolean;
    technical: number | undefined;
    behavioural: number | undefined;
    overall: number | undefined;
  }>;
  /** Teams above the display threshold only. */
  teams: Array<{
    teamId: string;
    m1: number | undefined;
    m2: number | undefined;
    o5: number | undefined;
  }>;
  c3GuardFired: boolean;
  formalRatingsFailedAcceptance: boolean;
}

export interface Methodology {
  route: string;
  instruments: Array<{
    instrument: string;
    deployed: boolean;
    responseRate: number | undefined;
    validCount: number | undefined;
  }>;
  exclusions: Partial<Record<Audience, ScreeningSummary>>;
  insufficiencies: Array<{ subDimension: SubDimensionCode; reason: string }>;
  adjustments: Adjustment[];
  c3: C3RouteRecord;
  carriedForward: Array<{ subDimension: SubDimensionCode; measuredAt: IsoDate }>;
  standingStatements: string[];
}

export interface IntakeResult {
  engineInput: UnitMeasurementInput;
  screening: Partial<Record<Audience, ScreeningSummary>>;
  instruments: Record<string, InstrumentResult>;
  teams: TeamResult[];
  aggregates: Aggregates;
  adjustments: Adjustment[];
  c3Route: C3RouteRecord;
  insufficiencies: Array<{ subDimension: SubDimensionCode; reason: string }>;
  methodology: Methodology;
  intakeVersion: string;
}
