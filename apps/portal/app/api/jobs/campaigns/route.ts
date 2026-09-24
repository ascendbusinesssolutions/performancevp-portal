import { type NextRequest, NextResponse } from "next/server";

import { launchDueCampaigns } from "@/lib/campaigns/launch";
import { cronAuthorised } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The campaign job (Milestone 5 plan, 5.2), called by Vercel Cron every five minutes with the
 * CRON_SECRET bearer token. Each run does bounded, resumable work and records itself, so a missed
 * run shows as a gap. It opens the scheduled campaigns whose time has come, each through the same
 * launch as "Launch now"; a campaign readiness refuses goes back to draft with its blockers.
 * Closing, scoring, reminders and sending join it later in this milestone.
 */

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!cronAuthorised(request)) return new NextResponse(null, { status: 401 });
  const opened = await launchDueCampaigns();
  const detail = { opened };
  await createAdminClient().rpc("record_job_run", { p_job: "campaigns", p_detail: detail });
  return NextResponse.json(detail, { status: opened.failed.length ? 500 : 200 });
}
