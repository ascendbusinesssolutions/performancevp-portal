"use server";

import { constants } from "@performancevp/intake";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { commonCopy } from "@/lib/copy/common";
import { setupCopy } from "@/lib/copy/setup";
import { fill, listOf } from "@/lib/copy/template";
import { loadMeasuredUnits } from "@/lib/campaigns/data";
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

// The measurement-unit choices (Online Measurement Specification 6.2; Milestone 4b plan, Section 2;
// Milestone 5 plan, 2.5). Each runs as the signed-in person. The database decides whether they may
// make it (administrators, the account owner, staff under a session, while the organisation is
// writable), keeps membership exclusive, changes a unit with campaign results only through lineage,
// refuses anything a running campaign measures, and writes the audit entry. Which units may combine
// is checked here, against the same candidates the page offered: a unit under 10, by the intake's
// minimum, with a unit in its branch. A change that breaks a trend needs the person's confirmation.

type Client = Awaited<ReturnType<typeof createClient>>;

const MIN_STAFF = constants.SETUP.minUnitStaff;

const RULES: readonly ErrorRule<UnitsCopyKey | "readOnly">[] = [
  ["22023", "two combinations", "error.twoCombinations"],
  ["22023", "a campaign is measuring", "error.runningCampaign"],
  ["22023", "the unit to split out", "error.combineStale"],
  ["22023", "can be split", "error.combineStale"],
  ["22023", "stay combined need a name", "error.combinationName"],
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
  return { ...measurementModel({ units, people, ...measurement }), people };
}

function defaultName(names: string[]): string {
  return listOf(
    names,
    { and: commonCopy["list.and"], more: (n) => fill(commonCopy["list.more"], { n }) },
    3,
  );
}

/** A change to a unit with campaign results records a break in its trend, once confirmed. */
function confirmed(formData: FormData): boolean {
  return formData.get("confirmLineage") === "on";
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
  const { measured } = await loadMeasuredUnits(supabase, orgId);
  if ((measured.has(view.row.id) || measured.has(target.row.id)) && !confirmed(formData)) {
    return { error: unitsCopy["error.confirmLineage"] };
  }
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

/**
 * Undoes a combination: its units are measured on their own again. One with campaign results is
 * retired rather than removed, and keeps its history and context.
 */
export async function undoCombination(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const measurementUnitId = text(formData, "measurementUnitId");
  const { measured } = await loadMeasuredUnits(supabase, orgId);
  const retiring = measured.has(measurementUnitId);
  if (retiring && !confirmed(formData)) return { error: unitsCopy["error.confirmLineage"] };
  const { error } = await supabase.rpc("undo_measurement_unit", {
    p_organisation_id: orgId,
    p_measurement_unit_id: measurementUnitId,
  });
  if (error) return failure(error);
  back(orgId, retiring ? "retired" : "undone");
}

/**
 * Measures a unit of a combination with campaign results on its own, once it has grown to 10 or
 * more (Online Measurement Specification 6.2; Milestone 5 plan, 2.5). The combination is retired;
 * the rest stay combined under a new name, or return to their own where only one remains.
 */
export async function splitOut(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const model = await loadModel(supabase, orgId);
  const view = model.views.find((v) => v.row.id === text(formData, "measurementUnitId"));
  const unitId = text(formData, "unitId");
  const unit = view?.units.find((u) => u.id === unitId);
  if (!view || !view.combined || !unit) return { error: unitsCopy["error.combineStale"] };
  const staff = model.people.filter((p) => p.unit_id === unitId).length;
  if (staff < MIN_STAFF) return { error: unitsCopy["error.combineStale"] };
  if (!confirmed(formData)) return { error: unitsCopy["error.confirmLineage"] };
  const rest = view.units.filter((u) => u.id !== unitId);
  const { error } = await supabase.rpc("split_out_measurement_unit", {
    p_organisation_id: orgId,
    p_measurement_unit_id: view.row.id,
    p_unit_id: unitId,
    p_rest_name: rest.length >= 2 ? defaultName(rest.map((u) => u.name)) : "",
  });
  if (error) return failure(error);
  back(orgId, "split");
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
