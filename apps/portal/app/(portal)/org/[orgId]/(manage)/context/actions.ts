"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { contextCopy, type ContextCopyKey } from "@/lib/copy/context";
import { setupCopy } from "@/lib/copy/setup";
import { requireOrgManager } from "@/lib/org/context";
import { singleMeasurementUnitId } from "@/lib/setup/data";
import { type DbError, errorKey, type ErrorRule } from "@/lib/setup/db-errors";
import { createClient } from "@/lib/supabase/server";

// Every action runs as the signed-in person. The database decides whether they may change this
// organisation's context (administrators, the account owner, staff under a session, while the
// organisation is writable) and writes the audit entry. Nothing is deleted: a row is retired, and
// adding a name that was retired brings it back, so its history stays joined up.

type Client = Awaited<ReturnType<typeof createClient>>;
type NamedTable = "decision_types" | "critical_processes" | "primary_systems" | "knowledge_domains";

const RULES: readonly ErrorRule<ContextCopyKey | "readOnly">[] = [
  ["23505", null, "error.nameUsed"],
  ["42501", null, "readOnly"],
];

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function failure(error: DbError | null): FormState {
  const key = errorKey(error, RULES, "readOnly");
  if (key === "readOnly") {
    return { error: error ? setupCopy["error.readOnly"] : setupCopy["error.generic"] };
  }
  return { error: contextCopy[key] };
}

