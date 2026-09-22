"""Build one workbook copy per fixture from a list of cell edits, ready for recalculation in Excel.

usage: build_copies.py <source.xlsx> <edits_dir> <out_dir>

Each <edits_dir>/<name>.edits.json holds a JSON list of edits, as the engine's parity/prepare.ts
writes them:
  ["clear", sheet, cell]          empty the cell
  ["set", sheet, cell, value]     set a constant; on a formula cell this replaces the formula
Every copy carries fullCalcOnLoad="1" so Excel recalculates it on open. The source is never modified.
"""
import json
import os
import sys

from testcopy import TestCopy

source, edits_dir, out_dir = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)
n = 0
for fname in sorted(os.listdir(edits_dir)):
    if not fname.endswith('.edits.json'):
        continue
    name = fname[: -len('.edits.json')]
    t = TestCopy(source)
    for e in json.load(open(os.path.join(edits_dir, fname))):
        if e[0] == 'clear':
            t.clear(e[1], e[2])
        elif e[0] == 'set':
            t.set(e[1], e[2], e[3])
        else:
            raise SystemExit(f'unknown edit {e!r} in {fname}')
    t.save(os.path.join(out_dir, f'{name}.xlsx'))
    n += 1
print(f'built {n} copies in {out_dir}')
