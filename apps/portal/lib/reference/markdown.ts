/**
 * Just enough markdown to read the tables of the source documents in docs/source-ip: every pipe
 * table, with the headings it sits under. Cells are trimmed; nothing else is interpreted.
 */

export interface Table {
  /** The headings above the table, outermost first (the `#` marks removed). */
  path: string[];
  header: string[];
  rows: string[][];
  /** The 1-based line of the table's header, for error messages. */
  line: number;
}

function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim());
}

const SEPARATOR = /^\|[\s:|-]+\|$/;

export function tables(doc: string): Table[] {
  const lines = doc.split("\n");
  const path: Array<{ level: number; text: string }> = [];
  const out: Table[] = [];
  let current: Table | undefined;
  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      current = undefined;
      const level = heading[1]!.length;
      while (path.length > 0 && path[path.length - 1]!.level >= level) path.pop();
      path.push({ level, text: heading[2]!.trim() });
      return;
    }
    if (!line.startsWith("|")) {
      current = undefined;
      return;
    }
    if (SEPARATOR.test(line)) return;
    if (current === undefined) {
      current = { path: path.map((h) => h.text), header: cells(line), rows: [], line: index + 1 };
      out.push(current);
      return;
    }
    current.rows.push(cells(line));
  });
  return out;
}

/** The single table under headings starting with each prefix, in order, with the given header. */
export function tableUnder(
  all: readonly Table[],
  prefixes: readonly string[],
  header: readonly string[],
): Table {
  const found = all.filter(
    (t) =>
      prefixes.every((prefix) => t.path.some((h) => h.startsWith(prefix))) &&
      t.header.length === header.length &&
      t.header.every((cell, i) => cell === header[i]),
  );
  if (found.length !== 1) {
    throw new Error(
      `expected one table under ${prefixes.join(" > ")} headed ${header.join(" | ")}, found ${found.length}`,
    );
  }
  return found[0]!;
}

/** Markdown emphasis removed: `**Recommends**` reads `Recommends`. */
export function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

/**
 * Numbered anchors of a scale cell: "1 = Novice, 2 = Developing" or "1 = >12 weeks; 5 = <2 weeks"
 * or "1 = Little working knowledge. 2 = Basic; needs frequent reference or help." Each value's text
 * runs to the next "{n} =" and loses the separator before it.
 */
export function anchors(cell: string): Array<{ value: number; label: string }> {
  const marks = [...cell.matchAll(/(?:^|[\s,;.])([1-5]) = /g)];
  return marks.map((mark, i) => {
    const start = (mark.index ?? 0) + mark[0].length;
    const end = i + 1 < marks.length ? (marks[i + 1]!.index ?? cell.length) : cell.length;
    const label = cell
      .slice(start, end)
      .trim()
      .replace(/[,;.]$/, "")
      .trim();
    return { value: Number(mark[1]), label };
  });
}
