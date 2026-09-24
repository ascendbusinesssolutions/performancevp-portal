import { describe, expect, it } from "vitest";

import {
  addDays,
  dateLabel,
  dayLabel,
  daysSpanned,
  proposedOpening,
  sydneyInstant,
  timeLabel,
  windowFrom,
  windowLaunchedNow,
} from "./calendar";

// Sydney moves from AEST (+10) to AEDT (+11) on Sunday 4 October 2026.

describe("the campaign calendar", () => {
  it("turns Sydney wall-clock times into instants either side of daylight saving", () => {
    expect(sydneyInstant("2026-09-28", "17:00").toISOString()).toBe("2026-09-28T07:00:00.000Z");
    expect(sydneyInstant("2026-10-12", "17:00").toISOString()).toBe("2026-10-12T06:00:00.000Z");
    expect(sydneyInstant("2026-10-04", "09:00").toISOString()).toBe("2026-10-03T22:00:00.000Z");
  });

  it("opens at 09:00 on the first day and closes at 17:00 on the last", () => {
    const baseline = windowFrom("baseline", "2026-09-15");
    expect(baseline.opensAt.toISOString()).toBe("2026-09-14T23:00:00.000Z");
    // Day 14 of the mockup's window: Monday 28 September, 5 pm.
    expect(baseline.closesAt.toISOString()).toBe("2026-09-28T07:00:00.000Z");
    expect(windowFrom("half_yearly", "2026-09-28").closesAt.toISOString()).toBe(
      "2026-10-04T06:00:00.000Z",
    );
    expect(windowFrom("quarterly_pulse", "2026-09-28").closesAt.toISOString()).toBe(
      "2026-10-02T07:00:00.000Z",
    );
    expect(windowFrom("event_triggered", "2026-09-29").closesAt.toISOString()).toBe(
      "2026-10-12T06:00:00.000Z",
    );
  });

  it("counts days on the calendar", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysSpanned("2026-09-15", "2026-09-28")).toBe(14);
  });

  it("launching a later draft now keeps its length and closes that many days from today", () => {
    const now = new Date("2026-09-25T01:30:00Z"); // 11:30 on 25 September in Sydney
    const later = windowFrom("baseline", "2026-10-06");
    const moved = windowLaunchedNow(later.opensAt.toISOString(), later.closesAt.toISOString(), now);
    expect(moved.opensAt).toEqual(now);
    expect(moved.closesAt.toISOString()).toBe("2026-10-08T06:00:00.000Z");

    const started = windowFrom("baseline", "2026-09-24");
    const kept = windowLaunchedNow(
      started.opensAt.toISOString(),
      started.closesAt.toISOString(),
      now,
    );
    expect(kept.closesAt).toEqual(started.closesAt);
  });

  it("proposes tomorrow, or the calendar's due date where later", () => {
    expect(proposedOpening("2026-09-25")).toBe("2026-09-26");
    expect(proposedOpening("2026-09-25", "2026-12-24")).toBe("2026-12-24");
    expect(proposedOpening("2026-09-25", "2026-09-01")).toBe("2026-09-26");
  });
});

describe("the calendar's words", () => {
  const now = new Date("2026-09-25T01:00:00Z");
  it("names days and times as copy C1 does", () => {
    expect(dayLabel("2026-09-28T07:00:00Z", now)).toBe("Monday 28 September");
    expect(dayLabel("2027-09-24T07:00:00Z", now)).toBe("Friday 24 September 2027");
    expect(dateLabel("2026-12-24", now)).toBe("Thursday 24 December");
    expect(timeLabel("2026-09-28T07:00:00Z")).toBe("5 pm");
    expect(timeLabel("2026-09-28T07:30:00Z")).toBe("5:30 pm");
  });
});
