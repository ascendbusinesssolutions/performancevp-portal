import { Fragment, type ReactNode } from "react";

import type { SlotNames } from "./template";

/**
 * Fills a template's slots with React nodes, so a slot can hold a link (a unit's name linking to
 * where it is fixed) while the sentence around it stays the copy module's. Strings and numbers are
 * written as fill() writes them.
 */
export function fillNodes<S extends string>(
  template: S,
  slots: Record<SlotNames<S>, ReactNode>,
): ReactNode {
  const values = slots as Record<string, ReactNode>;
  const parts = template.split(/(\{[A-Za-z][A-Za-z0-9_]*\})/);
  return parts.map((part, index) => {
    const match = /^\{([A-Za-z][A-Za-z0-9_]*)\}$/.exec(part);
    if (!match) return <Fragment key={index}>{part}</Fragment>;
    const value = values[match[1]!];
    if (value === undefined) throw new Error(`copy template: no value for {${match[1]}}`);
    return (
      <Fragment key={index}>
        {typeof value === "number" && Number.isInteger(value)
          ? value.toLocaleString("en-AU")
          : value}
      </Fragment>
    );
  });
}
