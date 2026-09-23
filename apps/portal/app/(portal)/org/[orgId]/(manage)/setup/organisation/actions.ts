"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { setupCopy } from "@/lib/copy/setup";
import { requireOrgManager } from "@/lib/org/context";
import { errorKey } from "@/lib/setup/db-errors";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const SIZE_BANDS = ["under_50", "50_to_200", "200_to_1000", "over_1000"] as const;

/** Saves the organisation's name and sector metadata, as the signed-in person. */
export async function saveOrganisation(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const anzsicClass = text(formData, "anzsicClass");
  if (anzsicClass !== "" && !/^[0-9]{4}$/.test(anzsicClass)) {
    return { error: setupCopy["error.classCode"] };
  }
  const sizeBand = text(formData, "sizeBand");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .update({
      name: text(formData, "name"),
      anzsic_division: text(formData, "division") || null,
      anzsic_class: anzsicClass || null,
      size_band: SIZE_BANDS.find((b) => b === sizeBand) ?? null,
    })
    .eq("id", orgId)
    .select("id");
  if (error) {
    return {
      error: setupCopy[errorKey(error, [["23514", null, "error.generic"]], "error.generic")],
    };
  }
  if (!data || data.length === 0) return { error: setupCopy["error.readOnly"] };
  revalidatePath(`/org/${orgId}`, "layout");
  return { message: setupCopy["notice.saved"] };
}
