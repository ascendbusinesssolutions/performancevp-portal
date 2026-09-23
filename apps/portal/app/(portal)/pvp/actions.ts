"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { sendInvitation } from "@/lib/auth/invite";
import { authCopy } from "@/lib/copy/auth";
import { consoleCopy } from "@/lib/copy/console";
import { createClient } from "@/lib/supabase/server";

// Every action runs as the signed-in staff member; the database functions check that they are
// staff (or the Owner) at aal2 and write the audit entry.

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function provisionOrganisation(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const email = text(formData, "accountOwnerEmail");
  const { data, error } = await supabase.rpc("provision_organisation", {
    p_name: text(formData, "name"),
    p_employee_band: text(formData, "band"),
    p_period_start: text(formData, "periodStart"),
    p_period_end: text(formData, "periodEnd"),
    p_agreement_date: text(formData, "agreementDate"),
    p_invoice_reference: text(formData, "invoiceReference"),
    p_account_owner_email: email,
  });
  const result = Array.isArray(data) ? data[0] : undefined;
  if (error || !result) return { error: authCopy["error.generic"] };
  if (result.needs_account) await sendInvitation(email);
  revalidatePath("/pvp");
  return { message: consoleCopy["pvp.provision.done"] };
}

export async function openSupportSession(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_support_session", {
    p_organisation_id: text(formData, "organisationId"),
    p_reason: text(formData, "reason"),
  });
  if (error) return { error: authCopy["error.generic"] };
  revalidatePath("/", "layout");
  return {};
}

export async function closeSupportSession(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_support_session", {
    p_session_id: text(formData, "sessionId"),
  });
  if (error) return { error: authCopy["error.generic"] };
  revalidatePath("/", "layout");
  return {};
}

export async function designateSupportStaff(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const email = text(formData, "email");
  let { data, error } = await supabase.rpc("designate_support_staff", { p_email: email });
  if (!error && data === "needs_account") {
    await sendInvitation(email);
    ({ data, error } = await supabase.rpc("designate_support_staff", { p_email: email }));
  }
  if (error || data !== "designated") return { error: authCopy["error.generic"] };
  revalidatePath("/pvp");
  return { message: consoleCopy["pvp.staff.done"] };
}

export async function removeSupportStaff(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_support_staff", {
    p_user_id: text(formData, "userId"),
    p_is_support_staff: false,
  });
  if (error) return { error: authCopy["error.generic"] };
  revalidatePath("/pvp");
  return {};
}
