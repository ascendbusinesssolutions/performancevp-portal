"use server";

import { redirect } from "next/navigation";

import type { CodeFormState, FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Password sign-in: account owners, administrators, viewers and PerformanceVP staff. */
export async function signInWithPassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email"),
    password:
      typeof formData.get("password") === "string" ? (formData.get("password") as string) : "",
  });
  if (error) return { error: authCopy["login.error"] };
  redirect("/");
}

/**
 * Email-code sign-in for managers. Sending gives the same answer whether or not the address has
 * an account (PORTAL_COPY_SPEC.md M2), and never creates one. The address stays in the form, not
 * the URL.
 */
export async function signInWithCode(
  previous: CodeFormState,
  formData: FormData,
): Promise<CodeFormState> {
  const supabase = await createClient();
  const intent = field(formData, "intent");
  const email = field(formData, "email") || previous.email || "";

  if (intent === "send") {
    if (email !== "") {
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    }
    return { step: "code", email, message: authCopy["code.sent"] };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: field(formData, "code"),
    type: "email",
  });
  if (error) return { step: "code", email, error: authCopy["code.error"] };
  redirect("/");
}
