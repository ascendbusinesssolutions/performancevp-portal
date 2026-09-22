# Parity tooling: generating engine fixtures from the Diagnostic Workbook

These scripts produce the parity fixtures in `packages/engine/fixtures/parity/` by recalculating copies of the production Diagnostic Workbook in Microsoft Excel. They run on a machine with Excel; CI never runs them and reads only the committed fixtures. The source workbook, `docs/benchmarks/PerformanceVP-Diagnostic-Workbook.xlsx`, is read and never written.

`xlsx_lib.py` and `testcopy.py` are copies of the IP folder's workbook maintenance tools (`tools/workbook-maintenance/`, 21 September 2026), standard library only. `excel_recalc.sh` is adapted from the same folder.

## The run

The staging folder must sit inside Excel's sandbox container, which is what avoids file-access prompts. The first run may ask, once, to allow control of Excel.

```
STAGE=~/Library/Containers/com.microsoft.Excel/Data/pvp-parity
rm -rf "$STAGE" && mkdir -p "$STAGE/in" "$STAGE/out" "$STAGE/values"

# 1. Requests (packages/engine/fixtures/parity/requests/*.json) to cell edits, through the cell map
pnpm --filter @performancevp/engine parity:requests
pnpm --filter @performancevp/engine parity:prepare "$STAGE"

# 2. One workbook copy per request, with fullCalcOnLoad set
python3 tools/parity/build_copies.py docs/benchmarks/PerformanceVP-Diagnostic-Workbook.xlsx "$STAGE/edits" "$STAGE/in"

# 3. Recalculate in Excel
tools/parity/excel_recalc.sh "$STAGE/in" "$STAGE/out"

# 4. Every cell's value from each recalculated copy
for f in "$STAGE"/out/*.xlsx; do n=$(basename "$f" .xlsx); python3 tools/parity/dump_values.py "$f" "$STAGE/values/$n.values.json"; done

# 5. Fixtures, with the workbook hash and the Excel build recorded
pnpm --filter @performancevp/engine parity:collect "$STAGE" "Microsoft Excel $(defaults read '/Applications/Microsoft Excel.app/Contents/Info.plist' CFBundleShortVersionString) (macOS)"

rm -rf "$STAGE"
```

Then `pnpm --filter @performancevp/engine test` runs every fixture and prints the parity report.

## The other two files the engine tests read

- `packages/engine/fixtures/workbook-formula-cells.json` lists every formula cell in the workbook with its hash (`list_formula_cells.py`); the cell-map test asserts the map covers all of them.
- `packages/engine/fixtures/northwind-input.json` is the Northwind Mutual worked example read from the workbook's stored input cells (`dump_values.py` on the production workbook, then `parity:extract-input`).

Regenerate both, and every fixture, whenever the production workbook changes; the hash in each file says which workbook it came from.
