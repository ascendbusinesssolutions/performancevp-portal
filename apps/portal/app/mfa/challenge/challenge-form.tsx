"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { challengeTotp } from "../actions";

export function ChallengeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(challengeTotp, {});
  return (
    <form action={action}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      <Field
        label={authCopy["mfa.challenge.code"]}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
      />
      <SubmitButton pending={pending}>{authCopy["mfa.challenge.submit"]}</SubmitButton>
    </form>
  );
}
