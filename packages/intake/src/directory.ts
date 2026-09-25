/**
 * What the directory snapshot supplies: the audience headcounts the response rates divide by
 * (Setup B20:B23) and the FTE per unit, team and role family (Setup B16, B32:B41, L32:L41).
 * The snapshot is the one source; the unit context carries names only.
 */

import type { Member, Snapshot } from "./types";

export interface Headcounts {
  /** Everyone in the snapshot: the all-member survey's denominator. */
  members: number;
  /** Distinct managers with at least one direct report in the snapshot. */
  managers: number;
  leadershipTeam: number;
  teamLeaders: number;
}

/**
 * The leadership-team and team-leader counts are the frozen audiences where the snapshot carries
 * them (a leader from a unit above counts there and nowhere else), and the members' flags otherwise.
 */
export function headcounts(snapshot: Snapshot): Headcounts {
  const managers = new Set<string>();
  let leadershipTeam = 0;
  let teamLeaders = 0;
  for (const m of snapshot.members) {
    if (m.managerRef !== undefined) managers.add(m.managerRef);
    if (m.leadershipTeam === true) leadershipTeam += 1;
    if (m.teamLeader === true) teamLeaders += 1;
  }
  const audiences = snapshot.audiences;
  if (audiences?.leadershipTeam !== undefined)
    leadershipTeam = new Set(audiences.leadershipTeam).size;
  if (audiences?.teamLeaders !== undefined) teamLeaders = new Set(audiences.teamLeaders).size;
  return { members: snapshot.members.length, managers: managers.size, leadershipTeam, teamLeaders };
}

export function unitFte(snapshot: Snapshot): number {
  return sumFte(snapshot.members);
}

export function teamFte(snapshot: Snapshot, teamId: string): number {
  return sumFte(snapshot.members.filter((m) => m.teamId === teamId));
}

export function roleFamilyFte(snapshot: Snapshot, roleFamilyId: string): number {
  return sumFte(snapshot.members.filter((m) => m.roleFamilyId === roleFamilyId));
}

export function sumFte(members: readonly Member[]): number {
  let total = 0;
  for (const m of members) total += m.fte;
  return total;
}
