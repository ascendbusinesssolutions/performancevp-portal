import { redirect } from "next/navigation";

import { RatingBar } from "@/components/rating-bar";
import { requireAccess } from "@/lib/auth/access";
import { asCadence } from "@/lib/campaigns/cadence";
import { dayLabel } from "@/lib/campaigns/calendar";
import { cadenceName } from "@/lib/campaigns/display";
import { commonCopy } from "@/lib/copy/common";
import { managerCopy } from "@/lib/copy/manager";
import { fill, listOf } from "@/lib/copy/template";
import type { RatingForm } from "@/lib/rating/form";
import { REFERENCE } from "@/lib/reference";
import { createClient } from "@/lib/supabase/server";

import { type Anchors, RatingFormView } from "./rating-form";

function anchorsOf(code: string): Anchors["band"] {
  return (REFERENCE.module_items.find((i) => i.code === code)?.anchors ?? []).map((a) => ({
    value: a.value,
    label: a.label,
    description: a.description,
  }));
}

/**
 * The manager's rating form for one campaign (Milestone 5 plan, 3.4). Read through my_rating_form,
 * which refuses anyone but the rating manager. The scale anchors and band labels are the sources'
 * own, from the reference tables (S8).
 */
export default async function RatePage({
  params,
  searchParams,
}: PageProps<"/org/[orgId]/rate/[campaignId]">) {
  const { orgId, campaignId } = await params;
  const { report } = await searchParams;
  const access = await requireAccess();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_rating_form", { p_campaign_id: campaignId });
  if (error || !data) redirect(`/org/${orgId}/rate`);
  const form = data as unknown as RatingForm;
  const campaign =
    form.campaign.name ??
    cadenceName(asCadence(form.campaign.cadence) ?? "baseline", form.campaign.eventTrigger);
  const units = listOf(
    form.units.map((u) => u.name),
    { and: commonCopy["list.and"], more: (n: number) => fill(commonCopy["list.more"], { n }) },
  );
  return (
    <>
      <RatingBar
        organisation={form.organisationName}
        person={form.session.managerName || access.email}
      />
      <RatingFormView
        form={form}
        anchors={{
          skill: anchorsOf("C1M-01"),
          knowledge: anchorsOf("C2M-01"),
          band: anchorsOf("C3M-01"),
        }}
        eyebrow={fill(managerCopy.eyebrow, { campaign, units })}
        closes={dayLabel(form.campaign.closesAt)}
        initialReport={typeof report === "string" ? report : null}
      />
    </>
  );
}
