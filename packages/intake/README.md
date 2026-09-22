# @performancevp/intake

The intake package. A pure TypeScript package that turns validated survey aggregates, identified manager ratings, administrator checklists and formal performance ratings into a complete `UnitMeasurementInput` for the engine, together with the item-group means the recommendations rules use and the methodology metadata for the footer.

**Authority.** The Online Measurement Specification is the authority for every online-only rule. The Survey Processing and Scoring Workbook Spec and the Tier 3 Module Library define module scoring. The Northwind Mutual worked example in `docs/benchmarks/` is the parity benchmark; the worked examples in Part 4 of the Online Measurement Specification are the named fixtures for the rules that have no workbook.

**Dependencies.** The engine's input types only. Nothing else, and no IO.

**Status.** Empty shell (Milestone 0). Milestone 2 fills it.

**Run alone.** `pnpm test` and `pnpm typecheck` from this folder.
