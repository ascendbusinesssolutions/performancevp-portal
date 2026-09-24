import type { NextRequest } from "next/server";

import { isToken, stampSeconds, tokenHash } from "@/lib/campaigns/tokens";
import { surveyTokenSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAudience, parsePayload } from "@/lib/survey/payload";
import { readObject, reply } from "@/lib/survey/request";

/**
 * Submitting a survey (Milestone 5 plan, 4.2 and 4.3). The completion time comes from the signed
 * start stamp, never from the page; a stamp that is forged, expired or for another token is refused
 * and the page opens the survey again for a fresh one. ingest_survey_response spends the token and
 * writes the response in one transaction, so a token answers once. Nothing is logged and the reply
 * echoes nothing.
 */

const REFUSALS: Record<string, [string, number]> = {
  "survey.spent": ["unknown", 409],
  "survey.closed": ["closed", 409],
  "survey.empty": ["empty", 400],
  "survey.invalid": ["invalid", 400],
};

export async function POST(request: NextRequest) {
  const body = await readObject(request);
  if (!body || !isToken(body.token) || !isAudience(body.audience)) {
    return reply({ state: "invalid" }, 400);
  }
  const payload = parsePayload(body.answers);
  if (!payload) return reply({ state: "invalid" }, 400);
  const hash = tokenHash(body.token);
  const seconds = stampSeconds(surveyTokenSecret(), body.stamp, hash, body.audience, new Date());
  if (seconds === null) return reply({ state: "stale" }, 409);

  const { error } = await createAdminClient().rpc("ingest_survey_response", {
    p_token_hash: hash,
    p_payload: payload as never,
    p_completion_seconds: seconds,
  });
  if (error) {
    const refusal = REFUSALS[error.message];
    return refusal
      ? reply({ state: refusal[0] }, refusal[1])
      : reply({ state: "unavailable" }, 503);
  }
  return reply({ state: "received" });
}
