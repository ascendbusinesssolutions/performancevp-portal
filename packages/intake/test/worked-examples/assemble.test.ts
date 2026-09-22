/**
 * The intake end to end: a Northwind-shaped online campaign through assemble and calculateUnit,
 * the full instrument set, carry-forward at a half-yearly check, and a quarterly pulse.
 */
import { calculateUnit } from "@performancevp/engine";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { assemble } from "../../src/assemble";
import { PART_A_ITEMS } from "../../src/items";
import {
  C5L_ITEMS,
  type IntakeInput,
  type KnowledgeRating,
  type Member,
  type RoleFamily,
  type SkillRating,
  type TalentBand,
} from "../../src/types";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

/** Northwind plus every online instrument: three role families, five managers, domains, checklists, team leaders. */
function fullCampaign(): IntakeInput {
  const input = structuredClone(northwind);
  const families: RoleFamily[] = ["Claims", "Support", "Leads"].map((name, f) => ({
    id: `f${f}`,
    name,
    peopleLeader: f === 2,
    skills: Array.from({ length: 6 }, (_, k) => ({
      id: `f${f}-s${k}`,
      name: `${name} skill ${k + 1}`,
      critical: k < 2,
      kind: k % 2 === 0 ? "technical" : "behavioural",
    })),
  }));
  input.unit.roleFamilies = families;
  input.unit.knowledgeDomains = [
    { id: "reg", name: "Regulatory", criticality: 3 },
    { id: "prod", name: "Product", criticality: 2 },
  ];
  input.unit.systems = [
    { id: "crm", name: "CRM" },
    { id: "pm", name: "Practice management" },
  ];
  const members = input.snapshot.members as Member[];
  const skills: SkillRating[] = [];
  const bands: TalentBand[] = [];
  const knowledge: KnowledgeRating[] = [];
  members.forEach((m, i) => {
    m.roleFamilyId = `f${i % 3}`;
    m.managerRef = `M${Math.floor(i / 12)}`;
    m.startDate = i % 2 === 0 ? "2023-03-01" : "2025-11-15";
    if (i % 12 === 0) m.teamLeader = true;
    const family = families[i % 3] as RoleFamily;
    if (i < 54) {
      // 90% rated: skills, a band and two domains each.
      for (const skill of family.skills) {
        skills.push({
          managerRef: m.managerRef,
          employeeRef: m.employeeRef,
          skillId: skill.id,
          rating: 2 + ((i + skill.id.length) % 3),
        });
      }
      bands.push({
        managerRef: m.managerRef,
        employeeRef: m.employeeRef,
        band: 2 + (i % 4 === 0 ? 2 : i % 3),
      });
      knowledge.push({
        managerRef: m.managerRef,
        employeeRef: m.employeeRef,
        domainId: "reg",
        rating: 3 + (i % 2),
      });
      knowledge.push({
        managerRef: m.managerRef,
        employeeRef: m.employeeRef,
        domainId: "prod",
        rating: 3,
      });
    }
  });
  input.ratings = { skills, talentBands: bands, knowledge };
  input.checklists = {
    admO1: families.map((f) => ({ roleFamilyId: f.id, ra1: true, ra2: f.id !== "f1", ra3: false })),
    admO2: [
      { systemId: "crm", ti1: true, ti2: true, ti3: "partly", int1: "automated" },
      { systemId: "pm", ti1: true, ti2: false, ti3: "yes", int1: "manual" },
    ],
    admO4: { utilisationPercent: 92, overtimeHoursPerFte: 1.5, absenceAboveBaselinePercent: 4 },
  };
  input.responses = {
    ...input.responses,
    teamLeaders: [0, 1, 2, 3].map((k) => {
      const items: Partial<Record<(typeof C5L_ITEMS)[number], number>> = {};
      C5L_ITEMS.forEach((item, j) => {
        items[item] = 3 + ((k + j) % 3);
      });
      return { id: `L${k}`, items };
    }),
  };
  input.campaign.deployed = {
    ...input.campaign.deployed,
    teamLeaders: true,
    managers: { c1: true, c2: true, c3: true },
    checklists: ["ADM-O1", "ADM-O2", "ADM-O4"],
  };
  return input;
}

