"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { requireAccess } from "@/lib/auth/access";
import type { FormState } from "@/lib/auth/form-state";
import { asCadence } from "@/lib/campaigns/cadence";
import { answersFromForm, CHECKLISTS } from "@/lib/campaigns/checklist-answers";
import {
  dayLabel,
  proposedOpening,
  sameTimeDaysLater,
  sydneyInstant,
  timeLabel,
  windowFrom,
  windowLaunchedNow,
} from "@/lib/campaigns/calendar";
import { loadCampaign } from "@/lib/campaigns/data";
import { launchNow } from "@/lib/campaigns/launch";
import { runReminders } from "@/lib/campaigns/reminders";
import { sendOutbox } from "@/lib/campaigns/sender";
import { campaignsCopy, type CampaignsCopyKey } from "@/lib/copy/campaigns";
import { fill } from "@/lib/copy/template";
import { setupCopy } from "@/lib/copy/setup";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import { REFERENCE } from "@/lib/reference";
import { type DbError, errorKey, type ErrorRule } from "@/lib/setup/db-errors";
import { createClient } from "@/lib/supabase/server";

// The campaign actions (Milestone 5 plan, 2.1 to 2.3). Each runs as the signed-in person; the
// database decides whether they may (administrators, the account owner, staff under a session, in a
// writable organisation) and writes the audit entry. The launch alone runs as the service role,
// acting for that person, after readiness has rerun on the server (lib/campaigns/launch.ts).

const RULES: readonly ErrorRule<CampaignsCopyKey | "readOnly">[] = [
  ["22023", "every unit must be", "error.units"],
  ["22023", "one or more", "error.units"],
  ["22023", "closes after it opens", "error.window"],
  ["22023", "opens in the future", "error.opens"],
  ["22023", "already been decided", "error.proposal"],
  ["22023", "none of the units this proposal", "error.proposalUnits"],
  ["22023", "another campaign is measuring", "error.busy"],
  ["22023", "only a draft", "error.state"],
  ["22023", "only a scheduled", "error.state"],
  ["22023", "close has passed", "error.window"],
  ["22023", "less than a day ago", "monitor.remindLimit"],
  ["23514", "name", "error.name"],
  ["42501", null, "readOnly"],
];

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function failure(error: DbError | null): FormState {
  const key = errorKey(error, RULES, "readOnly");
  if (key === "readOnly") {
    return { error: error ? setupCopy["error.readOnly"] : setupCopy["error.generic"] };
  }
  return { error: campaignsCopy[key] };
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function campaignPath(orgId: string, campaignId?: string): string {
  return campaignId ? `/org/${orgId}/campaigns/${campaignId}` : `/org/${orgId}/campaigns`;
}

/** A new draft: the cadence, the event where there is one, the units and the window. */
export async function createCampaign(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  let cadence = asCadence(text(formData, "cadence"));
  if (!cadence) return { error: campaignsCopy["error.cadence"] };
  let trigger: string | null = null;
  if (cadence === "event_triggered") {
    const chosen = REFERENCE.event_triggers.find(
      (t) => t.code === text(formData, "event") && t.detection === "menu",
    );
    if (!chosen) return { error: campaignsCopy["error.event"] };
    // Two pulse indicators down calls for a half-yearly check (Cadence Master 7.3).
    if (chosen.deploys === "half_yearly") cadence = "half_yearly";
    else trigger = chosen.code;
  }
  const units = formData
    .getAll("unit")
    .filter((u): u is string => typeof u === "string" && u !== "");
  if (units.length === 0) return { error: campaignsCopy["error.units"] };
  const opensOn = text(formData, "opensOn");
  if (!isDate(opensOn) || opensOn < sydneyToday()) return { error: campaignsCopy["error.opens"] };
  const name = text(formData, "name");
  if (name.length > 120) return { error: campaignsCopy["error.name"] };
  const window = windowFrom(cadence, opensOn);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_campaign", {
    p_organisation_id: orgId,
    p_cadence: cadence,
    p_name: name,
    p_measurement_unit_ids: units,
    p_opens_at: window.opensAt.toISOString(),
    p_closes_at: window.closesAt.toISOString(),
    ...(trigger ? { p_event_trigger: trigger } : {}),
  });
  if (error || !data) return failure(error);
  revalidatePath(campaignPath(orgId));
  redirect(campaignPath(orgId, data));
}

