import "server-only";

import {
  loadActivePeople,
  loadFormalRatingsForCheck,
  loadMeasurementUnits,
  loadRoleFamilies,
  loadScaleMap,
  loadSkills,
  loadTeams,
  loadUnitContext,
  loadUnits,
} from "@/lib/setup/data";
import { sydneyToday } from "@/lib/dates";
import type { createAdminClient } from "@/lib/supabase/admin";
import { allRows } from "@/lib/supabase/all-rows";
import type { createClient } from "@/lib/supabase/server";

import { asCadence, type CampaignCadence } from "./cadence";
import type { AudienceKey } from "./deployment";
import type { CampaignToLaunch, LaunchData, PreviewUnit } from "./plan";

/**
 * The campaign reads. The screens read as the signed-in person, under row level security; a
 * scheduled launch, with no one signed in, reads the same rows through launch_dataset as the
 * service role (Milestone 5 plan, 2.3).
 */

type Client = Awaited<ReturnType<typeof createClient>>;
type Admin = ReturnType<typeof createAdminClient>;

export type CampaignStatus =
  "draft" | "scheduled" | "open" | "closed" | "under_review" | "released" | "cancelled";

export interface Campaign {
  id: string;
  organisation_id: string;
  cadence: CampaignCadence;
  name: string | null;
  status: CampaignStatus;
  opens_at: string | null;
  closes_at: string | null;
  launched_at: string | null;
  closed_at: string | null;
  pulse_rotation: number | null;
  event_trigger: string | null;
  launch_blockers: unknown;
  created_at: string;
  measurementUnitIds: string[];
}

export interface Proposal {
  id: string;
  anchor_campaign_id: string;
  cadence: CampaignCadence;
  due_on: string;
  status: "proposed" | "scheduled" | "dismissed";
  campaign_id: string | null;
}

const CAMPAIGN_COLUMNS =
  "id, organisation_id, cadence, name, status, opens_at, closes_at, launched_at, closed_at, " +
  "pulse_rotation, event_trigger, launch_blockers, created_at";

interface CampaignRow extends Omit<Campaign, "measurementUnitIds" | "cadence" | "status"> {
  cadence: string;
  status: string;
}

function campaignOf(row: CampaignRow, unitIds: string[]): Campaign {
  return {
    ...row,
    cadence: asCadence(row.cadence) ?? "baseline",
    status: row.status as CampaignStatus,
    measurementUnitIds: unitIds,
  };
}

/** Every campaign of the organisation with the measurement units it measures, newest first. */
export async function loadCampaigns(supabase: Client, orgId: string): Promise<Campaign[]> {
  const [rows, units] = await Promise.all([
    allRows((from, to) =>
      supabase
        .from("campaigns")
        .select(CAMPAIGN_COLUMNS)
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("campaign_units")
        .select("campaign_id, measurement_unit_id")
        .eq("organisation_id", orgId)
        .order("id")
        .range(from, to),
    ),
  ]);
  return (rows as unknown as CampaignRow[]).map((row) =>
    campaignOf(
      row,
      units.filter((u) => u.campaign_id === row.id).map((u) => u.measurement_unit_id),
    ),
  );
}

export async function loadCampaign(
  supabase: Client,
  orgId: string,
  campaignId: string,
): Promise<Campaign | null> {
  const [{ data }, { data: units }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("organisation_id", orgId)
      .eq("id", campaignId)
      .maybeSingle(),
    supabase
      .from("campaign_units")
      .select("measurement_unit_id")
      .eq("organisation_id", orgId)
      .eq("campaign_id", campaignId),
  ]);
  if (!data) return null;
  return campaignOf(
    data as unknown as CampaignRow,
    (units ?? []).map((u) => u.measurement_unit_id),
  );
}

export async function loadProposals(supabase: Client, orgId: string): Promise<Proposal[]> {
  const { data } = await supabase
    .from("campaign_schedule")
    .select("id, anchor_campaign_id, cadence, due_on, status, campaign_id")
    .eq("organisation_id", orgId)
    .eq("status", "proposed")
    .order("due_on");
  return (data ?? []).map((p) => ({
    ...p,
    cadence: asCadence(p.cadence) ?? "annual",
    status: p.status as Proposal["status"],
  }));
}

export function toLaunch(campaign: Campaign): CampaignToLaunch {
  return {
    id: campaign.id,
    cadence: campaign.cadence,
    pulse_rotation: campaign.pulse_rotation,
    event_trigger: campaign.event_trigger,
    closes_at: campaign.closes_at,
    measurementUnitIds: campaign.measurementUnitIds,
  };
}

/**
 * The readiness data and what else the launch plan needs, read as the signed-in person: the same
 * loaders as the readiness page, so the formal-ratings read is logged as ratings.checked there too.
 */
