"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { setPassword } from "../actions";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form action={action}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      <div className="space-y-4">
        <Field
          label={authCopy["setPassword.password"]}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Field
          label={authCopy["setPassword.confirm"]}
          name="confirm"
          type="password"
          autoComplete="new-password"
        />
      </div>
      <SubmitButton pending={pending}>{authCopy["setPassword.submit"]}</SubmitButton>
    </form>
  );
}
