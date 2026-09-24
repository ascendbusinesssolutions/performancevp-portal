/**
 * The reference set: the instrument as the source documents define it, in the shape of the reference
 * tables (PORTAL_BUILD_PLAN.md 2.4; Milestone 5 plan, Section 1). Keys are the tables' column names,
 * so the generated pgTAP test can compare each table with `to_jsonb` of its rows.
 */

export type Block =
  "C4" | "M1" | "M2" | "M3" | "M4" | "TW" | "O1" | "O2" | "O3" | "O4" | "O5" | "S2" | "S3";

export type SectionCode = "A" | "B" | "C";

export interface SurveySection {
  code: SectionCode;
  heading: string;
  position: number;
}

export interface SurveyItem {
  code: string;
  block: Block;
  sub_construct: string | null;
  wording: string;
  is_reverse: boolean;
  in_baseline: boolean;
  in_pulse: boolean;
  /** The Blueprint's `Q*`: the item appears in some quarters' pulses, not all. */
  pulse_rotates: boolean;
  in_half_yearly: boolean;
  in_annual: boolean;
  section: SectionCode;
  /** The respondent order of Blueprint Part 6.1, 1 to 71. */
  position: number;
}

export interface PulseRotationRow {
  rotation: 1 | 2 | 3 | 4;
  item_code: string;
}

export type ModuleAudience = "members_part_b" | "leadership_team" | "managers" | "team_leaders";

export interface Module {
  code: string;
  audience: ModuleAudience;
  sub_dimension: string;
  repeats_over: "none" | "process" | "decision_type" | "report_skill" | "report_domain" | "report";
  disclosure: "none" | "leadership_team" | "small_group";
  source: string;
  position: number;
}

export type ResponseKind =
  "agree5" | "anchored5" | "rapid_multi" | "rapid_single" | "band5" | "evidence_note" | "open_text";

export interface Anchor {
  value: number;
  label: string;
  description: string | null;
}

export interface ModuleItem {
  code: string;
  module_code: string;
  position: number;
  wording: string;
  response_kind: ResponseKind;
  anchors: Anchor[] | null;
  is_reverse: boolean;
  /** Deployed on the online route; false for the open-text items (Online Measurement Specification 11.1, decision 5). */
  online: boolean;
  /** True where the source gives the item no code and the portal assigned one (Milestone 5 plan, D20). */
  portal_code: boolean;
}

export interface Checklist {
  code: "ADM-O1" | "ADM-O2" | "ADM-O4";
  repeats_over: "role_family" | "system" | "unit";
  minimum_facts: number | null;
  source: string;
  position: number;
}

export interface ChecklistFact {
  code: string;
  checklist_code: Checklist["code"];
  position: number;
  wording: string;
  response_kind: "yes_no" | "yes_partly_no" | "integration" | "percent" | "hours" | "percent_or_na";
  /** The source's response or band cell, verbatim, so a change at source is caught. */
  source_response: string | null;
}

export interface ChecklistValue {
  fact_code: string;
  option: string;
  label: string;
  /** Null where the answer is excluded from the score. */
  value: number | null;
  position: number;
}

export interface ChecklistBand {
  fact_code: string;
  position: number;
  score: number;
  lower: number | null;
  lower_inclusive: boolean;
  upper: number | null;
  upper_inclusive: boolean;
}

export interface EventTrigger {
  code: string;
  /** The trigger as the source words it. */
  source_trigger: string;
  affects: string[];
  /** A menu item, or detected from the directory (Milestone 8 prompts). */
  detection: "menu" | "directory";
  /** What the campaign deploys: the affected sub-dimensions, or a whole half-yearly. */
  deploys: "affected" | "half_yearly";
  source: string;
  position: number;
}

export interface ReferenceSet {
  survey_sections: SurveySection[];
  survey_items: SurveyItem[];
  pulse_rotation: PulseRotationRow[];
  modules: Module[];
  module_items: ModuleItem[];
  checklists: Checklist[];
  checklist_facts: ChecklistFact[];
  checklist_values: ChecklistValue[];
  checklist_bands: ChecklistBand[];
  event_triggers: EventTrigger[];
}
