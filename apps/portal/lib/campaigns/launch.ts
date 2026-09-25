import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

import { loadCampaign, loadLaunchData, loadLaunchDataAsService, toLaunch } from "./data";
import { type CampaignBlocker, type LaunchPreparation, prepareLaunch } from "./plan";

/**
 * The launch (Milestone 5 plan, 2.3). "Launch now" reads the readiness data as the signed-in
 * person; the setup version is read before and after, and the read is repeated if it moved (D27).
 * Readiness reruns on the server with evaluateReadiness unchanged, and the campaign's own checks are
 * added; any blocker refuses. Then launch_campaign, which only the service role runs, checks the
 * plan again under the organisation lock, acting for the named person. Managers who have no account
 * get one through the Auth Admin API, confirmed and without a password, since they sign in with a
 * one-time code; their memberships follow. A scheduled launch does the same from the job, reading
 * through launch_dataset, and a refusal sends the campaign back to draft with its blockers.
 */

type Client = Awaited<ReturnType<typeof createClient>>;
type Admin = ReturnType<typeof createAdminClient>;

const ATTEMPTS = 3;

export type LaunchOutcome =
  | { kind: "launched"; invitations: number; ratingSessions: number; accountsPending: number }
  | { kind: "refused"; preparation: LaunchPreparation }
  | { kind: "changed" }
  | { kind: "failed"; code: string };

interface LaunchResult {
  managersWithoutAccounts: Array<{ employeeId: string; email: string }>;
  invitations: number;
  ratingSessions: number;
}

async function setupVersion(admin: Admin, orgId: string): Promise<number> {
  const { data, error } = await admin.rpc("setup_version", { p_organisation_id: orgId });
  if (error || data === null) throw new Error(`setup version not read: ${error?.code ?? "empty"}`);
  return Number(data);
}

/**
 * Accounts for the campaign's rating managers who have none, then their memberships. Returns how
 * many are still without one; the five-minute job retries them.
 */
export async function provideManagerAccounts(
  admin: Admin,
  campaignId: string,
  missing: ReadonlyArray<{ email: string }>,
): Promise<number> {
  for (const manager of missing) {
    const { error } = await admin.auth.admin.createUser({
      email: manager.email,
      email_confirm: true,
    });
    if (error && error.code !== "email_exists") continue;
  }
  const { data, error } = await admin.rpc("grant_manager_memberships", {
    p_campaign_id: campaignId,
  });
  if (error) return missing.length;
  return Array.isArray(data) ? data.length : 0;
}

async function callLaunch(
  admin: Admin,
  actorUserId: string | null,
  campaignId: string,
  version: number,
  preparation: LaunchPreparation,
): Promise<{ result: LaunchResult } | { changed: true } | { code: string }> {
  const { data, error } = await admin.rpc("launch_campaign", {
    // A scheduled launch acts for no one: the audit shows the system opened it.
    p_actor_user_id: actorUserId as string,
    p_campaign_id: campaignId,
    p_setup_version: version,
    p_plan: JSON.parse(JSON.stringify(preparation.plan)),
  });
  if (error) {
    if (error.message.includes("changed while the campaign was launching"))
      return { changed: true };
    return { code: error.code ?? "unknown" };
  }
  return { result: data as unknown as LaunchResult };
}

/** "Launch now", for a signed-in administrator, account owner or staff member under a session. */
export async function launchNow(
  supabase: Client,
  orgId: string,
  campaignId: string,
  actorUserId: string,
): Promise<LaunchOutcome> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const before = await setupVersion(admin, orgId);
    const [campaign, data] = await Promise.all([
      loadCampaign(supabase, orgId, campaignId),
      loadLaunchData(supabase, orgId, campaignId),
    ]);
    const after = await setupVersion(admin, orgId);
    if (!campaign) return { kind: "failed", code: "not_found" };
    if (before !== after) continue;
    const preparation = prepareLaunch(data, toLaunch(campaign), new Date());
    if (!preparation.ready) return { kind: "refused", preparation };
    const launched = await callLaunch(admin, actorUserId, campaignId, before, preparation);
    if ("changed" in launched) continue;
    if ("code" in launched) return { kind: "failed", code: launched.code };
    const pending = await provideManagerAccounts(
      admin,
      campaignId,
      launched.result.managersWithoutAccounts,
    );
    return {
      kind: "launched",
      invitations: launched.result.invitations,
      ratingSessions: launched.result.ratingSessions,
      accountsPending: pending,
    };
  }
  return { kind: "changed" };
}

/** The blockers a refused scheduled launch records on the campaign, for its page and the audit. */
export function blockerSummary(preparation: LaunchPreparation): Array<Record<string, string>> {
  return [
    ...preparation.readiness.checks
      .filter((c) => c.level === "blocker")
      .map((c) => ({ check: c.key })),
    ...preparation.blockers.map((b: CampaignBlocker): Record<string, string> =>
      "unit" in b ? { campaign: b.kind, unit: b.unit.id } : { campaign: b.kind },
    ),
  ];
}

/** Opens every scheduled campaign whose time has come (the five-minute job). */
export async function launchDueCampaigns(): Promise<{
  launched: number;
  refused: number;
  failed: string[];
}> {
  const admin = createAdminClient();
  const { data: due, error } = await admin.rpc("due_scheduled_campaigns");
  if (error) return { launched: 0, refused: 0, failed: [error.code ?? "unknown"] };
  let launched = 0;
  let refused = 0;
  const failed: string[] = [];
  for (const { campaign_id: campaignId } of due ?? []) {
    try {
      const outcome = await launchScheduled(admin, campaignId);
      if (outcome === "launched") launched += 1;
      else if (outcome === "refused") refused += 1;
      else if (outcome !== "skipped") failed.push(outcome);
    } catch {
      failed.push("unreadable");
    }
  }
  return { launched, refused, failed };
}

/** One scheduled launch: launched, refused, skipped (no longer scheduled), or an error code. */
async function launchScheduled(admin: Admin, campaignId: string): Promise<string> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const {
      data,
      campaign,
      setupVersion: version,
    } = await loadLaunchDataAsService(admin, campaignId);
    if (campaign.status !== "scheduled") return "skipped";
    const preparation = prepareLaunch(data, campaign, new Date());
    if (!preparation.ready) {
      const { error } = await admin.rpc("record_launch_refusal", {
        p_campaign_id: campaignId,
        p_blockers: blockerSummary(preparation),
      });
      return error ? (error.code ?? "unknown") : "refused";
    }
    const result = await callLaunch(admin, null, campaignId, version, preparation);
    if ("changed" in result) continue;
    if ("code" in result) return result.code;
    await provideManagerAccounts(admin, campaignId, result.result.managersWithoutAccounts);
    return "launched";
  }
  return "changed";
}

/**
 * Accounts and memberships for managers still without them, on every open campaign (the five-minute
 * job). Returns how many are still waiting.
 */
export async function retryManagerAccounts(): Promise<number> {
  const admin = createAdminClient();
  const { data: open } = await admin.rpc("open_campaigns");
  let waiting = 0;
  for (const campaign of open ?? []) {
    const { data } = await admin.rpc("grant_manager_memberships", {
      p_campaign_id: campaign.campaign_id,
    });
    const missing = (Array.isArray(data) ? data : []) as Array<{ email: string }>;
    if (missing.length > 0) {
      waiting += await provideManagerAccounts(admin, campaign.campaign_id, missing);
    }
  }
  return waiting;
}
