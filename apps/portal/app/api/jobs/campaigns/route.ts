import { type NextRequest, NextResponse } from "next/server";

import { launchDueCampaigns } from "@/lib/campaigns/launch";
import { sendOutbox } from "@/lib/campaigns/sender";
import { cronAuthorised } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The campaign job (Milestone 5 plan, 5.2), called by Vercel Cron every five minutes with the
 * CRON_SECRET bearer token. Each run does bounded, resumable work and records itself, so a missed
 * run shows as a gap. It opens the scheduled campaigns whose time has come, each through the same
 * launch as "Launch now" (a campaign readiness refuses goes back to draft with its blockers), then
 * issues any launched campaign's tokens and sends the outbox within its time budget. Closing,
 * scoring and reminders join it later in this milestone.
 */

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!cronAuthorised(request)) return new NextResponse(null, { status: 401 });
  const opened = await launchDueCampaigns();
  const sent = await sendOutbox({ budgetMs: 200_000 });
  const detail = { opened, sent };
  // Every run is recorded; only a run that changed a campaign's state is audited (checkpoint 2).
  await createAdminClient().rpc("record_job_run", {
    p_job: "campaigns",
    p_detail: detail,
    p_changed: opened.launched + opened.refused > 0,
  });
  const failed = opened.failed.length > 0 || sent.errors.length > 0;
  return NextResponse.json(detail, { status: failed ? 500 : 200 });
}
