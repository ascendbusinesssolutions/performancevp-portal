/**
 * Every row of a query, read a page at a time. PostgREST returns at most `max_rows` rows per
 * request (1,000; supabase/config.toml), so a directory of several thousand people would otherwise
 * be cut short without any error. The query must have a stable order (by id, say) so that pages
 * neither overlap nor skip.
 */
export const PAGE_SIZE = 1000;

export async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
