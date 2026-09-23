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

export function Row({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <tr className="border-b border-grey-20 align-top" data-testid={testId}>
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

// Indentation for a tree in a table. Classes, not a style attribute: the content security policy
// allows styles by nonce only, so inline style attributes are dropped in production.
const INDENTS = ["pl-0", "pl-5", "pl-10", "pl-15", "pl-20", "pl-25", "pl-30"] as const;

export function indentClass(depth: number): string {
  return INDENTS[Math.min(Math.max(depth, 0), INDENTS.length - 1)]!;
}
