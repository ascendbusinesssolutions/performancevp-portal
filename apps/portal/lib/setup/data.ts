import "server-only";

import { allRows } from "@/lib/supabase/all-rows";
import type { createClient } from "@/lib/supabase/server";

import type { DomainRow, NamedRow, SkillRow } from "./frameworks";
import type { MeasurementUnitRow, MemberRow } from "./measurement";
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
  employment_status: string | null;
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
  "role_family_id, role_title, start_date, fte, is_team_leader, is_leadership_team, employment_status, status";

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

export async function loadRoleFamilies(
  supabase: Client,
  orgId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    is_people_leader: boolean;
    status: string;
    template_code: string | null;
  }>
> {
  return allRows((from, to) =>
    supabase
      .from("role_families")
      .select("id, name, is_people_leader, status, template_code")
      .eq("organisation_id", orgId)
      .order("id")
      .range(from, to),
  );
}

/** One directory record, active or deactivated. */
export async function loadPerson(
  supabase: Client,
  orgId: string,
  employeeId: string,
): Promise<Person | null> {
  const { data } = await supabase
    .from("employees")
    .select(PERSON_COLUMNS)
    .eq("organisation_id", orgId)
    .eq("id", employeeId)
    .maybeSingle();
  if (!data) return null;
  const person = data as unknown as Person;
  return { ...person, fte: Number(person.fte) };
}

export async function loadSkills(supabase: Client, orgId: string): Promise<SkillRow[]> {
  return allRows((from, to) =>
    supabase
      .from("skills")
      .select("id, role_family_id, name, is_critical, kind, status")
      .eq("organisation_id", orgId)
      .order("id")
      .range(from, to),
  );
}

export interface UnitContextRows {
  domains: DomainRow[];
  decisions: Array<NamedRow & { from_starter_list: boolean }>;
  processes: NamedRow[];
  systems: NamedRow[];
}

/**
 * The unit context of every measurement unit: knowledge domains, decision types, processes and
 * systems (Milestone 4b: context belongs to measurement units).
 */
export async function loadUnitContext(supabase: Client, orgId: string): Promise<UnitContextRows> {
  const [domains, decisions, processes, systems] = await Promise.all([
    allRows((from, to) =>
      supabase
        .from("knowledge_domains")
        .select("id, measurement_unit_id, name, status, criticality")
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("decision_types")
        .select("id, measurement_unit_id, name, status, from_starter_list")
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("critical_processes")
        .select("id, measurement_unit_id, name, status")
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("primary_systems")
        .select("id, measurement_unit_id, name, status")
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
  ]);
  return { domains, decisions, processes, systems };
}

/** The organisation's measurement units and which units each holds now (Milestone 4b). */
export async function loadMeasurementUnits(
  supabase: Client,
  orgId: string,
): Promise<{ measurementUnits: MeasurementUnitRow[]; members: MemberRow[] }> {
  const [measurementUnits, members] = await Promise.all([
    allRows((from, to) =>
      supabase
        .from("measurement_units")
        .select(
          "id, code, name, kind, status, single_unit_id, unit_leader_employee_id, grouping_kept_at",
        )
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("measurement_unit_members")
        .select("measurement_unit_id, business_unit_id")
        .eq("organisation_id", orgId)
        .is("ended_at", null)
        .order("id")
        .range(from, to),
    ),
  ]);
  return { measurementUnits, members };
}

/**
 * A unit's single measurement unit, where its context is written until the context screens are
 * keyed on measurement units (Milestone 4b, step 4).
 */
export async function singleMeasurementUnitId(
  supabase: Client,
  orgId: string,
  unitId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("measurement_units")
    .select("id")
    .eq("organisation_id", orgId)
    .eq("single_unit_id", unitId)
    .maybeSingle();
  return data?.id ?? null;
}

export interface Template {
  code: string;
  kind: string;
  name: string;
  unit_type: string | null;
  is_people_leader: boolean;
  version: number;
  is_placeholder: boolean;
  items: Array<{
    position: number;
    name: string;
    skill_kind: string | null;
    is_critical: boolean | null;
  }>;
}

/** The template library and starter lists (reference data), with their items in order. */
export async function loadTemplates(supabase: Client): Promise<Template[]> {
  const [{ data: templates }, { data: items }] = await Promise.all([
    supabase
      .from("ref_templates")
      .select("code, kind, name, unit_type, is_people_leader, version, is_placeholder, sort_order")
      .order("kind")
      .order("sort_order"),
    supabase
      .from("ref_template_items")
      .select("template_code, position, name, skill_kind, is_critical")
      .order("template_code")
      .order("position"),
  ]);
  return (templates ?? []).map((t) => ({
    code: t.code,
    kind: t.kind,
    name: t.name,
    unit_type: t.unit_type,
    is_people_leader: t.is_people_leader,
    version: t.version,
    is_placeholder: t.is_placeholder,
    items: (items ?? [])
      .filter((i) => i.template_code === t.code)
      .map((i) => ({
        position: i.position,
        name: i.name,
        skill_kind: i.skill_kind,
        is_critical: i.is_critical,
      })),
  }));
}

/**
 * The organisation's formal ratings for the readiness check and the mapping screen: read through
 * read_formal_ratings with the purpose 'check', which is logged as ratings.checked (not as a view).
 * Only counts derived from them reach the page. Paged, since max_rows applies to functions too.
 */
export async function loadFormalRatingsForCheck(
  supabase: Client,
  orgId: string,
): Promise<
  Array<{ employee_id: string; unit_id: string; rating_label: string; rating_date: string }>
> {
  return allRows((from, to) =>
    supabase
      .rpc("read_formal_ratings", { p_organisation_id: orgId, p_purpose: "check" })
      .select("employee_id, unit_id, rating_label, rating_date")
      .range(from, to),
  );
}

export interface ScaleMap {
  decision: "mapped" | "skipped";
  calibrated: boolean | null;
  entries: Array<{ label: string; band: 1 | 2 | 3 | 4 | 5 }>;
}

export async function loadScaleMap(supabase: Client, orgId: string): Promise<ScaleMap | null> {
  const [{ data: map }, { data: entries }] = await Promise.all([
    supabase
      .from("rating_scale_maps")
      .select("decision, calibrated")
      .eq("organisation_id", orgId)
      .maybeSingle(),
    supabase.from("rating_scale_map_entries").select("label, band").eq("organisation_id", orgId),
  ]);
  if (!map) return null;
  return {
    decision: map.decision === "skipped" ? "skipped" : "mapped",
    calibrated: map.calibrated,
    entries: (entries ?? []).map((e) => ({ label: e.label, band: e.band as 1 | 2 | 3 | 4 | 5 })),
  };
}