function done(orgId: string, message: string = setupCopy["notice.saved"]): FormState {
  revalidatePath(`/org/${orgId}`, "layout");
  return { message };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Adds a named row to a unit's measurement unit, or brings back a retired row of the same name
 * (names are unique per measurement unit, case aside, retired rows included). onUpdate may set only
 * columns the database lets a client update. Returns the database's refusal, if any.
 */
async function addNamed(
  supabase: Client,
  table: NamedTable,
  orgId: string,
  unitId: string,
  name: string,
  onInsert: Record<string, unknown> = {},
  onUpdate: Record<string, unknown> = {},
): Promise<DbError | null> {
  const measurementUnitId = await singleMeasurementUnitId(supabase, orgId, unitId);
  if (!measurementUnitId) return { code: "42501" };
  const { data: existing } = await supabase
    .from(table)
    .select("id, name, status")
    .eq("organisation_id", orgId)
    .eq("measurement_unit_id", measurementUnitId)
    .ilike("name", escapeLike(name));
  const same = (existing ?? []).find((r) => r.name.toLowerCase() === name.toLowerCase());
  if (same?.status === "active") return { code: "23505", message: "name in use" };
  if (same) {
    const { data, error } = await supabase
      .from(table)
      .update({ status: "active", ...onUpdate } as never)
      .eq("id", same.id)
      .select("id");
    return error ?? (data?.length ? null : { code: "42501" });
  }
  const { data, error } = await supabase
    .from(table)
    .insert({
      organisation_id: orgId,
      measurement_unit_id: measurementUnitId,
      name,
      ...onInsert,
    } as never)
    .select("id");
  return error ?? (data?.length ? null : { code: "42501" });
}

async function retireRow(supabase: Client, table: NamedTable, orgId: string, id: string) {
  const { data, error } = await supabase
    .from(table)
    .update({ status: "retired" })
    .eq("id", id)
    .eq("organisation_id", orgId)
    .select("id");
  return error ?? (data?.length ? null : { code: "42501" });
}

// Role families and skills --------------------------------------------------------------------------

interface SkillInput {
  name: string;
  kind: "technical" | "behavioural";
  is_critical: boolean;
}

/** The kept rows of the new-family form: skill_<i>_keep, _name, _kind, _critical. */
function skillRows(formData: FormData): SkillInput[] {
  const rows: SkillInput[] = [];
  for (let i = 0; i < 40; i++) {
    const name = text(formData, `skill_${i}_name`);
    if (name === "" || formData.get(`skill_${i}_keep`) !== "on") continue;
    rows.push({
      name,
      kind: text(formData, `skill_${i}_kind`) === "behavioural" ? "behavioural" : "technical",
      is_critical: formData.get(`skill_${i}_critical`) === "on",
    });
  }
  return rows;
}

export async function createFamily(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const name = text(formData, "name");
  const skills = skillRows(formData);
  const lower = skills.map((s) => s.name.toLowerCase());
  if (new Set(lower).size !== lower.length) return { error: contextCopy["error.nameUsed"] };

  const supabase = await createClient();
  const templateCode = text(formData, "templateCode");
  const templateVersion = Number(text(formData, "templateVersion"));
  const { data, error } = await supabase
    .from("role_families")
    .insert({
      organisation_id: orgId,
      name,
      is_people_leader: formData.get("peopleLeader") === "on",
      template_code: templateCode || null,
      template_version: templateCode && templateVersion > 0 ? templateVersion : null,
    })
    .select("id");
  if (error || !data?.length) return failure(error);
  const familyId = data[0]!.id;
  if (skills.length > 0) {
    const { error: skillError } = await supabase
      .from("skills")
      .insert(skills.map((s) => ({ organisation_id: orgId, role_family_id: familyId, ...s })));
    if (skillError) return failure(skillError);
  }
  revalidatePath(`/org/${orgId}`, "layout");
  redirect(`/org/${orgId}/context/role-families/${familyId}?notice=created`);
}

/** Adds the kept skills of a template to an existing role family, such as one an upload created. */
export async function addTemplateSkills(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const familyId = text(formData, "familyId");
  const skills = skillRows(formData);
  const lower = skills.map((s) => s.name.toLowerCase());
  if (new Set(lower).size !== lower.length) return { error: contextCopy["error.nameUsed"] };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("skills")
    .select("id, name, status")
    .eq("organisation_id", orgId)
    .eq("role_family_id", familyId);
  const byName = new Map((existing ?? []).map((r) => [r.name.toLowerCase(), r]));
  const fresh = skills.filter((s) => !byName.has(s.name.toLowerCase()));
  for (const s of skills) {
    const row = byName.get(s.name.toLowerCase());
    if (row && row.status !== "active") {
      const { error } = await supabase
        .from("skills")
        .update({ status: "active", kind: s.kind, is_critical: s.is_critical })
        .eq("id", row.id);
      if (error) return failure(error);
    }
  }
  if (fresh.length > 0) {
    const { error } = await supabase
      .from("skills")
      .insert(fresh.map((s) => ({ organisation_id: orgId, role_family_id: familyId, ...s })));
    if (error) return failure(error);
  }
  revalidatePath(`/org/${orgId}`, "layout");
  redirect(`/org/${orgId}/context/role-families/${familyId}?notice=saved`);
}

export async function updateFamily(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_families")
    .update({
      name: text(formData, "name"),
      is_people_leader: formData.get("peopleLeader") === "on",
    })
    .eq("id", text(formData, "familyId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, contextCopy["family.saved"]);
}

export async function retireFamily(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const familyId = text(formData, "familyId");
  const supabase = await createClient();
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .eq("role_family_id", familyId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return { error: contextCopy["error.familyInUse"] };
  const { data, error } = await supabase
    .from("role_families")
    .update({ status: "retired" })
    .eq("id", familyId)
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  redirect(`/org/${orgId}/context`);
}

export async function addSkill(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const familyId = text(formData, "familyId");
  const name = text(formData, "name");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("skills")
    .select("id, name, status")
    .eq("organisation_id", orgId)
    .eq("role_family_id", familyId)
    .ilike("name", escapeLike(name));
  const same = (existing ?? []).find((r) => r.name.toLowerCase() === name.toLowerCase());
  if (same?.status === "active") return { error: contextCopy["error.nameUsed"] };
  const values = {
    kind: text(formData, "kind") === "behavioural" ? "behavioural" : "technical",
    is_critical: formData.get("critical") === "on",
  };
  const { data, error } = same
    ? await supabase
        .from("skills")
        .update({ status: "active", ...values })
        .eq("id", same.id)
        .select("id")
    : await supabase
        .from("skills")
        .insert({ organisation_id: orgId, role_family_id: familyId, name, ...values })
        .select("id");
  if (error || !data?.length) return failure(error);
  return done(orgId);
}

export async function updateSkill(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skills")
    .update({
      name: text(formData, "name"),
      kind: text(formData, "kind") === "behavioural" ? "behavioural" : "technical",
      is_critical: formData.get("critical") === "on",
    })
    .eq("id", text(formData, "skillId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId);
}

export async function retireSkill(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skills")
    .update({ status: "retired" })
    .eq("id", text(formData, "skillId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId);
}

// A unit's knowledge domains, decision types, processes and systems ----------------------------------

export async function addDomain(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const criticality = Number(text(formData, "criticality"));
  const supabase = await createClient();
  const level = { criticality: [1, 2, 3].includes(criticality) ? criticality : 2 };
  const error = await addNamed(
    supabase,
    "knowledge_domains",
    orgId,
    text(formData, "unitId"),
    text(formData, "name"),
    level,
    level,
  );
  return error ? failure(error) : done(orgId);
}

export async function setDomainCriticality(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const criticality = Number(text(formData, "criticality"));
  if (![1, 2, 3].includes(criticality)) return { error: setupCopy["error.generic"] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_domains")
    .update({ criticality })
    .eq("id", text(formData, "rowId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId);
}

const TABLES: Record<string, NamedTable> = {
  domain: "knowledge_domains",
  decision: "decision_types",
  process: "critical_processes",
  system: "primary_systems",
};

export async function addUnitItem(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const table = TABLES[text(formData, "kind")];
  if (!table || table === "knowledge_domains") return { error: setupCopy["error.generic"] };
  const unitId = text(formData, "unitId");
  const supabase = await createClient();
  const measurementUnitId = await singleMeasurementUnitId(supabase, orgId, unitId);
  if (!measurementUnitId) return { error: setupCopy["error.generic"] };
  if (table === "critical_processes") {
    const { count } = await supabase
      .from("critical_processes")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("measurement_unit_id", measurementUnitId)
      .eq("status", "active");
    if ((count ?? 0) >= 3) return { error: contextCopy["error.processesFull"] };
  }
  const error = await addNamed(supabase, table, orgId, unitId, text(formData, "name"));
  return error ? failure(error) : done(orgId);
}

export async function retireUnitItem(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const table = TABLES[text(formData, "kind")];
  if (!table) return { error: setupCopy["error.generic"] };
  const supabase = await createClient();
  const error = await retireRow(supabase, table, orgId, text(formData, "rowId"));
  return error ? failure(error) : done(orgId);
}

/**
 * Saves the choice from a unit's starter list of decision types: checked names are added (or
 * brought back), unchecked starter names are retired. The client's own decision types are left alone.
 */
export async function saveDecisionSelection(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const unitId = text(formData, "unitId");
  const offered = formData.getAll("offered").filter((v): v is string => typeof v === "string");
  const chosen = new Set(
    formData
      .getAll("chosen")
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.toLowerCase()),
  );
  const supabase = await createClient();
  const measurementUnitId = await singleMeasurementUnitId(supabase, orgId, unitId);
  if (!measurementUnitId) return { error: setupCopy["error.generic"] };
  const { data: existing } = await supabase
    .from("decision_types")
    .select("id, name, status")
    .eq("organisation_id", orgId)
    .eq("measurement_unit_id", measurementUnitId);
  const byName = new Map((existing ?? []).map((r) => [r.name.toLowerCase(), r]));
  for (const name of offered) {
    const row = byName.get(name.toLowerCase());
    if (chosen.has(name.toLowerCase())) {
      if (row?.status === "active") continue;
      const error = await addNamed(supabase, "decision_types", orgId, unitId, name, {
        from_starter_list: true,
      });
      if (error) return failure(error);
    } else if (row?.status === "active") {
      const error = await retireRow(supabase, "decision_types", orgId, row.id);
      if (error) return failure(error);
    }
  }
  return done(orgId);
}
