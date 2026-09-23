import "server-only";

import { cache } from "react";

import { sydneyToday } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import {
  loadActivePeople,
  loadFormalRatingsForCheck,
  loadMeasurementUnits,
  loadRoleFamilies,
  loadScaleMap,
  loadSkills,
  loadUnitContext,
  loadUnits,
  type Person,
} from "./data";
import { contextCounts, incompleteParts } from "./frameworks";
import { evaluateReadiness, type Readiness } from "./readiness";
import type { UnitRow } from "./units";

/**
 * Everything the setup hub and the readiness page need, read once per request (React cache) as the
 * signed-in person. It reads formal ratings for a check, which is logged, so only the screens about
 * setup and ratings call it. Progress is derived from the data and never stored, so
 * leaving and returning needs nothing more (Milestone 4 plan, Section 2).
 */

export type StepKey =
  "organisation" | "directory" | "context" | "formalRatings" | "readiness" | "campaign";
export type StepState = "done" | "next" | "todo" | "skipped" | "locked";

export interface Step {
  key: StepKey;
  state: StepState;
  href: string;
}

export interface SetupState {
  readiness: Readiness;
  steps: Step[];
  units: UnitRow[];
  people: Person[];
  lastUpload: { id: string; uploaded_at: string } | null;
  contextDone: number;
  contextRemaining: string[];
  /** Units under 10 still to combine, grow or retire, and combinations to choose again. */
  unitsToSettle: number;
  formal: { held: number; current: number; decision: "mapped" | "skipped" | null };
}

export const loadSetupState = cache(async (orgId: string): Promise<SetupState> => {
  const supabase = await createClient();
  const [units, measurement, people, families, skills, context, formalRatings, scaleMap, uploads] =
    await Promise.all([
      loadUnits(supabase, orgId),
      loadMeasurementUnits(supabase, orgId),
      loadActivePeople(supabase, orgId),
      loadRoleFamilies(supabase, orgId),
      loadSkills(supabase, orgId),
      loadUnitContext(supabase, orgId),
      loadFormalRatingsForCheck(supabase, orgId),
      loadScaleMap(supabase, orgId),
      supabase
        .from("directory_uploads")
        .select("id, status, uploaded_at")
        .eq("organisation_id", orgId)
        .in("status", ["staged", "applied"])
        .order("uploaded_at", { ascending: false })
        .limit(10),
    ]);
  const today = sydneyToday();
  const staged = (uploads.data ?? []).find((u) => u.status === "staged");
  const applied = (uploads.data ?? []).find((u) => u.status === "applied");
  const readiness = evaluateReadiness({
    today,
    units,
    ...measurement,
    people,
    families,
    skills,
    context,
    formalRatings,
    scaleMap,
    stagedUploadId: staged?.id ?? null,
  });

  // Context is complete per measurement unit measured (Milestone 4b).
  const measuredUnits = readiness.measured;
  const complete = measuredUnits.filter(
    (u) => incompleteParts(contextCounts(u.id, context)).length === 0,
  );
  const familiesReady = readiness.checks.find((c) => c.key === "roleFamilies")?.level === "passed";
  const formalCheck = readiness.checks.find((c) => c.key === "formalRatings");
  const activeIds = new Set(people.map((p) => p.id));
  const held = formalRatings.filter((r) => activeIds.has(r.employee_id));

  // "Organisation and units" stays open while a unit is still under 10 and uncombined, so the hub
  // leads to the units screen, where it is settled (Milestone 4b).
  const unitsToSettle = readiness.checks.find((c) => c.key === "units")?.findings.length ?? 0;
  const hasUnits = units.some((u) => u.status === "active");
  const done: Record<Exclude<StepKey, "campaign">, boolean> = {
    organisation: hasUnits && unitsToSettle === 0,
    directory: people.length > 0,
    context: measuredUnits.length > 0 && complete.length === measuredUnits.length && familiesReady,
    formalRatings: formalCheck?.level === "skipped" || formalCheck?.level === "passed",
    readiness: readiness.ready,
  };
  const order: Array<Exclude<StepKey, "campaign">> = [
    "organisation",
    "directory",
    "context",
    "formalRatings",
    "readiness",
  ];
  const next = order.find((k) => !done[k]);
  const hrefs: Record<StepKey, string> = {
    organisation:
      hasUnits && unitsToSettle > 0
        ? `/org/${orgId}/units#measurement`
        : `/org/${orgId}/setup/organisation`,
    directory: `/org/${orgId}/directory`,
    context: `/org/${orgId}/context`,
    formalRatings: `/org/${orgId}/formal-ratings`,
    readiness: `/org/${orgId}/readiness`,
    campaign: `/org/${orgId}/readiness`,
  };
  const steps: Step[] = order.map((key) => ({
    key,
    href: hrefs[key],
    state:
      key === "formalRatings" && done.formalRatings && held.length === 0
        ? "skipped"
        : key === "formalRatings" && scaleMap?.decision === "skipped"
          ? "skipped"
          : done[key]
            ? "done"
            : key === next
              ? "next"
              : "todo",
  }));
  steps.push({ key: "campaign", href: hrefs.campaign, state: readiness.ready ? "next" : "locked" });

  return {
    readiness,
    steps,
    units,
    people,
    lastUpload: applied ? { id: applied.id, uploaded_at: applied.uploaded_at } : null,
    contextDone: complete.length,
    unitsToSettle,
    contextRemaining: measuredUnits
      .filter((u) => !complete.some((c) => c.id === u.id))
      .map((u) => u.name),
    formal: {
      held: held.length,
      current: formalCheck?.pass.key === "formalRatings" ? formalCheck.pass.current : 0,
      decision: scaleMap?.decision ?? null,
    },
  };
});
