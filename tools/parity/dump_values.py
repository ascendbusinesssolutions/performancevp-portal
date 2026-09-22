"""Write every cell's stored value in a workbook to JSON, keyed "Sheet!Cell".

usage: dump_values.py <workbook.xlsx> <out.json>

Values: numbers as numbers; strings as strings; a blank cell or an empty-string formula result as
null; an Excel error as {"error": "#DIV/0!"}. The engine's parity/collect.ts reads the result.
Reads the package only; the workbook is never modified.
"""
import json
import sys

from xlsx_lib import values

src, dst = sys.argv[1:3]
out = {}
for (sheet, ref), (kind, val, has_formula) in values(src).items():
    key = f'{sheet}!{ref}'
    if kind == 'n':
        f = float(val)
        out[key] = int(f) if f.is_integer() else f
    elif kind == 'e':
        out[key] = {'error': val}
    elif kind == 'b':
        out[key] = val in ('1', 'TRUE', 'true')
    else:
        out[key] = None if val == '' else val
json.dump(out, open(dst, 'w'), indent=0, sort_keys=True)
print(f'{len(out)} cells written to {dst}')
