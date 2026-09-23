/**
 * The Sydney calendar date, as YYYY-MM-DD. Subscription terms, the 12-month rule for formal ratings
 * and every date a client enters are on the Australian calendar, not the server's UTC date
 * (private.today() in the database is the same rule).
 */
export function sydneyToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
}
