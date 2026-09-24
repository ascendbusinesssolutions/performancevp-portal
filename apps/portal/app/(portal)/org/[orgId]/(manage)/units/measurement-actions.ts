"use server";

import { constants } from "@performancevp/intake";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { commonCopy } from "@/lib/copy/common";
import { setupCopy } from "@/lib/copy/setup";
import { fill, listOf } from "@/lib/copy/template";
import { unitsCopy, type UnitsCopyKey } from "@/lib/copy/units";
import { requireOrgManager } from "@/lib/org/context";
import { loadActivePeople, loadMeasurementUnits, loadUnits } from "@/lib/setup/data";
import { type DbError, errorKey, type ErrorRule } from "@/lib/setup/db-errors";
import {
  candidates,
  combinationName,
  isGroupingState,
  measurementModel,
} from "@/lib/setup/measurement";
import { unitTree } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

// The measurement-unit choices (Online Measurement Specification 6.2; Milestone 4b plan, Section 2).
// Each runs as the signed-in person. The database decides whether they may make it (administrators,
// the account owner, staff under a session, while the organisation is writable), keeps membership
// exclusive, refuses to change what a campaign has measured and writes the audit entry. Which units
// may combine is checked here, against the same candidates the page offered: a unit under 10, by
// the intake's minimum, with a unit in its branch.

type Client = Awaited<ReturnType<typeof createClient>>;

const MIN_STAFF = constants.SETUP.minUnitStaff;

const RULES: readonly ErrorRule<UnitsCopyKey | "readOnly">[] = [
  ["22023", "two combinations", "error.twoCombinations"],
  ["22023", "campaign has measured", "error.measuredByCampaign"],
  ["22023", "every measurement unit must be", "error.combineStale"],
  ["22023", "only an active", "error.combineStale"],
  ["22023", "a name of up to 200", "error.combinationName"],
  ["23514", "btrim", "error.combinationName"],
  ["23514", "the leader must be", "error.combinationLeader"],
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
  return { error: unitsCopy[key] };
}

async function loadModel(supabase: Client, orgId: string) {
  const [units, people, measurement] = await Promise.all([
    loadUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
  ]);
  return measurementModel({ units, people, ...measurement });
}

function defaultName(names: string[]): string {
  return listOf(
    names,
    { and: commonCopy["list.and"], more: (n) => fill(commonCopy["list.more"], { n }) },
    3,
  );
}

function back(orgId: string, notice: string, measurementUnitId?: string): never {
  revalidatePath(`/org/${orgId}`, "layout");
  const query = measurementUnitId
    ? `notice=${notice}&measurement=${measurementUnitId}`
    : `notice=${notice}`;
  redirect(`/org/${orgId}/units?${query}#measurement`);
}

/** Combines a measurement unit under 10 with one of the candidates the page listed for it. */
export async function combineUnits(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const model = await loadModel(supabase, orgId);
  const view = model.views.find((v) => v.row.id === text(formData, "measurementUnitId"));
  const target = model.views.find((v) => v.row.id === text(formData, "candidateId"));
  if (!view || !target || view.staff >= MIN_STAFF)
    return { error: unitsCopy["error.combineStale"] };
  const offered = candidates(model, view, isGroupingState(view.state) ? ["below"] : undefined);
  if (!offered.some((c) => c.view.row.id === target.row.id)) {
    return { error: unitsCopy["error.combineStale"] };
  }
  const order = new Map(unitTree(model.units).map((e, i) => [e.unit.id, i]));
  const next = [...view.units, ...target.units].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  const extending = [view, target].find((v) => v.combined);
  const name = combinationName(
    defaultName,
    next,
    extending ? { name: extending.row.name, units: extending.units } : undefined,
  );
  const { data, error } = await supabase.rpc("combine_measurement_units", {
    p_organisation_id: orgId,
    p_measurement_unit_ids: [view.row.id, target.row.id],
    p_name: name,
  });
  if (error || !data) return failure(error);
  back(orgId, "combined", data);
}

/** Undoes a combination: its units are measured on their own again. */
export async function undoCombination(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_measurement_unit", {
    p_organisation_id: orgId,
    p_measurement_unit_id: text(formData, "measurementUnitId"),
  });
  if (error) return failure(error);
  back(orgId, "undone");
}

/** Keeps a unit under 10 with units below it as a grouping unit, or withdraws that choice. */
export async function keepGrouping(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const keep = text(formData, "keep") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("keep_grouping_unit", {
    p_organisation_id: orgId,
    p_measurement_unit_id: text(formData, "measurementUnitId"),
    p_keep: keep,
  });
  if (error) return failure(error);
  back(orgId, keep ? "kept" : "withdrawn");
}

export async function renameCombination(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const name = text(formData, "name");
  if (name === "" || name.length > 200) return { error: unitsCopy["error.combinationName"] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurement_units")
    .update({ name })
    .eq("id", text(formData, "measurementUnitId"))
    .eq("organisation_id", orgId)
    .eq("kind", "combined")
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: unitsCopy["edit.saved"] };
}

export async function setCombinationLeader(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurement_units")
    .update({ unit_leader_employee_id: text(formData, "leaderId") || null })
    .eq("id", text(formData, "measurementUnitId"))
    .eq("organisation_id", orgId)
    .eq("kind", "combined")
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: unitsCopy["edit.saved"] };
}
