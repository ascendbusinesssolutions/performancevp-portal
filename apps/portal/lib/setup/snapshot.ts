import type { Snapshot } from "@performancevp/intake";

/**
 * The live directory in the intake package's own shape: one unit's members as they would be frozen
 * if a campaign launched now. The readiness check and the formal-ratings screen run the intake's
 * functions over it, so what they preview is what the campaign close will compute. Milestone 5's
 * launch builds the real snapshot the same way.
 */
export interface SnapshotPerson {
  id: string;
  employee_ref: string;
  unit_id: string;
  team_id: string | null;
  role_family_id: string | null;
  manager_employee_id: string | null;
  start_date: string | null;
  fte: number;
  is_team_leader: boolean;
  is_leadership_team: boolean;
}

export interface FormalRatingRow {
  employee_id: string;
  rating_label: string;
  rating_date: string;
}

export function unitSnapshot(
  unitId: string,
  people: readonly SnapshotPerson[],
  ratings: readonly FormalRatingRow[] = [],
): Snapshot {
  const refOf = new Map(people.map((p) => [p.id, p.employee_ref]));
  const ratingOf = new Map(ratings.map((r) => [r.employee_id, r]));
  return {
    members: people
      .filter((p) => p.unit_id === unitId)
      .map((p) => {
        const rating = ratingOf.get(p.id);
        const managerRef = p.manager_employee_id ? refOf.get(p.manager_employee_id) : undefined;
        return {
          employeeRef: p.employee_ref,
          fte: p.fte,
          ...(p.team_id ? { teamId: p.team_id } : {}),
          ...(p.role_family_id ? { roleFamilyId: p.role_family_id } : {}),
          ...(p.start_date ? { startDate: p.start_date } : {}),
          ...(p.is_team_leader ? { teamLeader: true } : {}),
          ...(p.is_leadership_team ? { leadershipTeam: true } : {}),
          ...(managerRef ? { managerRef } : {}),
          ...(rating
            ? { formalRating: { label: rating.rating_label, date: rating.rating_date } }
            : {}),
        };
      }),
  };
}
