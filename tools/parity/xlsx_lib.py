"""Stdlib-only helpers for reading xlsx packages (no openpyxl).

Copied from the IP folder's workbook maintenance tools (tools/workbook-maintenance/xlsx_lib.py,
21 September 2026) so the portal's parity tooling is self-contained. Read-only on the source.
"""
import hashlib
import posixpath
import zipfile
import zlib
import xml.etree.ElementTree as ET

M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def sheet_parts(z):
    """Ordered list of (sheet name, part path)."""
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    out = []
    for s in wb.find(M + 'sheets'):
        t = rels[s.get(RID)]
        part = t.lstrip('/') if t.startswith('/') else posixpath.normpath(posixpath.join('xl', t))
        out.append((s.get('name'), part))
    return out


def shared_strings(z):
    if 'xl/sharedStrings.xml' not in z.namelist():
        return []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    return [''.join(t.text or '' for t in si.iter(M + 't')) for si in root.findall(M + 'si')]


def read_cells(path):
    """{(sheet, ref): {'f': formula or None, 't': type, 'v': value (strings resolved)}} for every <c> element."""
    z = zipfile.ZipFile(path)
    ss = shared_strings(z)
    out = {}
    for name, part in sheet_parts(z):
        root = ET.fromstring(z.read(part))
        for c in root.iter(M + 'c'):
            f = c.find(M + 'f')
            v = c.find(M + 'v')
            t = c.get('t')
            val = v.text if v is not None else None
            if t == 's' and val is not None:
                val = ss[int(val)]
            elif t == 'inlineStr':
                is_ = c.find(M + 'is')
                val = ''.join(x.text or '' for x in is_.iter(M + 't')) if is_ is not None else None
            if f is not None and f.get('t') == 'shared' and not (f.text or '').strip():
                raise RuntimeError(f'shared formula child at {name}!{c.get("r")}: not expanded by this reader')
            out[(name, c.get('r'))] = {'f': f.text if f is not None else None, 't': t, 'v': val}
    return out


def formulas(path):
    return {k: c['f'] for k, c in read_cells(path).items() if c['f'] is not None}


def manifest(path):
    """Ordered list of (name, crc, size, sha256 of decompressed content)."""
    z = zipfile.ZipFile(path)
    rows = []
    for zi in z.infolist():
        data = z.read(zi.filename)
        rows.append((zi.filename, format(zi.CRC, '08x'), zi.file_size, hashlib.sha256(data).hexdigest()))
    return rows


def structure_counts(path):
    z = zipfile.ZipFile(path)
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    dn = wb.find(M + 'definedNames')
    counts = {
        'sheets': len(wb.find(M + 'sheets')),
        'defined names': len(dn) if dn is not None else 0,
        'data validations': 0,
        'conditional formatting rules': 0,
        'merged ranges': 0,
    }
    for _, part in sheet_parts(z):
        root = ET.fromstring(z.read(part))
        counts['data validations'] += len(list(root.iter(M + 'dataValidation')))
        counts['conditional formatting rules'] += len(list(root.iter(M + 'cfRule')))
        counts['merged ranges'] += len(list(root.iter(M + 'mergeCell')))
    return counts


def values(path):
    """Lenient value reader for any writer (Excel output uses shared formulas).
    {(sheet, ref): (kind, value, has_formula)}; kind in n/s/b/e; formula cells with no value read as ('s', '')."""
    z = zipfile.ZipFile(path)
    ss = shared_strings(z)
    res = {}
    for name, part in sheet_parts(z):
        for c in ET.fromstring(z.read(part)).iter(M + 'c'):
            t = c.get('t') or 'n'
            f = c.find(M + 'f') is not None
            v = c.find(M + 'v')
            val = v.text if v is not None else None
            if t == 's' and val is not None:
                val = ss[int(val)]
            elif t == 'str':
                t = 's'
            elif t == 'inlineStr':
                is_ = c.find(M + 'is')
                val, t = ''.join(x.text or '' for x in is_.iter(M + 't')), 's'
            if val is None:
                if not f:
                    continue
                t, val = 's', ''
            if t == 's' and val == '' and not f:
                continue
            res[(name, c.get('r'))] = (t, val, f)
    return res


def lo_escape(s):
    """XML escaping as LibreOffice writes it inside <f> and <t>."""
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;').replace("'", '&apos;'))


def rewrite_package(src, dst, replace_parts):
    """Copy src zip to dst entry by entry, preserving order and ZipInfo metadata.
    replace_parts: {part name: new bytes}."""
    zin = zipfile.ZipFile(src)
    with zipfile.ZipFile(dst, 'w') as zout:
        for zi in zin.infolist():
            data = replace_parts.get(zi.filename, zin.read(zi.filename))
            nzi = zipfile.ZipInfo(zi.filename, date_time=zi.date_time)
            nzi.compress_type = zi.compress_type
            nzi.create_system = zi.create_system
            nzi.external_attr = zi.external_attr
            nzi.internal_attr = zi.internal_attr
            zout.writestr(nzi, data)
