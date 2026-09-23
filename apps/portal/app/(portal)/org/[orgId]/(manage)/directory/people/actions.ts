"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { directoryCopy, type DirectoryCopyKey } from "@/lib/copy/directory";
import { setupCopy } from "@/lib/copy/setup";
import { requireOrgManager } from "@/lib/org/context";
import { type DbError, errorKey, type ErrorRule } from "@/lib/setup/db-errors";
import { createClient } from "@/lib/supabase/server";

// Every action runs as the signed-in person; the database decides whether they may change this
// organisation's directory, keeps reporting lines from looping and teams inside their unit, and
// writes the audit entry. Formal ratings go through set_formal_rating, which checks and logs.

const RULES: readonly ErrorRule<DirectoryCopyKey | "readOnly">[] = [
  ["23505", "employees_ref", "error.refUsed"],
  ["23505", "employees_active_email", "error.emailUsed"],
  ["23503", "team", "error.teamUnit"],
  ["23514", "retired unit", "error.retiredUnit"],
  ["23514", "loop", "error.managerLoop"],
  ["23514", "manager_employee_id", "error.managerSelf"],
  ["23514", "fte", "error.fte"],
  ["23514", "work_email", "error.email"],
  ["22023", "rating date", "error.ratingDate"],
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
  return { error: directoryCopy[key] };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^@\s]+@[^@\s]+$/;

/** Resolves a manager's employee ID to their record, matching without regard to case. */
async function managerId(orgId: string, ref: string): Promise<string | null | undefined> {
  if (ref === "") return null;
  const supabase = await createClient();
  const pattern = ref.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await supabase
    .from("employees")
    .select("id, employee_ref")
    .eq("organisation_id", orgId)
    .ilike("employee_ref", pattern)
    .limit(5);
  return (data ?? []).find((e) => e.employee_ref.toLowerCase() === ref.toLowerCase())?.id;
}

export async function savePerson(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const employeeId = text(formData, "employeeId");

  const fte = Number(text(formData, "fte"));
  if (!Number.isFinite(fte) || fte <= 0 || fte > 1) return { error: directoryCopy["error.fte"] };
  const startDate = text(formData, "startDate");
  if (startDate !== "" && !DATE.test(startDate)) return { error: directoryCopy["error.date"] };
  const email = text(formData, "workEmail");
  if (email !== "" && !EMAIL.test(email)) return { error: directoryCopy["error.email"] };
  const manager = await managerId(orgId, text(formData, "managerRef"));
  if (manager === undefined) return { error: directoryCopy["error.managerUnknown"] };
  if (employeeId !== "" && manager === employeeId)
    return { error: directoryCopy["error.managerSelf"] };

  const fields = {
    first_name: text(formData, "firstName"),
    last_name: text(formData, "lastName"),
    work_email: email || null,
    unit_id: text(formData, "unitId"),
    team_id: text(formData, "teamId") || null,
    manager_employee_id: manager,
    role_title: text(formData, "roleTitle") || null,
    role_family_id: text(formData, "roleFamilyId") || null,
    start_date: startDate || null,
    fte,
    is_team_leader: formData.get("teamLeader") === "on",
    is_leadership_team: formData.get("leadershipTeam") === "on",
    employment_status: text(formData, "employmentStatus") || null,
  };

  const supabase = await createClient();
  if (employeeId === "") {
    const ref = text(formData, "employeeRef");
    if (ref === "" || ref.length > 64) return { error: directoryCopy["error.refFormat"] };
    const { data, error } = await supabase
      .from("employees")
      .insert({ organisation_id: orgId, employee_ref: ref, ...fields })
      .select("id");
    if (error || !data?.length) return failure(error);
    revalidatePath(`/org/${orgId}`, "layout");
    redirect(`/org/${orgId}/directory/people/${data[0]!.id}?notice=added`);
  }

  const { data, error } = await supabase
    .from("employees")
    .update(fields)
    .eq("id", employeeId)
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: directoryCopy["person.saved"] };
}

export async function setPersonStatus(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const status = text(formData, "status") === "inactive" ? "inactive" : "active";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .update({ status })
    .eq("id", text(formData, "employeeId"))
    .eq("organisation_id", orgId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: directoryCopy["person.saved"] };
}

export async function setPersonRating(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const clear = text(formData, "intent") === "clear";
  const label = text(formData, "label");
  const date = text(formData, "ratingDate");
  if (!clear && (label === "" || !DATE.test(date)))
    return { error: directoryCopy["error.ratingPair"] };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_formal_rating", {
    p_employee_id: text(formData, "employeeId"),
    p_label: clear ? (null as unknown as string) : label,
    p_rating_date: clear ? (null as unknown as string) : date,
  });
  if (error) return failure(error);
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: directoryCopy["person.rating.saved"] };
}
