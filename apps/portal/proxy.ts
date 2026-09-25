import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { appEnv, supabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { contentSecurityPolicy } from "@/lib/security/csp";

/**
 * Runs before every page and route (Next.js 16's proxy, formerly middleware). It does three
 * things and no more:
 *   1. sets the content security policy with a fresh nonce;
 *   2. refreshes the Supabase session cookie, verifying the token (getClaims);
 *   3. sends a visitor with no session to sign in, except on the public paths.
 * The anonymous survey (/s and /api/survey) is public and never touches the session at all: a
 * respondent who is also signed in to the portal sends their cookie with the request, and nothing
 * about a survey request may read, refresh or set it (Milestone 5 plan, 4.2).
 * Which roles a person holds, and whether their session carries the assurance those roles need,
 * is decided in the signed-in layout from the database (lib/auth/access.ts), and enforced again by
 * the database itself on every query.
 */

const PUBLIC_PATHS = [
  "/login",
  "/auth/confirm",
  "/auth/reset",
  "/auth/new-link",
  "/api/health",
  "/api/jobs",
];

const SURVEY_PATHS = ["/s", "/api/survey"];

function under(paths: readonly string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublic(pathname: string): boolean {
  return under(PUBLIC_PATHS, pathname);
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    upgradeInsecureRequests: appEnv() !== "local" && appEnv() !== "unset",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withHeaders = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const { pathname } = request.nextUrl;
  if (under(SURVEY_PATHS, pathname)) {
    return withHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  }
  if (!supabaseConfigured()) {
    return withHeaders(
      isPublic(pathname)
        ? NextResponse.next({ request: { headers: requestHeaders } })
        : new NextResponse("This deployment is not configured yet.", { status: 503 }),
    );
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !isPublic(pathname)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return withHeaders(redirect);
  }
  return withHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
