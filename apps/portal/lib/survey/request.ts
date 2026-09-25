import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * The survey routes' shared handling (Milestone 5 plan, 4.2): a size limit, JSON only, and responses
 * that are never cached or sent on with a referrer. These routes log nothing: no token, no hash, no
 * answer and no address (asserted by lib/survey/routes.test.ts).
 */

export const MAX_BODY = 64 * 1024;

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export function reply(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: HEADERS });
}

/** The request's JSON object, or null where it is too large, not JSON or not an object. */
export async function readObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
