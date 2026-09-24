import type { ReactNode } from "react";

/**
 * Working tables (the directory, the units, the preview): a 12px letter-spaced header row and 1px
 * hairline row rules, as on the setup mockups. Figures take the mono face so columns align.
 */

export function Table({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" data-testid={testId}>
        {children}
      </table>
    </div>
  );
}

export function Head({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-grey-20">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`py-2 pr-6 text-xs font-medium tracking-[0.08em] text-grey uppercase last:pr-0 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

export function Row({
  children,
  testId,
  middle = false,
}: {
  children: ReactNode;
  testId?: string;
  /** Centre the cells vertically, for rows of form controls. */
  middle?: boolean;
}) {
  return (
    <tr
      className={`border-b border-grey-20 ${middle ? "align-middle" : "align-top"}`}
      data-testid={testId}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  figure = false,
  muted = false,
  align = "left",
}: {
  children?: ReactNode;
  figure?: boolean;
  muted?: boolean;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`py-3 pr-6 last:pr-0 ${figure ? "font-mono" : ""} ${
        muted ? "text-grey" : "text-slate"
      } ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </td>
  );
}

// A tree in a table: the name is indented 24 px a level, and each child's name follows a small
// grey elbow that fills the last 24 px, so the indent reads as the hierarchy it is. A parent is set
// a little heavier than its children. Classes, not a style attribute: the content security policy
// allows styles by nonce only, so inline style attributes are dropped in production.
const INDENTS = ["pl-0", "pl-6", "pl-12", "pl-18", "pl-24", "pl-30"] as const;

export function TreeName({
  depth,
  parent,
  below,
  children,
}: {
  depth: number;
  /** Whether units sit below this one. */
  parent: boolean;
  /** For assistive technology, what the indent shows: the unit this one sits below. */
  below?: string;
  children: ReactNode;
}) {
  const level = Math.max(depth, 0);
  return (
    <span
      className={`flex items-center ${INDENTS[Math.min(Math.max(level - 1, 0), INDENTS.length - 1)]} ${
        parent ? "font-medium" : ""
      }`}
    >
      {level > 0 ? (
        <span aria-hidden="true" className="inline-flex w-6 shrink-0 text-grey-60">
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M4 1.5V8.5H13" />
          </svg>
        </span>
      ) : null}
      <span>
        {children}
        {below ? (
          <span className="sr-only">
            {", "}
            {below}
          </span>
        ) : null}
      </span>
    </span>
  );
}
