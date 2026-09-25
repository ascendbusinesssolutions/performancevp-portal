import type { Cadence } from "@performancevp/intake";

/**
 * The campaign cadences as the database names them, and what each means for the window and the
 * reminders (Survey Blueprint 1.2 and 1.3; Cadence Master 7.7, refreshed 24 September 2026; Milestone
 * 5 plan, D12 and the approval note on the close time). A window opens at 09:00 and closes at 17:00
 * on the Sydney calendar; reminders go out at 09:00 on the stated days of the window, day 1 being
 * the opening day.
 */

export const CADENCES = [
  "baseline",
  "annual",
  "half_yearly",
  "quarterly_pulse",
  "event_triggered",
] as const;

export type CampaignCadence = (typeof CADENCES)[number];

export function asCadence(value: string | null | undefined): CampaignCadence | null {
  return CADENCES.find((c) => c === value) ?? null;
}

/** The intake's name for each cadence. */
export const INTAKE_CADENCE: Readonly<Record<CampaignCadence, Cadence>> = {
  baseline: "baseline",
  annual: "annual",
  half_yearly: "half-yearly",
  quarterly_pulse: "quarterly",
  event_triggered: "event",
};

/** Calendar days in a window, the opening and closing days included. */
export const WINDOW_DAYS: Readonly<Record<CampaignCadence, number>> = {
  baseline: 14,
  annual: 14,
  event_triggered: 14,
  half_yearly: 7,
  quarterly_pulse: 5,
};

/** The days of the window on which the automatic reminders go out. */
export const REMINDER_DAYS: Readonly<Record<CampaignCadence, readonly number[]>> = {
  baseline: [4, 8, 11],
  annual: [4, 8, 11],
  event_triggered: [4, 8, 11],
  half_yearly: [3, 5],
  quarterly_pulse: [2, 4],
};

export const OPEN_TIME = "09:00";
export const CLOSE_TIME = "17:00";

/** A unit's first campaign is a baseline or an annual; the others carry forward from one (D9). */
export function needsFullRun(cadence: CampaignCadence): boolean {
  return (
    cadence === "half_yearly" || cadence === "quarterly_pulse" || cadence === "event_triggered"
  );
}
