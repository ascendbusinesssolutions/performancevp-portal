import { sydneyToday } from "@/lib/dates";

import { type CampaignCadence, CLOSE_TIME, OPEN_TIME, WINDOW_DAYS } from "./cadence";

/**
 * Campaign windows on the Sydney calendar (Milestone 5 plan, 2.1 and D12). Pure: every function
 * takes the instant it works from, so the tests can cross a daylight-saving change.
 */

const ZONE = "Australia/Sydney";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Sydney's offset from UTC at an instant, in minutes. */
function offsetMinutes(instant: number): number {
  const parts = PARTS.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return Math.round((wall - instant) / 60000);
}

/** The instant of a Sydney wall-clock time on a date (YYYY-MM-DD, HH:MM). */
export function sydneyInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, min] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, m - 1, d, h, min);
  // Two passes settle the offset either side of a change; 09:00 and 17:00 never fall in the gap.
  let guess = wall - offsetMinutes(wall) * 60000;
  guess = wall - offsetMinutes(guess) * 60000;
  return new Date(guess);
}

/** A calendar date plus a number of days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The Sydney date of an instant. */
export function sydneyDate(instant: Date | string): string {
  return sydneyToday(typeof instant === "string" ? new Date(instant) : instant);
}

export interface Window {
  opensAt: Date;
  closesAt: Date;
}

/** The cadence's window from an opening date: 09:00 on it to 17:00 on its last day. */
export function windowFrom(cadence: CampaignCadence, opensOn: string): Window {
  return {
    opensAt: sydneyInstant(opensOn, OPEN_TIME),
    closesAt: sydneyInstant(addDays(opensOn, WINDOW_DAYS[cadence] - 1), CLOSE_TIME),
  };
}

/** Calendar days from the first date to the second, both included. */
export function daysSpanned(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * Launching a draft now: it opens at once and keeps the length of the window it was given, so a
 * draft planned for a later date closes that many days from today, at 17:00.
 */
export function windowLaunchedNow(opensAt: string, closesAt: string, now: Date): Window {
  const today = sydneyDate(now);
  if (Date.parse(opensAt) <= now.getTime()) {
    return { opensAt: new Date(opensAt), closesAt: new Date(closesAt) };
  }
  const length = daysSpanned(sydneyDate(opensAt), sydneyDate(closesAt));
  return { opensAt: now, closesAt: sydneyInstant(addDays(today, length - 1), CLOSE_TIME) };
}

/**
 * The opening date to propose for a new campaign: tomorrow, or the calendar's due date where it is
 * later, so a scheduled campaign always opens in the future.
 */
export function proposedOpening(today: string, dueOn?: string): string {
  const tomorrow = addDays(today, 1);
  return dueOn && dueOn > tomorrow ? dueOn : tomorrow;
}

const DAY = new Intl.DateTimeFormat("en-AU", {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const DAY_YEAR = new Intl.DateTimeFormat("en-AU", {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("en-AU", {
  timeZone: ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** "Monday 28 September", with the year where it is not this year's (copy C1). */
export function dayLabel(instant: Date | string, now: Date = new Date()): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const sameYear = sydneyDate(date).slice(0, 4) === sydneyDate(now).slice(0, 4);
  return (sameYear ? DAY : DAY_YEAR).format(date);
}

/** A calendar date (YYYY-MM-DD) as dayLabel words it. */
export function dateLabel(date: string, now: Date = new Date()): string {
  return dayLabel(sydneyInstant(date, "12:00"), now);
}

/** "5 pm", or "5:30 pm" off the hour. */
export function timeLabel(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  // ICU may put a narrow no-break space before "pm"; the copy uses a plain one.
  return TIME.format(date).replace(":00", "").replace(/\s/g, " ");
}
