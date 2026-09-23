/**
 * The content security policy set on every response by the proxy (Milestone 3 plan, Section 9).
 *
 * Scripts run only with the per-request nonce (Next.js adds it to its own scripts when it sees the
 * policy on the request). Nothing is fetched from another origin: every Supabase call is made on
 * the server, so the browser talks to this origin alone. The page cannot be framed, forms post only
 * here, and plugins and <base> are refused. Development relaxes only what the Next.js dev server
 * needs; `upgrade-insecure-requests` is added wherever the site is served over HTTPS.
 */
export interface CspOptions {
  development: boolean;
  upgradeInsecureRequests: boolean;
}

export function contentSecurityPolicy(nonce: string, options: CspOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${options.development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (options.upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}
