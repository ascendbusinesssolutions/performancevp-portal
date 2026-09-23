import "server-only";

import { allRows } from "@/lib/supabase/all-rows";
import type { createClient } from "@/lib/supabase/server";

import type { UnitRow } from "./units";

/**
 * The reads the setup screens share. Each runs as the signed-in person, under row level security,
 * and reads every row a page at a time (allRows), so a large directory is never cut short.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

export interface Person {
  id: string;
  employee_ref: string;
  first_name: string;
  last_name: string;
  work_email: string | null;
  unit_id: string;
  team_id: string | null;
  manager_employee_id: string | null;
  role_family_id: string | null;
  role_title: string | null;
  start_date: string | null;
  fte: number;
  is_team_leader: boolean;
  is_leadership_team: boolean;
  status: string;
}

export interface Team {
  id: string;
  unit_id: string;
  name: string;
  status: string;
}

const PERSON_COLUMNS =
  "id, employee_ref, first_name, last_name, work_email, unit_id, team_id, manager_employee_id, " +
  "role_family_id, role_title, start_date, fte, is_team_leader, is_leadership_team, status";

export async function loadUnits(supabase: Client, orgId: string): Promise<UnitRow[]> {
  return allRows((from, to) =>
    supabase
      .from("business_units")
      .select("id, unit_code, name, parent_unit_id, unit_type, status, unit_leader_employee_id")
      .eq("organisation_id", orgId)
      .order("id")
      .range(from, to),
  );
}

export async function loadActivePeople(supabase: Client, orgId: string): Promise<Person[]> {
  const rows = await allRows((from, to) =>
    supabase
      .from("employees")
      .select(PERSON_COLUMNS)
      .eq("organisation_id", orgId)
      .eq("status", "active")
      .order("id")
      .range(from, to),
  );
  return (rows as unknown as Person[]).map((p) => ({ ...p, fte: Number(p.fte) }));
}

export async function loadTeams(supabase: Client, orgId: string): Promise<Team[]> {
  return allRows((from, to) =>
    supabase
      .from("teams")
      .select("id, unit_id, name, status")
      .eq("organisation_id", orgId)
      .order("id")
      .range(from, to),
  );
}

/** Active headcount per unit. */
export function headcountByUnit(people: readonly Person[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of people) counts.set(p.unit_id, (counts.get(p.unit_id) ?? 0) + 1);
  return counts;
}
