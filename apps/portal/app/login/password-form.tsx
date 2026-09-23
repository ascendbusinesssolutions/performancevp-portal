"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { signInWithPassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signInWithPassword, {});
  return (
    <form action={action}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      <div className="space-y-4">
        <Field label={authCopy["login.email"]} name="email" type="email" autoComplete="username" />
        <Field
          label={authCopy["login.password"]}
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </div>
      <SubmitButton pending={pending}>{authCopy["login.submit"]}</SubmitButton>
    </form>
  );
}