/** A draft's name, units and window. */
export async function saveDraft(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const units = formData
    .getAll("unit")
    .filter((u): u is string => typeof u === "string" && u !== "");
  if (units.length === 0) return { error: campaignsCopy["error.units"] };
  const opensOn = text(formData, "opensOn");
  const closesOn = text(formData, "closesOn");
  if (!isDate(opensOn) || opensOn < sydneyToday()) return { error: campaignsCopy["error.opens"] };
  if (!isDate(closesOn) || closesOn < opensOn) return { error: campaignsCopy["error.window"] };
  const name = text(formData, "name");
  if (name.length > 120) return { error: campaignsCopy["error.name"] };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_campaign", {
    p_campaign_id: campaignId,
    p_name: name,
    p_measurement_unit_ids: units,
    p_opens_at: sydneyInstant(opensOn, "09:00").toISOString(),
    p_closes_at: sydneyInstant(closesOn, "17:00").toISOString(),
  });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId, campaignId));
  return { message: campaignsCopy["draft.saved"] };
}

/**
 * "Launch now": a draft planned for a later day first moves to open today with the same length of
 * window, then the launch reruns readiness on the server and launches if nothing blocks it.
 */
export async function launchCampaign(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const access = await requireAccess();
  const supabase = await createClient();
  const campaign = await loadCampaign(supabase, orgId, campaignId);
  if (!campaign || campaign.status !== "draft" || !campaign.opens_at || !campaign.closes_at) {
    return { error: campaignsCopy["error.state"] };
  }
  const now = new Date();
  if (Date.parse(campaign.opens_at) > now.getTime()) {
    const window = windowLaunchedNow(campaign.opens_at, campaign.closes_at, now);
    const { error } = await supabase.rpc("update_campaign", {
      p_campaign_id: campaignId,
      p_name: campaign.name ?? "",
      p_measurement_unit_ids: campaign.measurementUnitIds,
      p_opens_at: window.opensAt.toISOString(),
      p_closes_at: window.closesAt.toISOString(),
    });
    if (error) return failure(error);
  }
  const outcome = await launchNow(supabase, orgId, campaignId, access.userId);
  revalidatePath(campaignPath(orgId), "layout");
  switch (outcome.kind) {
    case "launched":
      // The first invitations go now rather than at the next run of the job.
      after(() => sendOutbox({ campaignId, budgetMs: 120_000 }));
      redirect(
        `${campaignPath(orgId, campaignId)}?notice=launched${
          outcome.accountsPending > 0 ? `&pending=${outcome.accountsPending}` : ""
        }`,
      );
    case "refused":
      return { error: campaignsCopy["error.refused"] };
    case "changed":
      return { error: campaignsCopy["error.changed"] };
    case "failed":
      return failure({ code: outcome.code });
  }
}

export async function scheduleCampaign(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_campaign", { p_campaign_id: campaignId });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId), "layout");
  return {};
}

export async function unscheduleCampaign(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("unschedule_campaign", { p_campaign_id: campaignId });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId), "layout");
  return {};
}

export async function cancelCampaign(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_campaign", { p_campaign_id: campaignId });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId), "layout");
  redirect(campaignPath(orgId));
}

/**
 * The calendar: approving a proposal schedules its campaign from the due date (or tomorrow, where
 * the date has passed) for the cadence's window; dismissing it records the decision.
 */
