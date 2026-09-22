/**
 * Generates fixtures/parity/requests/*.json: the inputs the parity fixtures are built from. Each
 * request is a named variation on the Northwind Mutual worked example, so the fixtures stay
 * comparable and every edit is visible in the request. Re-running overwrites the requests; the
 * fixtures themselves are produced by the Excel pipeline (tools/parity/README.md).
 *
 * usage: pnpm parity:requests
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { compositeScores } from "../src/composite";
import type { Overrides } from "../src/evaluate";
import {
  SUB_DIMENSION_CODES,
  type SubDimensionCode,
  type UnitMeasurementInput,
} from "../src/types";
import type { FixtureRequest } from "./fixture-schema";

const base = JSON.parse(
  readFileSync(new URL("../fixtures/northwind-input.json", import.meta.url), "utf8"),
) as UnitMeasurementInput;

const requests: FixtureRequest[] = [];
function add(
  name: string,
  purpose: string,
  edit: (input: UnitMeasurementInput) => void,
  overrides?: Overrides,
): void {
  const input = structuredClone(base);
  edit(input);
  requests.push({ name, purpose, input, ...(overrides === undefined ? {} : { overrides }) });
}

// --- Controls -------------------------------------------------------------------------------

add(
  "northwind",
  "The Northwind Mutual worked example as stored in the workbook, every formula cell.",
  () => undefined,
);
add("blank", "The blank template: every input cleared except the archetype.", (input) => {
  for (const key of Object.keys(input) as (keyof UnitMeasurementInput)[]) {
    if (key !== "engagement") delete input[key];
  }
  input.engagement = { archetype: "Default" };
});

// --- The online route: all Tier 3, no DLP, no triangulators, no telemetry ------------------

add(
  "online-route",
  "An input shaped like the online route: every route Tier 3, C1 and C5 from module scores, M1 from items, S2 from perception alone, no DLP and no behavioural triangulators.",
  (input) => {
    for (const row of Object.keys(input.routes ?? {})) {
      const assignment = input.routes?.[row as keyof typeof input.routes];
      if (assignment !== undefined) assignment.tier = "Tier 3";
    }
    if (input.routes?.DLP !== undefined) input.routes.DLP.tier = "Insufficient data";
    if (input.capability?.c1 !== undefined) {
      delete input.capability.c1.families;
      input.capability.c1.moduleScore = 71.4;
    }
    if (input.capability?.c5 !== undefined) {
      input.capability.c5 = { moduleScore: 68.75 };
    }
    if (input.motivation?.m1 !== undefined) delete input.motivation.m1.platformComposite;
    if (input.synergy?.s2 !== undefined) delete input.synergy.s2.telemetry;
    delete input.dlp;
    delete input.behaviouralTriangulators;
  },
);

// --- Routes -----------------------------------------------------------------------------------

add(
  "routes-tier2-and-blends",
  "C1 on Tier 2 with the table, C5 on Tier 2 with indicators and module blended, M1 on Tier 3 with both items and a platform composite present.",
  (input) => {
    if (input.routes?.C1) input.routes.C1.tier = "Tier 2";
    if (input.routes?.C5) input.routes.C5.tier = "Tier 2";
    if (input.routes?.M1) input.routes.M1.tier = "Tier 3";
    if (input.capability?.c5) input.capability.c5.moduleScore = 70;
    if (input.capability?.c1) input.capability.c1.moduleScore = 50;
  },
);
add(
  "routes-tier3-modules",
  "C1 and C5 on Tier 3 with module scores present, M1 on Tier 1 with no platform composite.",
  (input) => {
    if (input.routes?.C1) input.routes.C1.tier = "Tier 3";
    if (input.routes?.C5) input.routes.C5.tier = "Tier 3";
    if (input.capability?.c1) input.capability.c1.moduleScore = 64.2;
    if (input.capability?.c5) input.capability.c5.moduleScore = 81;
    if (input.motivation?.m1) delete input.motivation.m1.platformComposite;
  },
);
add(
  "tenure-moderator-junior",
  "Median tenure of 12 months applies the 0.95 moderator to C1.",
  (input) => {
    if (input.capability?.c1) input.capability.c1.medianTenureMonths = 12;
  },
);
add(
  "tenure-moderator-experienced",
  "Median tenure of 120 months applies the 1.05 moderator to C1.",
  (input) => {
    if (input.capability?.c1) input.capability.c1.medianTenureMonths = 120;
  },
);

// --- Structural edge cases ----------------------------------------------------------------------

add(
  "o5-team-scoring-zero",
  "A team scoring exactly 0 contributes nothing and leaves the O5 denominator.",
  (input) => {
    if (input.opportunity?.o5?.teams?.[1]) input.opportunity.o5.teams[1].score = 0;
  },
);
add(
  "component-zero",
  "Capability exactly 0: C3 all in band 1 and every other C sub-dimension insufficient, so the ranking block shows #DIV/0! for C rows and P is 0.",
  (input) => {
    if (input.routes?.C1) input.routes.C1.tier = "Insufficient data";
    if (input.routes?.C5) input.routes.C5.tier = "Insufficient data";
    if (input.capability) {
      delete input.capability.c2;
      delete input.capability.c4;
      input.capability.c3 = { band1: 40 };
    }
  },
);
add(
  "ranking-tie",
  "M3 and M4 at the same score and the same weight give equal priorities; the earlier sheet row ranks first.",
  (input) => {
    if (input.motivation?.m3)
      input.motivation.m3.items = {
        "MI3-01": 3.4,
        "MI3-02": 3.4,
        "MI3-03": 3.4,
        "MI3-04": 2.6,
        "MI3-05": 3.4,
      };
    if (input.motivation?.m4)
      input.motivation.m4.items = { "MI4-01": 3.4, "MI4-02": 3.4, "MI4-03": 3.4, "MI4-04": 2.6 };
  },
);
add(
  "s-at-ceiling",
  "Every Synergy sub-dimension at 100 puts S at the 1.15 ceiling; the range check reads OK.",
  (input) => {
    if (input.synergy) {
      input.synergy.s1 = { coverageBreadth: 100, coverageDepth: 100, distribution: 100 };
      input.synergy.s2 = {
        telemetry: {
          meetingHoursPerIc: 1,
          meetingHoursPerManager: 1,
          fragmentedTimeRatio: 0.1,
          afterHoursHours: 0,
        },
        items: { "TSI2-01": 5, "TSI2-02": 5, "TSI2-03": 1 },
        responseRate: 0.9,
      };
      input.synergy.s3 = {
        items: { "TSI3-01": 5, "TSI3-02": 5, "TSI3-03": 5, "TSI3-04": 1, "TSI3-05": 1 },
        responseRate: 0.9,
      };
    }
  },
);
add(
  "p-above-typical",
  "Every survey item at 5 and every Type C score at 100 puts P above 80; the typical-range check warns.",
  (input) => {
    const max = (items: Record<string, number> | undefined, reverse: string[]): void => {
      if (!items) return;
      for (const key of Object.keys(items)) items[key] = reverse.includes(key) ? 1 : 5;
    };
    if (input.capability) {
      input.capability.c1 = {
        families: [{ name: "All", fte: 60, skillsRequired: 10, confirmedProficiencies: 600 }],
        medianTenureMonths: 40,
      };
      input.capability.c2 = {
        domains: [{ name: "All", criticality: 3, meanScore: 100, coverage: 1 }],
      };
      input.capability.c3 = { band5: 60 };
      max(input.capability.c4?.items, ["CII-05", "CII-10", "CII-15"]);
      input.capability.c5 = { timeToCompetence: 100, adoption: 100, cycleImprovement: 100 };
    }
    if (input.motivation) {
      if (input.motivation.m1) input.motivation.m1.platformComposite = 100;
      max(input.motivation.m2?.items, ["MI2-05"]);
      max(input.motivation.m3?.items, ["MI3-04"]);
      max(input.motivation.m4?.items, ["MI4-04"]);
    }
    if (input.opportunity) {
      input.opportunity.o1 = {
        ...input.opportunity.o1,
        decisionRightsScore: 100,
        roleArchitectureScore: 100,
        cascadeScore: 100,
      };
      max(input.opportunity.o1.items, ["OI1-03", "OI1-06"]);
      input.opportunity.o2 = {
        ...input.opportunity.o2,
        toolInventoryScore: 100,
        informationAccessScore: 100,
        integrationScore: 100,
      };
      max(input.opportunity.o2.items, ["OI2-04"]);
      input.opportunity.o3 = { ...input.opportunity.o3, processFrictionScore: 100 };
      max(input.opportunity.o3.items, ["OI3-05"]);
      input.opportunity.o4 = { ...input.opportunity.o4, capacityAnalysisScore: 100 };
      max(input.opportunity.o4.items, ["OI4-03"]);
      input.opportunity.o5 = { teams: [{ name: "All", fte: 60, score: 100 }] };
    }
  },
);

// --- Confidence: DATEDIF at month ends and a future vintage ------------------------------------

add(
  "confidence-boundaries",
  "Vintages at month ends and one in the future: C4 at 6 complete months (High), O1 at 8 (Medium), O2 at 8 complete months from the 30th (Medium), O5 at 4 (Medium), TW2 at 5 (Low), S2 after the engagement date ('-').",
  (input) => {
    const r = input.routes;
    if (!r) return;
    if (r.C4) r.C4.vintage = "2025-11-30";
    if (r.O1) r.O1.vintage = "2025-10-01";
    if (r.O2) r.O2.vintage = "2025-09-30";
    if (r.O5) r.O5.vintage = "2026-01-31";
    if (r.TW2) r.TW2.vintage = "2026-01-01";
    if (r.S2) r.S2.vintage = "2026-06-02";
    if (r.C5) r.C5.vintage = "2026-03-01";
  },
);

// --- DLP below every minimum ---------------------------------------------------------------------

add(
  "dlp-below-minimums",
  "Two operational, one tactical and no strategic decisions: every sample warning fires and the overall DLS is blank.",
  (input) => {
    input.dlp = {
      decisions: [
        { id: "OP-01", class: "Operational", latencyDays: 2 },
        { id: "OP-02", class: "Operational", latencyDays: 30, description: "Refund escalation" },
        { id: "TAC-01", class: "Tactical", latencyDays: 12 },
      ],
    };
  },
);

// --- Boundary fixtures, per comparison site, both directions ---------------------------------------
// "Noise" cases sit at the threshold with floating-point noise on one side, which Excel treats as
// equal (the rule under test); "cross" cases genuinely cross the threshold.

const oi1 = (first: number, rest: number): Record<string, number> => ({
  "OI1-01": first,
  "OI1-02": rest,
  "OI1-03": rest,
  "OI1-04": rest,
  "OI1-05": rest,
  "OI1-06": rest,
  "OI1-07": rest,
  "OI1-08": rest,
});
add(
  "gap-o1-noise-below",
  "O1 perception computes to 59.999999999999986 against a structural 75: a gap of 15.000000000000014 does not fire.",
  (input) => {
    if (input.opportunity?.o1) {
      Object.assign(input.opportunity.o1, {
        decisionRightsScore: 75,
        roleArchitectureScore: 75,
        cascadeScore: 75,
      });
      input.opportunity.o1.items = oi1(1, 4.04);
    }
  },
);
add(
  "gap-o1-noise-above",
  "O1 perception computes to 60.00000000000001 against a structural 75: a gap of 14.99999999999999 does not fire.",
  (input) => {
    if (input.opportunity?.o1) {
      Object.assign(input.opportunity.o1, {
        decisionRightsScore: 75,
        roleArchitectureScore: 75,
        cascadeScore: 75,
      });
      input.opportunity.o1.items = oi1(1.05, 4.03);
    }
  },
);
add(
  "gap-o1-cross",
  "O1 structural 75.01 against an exact perception 60: a gap of 15.01 fires and the perception feeds the composite.",
  (input) => {
    if (input.opportunity?.o1) {
      Object.assign(input.opportunity.o1, {
        decisionRightsScore: 75.01,
        roleArchitectureScore: 75.01,
        cascadeScore: 75.01,
      });
      input.opportunity.o1.items = oi1(1.2, 4);
    }
  },
);
add(
  "gap-o2-noise-below",
  "O2 perception computes to 59.999999999999986 against a structural 75.",
  (input) => {
    if (input.opportunity?.o2) {
      Object.assign(input.opportunity.o2, {
        toolInventoryScore: 75,
        informationAccessScore: 75,
        integrationScore: 75,
      });
      input.opportunity.o2.items = {
        "OI2-01": 2.96,
        "OI2-02": 2.96,
        "OI2-03": 2.96,
        "OI2-04": 1.28,
      };
    }
  },
);
add(
  "gap-o2-noise-above",
  "O2 perception computes to 60.00000000000001 against a structural 75.",
  (input) => {
    if (input.opportunity?.o2) {
      Object.assign(input.opportunity.o2, {
        toolInventoryScore: 75,
        informationAccessScore: 75,
        integrationScore: 75,
      });
      input.opportunity.o2.items = {
        "OI2-01": 2.88,
        "OI2-02": 2.88,
        "OI2-03": 2.88,
        "OI2-04": 1.04,
      };
    }
  },
);
add("gap-o2-cross", "O2 structural 75.01 against an exact perception 60 fires.", (input) => {
  if (input.opportunity?.o2) {
    Object.assign(input.opportunity.o2, {
      toolInventoryScore: 75.01,
      informationAccessScore: 75.01,
      integrationScore: 75.01,
    });
    input.opportunity.o2.items = { "OI2-01": 2.87, "OI2-02": 2.87, "OI2-03": 2.87, "OI2-04": 1.01 };
  }
});
add(
  "gap-o3-noise-below",
  "O3 perception computes to 44.99999999999999 against a structural 60: a gap of 15.00000000000001 does not fire.",
  (input) => {
    if (input.opportunity?.o3) {
      input.opportunity.o3.processFrictionScore = 60;
      input.opportunity.o3.items = {
        "OI3-01": 1,
        "OI3-02": 3.5,
        "OI3-03": 3.5,
        "OI3-04": 3.5,
        "OI3-05": 3.5,
      };
    }
  },
);
add("gap-o3-cross", "O3 structural 60.01 against an exact perception 45 fires.", (input) => {
  if (input.opportunity?.o3) {
    input.opportunity.o3.processFrictionScore = 60.01;
    input.opportunity.o3.items = {
      "OI3-01": 2.8,
      "OI3-02": 2.8,
      "OI3-03": 2.8,
      "OI3-04": 2.8,
      "OI3-05": 3.2,
    };
  }
});
add(
  "gap-s2-noise",
  "S2 telemetry composite 75 against a perception of 60.00000000000001: a gap of 14.99999999999999 does not fire.",
  (input) => {
    if (input.synergy?.s2) {
      input.synergy.s2.telemetry = {
        meetingHoursPerIc: 10,
        meetingHoursPerManager: 30,
        fragmentedTimeRatio: 0.7,
        afterHoursHours: 3,
      };
      input.synergy.s2.items = { "TSI2-01": 4.2, "TSI2-02": 1.02, "TSI2-03": 1.02 };
    }
  },
);
add("gap-s2-cross", "S2 telemetry composite 75 against a perception of 59.75 fires.", (input) => {
  if (input.synergy?.s2) {
    input.synergy.s2.telemetry = {
      meetingHoursPerIc: 10,
      meetingHoursPerManager: 30,
      fragmentedTimeRatio: 0.7,
      afterHoursHours: 3,
    };
    input.synergy.s2.items = { "TSI2-01": 3.39, "TSI2-02": 3.39, "TSI2-03": 2.61 };
  }
});
add(
  "gap-m1-exact",
  "M1 72 against a behavioural composite of 57: a gap of exactly 15 does not fire.",
  (input) => {
    input.behaviouralTriangulators = {
      voluntaryTurnover: 57,
      unplannedAbsence: 57,
      enps: 57,
      goalAchievement: 57,
    };
  },
);
add(
  "gap-m1-cross",
  "M1 72 against a behavioural composite of 56.99: a gap of 15.01 fires.",
  (input) => {
    input.behaviouralTriangulators = {
      voluntaryTurnover: 56.99,
      unplannedAbsence: 56.99,
      enps: 56.99,
      goalAchievement: 56.99,
    };
  },
);
add(
  "tripwire-noise",
  "Every trip-wire mean 3.4: (3.4 − 1) × 25 is 60.00000000000001, not below 60, so no flag.",
  (input) => {
    if (input.motivation) input.motivation.tripWires = { TW1: 3.4, TW2: 3.4, TW3: 3.4 };
  },
);
add(
  "tripwire-cross",
  "Every trip-wire mean 3.39: 59.75 is below 60, so every flag fires and the critical findings list all three.",
  (input) => {
    if (input.motivation) input.motivation.tripWires = { TW1: 3.39, TW2: 3.39, TW3: 3.39 };
  },
);
add(
  "false-consensus-noise",
  "TSI3-01 and TSI3-02 at 3.4 (60.00000000000001, not below 60) with M2 at 80: no flag.",
  (input) => {
    if (input.synergy?.s3)
      input.synergy.s3.items = { ...input.synergy.s3.items, "TSI3-01": 3.4, "TSI3-02": 3.4 };
    if (input.motivation?.m2)
      input.motivation.m2.items = {
        "MI2-01": 4.2,
        "MI2-02": 4.2,
        "MI2-03": 4.2,
        "MI2-04": 4.2,
        "MI2-05": 1.8,
      };
  },
);
add(
  "false-consensus-m2-exact",
  "TSI3-01 and TSI3-02 at 3.39 (below 60) with M2 at exactly 75: no flag.",
  (input) => {
    if (input.synergy?.s3)
      input.synergy.s3.items = { ...input.synergy.s3.items, "TSI3-01": 3.39, "TSI3-02": 3.39 };
    if (input.motivation?.m2)
      input.motivation.m2.items = {
        "MI2-01": 4,
        "MI2-02": 5,
        "MI2-03": 5,
        "MI2-04": 5,
        "MI2-05": 5,
      };
  },
);
add(
  "false-consensus-cross",
  "TSI3-01 and TSI3-02 at 3.39 with M2 at 75.05: the flag fires.",
  (input) => {
    if (input.synergy?.s3)
      input.synergy.s3.items = { ...input.synergy.s3.items, "TSI3-01": 3.39, "TSI3-02": 3.39 };
    if (input.motivation?.m2)
      input.motivation.m2.items = {
        "MI2-01": 4.01,
        "MI2-02": 5,
        "MI2-03": 5,
        "MI2-04": 5,
        "MI2-05": 5,
      };
  },
);
add(
  "band-75-noise-below",
  "M4 computes to 74.99999999999999: Amber, as an exact 75 is.",
  (input) => {
    if (input.motivation?.m4)
      input.motivation.m4.items = { "MI4-01": 3.8, "MI4-02": 3.8, "MI4-03": 3.8, "MI4-04": 1.4 };
  },
);
add("band-75-exact-and-cross", "M4 exactly 75 (Amber) and M2 at 75.05 (Green).", (input) => {
  if (input.motivation?.m4)
    input.motivation.m4.items = { "MI4-01": 5, "MI4-02": 5, "MI4-03": 5, "MI4-04": 5 };
  if (input.motivation?.m2)
    input.motivation.m2.items = {
      "MI2-01": 4.01,
      "MI2-02": 5,
      "MI2-03": 5,
      "MI2-04": 5,
      "MI2-05": 5,
    };
});
add(
  "band-50-noise",
  "M3 computes to 49.999999999999986 (Amber under the rule) while M2 computes to exactly 50 (Amber) and M4 to 49.75 (Red).",
  (input) => {
    if (input.motivation?.m3)
      input.motivation.m3.items = {
        "MI3-01": 3.61,
        "MI3-02": 3.61,
        "MI3-03": 1.78,
        "MI3-04": 1.78,
        "MI3-05": 1.78,
      };
    if (input.motivation?.m2)
      input.motivation.m2.items = {
        "MI2-01": 1,
        "MI2-02": 5,
        "MI2-03": 5,
        "MI2-04": 5,
        "MI2-05": 5,
      };
    if (input.motivation?.m4)
      input.motivation.m4.items = {
        "MI4-01": 2.99,
        "MI4-02": 2.99,
        "MI4-03": 2.99,
        "MI4-04": 3.01,
      };
  },
);
add("band-50-noise-above", "M3 computes to 50.000000000000014: Amber.", (input) => {
  if (input.motivation?.m3)
    input.motivation.m3.items = {
      "MI3-01": 3.64,
      "MI3-02": 3.64,
      "MI3-03": 1.72,
      "MI3-04": 1.72,
      "MI3-05": 1.72,
    };
});

// Binding component tie: search for a value where C and M differ only beyond the 15th digit.
{
  const scores = (v: number): Record<SubDimensionCode, number | undefined> => {
    const out = {} as Record<SubDimensionCode, number | undefined>;
    for (const code of SUB_DIMENSION_CODES) out[code] = undefined;
    out.C1 = v;
    out.C2 = v;
    out.C5 = v;
    out.M1 = v;
    out.O1 = 80;
    out.O2 = 80;
    out.O3 = 80;
    out.O4 = 80;
    out.O5 = 80;
    return out;
  };
  let chosen: { v: number; C: number; M: number } | undefined;
  for (let i = 5000; i <= 8000 && chosen === undefined; i += 1) {
    const v = i / 100;
    const c = compositeScores(scores(v), "Default");
    if (c.C !== undefined && c.M !== undefined && c.C !== c.M && Math.abs(c.C - c.M) < 1e-12)
      chosen = { v, C: c.C, M: c.M };
  }
  if (chosen === undefined) throw new Error("no tie value found");
  const tie = chosen;
  add(
    "binding-component-tie-noise",
    `C and M both from typed ${tie.v}: C computes to ${tie.C} and M to ${tie.M}, equal to Excel, so the tie resolves to Capability.`,
    (input) => {
      if (input.routes?.C1) input.routes.C1.tier = "Tier 3";
      if (input.routes?.C5) input.routes.C5.tier = "Tier 3";
      if (input.routes?.C3) input.routes.C3.tier = "Insufficient data";
      if (input.routes?.C4) input.routes.C4.tier = "Insufficient data";
      if (input.routes?.M2) input.routes.M2.tier = "Insufficient data";
      if (input.routes?.M3) input.routes.M3.tier = "Insufficient data";
      if (input.routes?.M4) input.routes.M4.tier = "Insufficient data";
      if (input.capability) {
        input.capability.c1 = { moduleScore: tie.v };
        input.capability.c2 = {
          domains: [{ name: "One", criticality: 1, meanScore: tie.v, coverage: 1 }],
        };
        delete input.capability.c3;
        delete input.capability.c4;
        input.capability.c5 = { moduleScore: tie.v };
      }
      if (input.motivation) {
        input.motivation.m1 = { platformComposite: tie.v };
        delete input.motivation.m2;
        delete input.motivation.m3;
        delete input.motivation.m4;
      }
      if (input.opportunity) {
        input.opportunity.o1 = {
          decisionRightsScore: 80,
          roleArchitectureScore: 80,
          cascadeScore: 80,
          items: oi1(1.2, 4.6),
        };
        input.opportunity.o2 = {
          toolInventoryScore: 80,
          informationAccessScore: 80,
          integrationScore: 80,
          items: { "OI2-01": 4.2, "OI2-02": 4.2, "OI2-03": 4.2, "OI2-04": 1.8 },
        };
        input.opportunity.o3 = {
          processFrictionScore: 80,
          items: { "OI3-01": 4.2, "OI3-02": 4.2, "OI3-03": 4.2, "OI3-04": 4.2, "OI3-05": 1.8 },
        };
        input.opportunity.o4 = {
          capacityAnalysisScore: 80,
          items: { "OI4-01": 4.2, "OI4-02": 4.2, "OI4-03": 1.8 },
        };
        input.opportunity.o5 = { teams: [{ name: "All", fte: 60, score: 80 }] };
      }
    },
  );
  add(
    "binding-component-tie-exact",
    "C and M both exactly 70 with O at 80: the tie resolves to Capability; then M below C resolves to Motivation in a second fixture.",
    (input) => {
      if (input.routes?.C1) input.routes.C1.tier = "Tier 3";
      if (input.routes?.C5) input.routes.C5.tier = "Tier 3";
      if (input.routes?.C2) input.routes.C2.tier = "Insufficient data";
      if (input.routes?.C3) input.routes.C3.tier = "Insufficient data";
      if (input.routes?.C4) input.routes.C4.tier = "Insufficient data";
      if (input.routes?.M2) input.routes.M2.tier = "Insufficient data";
      if (input.routes?.M3) input.routes.M3.tier = "Insufficient data";
      if (input.routes?.M4) input.routes.M4.tier = "Insufficient data";
      if (input.capability) {
        input.capability = { c1: { moduleScore: 70 }, c5: { moduleScore: 70 } };
      }
      if (input.motivation) {
        input.motivation.m1 = { platformComposite: 70 };
        delete input.motivation.m2;
        delete input.motivation.m3;
        delete input.motivation.m4;
      }
      if (input.opportunity) {
        input.opportunity.o1 = {
          decisionRightsScore: 80,
          roleArchitectureScore: 80,
          cascadeScore: 80,
          items: oi1(1.2, 4.6),
        };
        input.opportunity.o2 = {
          toolInventoryScore: 80,
          informationAccessScore: 80,
          integrationScore: 80,
          items: { "OI2-01": 4.2, "OI2-02": 4.2, "OI2-03": 4.2, "OI2-04": 1.8 },
        };
        input.opportunity.o3 = {
          processFrictionScore: 80,
          items: { "OI3-01": 4.2, "OI3-02": 4.2, "OI3-03": 4.2, "OI3-04": 4.2, "OI3-05": 1.8 },
        };
        input.opportunity.o4 = {
          capacityAnalysisScore: 80,
          items: { "OI4-01": 4.2, "OI4-02": 4.2, "OI4-03": 1.8 },
        };
        input.opportunity.o5 = { teams: [{ name: "All", fte: 60, score: 80 }] };
      }
    },
  );
  add(
    "binding-component-m-below-c",
    "M at 69.99 below C at 70 with O at 80 resolves to Motivation.",
    (input) => {
      if (input.routes?.C1) input.routes.C1.tier = "Tier 3";
      if (input.routes?.C5) input.routes.C5.tier = "Tier 3";
      if (input.routes?.C2) input.routes.C2.tier = "Insufficient data";
      if (input.routes?.C3) input.routes.C3.tier = "Insufficient data";
      if (input.routes?.C4) input.routes.C4.tier = "Insufficient data";
      if (input.routes?.M2) input.routes.M2.tier = "Insufficient data";
      if (input.routes?.M3) input.routes.M3.tier = "Insufficient data";
      if (input.routes?.M4) input.routes.M4.tier = "Insufficient data";
      if (input.capability) input.capability = { c1: { moduleScore: 70 }, c5: { moduleScore: 70 } };
      if (input.motivation) {
        input.motivation.m1 = { platformComposite: 69.99 };
        delete input.motivation.m2;
        delete input.motivation.m3;
        delete input.motivation.m4;
      }
      if (input.opportunity) {
        input.opportunity.o1 = {
          decisionRightsScore: 80,
          roleArchitectureScore: 80,
          cascadeScore: 80,
          items: oi1(1.2, 4.6),
        };
        input.opportunity.o2 = {
          toolInventoryScore: 80,
          informationAccessScore: 80,
          integrationScore: 80,
          items: { "OI2-01": 4.2, "OI2-02": 4.2, "OI2-03": 4.2, "OI2-04": 1.8 },
        };
        input.opportunity.o3 = {
          processFrictionScore: 80,
          items: { "OI3-01": 4.2, "OI3-02": 4.2, "OI3-03": 4.2, "OI3-04": 4.2, "OI3-05": 1.8 },
        };
        input.opportunity.o4 = {
          capacityAnalysisScore: 80,
          items: { "OI4-01": 4.2, "OI4-02": 4.2, "OI4-03": 1.8 },
        };
        input.opportunity.o5 = { teams: [{ name: "All", fte: 60, score: 80 }] };
      }
    },
  );
}

// --- Layer overrides, as the legacy scenarios use them ---------------------------------------------

add(
  "override-o1-layers-78-56",
  "O1 structural and perception layers replaced by typed 78 and 56: the flag fires and 56 feeds the composite.",
  () => undefined,
  { layers: { o1Structural: 78, o1Perception: 56 } },
);
add(
  "override-score-o3-70",
  "The O3 score cell replaced by a typed 70, as projectImpact does.",
  () => undefined,
  { scores: { O3: 70 } },
);

const dir = new URL("../fixtures/parity/requests/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
for (const request of requests) {
  writeFileSync(`${dir}${request.name}.json`, `${JSON.stringify(request, null, 2)}\n`);
}
process.stdout.write(`${requests.length} requests written to ${dir}\n`);
