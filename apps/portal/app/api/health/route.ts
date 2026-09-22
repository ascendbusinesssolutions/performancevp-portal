import { NextResponse } from "next/server";

import { buildInfo } from "@/lib/build-info";

// Read at request time, so the response reflects the running deployment, not the build.
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Reports the environment, the commit and the version of each workspace package. Public in
 * Milestone 0 so the staging deploy can be verified; whether it stays public is decided at
 * Milestone 10.
 */
export function GET() {
  return NextResponse.json({ status: "ok", ...buildInfo() });
}
