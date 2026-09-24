/**
 * The words a reader sees in one of the Supabase Auth email templates (supabase/templates), so the
 * copy lint can check them like any other copy: styles and tags removed, Go template actions
 * removed, the common entities decoded and whitespace collapsed.
 */
export function emailText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
