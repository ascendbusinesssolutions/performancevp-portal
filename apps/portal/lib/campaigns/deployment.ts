import type { Deployment, PartAItem, PartBItem } from "@performancevp/intake";

import { REFERENCE, type ReferenceSet } from "@/lib/reference";

import type { CampaignCadence } from "./cadence";

/**
 * What a campaign asks of a measurement unit, per cadence (Milestone 5 plan, 3.5; Survey Blueprint
 * 1.2 and Part 6; Cadence Master 7.2 and 7.3; Online Measurement Specification Part 2 and 6.3). Pure,
 * from the reference set, which the drift test holds equal to the seeded tables. The launch freezes
 * the audiences on campaign_audiences, and the close hands the intake the same Deployment, so what
 * is asked is what is scored.
 *
 * - Baseline and annual: every Part A item (71), Part B (the cascade, information access and the
 *   unit's three processes), the team-leader and leadership-team modules, the manager modules (C3
 *   only where the unit is not on the formal-ratings route) and all three checklists.
 * - Half-yearly: the 57 H-tagged Part A items and the capacity checklist.
 * - Quarterly pulse: the rotation row's items, which include OI5, TSI2 and CII-13 every quarter (D6).
 * - Event: the full baseline bank of each affected Part A block, with the structural instruments of
 *   each affected Opportunity sub-dimension, the leadership module for O1, and the manager modules
 *   for C1 (with S1) and C3 where affected (D8). A trigger that calls for a half-yearly deploys one.
 *
 * Anything not deployed is carried forward by the intake from the prior cycle.
 */

export type AudienceKey =
  | "members_part_a"
  | "members_part_b"
  | "team_leaders"
  | "leadership_team"
  | "managers"
  | "admin_checklists";

export const AUDIENCE_ORDER: readonly AudienceKey[] = [
  "members_part_a",
  "members_part_b",
  "managers",
  "team_leaders",
  "leadership_team",
  "admin_checklists",
];

export interface AudienceDeployment {
  items: string[];
  processIds?: string[];
}

export interface UnitDeployment {
  deployment: Deployment;
  audiences: Partial<Record<AudienceKey, AudienceDeployment>>;
}

export interface DeploymentChoice {
  cadence: CampaignCadence;
  /** The pulse's rotation row, 1 to 4. */
  rotation: number | null;
  /** The event trigger's code. */
  trigger: string | null;
  c3Route: "formal" | "module";
  /** The unit's critical processes, in the order the survey asks them. */
  processIds: readonly string[];
}

type Checklist = "ADM-O1" | "ADM-O2" | "ADM-O4";

/** The Part A block each sub-dimension's items sit in; the trip-wires are single items. */
const PART_A_OF: Readonly<Record<string, { block: string } | { item: string }>> = {
  C4: { block: "C4" },
  M1: { block: "M1" },
  M2: { block: "M2" },
  M3: { block: "M3" },
  M4: { block: "M4" },
  O1: { block: "O1" },
  O2: { block: "O2" },
  O3: { block: "O3" },
  O4: { block: "O4" },
  O5: { block: "O5" },
  S2: { block: "S2" },
  S3: { block: "S3" },
  TW1: { item: "TW-01" },
  TW2: { item: "TW-02" },
  TW3: { item: "TW-03" },
};

/** The structural checklist of each Opportunity sub-dimension that has one. */
const CHECKLIST_OF: Readonly<Record<string, Checklist>> = {
  O1: "ADM-O1",
  O2: "ADM-O2",
  O4: "ADM-O4",
};

const ALL_CHECKLISTS: readonly Checklist[] = ["ADM-O1", "ADM-O2", "ADM-O4"];

function moduleItems(reference: ReferenceSet, module: string): string[] {
  return reference.module_items
    .filter((i) => i.module_code === module && i.online)
    .sort((a, b) => a.position - b.position)
    .map((i) => i.code);
}

function partAItems(
  reference: ReferenceSet,
  keep: (item: ReferenceSet["survey_items"][number]) => boolean,
): string[] {
  return reference.survey_items
    .filter(keep)
    .sort((a, b) => a.position - b.position)
    .map((i) => i.code);
}

interface Asked {
  partA: string[];
  cascade: boolean;
  informationAccess: boolean;
  processFriction: boolean;
  teamLeaders: boolean;
  leadershipTeam: boolean;
  managers: { c1: boolean; c2: boolean; c3: boolean };
  checklists: Checklist[];
}