export async function loadLaunchData(
  supabase: Client,
  orgId: string,
  campaignId: string,
): Promise<LaunchData> {
  const [
    units,
    measurement,
    people,
    families,
    teams,
    skills,
    context,
    formalRatings,
    scaleMap,
    uploads,
    cycles,
    running,
  ] = await Promise.all([
    loadUnits(supabase, orgId),
    loadMeasurementUnits(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadRoleFamilies(supabase, orgId),
    loadTeams(supabase, orgId),
    loadSkills(supabase, orgId),
    loadUnitContext(supabase, orgId),
    loadFormalRatingsForCheck(supabase, orgId),
    loadScaleMap(supabase, orgId),
    supabase
      .from("directory_uploads")
      .select("id, uploaded_at")
      .eq("organisation_id", orgId)
      .eq("status", "staged")
      .order("uploaded_at", { ascending: false })
      .limit(1),
    allRows((from, to) =>
      supabase
        .from("measurement_cycles")
        .select("measurement_unit_id, calculation_runs(id)")
        .eq("organisation_id", orgId)
        .eq("status", "released")
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("campaign_units")
        .select("measurement_unit_id, campaigns!inner(id, status)")
        .eq("organisation_id", orgId)
        .neq("campaign_id", campaignId)
        .in("campaigns.status", ["open", "closed"])
        .order("id")
        .range(from, to),
    ),
  ]);
  return {
    today: sydneyToday(),
    units,
    ...measurement,
    people,
    families,
    teams,
    skills,
    context,
    formalRatings,
    scaleMap,
    stagedUploadId: uploads.data?.[0]?.id ?? null,
    releasedFullRuns: [
      ...new Set(
        cycles
          .filter((c) => (c.calculation_runs as unknown[] | null)?.length)
          .map((c) => c.measurement_unit_id),
      ),
    ],
    busy: [...new Set(running.map((r) => r.measurement_unit_id))],
  };
}

/** The same, read by the service role for a scheduled launch, with the setup version it saw first. */
export async function loadLaunchDataAsService(
  admin: Admin,
  campaignId: string,
): Promise<{
  data: LaunchData;
  campaign: CampaignToLaunch & { organisation_id: string; status: string };
  setupVersion: number;
}> {
  const { data, error } = await admin.rpc("launch_dataset", { p_campaign_id: campaignId });
  if (error || !data) throw new Error(`launch data not read: ${error?.code ?? "empty"}`);
  const d = data as unknown as Omit<LaunchData, "people"> & {
    people: Array<LaunchData["people"][number] & { fte: number | string }>;
    setupVersion: number;
    campaign: {
      id: string;
      organisation_id: string;
      cadence: string;
      status: string;
      pulse_rotation: number | null;
      event_trigger: string | null;
      closes_at: string | null;
      measurementUnitIds: string[];
    };
  };
  const { setupVersion, campaign, ...rest } = d;
  return {
    setupVersion,
    campaign: {
      ...campaign,
      cadence: asCadence(campaign.cadence) ?? "baseline",
    },
    data: { ...rest, people: rest.people.map((p) => ({ ...p, fte: Number(p.fte) })) },
  };
}

/** Who a launched campaign asked in each unit, as it froze them at launch. */
export async function loadFrozenAudiences(
  supabase: Client,
  orgId: string,
  campaignId: string,
): Promise<PreviewUnit[]> {
  const { data: units } = await supabase
    .from("campaign_units")
    .select("id, measurement_unit_id, headcount, c3_route, measurement_units(name)")
    .eq("organisation_id", orgId)
    .eq("campaign_id", campaignId);
  const ids = (units ?? []).map((u) => u.id);
  if (ids.length === 0) return [];
  const [audiences, members, teams] = await Promise.all([
    allRows((from, to) =>
      supabase
        .from("campaign_audiences")
        .select("campaign_unit_id, audience, items")
        .eq("organisation_id", orgId)
        .in("campaign_unit_id", ids)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("campaign_audience_members")
        .select("campaign_unit_id, audience")
        .eq("organisation_id", orgId)
        .in("campaign_unit_id", ids)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      supabase
        .from("campaign_teams")
        .select("campaign_unit_id")
        .eq("organisation_id", orgId)
        .in("campaign_unit_id", ids)
        .order("id")
        .range(from, to),
    ),
  ]);
  const count = (unitId: string, audience: string) =>
    members.filter((m) => m.campaign_unit_id === unitId && m.audience === audience).length;
  return (units ?? [])
    .map((u) => {
      const asked = audiences.filter((a) => a.campaign_unit_id === u.id);
      const name = (u.measurement_units as { name: string } | null)?.name ?? "";
      return {
        id: u.measurement_unit_id,
        name,
        members: u.headcount ?? count(u.id, "members"),
        teams: teams.filter((t) => t.campaign_unit_id === u.id).length,
        teamLeaders: count(u.id, "team_leaders"),
        teamLeaderFallback: false,
        leadershipTeam: count(u.id, "leadership_team"),
        managers: count(u.id, "managers"),
        c3Route: u.c3_route === "formal" ? ("formal" as const) : ("module" as const),
        audiences: asked.map((a) => a.audience as AudienceKey),
        checklists: asked.find((a) => a.audience === "admin_checklists")?.items ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
}

/**
 * The measurement units campaigns have measured (any campaign that names them: such a unit changes
 * through lineage, never in place) and those a scheduled, open or scoring campaign holds fixed.
 */
export async function loadMeasuredUnits(
  supabase: Client,
  orgId: string,
): Promise<{ measured: Set<string>; running: Set<string> }> {
  const rows = await allRows((from, to) =>
    supabase
      .from("campaign_units")
      .select("measurement_unit_id, campaigns!inner(status)")
      .eq("organisation_id", orgId)
      .order("id")
      .range(from, to),
  );
  const measured = new Set<string>();
  const running = new Set<string>();
  for (const row of rows) {
    measured.add(row.measurement_unit_id);
    const status = (row.campaigns as { status: string } | null)?.status;
    if (status === "scheduled" || status === "open" || status === "closed") {
      running.add(row.measurement_unit_id);
    }
  }
  return { measured, running };
}
