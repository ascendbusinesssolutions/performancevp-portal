/**
 * Turns a refusal from the database into the copy the person sees. The database's own messages are
 * never shown; each rule names the SQLSTATE and, where needed, a fragment of the message that tells
 * two refusals with the same state apart.
 */
export interface DbError {
  code?: string;
  message?: string;
}

export type ErrorRule<K extends string> = [code: string, fragment: string | null, key: K];

export function errorKey<K extends string>(
  error: DbError | null | undefined,
  rules: readonly ErrorRule<K>[],
  fallback: K,
): K {
  if (!error) return fallback;
  for (const [code, fragment, key] of rules) {
    if (error.code === code && (fragment === null || (error.message ?? "").includes(fragment))) {
      return key;
    }
  }
  return fallback;
}
