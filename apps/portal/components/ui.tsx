import Link from "next/link";
import type { ReactNode } from "react";

import { shellCopy } from "@/lib/copy/shell";

import { buttonClass } from "./button";

/**
 * The interface pieces the sign-in pages and the working screens share. Brand tokens only
 * (app/globals.css). Control boundaries use grey-80, which meets 3:1 on white (WCAG 1.4.11).
 */

/** The wordmark on a white page: "Performance" in slate, "VP" in Strategic Gold. */
export function Wordmark() {
  return (
    <p className="font-display text-[26px] leading-none font-medium">
      <span className="text-slate">{shellCopy["wordmark.first"]}</span>
      <span className="text-gold">{shellCopy["wordmark.second"]}</span>
    </p>
  );
}

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Wordmark />
      <h1 className="mt-8 font-display text-3xl font-medium text-slate">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export const INPUT_CLASS =
  "mt-1 block w-full rounded-control border border-grey-80 bg-white px-3 py-2 text-slate " +
  "focus:border-slate focus:outline-2 focus:outline-offset-2 focus:outline-slate " +
  "disabled:bg-grey-10 disabled:text-grey";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  inputMode,
  required = true,
  defaultValue,
  hint,
  maxLength,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal";
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-grey">{label}</span>
      <input
        className={INPUT_CLASS}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        disabled={disabled}
      />
      {hint ? <span className="mt-1 block text-xs text-grey">{hint}</span> : null}
    </label>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button type="submit" disabled={pending} className={`mt-6 w-full ${buttonClass("primary")}`}>
      {children}
    </button>
  );
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "problem";
}) {
  return (
    <p
      role={tone === "problem" ? "alert" : "status"}
      className={`mb-6 border-l-2 px-4 py-2 text-sm ${
        tone === "problem"
          ? "border-gold-deep bg-gold-10 text-slate"
          : "border-slate-40 bg-slate-05 text-slate"
      }`}
    >
      {children}
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
      href={href}
    >
      {children}
    </Link>
  );
}
