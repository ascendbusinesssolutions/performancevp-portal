/**
 * The unit-level aggregates the recommendations rules read (Online Recommendations Specification
 * Parts 3 and 8): item-group scores, the component scores behind the two-layer composites, S1's
 * uncovered critical skills, C1 coverage by skill kind per role family, and per-team M1, M2 and
 * O5 for teams above the display threshold. Every value is about the unit or a team; nothing
 * names a person.
 */

import type { Assembly } from "./assemble";
import { C1_PROFICIENCY_THRESHOLD, MI1_GROUPS, O2I_GROUPS, TSI3_GROUPS } from "./constants";
import { average, ge, isNumber, type Cell } from "./excel";
import { scoreItemMeans } from "./items";
import { itemMeans } from "./means";
import { anonymityFloor } from "./thresholds";
import {
  MI1_ITEMS,
  MI2_ITEMS,
  type Aggregates,
  type IntakeInput,
  type MemberResponse,
  type SurveyItem,
} from "./types";

/** A group's converted score, only when every item of the group was deployed. */
function groupScore(
  items: readonly SurveyItem[],
  means: Partial<Record<string, number>>,
  deployed: ReadonlySet<string>,
): Cell {
  if (!items.every((item) => deployed.has(item))) return undefined;
  return scoreItemMeans(items, means);
}

/** A team's converted M1 or M2 from its valid rows: the mean of item means, reverse items flipped. */
function teamBlockScore(rows: readonly MemberResponse[], items: readonly SurveyItem[]): Cell {
  return items.length === 0 ? undefined : scoreItemMeans(items, itemMeans(rows, items));
}

/** Per role family, the mean over its rated people of proficient skills over framework skills, by kind. */
export function coverageByKind(
  input: IntakeInput,
  assembly: Assembly,
): Aggregates["c1CoverageByKind"] {
  return input.unit.roleFamilies.map((family) => {
    const rows = assembly.workbook.typeC.c1.rows.filter(
      (r) => r.roleFamilyId === family.id && r.coverage !== undefined,
    );
    const kinds = family.skills.map((s) => s.kind);
    const share = (kind: "technical" | "behavioural" | "all"): Cell => {
      const indexes = kinds.flatMap((k, i) => (kind === "all" || k === kind ? [i] : []));
      if (indexes.length === 0) return undefined;
      return average(
        rows.map((row) => {
          let proficient = 0;
          for (const i of indexes) {
            const rating = row.skills[i];
            if (isNumber(rating) && ge(rating, C1_PROFICIENCY_THRESHOLD)) proficient += 1;
          }
          return proficient / indexes.length;
        }),
      );
    };
    return {
      roleFamilyId: family.id,
      peopleLeader: family.peopleLeader === true,
      technical: share("technical"),
      behavioural: share("behavioural"),
      overall: share("all"),
    };
  });
}

export function buildAggregates(input: IntakeInput, assembly: Assembly): Aggregates {
  const deployedA = new Set<string>(input.campaign.deployed.partA ?? []);
  const deployedB = new Set<string>(input.campaign.deployed.partB?.items ?? []);
  const means = assembly.workbook.typeA.means as Partial<Record<string, number>>;
  const validRows = assembly.workbook.screening.members.valid;
  const iaMeans = itemMeans(assembly.workbook.partBValid, [
    ...O2I_GROUPS.access,
    ...O2I_GROUPS.use,
  ]);
  const mi1Deployed = MI1_ITEMS.filter((i) => deployedA.has(i));
  const mi2Deployed = MI2_ITEMS.filter((i) => deployedA.has(i));

  const teams = assembly.teams.statuses
    .filter((status) => status.valid)
    .map((status) => {
      const rows =
        status.teamId === "unit" ? validRows : validRows.filter((r) => r.teamId === status.teamId);
      const m1Ok = status.validCount >= anonymityFloor("M1");
      const m2Ok = status.validCount >= anonymityFloor("M2");
      const o5 = assembly.teams.o5Teams.find((t) => t.name === status.name)?.score;
      return {
        teamId: status.teamId,
        m1: m1Ok ? teamBlockScore(rows, mi1Deployed) : undefined,
        m2: m2Ok ? teamBlockScore(rows, mi2Deployed) : undefined,
        o5,
      };
    });

  return {
    m1Engagement: groupScore(MI1_GROUPS.engagement, means, deployedA),
    m1TeamConfidence: groupScore(MI1_GROUPS.teamConfidence, means, deployedA),
    o2IaAccess: groupScore(O2I_GROUPS.access, iaMeans, deployedB),
    o2IaUse: groupScore(O2I_GROUPS.use, iaMeans, deployedB),
    s3TaskConflict: groupScore(TSI3_GROUPS.task, means, deployedA),
    s3RelationshipConflict: groupScore(TSI3_GROUPS.relationship, means, deployedA),
    processFriction: assembly.workbook.typeC.processFriction.processes.map((p) => ({
      processId: p.processId,
      score: p.score,
    })),
    decisionRights: assembly.workbook.typeC.leadership.score,
    cascade: assembly.workbook.typeC.cascade.score,
    toolInventory: assembly.admO2.toolInventoryScore,
    integration: assembly.admO2.integrationScore,
    informationAccess: assembly.workbook.typeC.informationAccess.score,
    capacityFacts: assembly.admO4.score,
    criticalSkillsUncovered: assembly.s1.criticalSkillsUncovered,
    c1CoverageByKind: coverageByKind(input, assembly),
    teams,
    c3GuardFired:
      assembly.c3Route.source === "module" &&
      assembly.adjustments.some((a) => a.subDimension === "C3" && a.applied),
    formalRatingsFailedAcceptance:
      assembly.c3Route.source === "formal" && assembly.c3Route.treatment === "uncalibrated-capped",
  };
}
