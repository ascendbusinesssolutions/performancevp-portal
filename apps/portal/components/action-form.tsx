"use client";

import { type ReactNode, useActionState } from "react";

import type { FormState } from "@/lib/auth/form-state";

import { type ButtonVariant, buttonClass } from "./button";
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
  variant,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  variant?: ButtonVariant;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const style = variant ?? (compact ? "quiet" : "primary");
  return (
    <form action={formAction} className={className}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      {state.message ? <Notice>{state.message}</Notice> : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={style === "quiet" ? buttonClass("quiet") : `mt-4 ${buttonClass(style)}`}
      >
        {submitLabel}
      </button>
    </form>
  );
}
