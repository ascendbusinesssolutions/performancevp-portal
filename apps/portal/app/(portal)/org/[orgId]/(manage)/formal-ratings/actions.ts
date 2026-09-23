"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { ratingsMapCopy } from "@/lib/copy/ratings-map";
import { setupCopy } from "@/lib/copy/setup";
import { requireOrgManager } from "@/lib/org/context";
import { createClient } from "@/lib/supabase/server";

// Both actions run as the signed-in person. The database lets administrators, the account owner
// and staff under a session write the scale map while the organisation is writable, stamps who
// decided and when, and records every change in the audit log (labels and bands by name only).

type Client = Awaited<ReturnType<typeof createClient>>;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Records the organisation's decision. Upsert is avoided: it would rewrite organisation_id. */
async function decide(
  supabase: Client,
  orgId: string,
  decision: "mapped" | "skipped",
  calibrated: boolean | null,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("rating_scale_maps")
    .select("id")
    .eq("organisation_id", orgId)
    .maybeSingle();
  const { data, error } = existing
    ? await supabase
        .from("rating_scale_maps")
        .update({ decision, calibrated })
        .eq("id", existing.id)
        .select("id")
    : await supabase
        .from("rating_scale_maps")
        .insert({ organisation_id: orgId, decision, calibrated })
        .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function saveMapping(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const calibrated = text(formData, "calibrated");
  if (calibrated !== "yes" && calibrated !== "no") return { error: setupCopy["error.generic"] };
  const supabase = await createClient();
  if (!(await decide(supabase, orgId, "mapped", calibrated === "yes"))) {
    return { error: setupCopy["error.readOnly"] };
  }

  const { data: entries } = await supabase
    .from("rating_scale_map_entries")
    .select("id, label, band")
    .eq("organisation_id", orgId);
  const byLabel = new Map((entries ?? []).map((e) => [e.label, e]));
  for (let i = 0; i < 200; i++) {
    const label = formData.get(`label_${i}`);
    if (typeof label !== "string") break;
    const band = Number(text(formData, `band_${i}`));
    const entry = byLabel.get(label);
    if (![1, 2, 3, 4, 5].includes(band)) {
      if (entry) await supabase.from("rating_scale_map_entries").delete().eq("id", entry.id);
      continue;
    }
    const { error } = entry
      ? entry.band === band
        ? { error: null }
        : await supabase.from("rating_scale_map_entries").update({ band }).eq("id", entry.id)
      : await supabase
          .from("rating_scale_map_entries")
          .insert({ organisation_id: orgId, label, band });
    if (error) return { error: setupCopy["error.generic"] };
  }
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: ratingsMapCopy["saved"] };
}

export async function skipMapping(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  if (!(await decide(supabase, orgId, "skipped", null))) {
    return { error: setupCopy["error.readOnly"] };
  }
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: ratingsMapCopy["skipped"] };
}