describe("Northwind as shipped: Part A, Part B and the leadership survey only", () => {
  const result = assemble(northwind);
  const engine = calculateUnit(result.engineInput);

  it("reports the survey sub-dimensions and marks the undeployed instruments insufficient without a prior", () => {
    expect(result.subDimensions.C4.status).toBe("reported");
    expect(result.subDimensions.M2).toMatchObject({ status: "reported", measuredAt: "2026-05-31" });
    expect(result.subDimensions.C1).toMatchObject({
      status: "insufficient",
      reason: "Not deployed and no prior cycle to carry forward.",
    });
    expect(result.subDimensions.O1.status).toBe("insufficient");
    expect(result.subDimensions.O1.reason).toContain("ADM-O1");
    expect(result.subDimensions.O3.status).toBe("reported");
    expect(result.subDimensions.O5.status).toBe("reported");
    expect(result.engineInput.routes?.C1?.tier).toBe("Insufficient data");
    expect(result.engineInput.routes?.DLP?.tier).toBe("Insufficient data");
    expect(result.engineInput.routes?.TW2).toEqual({
      tier: "Tier 3",
      source: "Part A TW-02",
      vintage: "2026-05-31",
    });
  });

  it("gives the engine the Northwind means, the per-team O5 rows and PF, and the engine scores P", () => {
    expect(result.engineInput.motivation?.m2?.items?.["MI2-01"]).toBeCloseTo(
      result.workbook.typeA.means["MI2-01"] as number,
      12,
    );
    expect(result.engineInput.opportunity?.o5?.teams).toHaveLength(4);
    expect(result.engineInput.opportunity?.o3?.processFrictionScore).toBeCloseTo(
      59.8958333333333,
      10,
    );
    expect(result.engineInput.capability?.c1).toBeUndefined();
    expect(engine.subDimensions.O5.score).toBeCloseTo(
      (70.83333333333334 + 64.58333333333334 + 66.66666666666666 + 64.58333333333334) / 4,
      10,
    );
    expect(engine.subDimensions.C4.score).toBeDefined();
    expect(engine.subDimensions.C1.score).toBeUndefined();
    expect(typeof engine.components.P).toBe("number");
  });
});

describe("the full online instrument set", () => {
  const input = fullCampaign();
  const result = assemble(input);
  const engine = calculateUnit(result.engineInput);

  it("reports every sub-dimension and scores P", () => {
    const statuses = Object.fromEntries(
      Object.entries(result.subDimensions).map(([k, v]) => [k, v.status]),
    );
    expect(
      Object.values(statuses).every((s) => s === "reported"),
      JSON.stringify(result.subDimensions),
    ).toBe(true);
    expect(result.instruments["M-C1-MGR"]?.status).toBe("reported");
    expect(result.instruments["M-C2-MGR"]?.status).toBe("reported");
    expect(result.instruments["M-C3-MGR"]?.status).toBe("reported");
    expect(result.instruments["M-C5-TL"]?.status).toBe("reported");
    for (const code of [
      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
      "M1",
      "M2",
      "M3",
      "M4",
      "O1",
      "O2",
      "O3",
      "O4",
      "O5",
      "S1",
      "S2",
      "S3",
    ] as const) {
      expect(engine.subDimensions[code].score, code).toBeDefined();
    }
    expect(typeof engine.components.P).toBe("number");
  });

  it("builds C1 as Type B rows whose engine coverage is the family mean of per-person coverage", () => {
    const rows = result.engineInput.capability?.c1?.families ?? [];
    expect(rows).toHaveLength(3);
    const workbookFamily = result.workbook.typeC.c1.families[0];
    const row = rows[0] as NonNullable<typeof rows>[number];
    expect(
      (row.confirmedProficiencies as number) /
        ((row.fte as number) * (row.skillsRequired as number)),
    ).toBeCloseTo(workbookFamily?.coverage as number, 12);
    expect(result.engineInput.capability?.c1?.medianTenureMonths).toBe(result.medianTenureMonths);
    expect(result.c3Route).toMatchObject({ source: "module", treatment: "module" });
    expect(result.engineInput.capability?.c3).toEqual({
      band5: result.workbook.typeC.c3.final[4],
      band4: result.workbook.typeC.c3.final[3],
      band3: result.workbook.typeC.c3.final[2],
      band2: result.workbook.typeC.c3.final[1],
      band1: result.workbook.typeC.c3.final[0],
    });
  });

  it("records the guard's C3 adjustments as applied and any C1 or C2 deduction as not applied", () => {
    for (const a of result.adjustments) {
      if (a.subDimension === "C3") expect(a.applied).toBe(true);
      else expect(a.applied).toBe(false);
    }
  });

  it("carries the undeployed sub-dimensions forward at a half-yearly check with their original dates", () => {
    const half = structuredClone(northwind);
    half.campaign = {
      cadence: "half-yearly",
      launchDate: "2026-11-02",
      closeDate: "2026-11-20",
      deployed: { partA: [...PART_A_ITEMS] },
    };
    for (const row of half.responses?.members ?? []) {
      for (const key of Object.keys(row.items)) {
        if (/^O[12][CI]-/.test(key)) delete (row.items as Record<string, number>)[key];
      }
      delete row.processes;
    }
    half.responses = { members: half.responses?.members ?? [] };
    half.prior = {
      engineInput: result.engineInput,
      measuredAt: Object.fromEntries(
        Object.entries(result.subDimensions).map(([k, v]) => [k, v.measuredAt]),
      ) as NonNullable<IntakeInput["prior"]>["measuredAt"],
    };
    const later = assemble(half);
    expect(later.subDimensions.M1).toMatchObject({ status: "reported", measuredAt: "2026-11-20" });
    expect(later.subDimensions.C1).toMatchObject({
      status: "carried-forward",
      measuredAt: "2026-05-31",
    });
    // O1 refreshes its perception and carries the structural layer forward, dated from the older.
    expect(later.subDimensions.O1).toMatchObject({ status: "reported", measuredAt: "2026-05-31" });
    expect(later.subDimensions.O1.reason).toContain(
      "Carried forward: M-O1-LT, ADM-O1, M-O1-CASCADE",
    );
    expect(later.engineInput.routes?.O1).toMatchObject({ tier: "Tier 3", vintage: "2026-05-31" });
    expect(later.engineInput.capability?.c1).toEqual(result.engineInput.capability?.c1);
    expect(later.engineInput.routes?.C1).toMatchObject({ tier: "Tier 2", vintage: "2026-05-31" });
    expect(later.engineInput.opportunity?.o1?.decisionRightsScore).toBe(
      result.engineInput.opportunity?.o1?.decisionRightsScore,
    );
    expect(later.engineInput.opportunity?.o1?.items?.["OI1-01"]).toBe(
      later.workbook.typeA.means["OI1-01"],
    );
    expect(later.subDimensions.O3).toMatchObject({ status: "reported", measuredAt: "2026-05-31" });
    expect(later.instruments["M-O1-CASCADE"]?.status).toBe("not-deployed");
    const laterEngine = calculateUnit(later.engineInput);
    expect(typeof laterEngine.components.P).toBe("number");
    expect(laterEngine.subDimensions.C1.score).toBe(engine.subDimensions.C1.score);
  });
});

