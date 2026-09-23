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
 * the action refuses it. Here the entries are kept when the action reports an error and cleared
 * only when it succeeds. Without JavaScript the form still submits through its action.
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
  const form = useRef<HTMLFormElement>(null);
  const style = variant ?? (compact ? "quiet" : "primary");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  }

  useEffect(() => {
    if (!state.error && state.message) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={formAction} onSubmit={submit} className={className}>
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
