"use client";

import { type ReactNode, useActionState } from "react";

import type { FormState } from "@/lib/auth/form-state";

import { Notice } from "./ui";

/**
 * A form whose server action returns a FormState: shows the outcome above the fields and keeps
 * the submit button disabled while the action runs. The fields are passed as children.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  compact = false,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      {state.message ? <Notice>{state.message}</Notice> : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "text-sm text-slate underline underline-offset-4 hover:text-gold-deep disabled:opacity-60"
            : "mt-4 bg-slate px-4 py-2 text-white hover:bg-slate-90 focus:outline-2 focus:outline-offset-2 focus:outline-slate disabled:opacity-60"
        }
      >
        {submitLabel}
      </button>
    </form>
  );
}
