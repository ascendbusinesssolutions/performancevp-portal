/**
 * The copy lint (PORTAL_COPY_SPEC.md Section 6). Every string in the copy module passes it; the
 * test in lint.test.ts runs it over the whole module. It fails on:
 *   - an em dash;
 *   - "will" in a sentence that mentions movement, lift, improvement or the index;
 *   - a dollar sign, or "%" followed by "return";
 *   - "engagement survey";
 *   - a competitor name from the maintained list;
 *   - a sub-dimension code (C1 to S3) outside the methodology footer module;
 *   - an American spelling from the maintained list;
 *   - a word from the maintained list of banned words.
 */

// Maintained lists, matched as whole words, case aside. Additions are reviewed with the copy
// module. The competitor list is a first draft for Michael's review.
export const COMPETITORS: readonly string[] = [
  "Culture Amp",
  "Qualtrics",
  "Glint",
  "Peakon",
  "Officevibe",
  "Lattice",
];

export const AMERICAN_SPELLINGS: readonly string[] = [
  "organization",
  "organize",
  "color",
  "behavior",
  "center",
  "analyze",
  "prioritize",
  "recognize",
  "optimize",
  "enrollment",
  "enrolls",
  "catalog",
  "favorite",
  "labor",
];

export const BANNED_WORDS: readonly string[] = [
  "genuinely",
  "honestly",
  "leverage",
  "unlock",
  "seamless",
  "robust",
  "delve",
  "elevate",
];

const MOVEMENT_WORDS =
  /\b(mov(e|es|ed|ement|ing)|lift(s|ed|ing)?|improv(e|es|ed|ement|ing)|index)\b/i;
const SUB_DIMENSION_CODE = /\b(C[1-5]|M[1-4]|O[1-5]|S[1-3])\b/;

export interface CopyProblem {
  key: string;
  rule: string;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

/** Lints one keyed string. `footer` allows sub-dimension codes (the methodology footer module). */
export function lintString(
  key: string,
  text: string,
  options: { footer?: boolean } = {},
): CopyProblem[] {
  const problems: CopyProblem[] = [];
  if (text.includes("\u2014")) problems.push({ key, rule: "em dash" });
  if (sentences(text).some((s) => /\bwill\b/i.test(s) && MOVEMENT_WORDS.test(s))) {
    problems.push({ key, rule: '"will" about movement' });
  }
  if (text.includes("$") || /%\s*return/i.test(text))
    problems.push({ key, rule: "dollar figure or percentage return" });
  if (/engagement survey/i.test(text)) problems.push({ key, rule: '"engagement survey"' });
  for (const name of COMPETITORS) {
    if (containsWord(text, name)) problems.push({ key, rule: `competitor name: ${name}` });
  }
  if (!options.footer && SUB_DIMENSION_CODE.test(text))
    problems.push({ key, rule: "sub-dimension code outside the footer" });
  for (const word of AMERICAN_SPELLINGS) {
    if (containsWord(text, word)) problems.push({ key, rule: `American spelling: ${word}` });
  }
  for (const word of BANNED_WORDS) {
    if (containsWord(text, word)) problems.push({ key, rule: `banned word: ${word}` });
  }
  return problems;
}

/** Lints a whole copy table. */
export function lintCopy(
  table: Readonly<Record<string, string>>,
  options: { footer?: boolean } = {},
): CopyProblem[] {
  return Object.entries(table).flatMap(([key, text]) => lintString(key, text, options));
}
