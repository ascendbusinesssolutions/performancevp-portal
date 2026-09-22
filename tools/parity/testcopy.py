"""Build temporary test copies of a workbook: set inputs, clear cells, override cells with
constants, trial replacement formulas. For verification copies only, never for production files.

Copied from the IP folder's workbook maintenance tools (tools/workbook-maintenance/testcopy.py,
21 September 2026). The source workbook is read and never written.
"""
import re
import zipfile

from xlsx_lib import lo_escape, rewrite_package, sheet_parts


def col_index(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def split_ref(ref):
    col, row = re.match(r'([A-Z]+)(\d+)$', ref).groups()
    return col, int(row)


class TestCopy:
    def __init__(self, src):
        self.src = src
        self.z = zipfile.ZipFile(src)
        self.parts = dict(sheet_parts(self.z))
        self.xml = {}

    def _get(self, sheet):
        part = self.parts[sheet]
        if part not in self.xml:
            self.xml[part] = self.z.read(part).decode('utf-8')
        return part, self.xml[part]

    def _cell(self, x, ref):
        return re.search(r'<c r="%s"([^>]*?)(/>|>(.*?)</c>)' % ref, x, re.S)

    def _put(self, sheet, ref, body_fn):
        """body_fn(attrs_without_t) -> full replacement <c> element."""
        part, x = self._get(sheet)
        m = self._cell(x, ref)
        if m:
            attrs = re.sub(r'\s+t="[^"]*"', '', m.group(1))
            x = x[:m.start()] + body_fn(attrs) + x[m.end():]
        else:
            col, row = split_ref(ref)
            new = body_fn('')
            rm = re.search(r'<row r="%d"([^>]*?)(/>|>(.*?)</row>)' % row, x, re.S)
            if rm is None:
                # insert a new row before the first row with a larger number
                later = [r for r in re.finditer(r'<row r="(\d+)"', x) if int(r.group(1)) > row]
                pos = later[0].start() if later else x.index('</sheetData>')
                x = x[:pos] + f'<row r="{row}">{new}</row>' + x[pos:]
            elif rm.group(2) == '/>':
                x = x[:rm.start()] + f'<row r="{row}"{rm.group(1)}>{new}</row>' + x[rm.end():]
            else:
                inner_start = rm.start(3)
                inner = rm.group(3)
                pos = len(inner)
                for cm in re.finditer(r'<c r="([A-Z]+)\d+"', inner):
                    if col_index(cm.group(1)) > col_index(col):
                        pos = cm.start()
                        break
                x = x[:inner_start + pos] + new + x[inner_start + pos:]
        self.xml[part] = x

    def set(self, sheet, ref, value):
        if value is None:
            return self.clear(sheet, ref)
        if isinstance(value, str):
            self._put(sheet, ref, lambda a: f'<c r="{ref}"{a} t="inlineStr"><is><t>{lo_escape(value)}</t></is></c>')
        else:
            self._put(sheet, ref, lambda a: f'<c r="{ref}"{a} t="n"><v>{repr(float(value)) if not float(value).is_integer() else int(value)}</v></c>')

    def clear(self, sheet, ref):
        part, x = self._get(sheet)
        if self._cell(x, ref):
            self._put(sheet, ref, lambda a: f'<c r="{ref}"{a}/>')

    def formula(self, sheet, ref, text):
        part, x = self._get(sheet)
        m = self._cell(x, ref)
        assert m and m.group(3) and '<f' in m.group(3), f'{sheet}!{ref} has no formula'
        body = re.sub(r'<f([^>]*)>.*?</f>', lambda fm: f'<f{fm.group(1)}>{lo_escape(text)}</f>', m.group(3), count=1, flags=re.S)
        body = re.sub(r'<v>.*?</v>', '', body, flags=re.S)
        attrs = re.sub(r'\s+t="[^"]*"', '', m.group(1))
        x = x[:m.start()] + f'<c r="{ref}"{attrs}>{body}</c>' + x[m.end():]
        self.xml[part] = x

    def save(self, dst, full_calc=True):
        parts = {p: x.encode('utf-8') for p, x in self.xml.items()}
        if full_calc:
            wb = self.z.read('xl/workbook.xml').decode('utf-8')
            wb, n = re.subn(r'<calcPr ', '<calcPr fullCalcOnLoad="1" ', wb, count=1)
            assert n == 1
            parts['xl/workbook.xml'] = wb.encode('utf-8')
        rewrite_package(self.src, dst, parts)
