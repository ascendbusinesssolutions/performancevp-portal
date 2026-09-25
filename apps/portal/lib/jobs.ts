import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

/** Vercel Cron calls the job routes with the CRON_SECRET bearer token; nothing else may. */
export function cronAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