describe("a quarterly pulse with a rotated item set", () => {
  const pulse = (keep: number): IntakeInput => {
    const input = structuredClone(northwind);
    const items = [
      "MI1-01",
      "MI1-02",
      "MI1-03",
      "MI1-05",
      "MI1-07",
      "MI2-01",
      "MI2-02",
      "MI2-05",
      "TW-01",
      "TW-03",
      "OI5-01",
      "OI5-02",
      "OI5-03",
      "TSI2-01",
      "TSI2-02",
      "TSI2-03",
    ] as const;
    input.campaign = {
      cadence: "quarterly",
      launchDate: "2026-08-03",
      closeDate: "2026-08-14",
      deployed: { partA: [...items] },
    };
    const rows = (input.responses?.members ?? []).slice(0, keep);
    for (const row of rows) {
      const kept: Record<string, number> = {};
      for (const item of items) {
        const v = (row.items as Record<string, number>)[item];
        if (v !== undefined) kept[item] = v;
      }
      row.items = kept as typeof row.items;
      delete row.processes;
    }
    input.responses = { members: rows };
    return input;
  };

  it("reports M1, M2, the two trip-wires, O5 and S2 from 12 valid respondents, and nothing else", () => {
    const result = assemble(pulse(13));
    expect(result.workbook.screening.members.summary.valid).toBe(13);
    expect(result.subDimensions.M1.status).toBe("reported");
    expect(result.subDimensions.M2.status).toBe("reported");
    expect(result.subDimensions.S2.status).toBe("reported");
    expect(result.subDimensions.M3.reason).toBe(
      "Not deployed and no prior cycle to carry forward.",
    );
    expect(result.engineInput.motivation?.m1?.items).toEqual(
      expect.objectContaining({ "MI1-05": expect.any(Number) }),
    );
    expect(result.engineInput.motivation?.m1?.items?.["MI1-04"]).toBeUndefined();
    expect(result.engineInput.motivation?.tripWires?.TW2).toBeUndefined();
    expect(result.engineInput.routes?.TW2?.tier).toBe("Insufficient data");
    expect(result.engineInput.routes?.TW1?.tier).toBe("Tier 3");
    // O5 at a pulse: four teams of 15 FTE with 3 or 4 valid rows each fail the team rule.
    expect(result.subDimensions.O5.status).toBe("insufficient");
  });

  it("is insufficient with 11 valid respondents, and M2 needs 12 as well", () => {
    const result = assemble(pulse(11));
    expect(result.subDimensions.M1).toMatchObject({ status: "insufficient" });
    expect(result.subDimensions.M1.reason).toContain(
      "below the 12 required at the quarterly pulse",
    );
    expect(result.subDimensions.M2.reason).toContain("below the 12 required");
    const seven = assemble(pulse(7));
    expect(seven.subDimensions.M2.reason).toBe(
      "7 valid respondents, below the anonymity floor of 8.",
    );
    expect(seven.tripWires["TW-01"].reason).toBe(
      "7 valid respondents, below the anonymity floor of 8.",
    );
  });
});
