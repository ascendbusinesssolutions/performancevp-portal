import { describe, expect, it } from "vitest";

import { askedOf, type FormReport, type FormUnit, needsEvidence, neededKeys } from "./form";

const unit: FormUnit = {
  campaignUnitId: "cu",
  name: "Dispatch",
  c3Route: "module",
  items: ["c1", "c2", "c3"],
  roleFamilies: [
    {
      id: "F",
      name: "Dispatchers",
      skills: [
        { id: "s1", name: "Routing", critical: true, kind: "technical" },
        { id: "s2", name: "Calm", critical: false, kind: "behavioural" },
      ],
    },
  ],
  knowledgeDomains: [{ id: "d1", name: "Fleet", criticality: 3 }],
};
const report: FormReport = {
  subject: "r1",
  name: "Nia North",
  roleTitle: "Dispatcher",
  roleFamilyId: "F",
  fte: 1,
  startDate: "2022-02-01",
  campaignUnitId: "cu",
  team: "North",
};

describe("what the form asks of a report", () => {
  it("asks the family's skills, the unit's domains and the band on the module route", () => {
    expect(neededKeys(report, unit)).toEqual([
      "r1|skill|s1",
      "r1|skill|s2",
      "r1|knowledge|d1",
      "r1|band|",
    ]);
  });

  it("asks no band on the formal-ratings route, and only what the campaign asks", () => {
    expect(askedOf(report, { ...unit, c3Route: "formal", items: ["c1", "c2"] }).band).toBe(false);
    expect(neededKeys(report, { ...unit, items: ["c1"] })).toEqual(["r1|skill|s1", "r1|skill|s2"]);
  });

  it("needs evidence for a 5, and for a band of 5 or 1", () => {
    expect([1, 4, 5].map((v) => needsEvidence("skill", v))).toEqual([false, false, true]);
    expect([1, 3, 5].map((v) => needsEvidence("band", v))).toEqual([true, false, true]);
  });
});
