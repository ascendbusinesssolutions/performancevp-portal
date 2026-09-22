# @performancevp/recommendations

The recommendations package. A pure TypeScript package that turns a stored calculation run and its intake aggregates into ranked suggestions: eligibility (which sub-dimensions receive a suggestion), pattern selection with the 8-point materiality margin and the self-check questions, sequencing and combinations, and the P projection rules. Every output is a pure function of a stored run, so a suggestion can always be reproduced from the run that produced it.

**Authority.** The Online Recommendations Specification. The Intervention Design Library remains the authority for the patterns themselves; the online pattern cards are reference data seeded by migration, not held here.

**Dependencies.** The engine only, for `projectImpact`. Nothing else, and no IO.

**Status.** Empty shell (Milestone 0). Milestone 7 fills it.

**Run alone.** `pnpm test` and `pnpm typecheck` from this folder.
