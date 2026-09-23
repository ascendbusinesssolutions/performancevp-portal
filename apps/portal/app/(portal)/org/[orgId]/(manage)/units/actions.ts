"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { setupCopy } from "@/lib/copy/setup";
import { unitsCopy, type UnitsCopyKey } from "@/lib/copy/units";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import { type DbError, errorKey, type ErrorRule } from "@/lib/setup/db-errors";
import { asUnitType } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

// Every action runs as the signed-in person. The database decides whether they may change this
// organisation's structure (administrators, the account owner, staff under a session, while the
// organisation is writable), keeps unit codes stable and unique, refuses a unit below itself, and
// writes the audit entry.

const RULES: readonly ErrorRule<UnitsCopyKey | "readOnly">[] = [
  ["23505", "business_units_code", "error.codeUsed"],
  ["23505", "teams_name", "error.nameUsed"],
  ["23514", "unit_code", "error.codeFormat"],
  ["23514", "below itself", "error.belowItself"],
  ["23514", "move everyone out", "error.hasStaff"],
  ["23514", "unit leader", "error.leader"],
  ["22023", "a merge has", "error.mergeShape"],
  ["22023", "a split has", "error.splitShape"],
  ["22023", "cannot succeed itself", "error.sameUnit"],
  ["22023", "move everyone out", "error.lineageStaff"],
  ["42501", null, "readOnly"],
];

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function list(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((v): v is string => typeof v === "string" && v !== "");
}

function failure(error: DbError | null): FormState {
  const key = errorKey(error, RULES, "readOnly");
  if (key === "readOnly") {
    return { error: error ? setupCopy["error.readOnly"] : setupCopy["error.generic"] };
  }
  return { error: unitsCopy[key] };
}

function done(orgId: string, message: string): FormState {
  revalidatePath(`/org/${orgId}`, "layout");
  return { message };
}

export async function addUnit(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const code = text(formData, "code");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(code))
    return { error: unitsCopy["error.codeFormat"] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_units")
    .insert({
      organisation_id: orgId,
      unit_code: code,
      name: text(formData, "name"),
      parent_unit_id: text(formData, "parentId") || null,
      unit_type: asUnitType(text(formData, "type")),
    })
    .select("id");
  if (error || !data?.length) return failure(error);
  return done(orgId, unitsCopy["add.done"]);
}

export async function updateUnit(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_units")
    .update({
      name: text(formData, "name"),
      parent_unit_id: text(formData, "parentId") || null,
      unit_type: asUnitType(text(formData, "type")),
    })
    .eq("id", text(formData, "unitId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, unitsCopy["edit.saved"]);
}

export async function setUnitLeader(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_units")
    .update({ unit_leader_employee_id: text(formData, "leaderId") || null })
    .eq("id", text(formData, "unitId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, unitsCopy["edit.saved"]);
}

export async function retireUnit(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const unitId = text(formData, "unitId");
  const supabase = await createClient();
  const { count } = await supabase
    .from("business_units")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .eq("parent_unit_id", unitId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return { error: unitsCopy["retire.hasChildren"] };
  const { data, error } = await supabase
    .from("business_units")
    .update({ status: "retired", retired_on: sydneyToday() })
    .eq("id", unitId)
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, unitsCopy["retire.done"]);
}

export async function addTeam(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      organisation_id: orgId,
      unit_id: text(formData, "unitId"),
      name: text(formData, "name"),
    })
    .select("id");
  if (error || !data?.length) return failure(error);
  return done(orgId, setupCopy["notice.saved"]);
}

export async function renameTeam(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ name: text(formData, "name") })
    .eq("id", text(formData, "teamId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, setupCopy["notice.saved"]);
}

export async function retireTeam(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const teamId = text(formData, "teamId");
  const supabase = await createClient();
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .eq("team_id", teamId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return { error: setupCopy["error.generic"] };
  const { data, error } = await supabase
    .from("teams")
    .update({ status: "retired" })
    .eq("id", teamId)
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  return done(orgId, setupCopy["notice.saved"]);
}

export async function recordLineage(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const date = text(formData, "effectiveDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: unitsCopy["error.lineageDate"] };
  const kind = text(formData, "kind");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_unit_lineage", {
    p_organisation_id: orgId,
    p_kind: kind === "split" ? "split" : "merge",
    p_predecessor_ids: list(formData, "predecessorIds"),
    p_successor_ids: list(formData, "successorIds"),
    p_effective_date: date,
  });
  if (error) return failure(error);
  return done(orgId, unitsCopy["lineage.done"]);
}
