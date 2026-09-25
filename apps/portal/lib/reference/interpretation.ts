import type { Block, ChecklistBand, EventTrigger, Module } from "./types";

/**
 * What the parser cannot read mechanically from the source documents, transcribed once and keyed to
 * the source's own words, so that a change at source fails the drift test instead of passing
 * silently. Each entry says where it comes from. Nothing here is a scoring rule of the portal's own:
 * the ADM-O4 bands are the Online Measurement Specification's, and the drift test proves they
 * reproduce the intake package's band functions exactly.
 */

/** The block (engine sub-dimension key) of a Part A item, by its code prefix. */
export const BLOCK_OF_PREFIX: Readonly<Record<string, Block>> = {
  CII: "C4",
  MI1: "M1",
  MI2: "M2",
  MI3: "M3",
  MI4: "M4",
  TW: "TW",
  OI1: "O1",
  OI2: "O2",
  OI3: "O3",
  OI4: "O4",
  OI5: "O5",
  TSI2: "S2",
  TSI3: "S3",
};

/** The Blueprint headings that name a sub-construct, with the key it is stored under. */
export const SUB_CONSTRUCT_OF_HEADING: Readonly<Record<string, string>> = {
  "2.1.1 Expertise Clarity items": "clarity",
  "2.1.2 Expertise Trust items": "trust",
  "2.1.3 Expertise Flow items": "flow",
  "3.1.1 Engagement items (vigour, dedication, absorption)": "engagement",
  "3.1.2 Team confidence items": "team_confidence",
  "3.1.3 Pride and commitment items": "pride",
  "4.1.1 Role clarity items": "role_clarity",
  "4.1.2 Decision-rights items": "decision_rights",
  "4.1.3 Strategic cascade items": "cascade",
  "5.2.1 Task conflict items (constructive — higher is better)": "task",
  "5.2.2 Relationship conflict items (destructive — higher is worse, reverse-scored)":
    "relationship",
};

/**
 * CII-13 in every pulse (Milestone 5 plan, D6, approved 24 September 2026). The Blueprint tags it
 * `Q*` but gives no rotation row for it, and its "16 with the 4-quarter CII rotation handled at unit
 * level" states no rule for leaving it out (plan S2).
 */
export const EVERY_PULSE = ["CII-13"] as const;

/**
 * Items the Blueprint's pulse rotation tables (3.1.4, 3.2.2) place in a pulse although the item
 * tables do not tag them `Q*`. The rotation tables are the more specific statement and are followed;
 * the discrepancy is parked for the source pass. The drift test fails when the source changes it.
 */
export const ROTATED_WITHOUT_Q_TAG = ["MI1-03", "MI1-06", "MI1-08", "MI2-04", "MI2-05"] as const;

/** The modules the online route deploys (Online Measurement Specification Parts 2 and 4.1). */
export const MODULES: readonly Module[] = [
  {
    code: "M-O1-CASCADE",
    audience: "members_part_b",
    sub_dimension: "O1",
    repeats_over: "none",
    disclosure: "none",
    source: "Tier 3 Module Library 2.1",
    position: 1,
  },
  {
    code: "M-O2-IA",
    audience: "members_part_b",
    sub_dimension: "O2",
    repeats_over: "none",
    disclosure: "none",
    source: "Tier 3 Module Library 2.2",
    position: 2,
  },
  {
    code: "M-O3-PF",
    audience: "members_part_b",
    sub_dimension: "O3",
    repeats_over: "process",
    disclosure: "none",
    source: "Tier 3 Module Library 2.3",
    position: 3,
  },
  {
    code: "M-O1-LT",
    audience: "leadership_team",
    sub_dimension: "O1",
    repeats_over: "decision_type",
    disclosure: "leadership_team",
    source: "Tier 3 Module Library 3.1 and 8.3",
    position: 4,
  },
  {
    code: "M-C1-MGR",
    audience: "managers",
    sub_dimension: "C1",
    repeats_over: "report_skill",
    disclosure: "none",
    source: "Tier 3 Module Library 4.1",
    position: 5,
  },
  {
    code: "M-C2-MGR",
    audience: "managers",
    sub_dimension: "C2",
    repeats_over: "report_domain",
    disclosure: "none",
    source: "Online Measurement Specification 4.1",
    position: 6,
  },
  {
    code: "M-C3-MGR",
    audience: "managers",
    sub_dimension: "C3",
    repeats_over: "report",
    disclosure: "none",
    source: "Tier 3 Module Library 4.2",
    position: 7,
  },
  {
    code: "M-C5-TL",
    audience: "team_leaders",
    sub_dimension: "C5",
    repeats_over: "none",
    disclosure: "small_group",
    source: "Tier 3 Module Library 5.1 and 8.4",
    position: 8,
  },
];

