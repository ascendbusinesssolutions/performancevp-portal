import { campaignsCopy } from "@/lib/copy/campaigns";
import { fill } from "@/lib/copy/template";
import { REFERENCE } from "@/lib/reference";

import type { CampaignCadence } from "./cadence";
import { dayLabel, timeLabel } from "./calendar";

/**
 * How a campaign is named and its state worded on the campaign screens (PORTAL_COPY_SPEC.md C1).
 */

interface Named {
  name: string | null;
  cadence: CampaignCadence;
  event_trigger: string | null;
}

export function cadenceName(cadence: CampaignCadence, trigger: string | null = null): string {
  if (cadence === "event_triggered" && trigger) {
    const source = REFERENCE.event_triggers.find((t) => t.code === trigger)?.source_trigger;
    if (source) return fill(campaignsCopy["cadence.eventNamed"], { trigger: source });
  }
  return campaignsCopy[`cadence.${cadence}`];
}

export function campaignTitle(campaign: Named): string {
  return campaign.name ?? cadenceName(campaign.cadence, campaign.event_trigger);
}

interface Stated {
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  closed_at: string | null;
}

export function stateLine(
  campaign: Stated,
  releasedAt: string | null = null,
  now = new Date(),
): string {
  switch (campaign.status) {
    case "scheduled":
      return campaign.opens_at
        ? fill(campaignsCopy["state.scheduled"], { date: dayLabel(campaign.opens_at, now) })
        : campaignsCopy["state.draft"];
    case "open":
      return campaign.closes_at
        ? fill(campaignsCopy["state.open"], {
            date: dayLabel(campaign.closes_at, now),
            time: timeLabel(campaign.closes_at),
          })
        : campaignsCopy["state.draft"];
    case "closed":
    case "under_review":
      return fill(campaignsCopy["state.closed"], {
        date: dayLabel(campaign.closed_at ?? campaign.closes_at ?? now, now),
      });
    case "released":
      return fill(campaignsCopy["state.released"], {
        date: dayLabel(releasedAt ?? campaign.closed_at ?? now, now),
      });
    case "cancelled":
      return campaignsCopy["state.cancelled"];
    default:
      return campaignsCopy["state.draft"];
  }
}

export function windowLine(campaign: Stated, now = new Date()): string {
  if (!campaign.opens_at || !campaign.closes_at) return campaignsCopy["window.none"];
  return fill(campaignsCopy["window.range"], {
    opens: dayLabel(campaign.opens_at, now),
    closes: dayLabel(campaign.closes_at, now),
  });
}
