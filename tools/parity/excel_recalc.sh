#!/bin/bash
# Recalculate every .xlsx in IN_DIR with Microsoft Excel and save the results to OUT_DIR.
# Both folders must sit inside Excel's sandbox container (~/Library/Containers/com.microsoft.Excel/Data/)
# to avoid file-access prompts. Each input copy carries fullCalcOnLoad="1" (build_copies.py sets it).
# Only the copies in IN_DIR are opened; other open workbooks are not recalculated or saved.
# Adapted from the IP folder's tools/workbook-maintenance/excel_recalc.sh (21 September 2026).
set -euo pipefail
IN_DIR="$1"; OUT_DIR="$2"
mkdir -p "$OUT_DIR"
for f in "$IN_DIR"/*.xlsx; do
  base=$(basename "$f")
  osascript <<APPLESCRIPT >/dev/null
set inPath to POSIX file "$f" as text
set outPath to POSIX file "$OUT_DIR/$base" as text
with timeout of 120 seconds
	tell application "Microsoft Excel"
		set wb to open workbook workbook file name inPath
		set wbName to name of wb
		save workbook as wb filename outPath file format Excel XML file format
		close workbook wbName saving no
	end tell
end timeout
APPLESCRIPT
  echo "recalculated $base"
done
