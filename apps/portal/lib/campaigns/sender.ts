import "server-only";

import { emailCopy } from "@/lib/copy/email";
import { appBaseUrl, appEnv, mailpitUrl, resendApiKey, surveyTokenSecret } from "@/lib/env";
import { type ClaimedEmail, renderEmail } from "@/lib/email/render";
import { type Email, mailpitTransport, resendTransport, type Transport } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

import { surveyToken, tokenHash } from "./tokens";

/**
 * The sender (Milestone 5 plan, 4.1 and 5.2), run by the five-minute job and straight after "Launch
 * now". First, for each launched campaign whose tokens are not issued, it derives every token from
 * its invitation with SURVEY_TOKEN_SECRET and writes their hashes in one call, which the database
 * inserts in shuffled order; no row it writes names an invitation. Then it claims outbox rows,
 * renders each email at send time, derives each survey link again from its invitation, sends, and
 * records the outcome. Tokens and links exist only in this process's memory; nothing here logs.
 */

type Admin = ReturnType<typeof createAdminClient>;

const CLAIM = 100;

export function transport(): Transport {
  const name = emailCopy["from.name"];
  return appEnv() === "local"
    ? mailpitTransport(mailpitUrl(), name)
    : resendTransport(resendApiKey(), name);
}

/** Writes a campaign's live tokens, once. Returns how many. */
export async function issueTokens(admin: Admin, campaignId: string): Promise<number> {
  const { data, error } = await admin.rpc("invitations_for_tokens", { p_campaign_id: campaignId });
  if (error) throw new Error(`invitations not read: ${error.code ?? "unknown"}`);
  if (!data || data.length === 0) return 0;
  const secret = surveyTokenSecret();
  const tokens = data.map((i) => ({
    campaignUnitId: i.campaign_unit_id,
    audience: i.audience,
    tokenHash: tokenHash(surveyToken(secret, i.invitation_id, i.token_salt)),
  }));
  const { data: issued, error: issueError } = await admin.rpc("issue_survey_tokens", {
    p_campaign_id: campaignId,
    p_tokens: tokens,
  });
  if (issueError) throw new Error(`tokens not issued: ${issueError.code ?? "unknown"}`);
  return issued ?? 0;
}

export type SendSummary = {
  tokensIssued: number;
  sent: number;
  failed: number;
  errors: string[];
};

/**
 * Issues any tokens due, then sends the outbox (all of it, or one campaign's) until it is empty or
 * the time budget is spent. Every step can be resumed by the next run.
 */
export async function sendOutbox(options: {
  campaignId?: string;
  budgetMs: number;
}): Promise<SendSummary> {
  const started = Date.now();
  const admin = createAdminClient();
  const summary: SendSummary = { tokensIssued: 0, sent: 0, failed: 0, errors: [] };

  const { data: awaiting, error } = await admin.rpc("campaigns_awaiting_tokens");
  if (error) summary.errors.push(error.code ?? "awaiting");
  for (const campaignId of awaiting ?? []) {
    if (options.campaignId && campaignId !== options.campaignId) continue;
    try {
      summary.tokensIssued += await issueTokens(admin, campaignId);
    } catch {
      summary.errors.push("tokens");
    }
  }

  const secret = surveyTokenSecret();
  const base = appBaseUrl();
  const mail = transport();
  while (Date.now() - started < options.budgetMs) {
    const { data, error: claimError } = await admin.rpc("claim_outbox", {
      p_limit: CLAIM,
      ...(options.campaignId ? { p_campaign_id: options.campaignId } : {}),
    });
    if (claimError) {
      summary.errors.push(claimError.code ?? "claim");
      break;
    }
    const rows = (data ?? []) as unknown as ClaimedEmail[];
    if (rows.length === 0) break;

    const emails: Email[] = [];
    for (const row of rows) {
      const links = new Map(
        row.invitations.map((i) => [i.id, `${base}/s#t=${surveyToken(secret, i.id, i.salt)}`]),
      );
      const rendered = renderEmail(row, base, links);
      if (!rendered) {
        await admin.rpc("outbox_failed", {
          p_outbox_id: row.id,
          p_error: row.email ? "not_rendered" : "no_address",
          p_permanent: true,
        });
        summary.failed += 1;
        continue;
      }
      emails.push({ key: row.id, to: row.email!, ...rendered });
    }

    const outcomes = await mail.send(emails);
    for (const outcome of outcomes) {
      if (outcome.ok) {
        await admin.rpc("outbox_sent", {
          p_outbox_id: outcome.key,
          p_provider_message_id: outcome.id,
        });
        summary.sent += 1;
      } else {
        await admin.rpc("outbox_failed", {
          p_outbox_id: outcome.key,
          p_error: outcome.error,
          p_permanent: outcome.permanent,
        });
        summary.failed += 1;
      }
    }
    if (rows.length < CLAIM) break;
  }
  return summary;
}