/**
 * Codes the portal assigns where the source names an item without one (Milestone 5 plan, D20),
 * keyed by the source's wording with emphasis removed. The M-O1-LT role items follow the intake's
 * RAPID order (recommend, agree, perform, input, decides).
 */
export const PORTAL_CODES: Readonly<Record<string, string>> = {
  "Who Recommends this decision?": "O1L-01",
  "Who Agrees must be consulted before this decision?": "O1L-02",
  "Who Performs (implements) this decision?": "O1L-03",
  "Who provides Input on this decision?": "O1L-04",
  "Who Decides (has decision authority) on this decision?": "O1L-05",
  "How clear are the decision rights for this type of decision?": "O1L-06",
  "[Skill name]: rate this person's current demonstrated proficiency": "C1M-01",
  "[Domain name]: rate this person's current working knowledge": "C2M-01",
  "Performance band": "C3M-01",
  "Evidence basis": "C3M-02",
};

/** The response form of each M-O1-LT role item, from the Library's "Response format" cell. */
export const RAPID_FORM: Readonly<Record<string, "rapid_multi" | "rapid_single">> = {
  'Multi-select from unit member list (or "Unclear / Varies")': "rapid_multi",
  "Multi-select": "rapid_multi",
  'Single-select (or "Unclear / Varies")': "rapid_single",
};

/** ADM-O2 answer labels as the specification words them, with the intake's answer codes. */
export const ANSWER_CODES: Readonly<Record<string, string>> = {
  Yes: "yes",
  No: "no",
  Partly: "partly",
  "Automated integration": "automated",
  "scheduled import or export": "scheduled",
  "manual re-entry": "manual",
  "not connected but should be": "not-connected",
  "does not need to connect": "excluded",
};

/**
 * ADM-O4, keyed by the specification's band cell (Online Measurement Specification 4.3a). A value
 * exactly on a boundary takes the higher-scoring band, which the inclusive bounds encode. CF-4's
 * "not applicable" is an answer, not a band (see NOT_APPLICABLE).
 */
export const ADM_O4_BANDS: Readonly<
  Record<
    string,
    {
      factKind: "percent" | "hours" | "percent_or_na";
      bands: Omit<ChecklistBand, "fact_code" | "position">[];
    }
  >
> = {
  "80 to 95 = 100; 95 to 105 or 70 to 80 = 75; 105 to 115 or 60 to 70 = 55; above 115 or below 60 = 25":
    {
      factKind: "percent",
      bands: [
        { score: 100, lower: 80, lower_inclusive: true, upper: 95, upper_inclusive: true },
        { score: 75, lower: 70, lower_inclusive: true, upper: 80, upper_inclusive: false },
        { score: 75, lower: 95, lower_inclusive: false, upper: 105, upper_inclusive: true },
        { score: 55, lower: 60, lower_inclusive: true, upper: 70, upper_inclusive: false },
        { score: 55, lower: 105, lower_inclusive: false, upper: 115, upper_inclusive: true },
        { score: 25, lower: null, lower_inclusive: false, upper: 60, upper_inclusive: false },
        { score: 25, lower: 115, lower_inclusive: false, upper: null, upper_inclusive: false },
      ],
    },
  "up to 1 = 100; 1 to 2 = 85; 2 to 4 = 65; 4 to 6 = 45; above 6 = 20": {
    factKind: "hours",
    bands: [
      { score: 100, lower: null, lower_inclusive: false, upper: 1, upper_inclusive: true },
      { score: 85, lower: 1, lower_inclusive: false, upper: 2, upper_inclusive: true },
      { score: 65, lower: 2, lower_inclusive: false, upper: 4, upper_inclusive: true },
      { score: 45, lower: 4, lower_inclusive: false, upper: 6, upper_inclusive: true },
      { score: 20, lower: 6, lower_inclusive: false, upper: null, upper_inclusive: false },
    ],
  },
  "at or below = 100; up to 10% above = 75; 10 to 25% above = 55; more than 25% above = 25": {
    factKind: "percent",
    bands: [
      { score: 100, lower: null, lower_inclusive: false, upper: 0, upper_inclusive: true },
      { score: 75, lower: 0, lower_inclusive: false, upper: 10, upper_inclusive: true },
      { score: 55, lower: 10, lower_inclusive: false, upper: 25, upper_inclusive: true },
      { score: 25, lower: 25, lower_inclusive: false, upper: null, upper_inclusive: false },
    ],
  },
  "shrinking or stable (within 5%) = 100; growing 5 to 25% = 55; growing more than 25% = 25; not applicable (excluded)":
    {
      factKind: "percent_or_na",
      bands: [
        { score: 100, lower: null, lower_inclusive: false, upper: 5, upper_inclusive: true },
        { score: 55, lower: 5, lower_inclusive: false, upper: 25, upper_inclusive: true },
        { score: 25, lower: 25, lower_inclusive: false, upper: null, upper_inclusive: false },
      ],
    },
  "up to 3% = 100; 3 to 6 = 85; 6 to 10 = 65; 10 to 15 = 45; above 15 = 20": {
    factKind: "percent",
    bands: [
      { score: 100, lower: null, lower_inclusive: false, upper: 3, upper_inclusive: true },
      { score: 85, lower: 3, lower_inclusive: false, upper: 6, upper_inclusive: true },
      { score: 65, lower: 6, lower_inclusive: false, upper: 10, upper_inclusive: true },
      { score: 45, lower: 10, lower_inclusive: false, upper: 15, upper_inclusive: true },
      { score: 20, lower: 15, lower_inclusive: false, upper: null, upper_inclusive: false },
    ],
  },
};

