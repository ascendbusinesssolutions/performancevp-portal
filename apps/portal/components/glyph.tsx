/**
 * Status glyphs for the setup hub and the readiness check. They are told apart by shape and carry
 * brand ink only: the status colours are reserved for score bands and trip-wires
 * (PORTAL_UX_BRIEF.md 5; Milestone 4 plan, decision D7). A glyph is never the only carrier of
 * meaning: the word beside it says the same thing, so the glyph is hidden from assistive technology.
 */
export type GlyphKind = "passed" | "blocker" | "warning" | "next" | "todo" | "locked" | "skipped";

export function Glyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      className="shrink-0"
      data-glyph={kind}
    >
      {kind === "passed" ? (
        <path
          d="M3 8.5l3.2 3.2L13 4.8"
          fill="none"
          className="stroke-slate"
          strokeWidth="2"
          strokeLinecap="square"
        />
      ) : null}
      {kind === "blocker" ? (
        <rect x="3" y="3" width="10" height="10" className="fill-slate" />
      ) : null}
      {kind === "warning" ? (
        <path
          d="M8 2.5L13.5 8 8 13.5 2.5 8z"
          fill="none"
          className="stroke-gold-deep"
          strokeWidth="1.75"
        />
      ) : null}
      {kind === "next" ? (
        <>
          <circle cx="8" cy="8" r="5.5" fill="none" className="stroke-slate" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.5" className="fill-slate" />
        </>
      ) : null}
      {kind === "todo" ? (
        <circle cx="8" cy="8" r="5.5" fill="none" className="stroke-grey-80" strokeWidth="1.5" />
      ) : null}
      {kind === "locked" ? (
        <path d="M3.5 8h9" className="stroke-grey-80" strokeWidth="1.75" />
      ) : null}
      {kind === "skipped" ? (
        <path
          d="M3 8h7M8 5l3 3-3 3"
          fill="none"
          className="stroke-grey-80"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      ) : null}
    </svg>
  );
}
