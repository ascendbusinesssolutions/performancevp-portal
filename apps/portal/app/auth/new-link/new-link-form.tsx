"use client";

import { useActionState } from "react";

import { Field, Notice, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";

import { requestNewLink } from "../actions";

export function NewLinkForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestNewLink, {});
  if (state.message) return <Notice>{state.message}</Notice>;
  return (
    <form action={action}>
      <Field label={authCopy["newLink.email"]} name="email" type="email" autoComplete="username" />
      <SubmitButton pending={pending}>{authCopy["newLink.submit"]}</SubmitButton>
    </form>
  );
}
