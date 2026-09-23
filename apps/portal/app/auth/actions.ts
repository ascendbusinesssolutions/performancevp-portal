"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";
import { appBaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Sends a set-password link. The same answer whether or not the address has an account. */
export async function requestPasswordLink(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const email =
    typeof formData.get("email") === "string" ? (formData.get("email") as string).trim() : "";
  if (email !== "") {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appBaseUrl()}/auth/confirm`,
    });
  }
  return { message: authCopy["reset.sent"] };
}

/**
 * Sets the password from an invitation or reset link, then signs the person out everywhere, so
 * that their next session starts from the password (and TOTP, where their role needs it).
 */
export async function setPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || typeof confirm !== "string")
    return { error: authCopy["error.generic"] };
  if (password !== confirm) return { error: authCopy["setPassword.mismatch"] };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: authCopy["setPassword.noSession"] };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "weak_password"
          ? authCopy["setPassword.rejected"]
          : authCopy["error.generic"],
    };
  }
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?notice=password-set");
}
