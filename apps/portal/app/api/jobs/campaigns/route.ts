import { type NextRequest, NextResponse } from "next/server";

import { launchDueCampaigns, retryManagerAccounts } from "@/lib/campaigns/launch";
import { runReminders } from "@/lib/campaigns/reminders";
import { sendOutbox } from "@/lib/campaigns/sender";
import { cronAuthorised } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The campaign job (Milestone 5 plan, 5.2), called by Vercel Cron every five minutes with the
 * CRON_SECRET bearer token. Each run does bounded, resumable work in order: opens the scheduled
 * campaigns whose time has come (through the same launch as "Launch now"; one readiness refuses
 * goes back to draft), closes those whose close has passed, sends the reminders due, queues the
 * calendar's notices, sets up any manager's sign-in still waiting, then issues tokens and sends the
 * outbox within its time budget. Every run is recorded; a run that changed a campaign's state is
 * also audited (checkpoint 2). Scoring a closed campaign joins it in step 8.
 */

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!cronAuthorised(request)) return new NextResponse(null, { status: 401 });
  const admin = createAdminClient();
  const opened = await launchDueCampaigns();
  const { data: closed, error: closeError } = await admin.rpc("close_due_campaigns");
  const reminders = await runReminders();
  const { data: notices } = await admin.rpc("queue_schedule_notices");
  const accountsWaiting = await retryManagerAccounts();
  const sent = await sendOutbox({ budgetMs: 150_000 });
  const detail = {
    opened,
    closed: (closed ?? []).length,
    reminders,
    notices: notices ?? 0,
    accountsWaiting,
    sent,
  };
  await admin.rpc("record_job_run", {
    p_job: "campaigns",
    p_detail: detail,
    p_changed: opened.launched + opened.refused + detail.closed > 0,
  });
  const failed =
    opened.failed.length > 0 ||
    sent.errors.length > 0 ||
    reminders.errors.length > 0 ||
    Boolean(closeError);
  return NextResponse.json(detail, { status: failed ? 500 : 200 });
}
