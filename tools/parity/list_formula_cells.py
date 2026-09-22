"""List every formula cell in a workbook, with the workbook's SHA-256, as JSON.

usage: list_formula_cells.py <workbook.xlsx> <out.json>

The engine's cell-map test asserts that its output map covers every cell listed here, so a
workbook change that adds a formula fails the suite until the map is extended.
"""
import hashlib
import json
import sys

from xlsx_lib import formulas

src, dst = sys.argv[1:3]
cells = sorted(f'{s}!{r}' for (s, r) in formulas(src))
out = {
    'workbook': src.split('/')[-1],
    'sha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(),
    'formulaCells': cells,
}
json.dump(out, open(dst, 'w'), indent=1)
print(f'{len(cells)} formula cells written to {dst}')
