import { describe, expect, it } from "vitest";

import { REFERENCE } from "@/lib/reference";

import { type DeploymentChoice, deploymentFor } from "./deployment";

const PROCESSES = ["p1", "p2", "p3"];

function choice(extra: Partial<DeploymentChoice>): DeploymentChoice {
  return {
    cadence: "baseline",
    rotation: null,
    trigger: null,
    c3Route: "module",
    processIds: PROCESSES,
    ...extra,
  };
}

const count = (items: readonly string[], prefix: string) =>
  items.filter((i) => i.startsWith(prefix)).length;

describe("what a campaign asks, per cadence", () => {
  it("asks everything at baseline and annual (Survey Blueprint 1.2)", () => {
    for (const cadence of ["baseline", "annual"] as const) {
      const { deployment, audiences } = deploymentFor(choice({ cadence }));
      expect(deployment.partA).toHaveLength(71);
      expect(deployment.partA?.[0]).toBe(
        REFERENCE.survey_items.find((i) => i.position === 1)?.code,
      );
      expect(deployment.partB).toEqual({
        items: [
          "O1C-01",
          "O1C-02",
          "O1C-03",
          "O1C-04",
          "O1C-05",
          "O2I-01",
          "O2I-02",
          "O2I-03",
          "O2I-04",
          "O2I-05",
          "O2I-06",
        ],
        processIds: PROCESSES,
      });
      expect(deployment.teamLeaders).toBe(true);
      expect(deployment.leadershipTeam).toBe(true);
      expect(deployment.managers).toEqual({ c1: true, c2: true, c3: true });
      expect(deployment.checklists).toEqual(["ADM-O1", "ADM-O2", "ADM-O4"]);
      expect(audiences.team_leaders?.items).toHaveLength(12);
      expect(audiences.leadership_team).toEqual({ items: [] });
      expect(audiences.managers).toEqual({ items: ["c1", "c2", "c3"] });
    }
  });

  it("leaves talent density to formal ratings on that route", () => {
    const { deployment, audiences } = deploymentFor(choice({ c3Route: "formal" }));
    expect(deployment.managers).toEqual({ c1: true, c2: true, c3: false });
    expect(audiences.managers).toEqual({ items: ["c1", "c2"] });
  });

  it("asks the 57 half-yearly items and the capacity checklist at the half-yearly", () => {
    const { deployment, audiences } = deploymentFor(choice({ cadence: "half_yearly" }));
    expect(deployment.partA).toHaveLength(57);
    expect(deployment).not.toHaveProperty("partB");
    expect(deployment).not.toHaveProperty("managers");
    expect(deployment.checklists).toEqual(["ADM-O4"]);
    expect(Object.keys(audiences).sort()).toEqual(["admin_checklists", "members_part_a"]);
  });

  it("asks one rotation row at the pulse, with CII-13, OI5 and TSI2 every quarter (D6)", () => {
    for (const rotation of [1, 2, 3, 4]) {
      const items = deploymentFor(choice({ cadence: "quarterly_pulse", rotation })).deployment
        .partA as string[];
      expect(items).toHaveLength(17);
      expect(items).toContain("CII-13");
      expect(count(items, "OI5")).toBe(3);
      expect(count(items, "TSI2")).toBe(3);
      expect(count(items, "MI1")).toBe(5);
      expect(count(items, "MI2")).toBe(3);
      expect(count(items, "TW")).toBe(2);
    }
    expect(() => deploymentFor(choice({ cadence: "quarterly_pulse", rotation: 5 }))).toThrow();
  });

  it("asks what an event affects, never more than a baseline (D8)", () => {
    const baseline = deploymentFor(choice({})).deployment;
    for (const trigger of REFERENCE.event_triggers) {
      const { deployment } = deploymentFor(
        choice({ cadence: "event_triggered", trigger: trigger.code }),
      );
      for (const item of deployment.partA ?? []) expect(baseline.partA).toContain(item);
      for (const item of deployment.partB?.items ?? []) {
        expect(baseline.partB?.items).toContain(item);
      }
      for (const c of deployment.checklists ?? []) expect(baseline.checklists).toContain(c);
      expect(deployment.teamLeaders).toBeUndefined();
    }

    const reorganisation = deploymentFor(
      choice({ cadence: "event_triggered", trigger: "reorganisation" }),
    ).deployment;
    expect(reorganisation.partA).toHaveLength(8);
    expect(reorganisation.partB).toEqual({
      items: ["O1C-01", "O1C-02", "O1C-03", "O1C-04", "O1C-05"],
      processIds: [],
    });
    expect(reorganisation.leadershipTeam).toBe(true);
    expect(reorganisation.checklists).toEqual(["ADM-O1"]);
    expect(reorganisation).not.toHaveProperty("managers");

    const headcount = deploymentFor(
      choice({ cadence: "event_triggered", trigger: "headcount_change" }),
    ).deployment;
    expect(count(headcount.partA as string[], "CII")).toBe(15);
    expect(headcount.managers).toEqual({ c1: true, c2: false, c3: false });

    const process = deploymentFor(
      choice({ cadence: "event_triggered", trigger: "process_redesign" }),
    ).deployment;
    expect(process.partB).toEqual({ items: [], processIds: PROCESSES });

    const payEquity = deploymentFor(
      choice({ cadence: "event_triggered", trigger: "pay_equity_audit" }),
    ).deployment;
    expect(payEquity.partA).toEqual(["TW-01"]);

    // Two pulse indicators down: a half-yearly (Cadence Master 7.3).
    expect(
      deploymentFor(choice({ cadence: "event_triggered", trigger: "pulse_drop" })).deployment,
    ).toEqual(deploymentFor(choice({ cadence: "half_yearly" })).deployment);
  });
});
