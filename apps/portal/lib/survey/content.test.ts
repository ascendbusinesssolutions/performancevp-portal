import { describe, expect, it } from "vitest";

import { REFERENCE } from "@/lib/reference";

import { buildSurvey, chunk, type OpenSurvey } from "./content";

const BASELINE = REFERENCE.survey_items.filter((i) => i.in_baseline).map((i) => i.code);

function open(extra: Partial<OpenSurvey>): OpenSurvey {
  return {
    state: "open",
    audience: "members_part_a",
    organisationName: "Northwind Mutual",
    unitName: "Member Services",
    cadence: "baseline",
    closesAt: "2026-10-08T06:00:00Z",
    items: BASELINE,
    teams: [
      { id: "t1", name: "North" },
      { id: "t2", name: "South" },
    ],
    processes: [],
    decisionTypes: [],
    positions: [],
    audienceSize: 60,
    partB: true,
    ...extra,
  };
}

describe("screens of up to four", () => {
  it("split as evenly as they can", () => {
    expect(chunk([1, 2, 3, 4, 5])).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
    expect(chunk(Array.from({ length: 23 }, (_, i) => i)).map((c) => c.length)).toEqual([
      4, 4, 4, 4, 4, 3,
    ]);
    expect(chunk([])).toEqual([]);
  });
});

describe("the survey a link opens", () => {
  it("asks Part A after the team question, in the Blueprint's order, section by section", () => {
    const content = buildSurvey(open({}));
    expect(content.screens[0]).toEqual({ kind: "team", options: open({}).teams });
    const items = content.screens.flatMap((s) => (s.kind === "items" ? s.questions : []));
    expect(items.map((q) => q.code)).toEqual(
      [...REFERENCE.survey_items].sort((a, b) => a.position - b.position).map((i) => i.code),
    );
    const screens = content.screens.filter((s) => s.kind === "items");
    expect(screens.every((s) => s.kind === "items" && s.questions.length <= 4)).toBe(true);
    expect(screens.map((s) => (s.kind === "items" ? s.group : 0))).toEqual(
      screens.map((_, i) => i + 1),
    );
    expect(screens[0]).toMatchObject({
      heading: "About your team and work",
      scaleLine: "1 strongly disagree, 5 strongly agree",
    });
    expect(content).toMatchObject({
      questionCount: 71,
      groupCount: screens.length,
      minutes: 15,
      partBFollows: true,
      disclosure: null,
      floor: 5,
    });
  });

  it("asks no team question where the unit has one team key or none", () => {
    expect(buildSurvey(open({ teams: [{ id: "t1", name: "North" }] })).screens[0]!.kind).toBe(
      "items",
    );
    expect(buildSurvey(open({ teams: [] })).screens[0]!.kind).toBe("items");
  });

  it("asks only the deployed items at a pulse, and mentions no second survey", () => {
    const rotation = REFERENCE.pulse_rotation
      .filter((r) => r.rotation === 1)
      .map((r) => r.item_code);
    const content = buildSurvey(
      open({ items: rotation, partB: false, cadence: "quarterly_pulse" }),
    );
    expect(content.questionCount).toBe(17);
    expect(content.partBFollows).toBe(false);
  });

  it("asks Part B's cascade, information access and each process with its own six items", () => {
    const items = REFERENCE.module_items
      .filter((i) => i.online && ["M-O1-CASCADE", "M-O2-IA"].includes(i.module_code))
      .map((i) => i.code);
    const processes = [
      { id: "p1", name: "Claims intake" },
      { id: "p2", name: "Assessment" },
      { id: "p3", name: "Settlement" },
    ];
    const content = buildSurvey(open({ audience: "members_part_b", items, processes, teams: [] }));
    expect(content.questionCount).toBe(5 + 6 + 18);
    const headings = content.screens.map((s) => (s.kind === "items" ? s.heading : ""));
    expect(headings).toEqual([
      "How your work connects to the strategy",
      "How your work connects to the strategy",
      "The information you need",
      "The information you need",
      "Thinking about Claims intake",
      "Thinking about Claims intake",
      "Thinking about Assessment",
      "Thinking about Assessment",
      "Thinking about Settlement",
      "Thinking about Settlement",
    ]);
    expect(content.screens[4]).toMatchObject({ process: processes[0] });
    expect(content.partBFollows).toBe(false);
  });

  it("gives the team leaders' items their own anchors, and the small-group line under five (D24)", () => {
    const items = REFERENCE.module_items
      .filter((i) => i.module_code === "M-C5-TL")
      .map((i) => i.code);
    const content = buildSurvey(
      open({ audience: "team_leaders", items, teams: [], audienceSize: 4, partB: false }),
    );
    expect(content.questionCount).toBe(12);
    expect(content.disclosure).toBe("smallGroup");
    const first = content.screens[0];
    expect(first).toMatchObject({ scaleLine: null });
    expect(first?.kind === "items" && first.questions[0]!.anchors).toHaveLength(5);
    expect(
      buildSurvey(open({ audience: "team_leaders", items, teams: [], audienceSize: 5 })).disclosure,
    ).toBeNull();
  });

  it("asks the leadership team one screen per decision type, after the disclosure", () => {
    const content = buildSurvey(
      open({
        audience: "leadership_team",
        items: [],
        teams: [],
        decisionTypes: [
          { id: "d1", name: "Hiring" },
          { id: "d2", name: "Refunds" },
        ],
        positions: [{ id: "x1", title: "Operations Lead" }],
        audienceSize: 6,
        partB: false,
      }),
    );
    expect(content.disclosure).toBe("leadershipTeam");
    expect(content.screens).toEqual([
      { kind: "decision", group: 1, decisionType: { id: "d1", name: "Hiring" } },
      { kind: "decision", group: 2, decisionType: { id: "d2", name: "Refunds" } },
    ]);
    expect(content.roles.map((r) => [r.key, r.single])).toEqual([
      ["recommend", false],
      ["agree", false],
      ["perform", false],
      ["input", false],
      ["decides", true],
    ]);
    expect(content.clarity?.anchors).toEqual([
      { value: 1, label: "Very unclear" },
      { value: 5, label: "Very clear" },
    ]);
    expect(content.minutes).toBe(10);
  });
});