export async function decideProposal(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  await requireOrgManager(orgId);
  const approve = text(formData, "decision") === "approve";
  const cadence = asCadence(text(formData, "cadence"));
  const dueOn = text(formData, "dueOn");
  const supabase = await createClient();
  if (!approve) {
    const { error } = await supabase.rpc("decide_schedule_proposal", {
      p_proposal_id: text(formData, "proposalId"),
      p_approve: false,
    });
    if (error) return failure(error);
    revalidatePath(campaignPath(orgId));
    redirect(`${campaignPath(orgId)}?notice=dismissed#calendar`);
  }
  if (!cadence || !isDate(dueOn)) return { error: campaignsCopy["error.state"] };
  const opensOn = proposedOpening(sydneyToday(), dueOn);
  const window = windowFrom(cadence, opensOn);
  const { data, error } = await supabase.rpc("decide_schedule_proposal", {
    p_proposal_id: text(formData, "proposalId"),
    p_approve: true,
    p_opens_at: window.opensAt.toISOString(),
    p_closes_at: window.closesAt.toISOString(),
  });
  if (error || !data) return failure(error);
  revalidatePath(campaignPath(orgId));
  redirect(campaignPath(orgId, data));
}

/**
 * Saves one checklist for one unit (Online Measurement Specification 4.2 to 4.3a; plan 3.4). Each
 * save is a new version; save_checklist checks the answers against the unit's frozen role families
 * and systems and refuses once the campaign has closed.
 */
export async function saveChecklist(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  const campaignUnitId = text(formData, "campaignUnitId");
  await requireOrgManager(orgId);
  const code = CHECKLISTS.find((c) => c === text(formData, "checklist"));
  if (!code) return { error: campaignsCopy["error.checklist"] };
  const subjects = formData.getAll("subject").filter((v): v is string => typeof v === "string");
  const answers = answersFromForm(code, formData, subjects);
  if (!answers) return { error: campaignsCopy["error.checklist"] };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_checklist", {
    p_campaign_unit_id: campaignUnitId,
    p_checklist: code,
    p_answers: answers as never,
  });
  if (error) {
    if (error.code === "42501") return failure(error);
    return {
      error: error.message.includes("completed while the campaign is open")
        ? campaignsCopy["checklist.closed"]
        : campaignsCopy["error.checklist"],
    };
  }
  revalidatePath(`${campaignPath(orgId, campaignId)}`, "layout");
  return { message: campaignsCopy["checklist.saved"] };
}

/** "Send a reminder now": to everyone who still has a part to answer, at most once a day. */
export async function requestReminder(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_survey_reminder", { p_campaign_id: campaignId });
  if (error) return failure(error);
  // It goes now rather than at the job's next run.
  after(() => runReminders());
  revalidatePath(campaignPath(orgId, campaignId));
  return { message: campaignsCopy["monitor.reminded"] };
}

/** "Extend by a week": the same time of day, seven days later. */
export async function extendWeek(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const campaign = await loadCampaign(supabase, orgId, campaignId);
  if (!campaign?.closes_at) return { error: campaignsCopy["error.state"] };
  const closesAt = sameTimeDaysLater(campaign.closes_at, 7);
  const { error } = await supabase.rpc("extend_campaign", {
    p_campaign_id: campaignId,
    p_closes_at: closesAt.toISOString(),
  });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId, campaignId));
  return {
    message: fill(campaignsCopy["monitor.extended"], {
      date: dayLabel(closesAt),
      time: timeLabel(closesAt),
    }),
  };
}

/** A reminder to one manager, or to every manager with reports still to rate: once a day each. */
export async function remindManagers(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  const sessionId = text(formData, "sessionId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remind_managers", {
    p_campaign_id: campaignId,
    ...(sessionId ? { p_session_id: sessionId } : {}),
  });
  if (error) return failure(error);
  if (!data) return { error: campaignsCopy["monitor.managers.limit"] };
  after(() => sendOutbox({ campaignId, budgetMs: 60_000 }));
  return { message: campaignsCopy["monitor.managers.reminded"] };
}

/** "Close it now": the surveys and rating forms stop, and scoring follows. */
export async function closeNow(_previous: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "organisationId");
  const campaignId = text(formData, "campaignId");
  await requireOrgManager(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_campaign_now", { p_campaign_id: campaignId });
  if (error) return failure(error);
  revalidatePath(campaignPath(orgId), "layout");
  redirect(campaignPath(orgId, campaignId));
}
