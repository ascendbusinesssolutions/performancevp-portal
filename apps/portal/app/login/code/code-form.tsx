"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { CodeFormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { signInWithCode } from "../actions";

export function CodeForm() {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(signInWithCode, {
    step: "email",
  });

  if (state.step === "email") {
    return (
      <form action={action}>
        <input type="hidden" name="intent" value="send" />
        <Field label={authCopy["code.email"]} name="email" type="email" autoComplete="username" />
        <SubmitButton pending={pending}>{authCopy["code.send"]}</SubmitButton>
      </form>
    );
  }

  return (
    <div>
      {state.message ? <Notice>{state.message}</Notice> : null}
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      <form action={action}>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email ?? ""} />
        <Field
          label={authCopy["code.code"]}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <SubmitButton pending={pending}>{authCopy["code.submit"]}</SubmitButton>
      </form>
      <form action={action} className="mt-4">
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="email" value={state.email ?? ""} />
        <button
          type="submit"
          className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
        >
          {authCopy["code.again"]}
        </button>
      </form>
    </div>
  );
}
