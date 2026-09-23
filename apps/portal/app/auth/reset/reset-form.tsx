"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { requestPasswordLink } from "../actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordLink, {});
  if (state.message) return <Notice>{state.message}</Notice>;
  return (
    <form action={action}>
      <Field label={authCopy["reset.email"]} name="email" type="email" autoComplete="username" />
      <SubmitButton pending={pending}>{authCopy["reset.submit"]}</SubmitButton>
    </form>
  );
}