/** The one ADM-O4 answer that is excluded rather than banded (CF-4). */
export const NOT_APPLICABLE = { option: "not-applicable", label: "not applicable" } as const;

/**
 * The event triggers of Cadence Master 7.3 and Online Measurement Specification 6.3, keyed by the
 * source's wording. `affects` uses the engine's codes (TW1 pay equity, TW2 fairness, TW3 basic
 * conditions). Rows the online route does not offer carry `null` with the reason (plan S13): DLP
 * is not measured online, and some rows are outcomes rather than something a client runs.
 */
export const EVENT_TRIGGERS: Readonly<
  Record<
    string,
    Omit<EventTrigger, "source_trigger" | "source" | "position"> | { excluded: string }
  >
> = {
  "Unit headcount change >20% in a quarter": {
    code: "headcount_change",
    affects: ["C1", "C4", "S1"],
    detection: "directory",
    deploys: "affected",
  },
  "New manager into the unit": {
    code: "new_manager",
    affects: ["O5", "S3"],
    detection: "directory",
    deploys: "affected",
  },
  "Manager-development programme completion": {
    code: "manager_development",
    affects: ["O5", "M1", "M2"],
    detection: "menu",
    deploys: "affected",
  },
  "Major reorganisation affecting decision rights": {
    code: "reorganisation",
    affects: ["O1"],
    detection: "menu",
    deploys: "affected",
  },
  "Major tool rollout (ERP, CRM, AI)": {
    code: "tool_rollout",
    affects: ["O2"],
    detection: "menu",
    deploys: "affected",
  },
  "Major process redesign": {
    code: "process_redesign",
    affects: ["O3"],
    detection: "menu",
    deploys: "affected",
  },
  "New enterprise strategy or pivot": {
    code: "strategy_change",
    affects: ["O1", "M4"],
    detection: "menu",
    deploys: "affected",
  },
  "Reported speak-up or grievance incident": {
    code: "grievance",
    affects: ["M2", "S3", "TW1", "TW2", "TW3"],
    detection: "menu",
    deploys: "affected",
  },
  "Trip-wire score <60 on any item": {
    excluded: "An outcome that calls for escalation, not a refresh a client runs.",
  },
  "Two or more pulse indicators drop >10 points": {
    code: "pulse_drop",
    affects: [],
    detection: "menu",
    deploys: "half_yearly",
  },
  "Pay equity audit pending or recent": {
    code: "pay_equity_audit",
    affects: ["TW1"],
    detection: "menu",
    deploys: "affected",
  },
  "WHS incident in the unit": {
    code: "whs_incident",
    affects: ["TW3", "M2"],
    detection: "menu",
    deploys: "affected",
  },
  "Backlog growth >25% or burnout indicators": {
    code: "backlog_growth",
    affects: ["O4"],
    detection: "menu",
    deploys: "affected",
  },
  "Sustained meeting overload signal in Workplace Analytics": {
    code: "meeting_overload",
    affects: ["S2"],
    detection: "menu",
    deploys: "affected",
  },
  "Major sector shock": {
    excluded: "External conditions are not in the model; nothing is refreshed.",
  },
  "Voluntary turnover spike in a specific manager's team": {
    code: "turnover_spike",
    affects: ["O5"],
    detection: "menu",
    deploys: "affected",
  },
  "Customer complaint spike on a process-related issue": {
    code: "complaint_spike",
    affects: ["O3"],
    detection: "menu",
    deploys: "affected",
  },
  "Decision-latency complaint or escalation": {
    excluded: "Decision latency is not measured on the online route.",
  },
  "Team composition change above 30%": {
    code: "team_composition_change",
    affects: ["C4"],
    detection: "directory",
    deploys: "affected",
  },
};

/** The source rows of Online Measurement Specification 6.3 that repeat a Cadence Master trigger. */
export const OMS_TRIGGERS_ALREADY_IN_CADENCE_MASTER: readonly string[] = [
  "Unit headcount change above 20% in a quarter",
  "New manager of the unit or a team",
];
