"use server";

import { redirect } from "next/navigation";

import type { EnrolFormState, FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * TOTP enrolment: removes any half-finished factor, starts a new one and returns its QR code and
 * key; the person then confirms it with a code, which lifts the session to aal2. Supabase refuses
 * a second factor to a session that has not completed the first (checked in the end-to-end suite).
 */
export async function enrolTotp(
  previous: EnrolFormState,
  formData: FormData,
): Promise<EnrolFormState> {
  const supabase = await createClient();

  if (formData.get("intent") === "start") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const factor of factors?.all ?? []) {
      if (factor.factor_type === "totp" && factor.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString()}`,
    });
    if (error || !data) return { step: "start", error: authCopy["error.generic"] };
    return {
      step: "verify",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  }

  const factorId =
    typeof formData.get("factorId") === "string" ? (formData.get("factorId") as string) : "";
  const code =
    typeof formData.get("code") === "string" ? (formData.get("code") as string).trim() : "";
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ...previous, step: "verify", error: authCopy["mfa.error"] };
  redirect("/");
}

/** The TOTP challenge at sign-in, against the person's verified factor. */
export async function challengeTotp(_previous: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/mfa/enrol");
  const code =
    typeof formData.get("code") === "string" ? (formData.get("code") as string).trim() : "";
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: authCopy["mfa.error"] };
  redirect("/");
}
