import Link from "next/link";
import type { ReactNode } from "react";

import { authCopy } from "@/lib/copy/auth";

/**
 * The few interface pieces the sign-in pages share. Brand tokens only (app/globals.css); proper
 * styling of the application arrives with the setup flows in Milestone 4.
 */

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold-deep">
        {authCopy["brand.eyebrow"]}
      </p>
      <h1 className="mt-3 font-display text-3xl font-medium text-slate">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  inputMode,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric";
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-grey">{label}</span>
      <input
        className="mt-1 block w-full rounded-none border border-grey-40 bg-white px-3 py-2 text-slate focus:border-slate focus:outline-2 focus:outline-offset-2 focus:outline-slate"
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full bg-slate px-4 py-3 text-white hover:bg-slate-90 focus:outline-2 focus:outline-offset-2 focus:outline-slate disabled:opacity-60"
    >
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
