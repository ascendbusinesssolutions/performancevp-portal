import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The two button styles from the setup mockups: primary is slate with white text, secondary is
 * white with a hairline border (grey-80, which meets 3:1 as a control boundary). Both take the
 * control radius. The quiet variant is a text link that submits.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `${BASE} bg-slate text-white hover:bg-slate-90`,
  secondary: `${BASE} border border-grey-80 bg-white text-slate hover:border-slate`,
  quiet:
    "text-sm text-slate underline underline-offset-4 hover:text-gold-deep focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-slate disabled:opacity-60",
};

export function buttonClass(variant: ButtonVariant = "primary"): string {
  return VARIANTS[variant];
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  name,
  value,
  onClick,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
  name?: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant)}
      disabled={disabled}
      name={name}
      value={value}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** A link styled as a button, for actions that move to another screen. */
export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}