const NOTHING: Asked = {
  partA: [],
  cascade: false,
  informationAccess: false,
  processFriction: false,
  teamLeaders: false,
  leadershipTeam: false,
  managers: { c1: false, c2: false, c3: false },
  checklists: [],
};

function halfYearly(reference: ReferenceSet): Asked {
  return {
    ...NOTHING,
    partA: partAItems(reference, (i) => i.in_half_yearly),
    checklists: ["ADM-O4"],
  };
}

function asked(choice: DeploymentChoice, reference: ReferenceSet): Asked {
  const formal = choice.c3Route === "formal";
  switch (choice.cadence) {
    case "baseline":
    case "annual":
      return {
        partA: partAItems(reference, (i) =>
          choice.cadence === "annual" ? i.in_annual : i.in_baseline,
        ),
        cascade: true,
        informationAccess: true,
        processFriction: true,
        teamLeaders: true,
        leadershipTeam: true,
        managers: { c1: true, c2: true, c3: !formal },
        checklists: [...ALL_CHECKLISTS],
      };
    case "half_yearly":
      return halfYearly(reference);
    case "quarterly_pulse": {
      const row = new Set(
        reference.pulse_rotation
          .filter((r) => r.rotation === choice.rotation)
          .map((r) => r.item_code),
      );
      if (row.size === 0) throw new Error(`no pulse rotation row ${String(choice.rotation)}`);
      return { ...NOTHING, partA: partAItems(reference, (i) => row.has(i.code)) };
    }
    case "event_triggered": {
      const trigger = reference.event_triggers.find((t) => t.code === choice.trigger);
      if (!trigger) throw new Error(`no event trigger ${String(choice.trigger)}`);
      if (trigger.deploys === "half_yearly") return halfYearly(reference);
      const affects = new Set(trigger.affects);
      const blocks = new Set<string>();
      const items = new Set<string>();
      for (const code of affects) {
        const where = PART_A_OF[code];
        if (where && "block" in where) blocks.add(where.block);
        if (where && "item" in where) items.add(where.item);
      }
      return {
        partA: partAItems(
          reference,
          (i) => i.in_baseline && (blocks.has(i.block) || items.has(i.code)),
        ),
        cascade: affects.has("O1"),
        informationAccess: affects.has("O2"),
        processFriction: affects.has("O3"),
        teamLeaders: affects.has("C5"),
        leadershipTeam: affects.has("O1"),
        managers: {
          c1: affects.has("C1") || affects.has("S1"),
          c2: affects.has("C2"),
          c3: affects.has("C3") && !formal,
        },
        checklists: ALL_CHECKLISTS.filter((c) =>
          [...affects].some((code) => CHECKLIST_OF[code] === c),
        ),
      };
    }
  }
}

export function deploymentFor(
  choice: DeploymentChoice,
  reference: ReferenceSet = REFERENCE,
): UnitDeployment {
  const a = asked(choice, reference);
  const partBItems = [
    ...(a.cascade ? moduleItems(reference, "M-O1-CASCADE") : []),
    ...(a.informationAccess ? moduleItems(reference, "M-O2-IA") : []),
  ];
  const processIds = a.processFriction ? [...choice.processIds] : [];
  const partB = partBItems.length > 0 || processIds.length > 0;
  const managerItems = (["c1", "c2", "c3"] as const).filter((m) => a.managers[m]);

  const audiences: UnitDeployment["audiences"] = {};
  if (a.partA.length > 0) audiences.members_part_a = { items: a.partA };
  if (partB) audiences.members_part_b = { items: partBItems, processIds };
  if (managerItems.length > 0) audiences.managers = { items: managerItems };
  if (a.teamLeaders) audiences.team_leaders = { items: moduleItems(reference, "M-C5-TL") };
  // The leadership module repeats over the unit's decision types; it has no item list of its own.
  if (a.leadershipTeam) audiences.leadership_team = { items: [] };
  if (a.checklists.length > 0) audiences.admin_checklists = { items: [...a.checklists] };

  const deployment: Deployment = {
    ...(a.partA.length > 0 ? { partA: a.partA as PartAItem[] } : {}),
    ...(partB ? { partB: { items: partBItems as PartBItem[], processIds } } : {}),
    ...(a.teamLeaders ? { teamLeaders: true } : {}),
    ...(a.leadershipTeam ? { leadershipTeam: true } : {}),
    ...(managerItems.length > 0 ? { managers: { ...a.managers } } : {}),
    ...(a.checklists.length > 0 ? { checklists: [...a.checklists] } : {}),
  };
  return { deployment, audiences };
}
