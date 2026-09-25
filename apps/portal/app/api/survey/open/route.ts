import type { NextRequest } from "next/server";

import { tokenHash, isToken, issueStamp } from "@/lib/campaigns/tokens";
import { surveyTokenSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSurvey, type OpenSurvey } from "@/lib/survey/content";
import { readObject, reply } from "@/lib/survey/request";

/**
 * Opening a survey link (Milestone 5 plan, 4.2). It has no side effects, since link scanners run
 * scripts: it looks the token's hash up through survey_for_token, which reads live tokens and the
 * frozen campaign and never the responses, and returns the survey and a signed start stamp. It
 * returns no name, email or identifier of anyone. A spent token and an unknown one look the same.
 */
export async function POST(request: NextRequest) {
  const body = await readObject(request);
  if (!body || !isToken(body.token)) return reply({ state: "unknown" });
  const hash = tokenHash(body.token);
  const { data, error } = await createAdminClient().rpc("survey_for_token", {
    p_token_hash: hash,
  });
  if (error || !data) return reply({ state: "unavailable" }, 503);
  const found = data as unknown as { state: string };
  if (found.state !== "open")
    return reply({ state: found.state === "closed" ? "closed" : "unknown" });
  const open = found as OpenSurvey;
  const stamp = issueStamp(
    surveyTokenSecret(),
    hash,
    open.audience,
    new Date(),
    new Date(open.closesAt),
  );
  return reply({ state: "open", content: buildSurvey(open), stamp });
}
