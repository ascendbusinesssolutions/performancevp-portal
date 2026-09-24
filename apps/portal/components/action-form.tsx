"use client";

import {
  type FormEvent,
  type ReactNode,
  startTransition,
  useActionState,
  useEffect,
  useRef,
} from "react";

import type { FormState } from "@/lib/auth/form-state";

import { type ButtonVariant, buttonClass } from "./button";
import { Notice } from "./ui";

/**
 * A form whose server action returns a FormState: shows the outcome above the fields and keeps
 * the submit button disabled while the action runs. The fields are passed as children.
 *
 * React resets a form whenever its action finishes, which would clear what the person typed when
 * the action refuses it, and would put an edit form back to the values it was first drawn with.
 * Here the entries are kept, and a form that adds something clears itself after a success
 * (resetOnSuccess). Without JavaScript the form still submits through its action.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  compact = false,
  variant,
  submitName,
  resetOnSuccess = false,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  variant?: ButtonVariant;
  /** The button's accessible name, where its visible label is shared by many rows ("Remove"). */
  submitName?: string;
  /** Clear the fields after a success: for forms that add something, not for forms that edit it. */
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const form = useRef<HTMLFormElement>(null);
  const style = variant ?? (compact ? "quiet" : "primary");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  }

  useEffect(() => {
    if (resetOnSuccess && !state.error && state.message) form.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={form} action={formAction} onSubmit={submit} className={className}>
      {state.error ? <Notice tone="problem">{state.error}</Notice> : null}
      {state.message ? <Notice>{state.message}</Notice> : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        aria-label={submitName}
        className={style === "quiet" ? buttonClass("quiet") : `mt-4 ${buttonClass(style)}`}
      >
        {submitLabel}
      </button>
    </form>
  );
}
