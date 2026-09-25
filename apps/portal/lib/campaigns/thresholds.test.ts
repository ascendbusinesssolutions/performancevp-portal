import { describe, expect, it } from "vitest";

import { thresholdFor } from "./thresholds";

describe("the thresholds the close will apply", () => {
  it("asks 60% of members at baseline, never below the floor, with the raised floor where it binds", () => {
    expect(thresholdFor("baseline", "members_part_a", 60)).toEqual({
      rate: 0.6,
      needed: 36,
      raisedNeeded: null,
    });
    expect(thresholdFor("annual", "members_part_a", 35).needed).toBe(21);
    expect(thresholdFor("baseline", "members_part_a", 11)).toEqual({
      rate: 0.6,
      needed: 7,
      raisedNeeded: 8,
    });
    expect(thresholdFor("baseline", "members_part_a", 12).raisedNeeded).toBeNull();
    expect(thresholdFor("event_triggered", "members_part_b", 10)).toEqual({
      rate: 0.6,
      needed: 6,
      raisedNeeded: null,
    });
  });

  it("asks a count at the half-yearly and the pulse", () => {
    expect(thresholdFor("half_yearly", "members_part_a", 40)).toEqual({
      rate: null,
      needed: 8,
      raisedNeeded: null,
    });
    expect(thresholdFor("quarterly_pulse", "members_part_a", 40).needed).toBe(12);
  });

  it("asks 70% of team leaders and managers, and 75% and 3 of the leadership team", () => {
    expect(thresholdFor("baseline", "team_leaders", 4).needed).toBe(3);
    expect(thresholdFor("baseline", "managers", 10).needed).toBe(7);
    expect(thresholdFor("baseline", "leadership_team", 3).needed).toBe(3);
    expect(thresholdFor("baseline", "leadership_team", 8).needed).toBe(6);
    expect(thresholdFor("baseline", "leadership_team", 2).needed).toBe(3);
  });
});
