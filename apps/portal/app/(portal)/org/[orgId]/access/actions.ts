"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { sendInvitation } from "@/lib/auth/invite";
import { authCopy } from "@/lib/copy/auth";
import { consoleCopy } from "@/lib/copy/console";
import { createClient } from "@/lib/supabase/server";

// Every action runs as the signed-in person; the database functions decide whether they may
// (the account owner, at aal2, in a writable organisation) and write the audit entry.

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function refresh(formData: FormData) {
  revalidatePath(`/org/${text(formData, "organisationId")}/access`);
}

export async function inviteMember(_previous: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const email = text(formData, "email");
  const role = text(formData, "role");
  const units = formData.getAll("units").filter((u): u is string => typeof u === "string");
  const { data, error } = await supabase.rpc("invite_member", {
    p_organisation_id: text(formData, "organisationId"),
    p_email: email,
    p_role: role,
    p_unit_ids: role === "unit_viewer" ? units : [],
  });
  if (error) return { error: authCopy["error.generic"] };
  if (data === true) await sendInvitation(email);
  refresh(formData);
  return { message: consoleCopy["access.invite.done"] };
}

export async function revokeMembership(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_membership", {
    p_membership_id: text(formData, "membershipId"),
  });
  if (error) return { error: authCopy["error.generic"] };
  refresh(formData);
  return {};
}

export async function setUnitAccess(_previous: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const units = formData.getAll("units").filter((u): u is string => typeof u === "string");
  const { error } = await supabase.rpc("set_unit_access", {
    p_membership_id: text(formData, "membershipId"),
    p_unit_ids: units,
  });
  if (error) return { error: authCopy["error.generic"] };
  refresh(formData);
  return {};
}

export async function setContributionOptOut(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_data_contribution_opt_out", {
    p_organisation_id: text(formData, "organisationId"),
    p_opt_out: text(formData, "optOut") === "true",
  });
  if (error) return { error: authCopy["error.generic"] };
  refresh(formData);
  return {};
}

/**
 * Resets another person's authenticator. The database needs TOTP verified within the last 15
 * minutes, so the account owner confirms a fresh code from their own authenticator first.
 */
export async function resetAuthenticator(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { error: authCopy["error.generic"] };
  const verified = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: text(formData, "code"),
  });
  if (verified.error) return { error: authCopy["mfa.error"] };
  const { error } = await supabase.rpc("reset_factors", { p_user_id: text(formData, "userId") });
  if (error) return { error: authCopy["error.generic"] };
  refresh(formData);
  return { message: consoleCopy["access.people.resetDone"] };
}
