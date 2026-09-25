import "server-only";

import { createHash } from "node:crypto";

import { appBaseUrl, surveyTokenSecret } from "@/lib/env";
import { type ClaimedEmail, renderSurveyReminder } from "@/lib/email/render";
import type { Email } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

import { asCadence, REMINDER_DAYS } from "./cadence";
import { reminderDue } from "./calendar";
import { transport } from "./sender";
import { surveyToken, tokenHash } from "./tokens";

/**
 * Survey reminders (Milestone 5 plan, 5.2; D12): on a reminder day from 09:00, and whenever an
 * administrator asks. Who is outstanding is worked out here and nowhere else: each invitation's
 * token is derived again with the secret, the database says which hashes are still live, and those
 * people are emailed at once with the links to the parts they have not answered. Nothing about who
 * was reminded is written anywhere; the reminder's record holds a count. A reminder day also queues
 * the managers' and the checklists' reminders, which are about identified work.
 */

type Admin = ReturnType<typeof createAdminClient>;

interface ReminderInvitation {
  id: string;
  salt: string;
  audience: ClaimedEmail["invitations"][number]["audience"];
  unitName: string;
  email: string;
  itemCount: number;
}

async function sendSurveyReminder(
  admin: Admin,
  reminderId: string,
  campaignId: string,
  campaignUnitId: string | null,
  audience: string | null,
): Promise<number> {
  const { data } = await admin.rpc("invitations_for_reminders", {
    p_campaign_id: campaignId,
    ...(campaignUnitId ? { p_campaign_unit_id: campaignUnitId } : {}),
    ...(audience ? { p_audience: audience } : {}),
  });
  const found = data as unknown as {
    organisationName: string;
    closesAt: string;
    invitations: ReminderInvitation[];
  } | null;
  if (!found || found.invitations.length === 0) {
    await admin.rpc("survey_reminder_sent", { p_reminder_id: reminderId, p_emails: 0 });
    return 0;
  }
  const secret = surveyTokenSecret();
  const base = appBaseUrl();
  const tokens = new Map(found.invitations.map((i) => [i.id, surveyToken(secret, i.id, i.salt)]));
  const { data: live } = await admin.rpc("survey_tokens_live", {
    p_campaign_id: campaignId,
    p_hashes: [...tokens.values()].map(tokenHash),
  });
  const liveHashes = new Set((live ?? []) as string[]);
  const outstanding = new Map<string, ReminderInvitation[]>();
  for (const invitation of found.invitations) {
    if (!liveHashes.has(tokenHash(tokens.get(invitation.id)!))) continue;
    outstanding.set(invitation.email, [...(outstanding.get(invitation.email) ?? []), invitation]);
  }
  const emails: Email[] = [...outstanding].map(([to, invitations]) => ({
    // The key names the reminder and a hash of the address, never the address.
    key: `${reminderId}-${createHash("sha256").update(to).digest("hex").slice(0, 16)}`,
    to,
    ...renderSurveyReminder(
      found.organisationName,
      found.closesAt,
      invitations,
      new Map(invitations.map((i) => [i.id, `${base}/s#t=${tokens.get(i.id)}`])),
      base,
    ),
  }));
  const outcomes = await transport().send(emails);
  const sent = outcomes.filter((o) => o.ok).length;
  await admin.rpc("survey_reminder_sent", { p_reminder_id: reminderId, p_emails: sent });
  return sent;
}

export type ReminderSummary = { days: number; requested: number; emails: number; errors: string[] };

/** The reminder days due now, and the administrators' reminders waiting to go. */
export async function runReminders(now: Date = new Date()): Promise<ReminderSummary> {
  const admin = createAdminClient();
  const summary: ReminderSummary = { days: 0, requested: 0, emails: 0, errors: [] };
  const { data: open, error } = await admin.rpc("open_campaigns");
  if (error) summary.errors.push(error.code ?? "open");
  for (const campaign of open ?? []) {
    const cadence = asCadence(campaign.cadence);
    if (!cadence || !campaign.tokens_issued || !campaign.opens_at) continue;
    const day = reminderDue(REMINDER_DAYS[cadence], campaign.opens_at, now);
    if (day === null) continue;
    const { data: reminderId } = await admin.rpc("claim_automatic_reminder", {
      p_campaign_id: campaign.campaign_id,
      p_day: day,
    });
    if (!reminderId) continue;
    summary.days += 1;
    try {
      summary.emails += await sendSurveyReminder(
        admin,
        reminderId,
        campaign.campaign_id,
        null,
        null,
      );
    } catch {
      summary.errors.push("reminder");
    }
  }
  const { data: pending } = await admin.rpc("pending_survey_reminders");
  for (const r of pending ?? []) {
    summary.requested += 1;
    try {
      summary.emails += await sendSurveyReminder(
        admin,
        r.reminder_id,
        r.campaign_id,
        r.campaign_unit_id,
        r.audience,
      );
    } catch {
      summary.errors.push("reminder");
    }
  }
  return summary;
}
