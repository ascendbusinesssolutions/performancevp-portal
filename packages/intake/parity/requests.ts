/**
 * Generates fixtures/parity/requests/*.json: the inputs the parity fixtures are built from. The
 * Northwind control is the extracted worked example; every other request is a small constructed
 * campaign that exercises one sheet's formulas at their edges. Re-running overwrites the
 * requests; the fixtures themselves come from the Excel pipeline (tools/parity/README.md).
 *
 * usage: pnpm parity:requests
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { PART_A_ITEMS } from "../src/items";
import {
  C5L_ITEMS,
  O1C_ITEMS,
  O2I_ITEMS,
  O3P_ITEMS,
  type IntakeInput,
  type LeadershipRow,
  type Member,
  type MemberResponse,
  type PartAItem,
  type PartBItem,
  type RoleFamily,
  type SkillRating,
  type TalentBand,
  type TeamLeaderResponse,
} from "../src/types";
import type { FixtureRequest } from "./fixture-schema";

const northwind = JSON.parse(
  readFileSync(new URL("../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

const requests: Array<FixtureRequest & { workbook?: "template" | "northwind" }> = [];

/** A small deterministic generator, so the requests are reproducible without a library. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function likert(rand: () => number, centre: number): number {
  const v = Math.round(centre + (rand() - 0.5) * 2.4);
  return Math.max(1, Math.min(5, v));
}

function members(count: number, teamId: string | undefined, prefix: string): Member[] {
  return Array.from({ length: count }, (_, i) => {
    const m: Member = { employeeRef: `${prefix}${String(i + 1).padStart(2, "0")}`, fte: 1 };
    if (teamId !== undefined) m.teamId = teamId;
    return m;
  });
}

function fullRow(
  rand: () => number,
  centre: number,
  options: { teamId?: string; partB?: boolean; processes?: string[]; id?: string } = {},
): MemberResponse {
  const items: Partial<Record<PartAItem | PartBItem, number>> = {};
  for (const item of PART_A_ITEMS) items[item] = likert(rand, centre);
  if (options.partB === true) {
    for (const item of O1C_ITEMS) items[item] = likert(rand, centre);
    for (const item of O2I_ITEMS) items[item] = likert(rand, centre);
  }
  const row: MemberResponse = { items };
  if (options.id !== undefined) row.id = options.id;
  if (options.teamId !== undefined) row.teamId = options.teamId;
  if (options.processes !== undefined) {
    row.processes = options.processes.map((processId) => {
      const processItems: Partial<Record<(typeof O3P_ITEMS)[number], number>> = {};
      for (const item of O3P_ITEMS) processItems[item] = likert(rand, centre);
      return { processId, items: processItems };
    });
  }
  return row;
}

function campaign(cadence: IntakeInput["campaign"]["cadence"]): IntakeInput["campaign"] {
  return {
    cadence,
    launchDate: "2026-08-03",
    closeDate: "2026-08-24",
    deployed: {
      partA: [...PART_A_ITEMS],
      partB: { items: [...O1C_ITEMS, ...O2I_ITEMS], processIds: ["p1", "p2", "p3"] },
    },
  };
}

function baseUnit(): IntakeInput["unit"] {
  return {
    name: "Fixture unit",
    teams: [],
    roleFamilies: [],
    knowledgeDomains: [],
    systems: [],
    processes: [
      { id: "p1", name: "Process 1" },
      { id: "p2", name: "Process 2" },
      { id: "p3", name: "Process 3" },
    ],
    decisionTypes: [],
  };
}

function add(
  name: string,
  purpose: string,
  build: () => IntakeInput,
  workbook: "template" | "northwind" = "template",
): void {
  requests.push({ name, purpose, input: build(), workbook });
}

// --- Control ---------------------------------------------------------------------------------

add(
  "northwind",
  "The Northwind Mutual worked example, extracted from the shipped copy and rebuilt on the template: 50 main-survey rows over four teams and 6 leadership respondents over 8 decision types; no manager, team-leader or DLP data.",
  () => northwind,
);

// --- M-C1-MGR and M-C3-MGR ---------------------------------------------------------------------

function skillsFor(familyId: string, count: number, critical = 2): RoleFamily["skills"] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${familyId}-s${i + 1}`,
    name: `Skill ${i + 1}`,
    critical: i < critical,
    kind: i % 3 === 2 ? ("behavioural" as const) : ("technical" as const),
  }));
}

function managerCampaign(
  bands: number[],
  options: { unratedReport?: boolean; missingFamily?: boolean } = {},
): IntakeInput {
  const rand = lcg(7);
  const families: RoleFamily[] = [
    { id: "f1", name: "Claims assessors", skills: skillsFor("f1", 6) },
    { id: "f2", name: "Member advisers", skills: skillsFor("f2", 4) },
    { id: "f3", name: "Team coordinators", skills: skillsFor("f3", 5), peopleLeader: true },
  ];
  const snapshot: Member[] = [];
  const skills: SkillRating[] = [];
  const talentBands: TalentBand[] = [];
  let band = 0;
  const rate = (managerRef: string, employeeRef: string, family: RoleFamily, fte: number): void => {
    snapshot.push({ employeeRef, roleFamilyId: family.id, fte, managerRef });
    for (const skill of family.skills) {
      skills.push({ managerRef, employeeRef, skillId: skill.id, rating: likert(rand, 3.4) });
    }
    const b = bands[band % bands.length] as number;
    band += 1;
    talentBands.push({ managerRef, employeeRef, band: b });
  };
  rate("M1", "E01", families[0] as RoleFamily, 1);
  rate("M1", "E02", families[0] as RoleFamily, 0.6);
  rate("M1", "E03", families[0] as RoleFamily, 1);
  rate("M2", "E04", families[1] as RoleFamily, 0.8);
  rate("M2", "E05", families[1] as RoleFamily, 1);
  rate("M3", "E06", families[2] as RoleFamily, 1);
  rate("M3", "E07", families[2] as RoleFamily, 0.5);
  rate("M3", "E08", families[2] as RoleFamily, 1);
  // A fourth manager with a report rated for the band only: no skill row, a row all the same.
  snapshot.push({ employeeRef: "E09", roleFamilyId: "f2", fte: 1, managerRef: "M4" });
  talentBands.push({
    managerRef: "M4",
    employeeRef: "E09",
    band: bands[band % bands.length] as number,
  });
  if (options.unratedReport === true) {
    // In the snapshot with a manager, never rated: counts in family FTE, not in coverage.
    snapshot.push({ employeeRef: "E10", roleFamilyId: "f1", fte: 1, managerRef: "M1" });
  }
  if (options.missingFamily === true) {
    // Rated, but with no role family in the snapshot: coverage blank.
    snapshot.push({ employeeRef: "E11", fte: 1, managerRef: "M2" });
    skills.push({ managerRef: "M2", employeeRef: "E11", skillId: "f2-s1", rating: 5 });
    talentBands.push({ managerRef: "M2", employeeRef: "E11", band: 3 });
  }
  // A fifth manager exists in the directory but rated nobody.
  snapshot.push({ employeeRef: "E12", roleFamilyId: "f3", fte: 1, managerRef: "M5" });
  const unit = baseUnit();
  unit.roleFamilies = families;
  const c = campaign("baseline");
  c.deployed = { managers: { c1: true, c2: false, c3: true } };
  return { campaign: c, unit, snapshot: { members: snapshot }, ratings: { skills, talentBands } };
}

add(
  "managers-neither",
  "M-C1-MGR over three role families with part-time FTE, an unrated report and a report without a family; M-C3-MGR with neither the cap nor the skew firing (bands 2, 3, 3, 4, 3, 2, 3, 4, 3, 3).",
  () =>
    managerCampaign([2, 3, 3, 4, 3, 2, 3, 4, 3, 3], { unratedReport: true, missingFamily: true }),
);
add(
  "managers-cap",
  "M-C3-MGR with the Band 5 cap firing (5 of 9 rated at Band 5, cap 2.25) and the skew rule firing on the capped mean of 3.81.",
  () => managerCampaign([5, 5, 5, 5, 5, 4, 3, 3, 2]),
);
add(
  "managers-skew",
  "M-C3-MGR with the skew rule firing (mean band 4.0 over 9 rated) and no Band 5 excess to cap.",
  () => managerCampaign([4, 4, 4, 4, 5, 4, 3, 4, 4]),
);
add(
  "managers-band1",
  "M-C3-MGR with no Band 1 at all, so the Band 1 floor check fires; mean band 3.44 over 9 rated, below the skew trigger.",
  () => managerCampaign([2, 3, 3, 4, 4, 4, 4, 3, 4]),
);
add(
  "managers-trigger",
  "M-C3-MGR with the mean band exactly at the 3.5 trigger over 10 rated (nine cycled bands summing to 32 plus a Band 3 for the report without a family), so the skew rule does not fire.",
  () => managerCampaign([2, 3, 3, 4, 4, 4, 4, 4, 4], { missingFamily: true }),
);

// --- M-C5-TL -----------------------------------------------------------------------------------

add(
  "team-leaders",
  "M-C5-TL over four leaders with a fifth row carrying an ID and no answers, and a sixth leader in the directory who did not respond.",
  () => {
    const rand = lcg(11);
    const leaders: TeamLeaderResponse[] = [4.2, 3.1, 3.8, 2.6].map((centre, i) => {
      const items: Partial<Record<(typeof C5L_ITEMS)[number], number>> = {};
      for (const item of C5L_ITEMS) items[item] = likert(rand, centre);
      return { id: `L${i + 1}`, items };
    });
    leaders.push({ id: "L5", items: {} });
    const snapshot = members(6, undefined, "L").map((m) => ({ ...m, teamLeader: true }));
    const c = campaign("annual");
    c.deployed = { teamLeaders: true };
    return {
      campaign: c,
      unit: baseUnit(),
      snapshot: { members: snapshot },
      responses: { teamLeaders: leaders },
    };
  },
);

// --- Screening ----------------------------------------------------------------------------------

add(
  "screening-cases",
  "7 Screening at its edges: an all-5s row, an all-3s row, a row straight-lined high (forward 4.2, reverse 4), a row straight-lined low, a row with forward items only, a row with a single item, a blank row between two responses, and ordinary rows; 12 heads, so the headcount reconciliation says ok.",
  () => {
    const rand = lcg(3);
    const rows: MemberResponse[] = [];
    rows.push(fullRow(rand, 3.6, { id: "r1", partB: true, processes: ["p1"] }));
    const all5: Partial<Record<PartAItem, number>> = {};
    for (const item of PART_A_ITEMS) all5[item] = 5;
    rows.push({ id: "all-5", items: all5 });
    const all3: Partial<Record<PartAItem, number>> = {};
    for (const item of PART_A_ITEMS) all3[item] = 3;
    rows.push({ id: "all-3", items: all3 });
    const high: Partial<Record<PartAItem, number>> = {};
    PART_A_ITEMS.forEach((item, i) => {
      high[item] = [
        "CII-05",
        "CII-10",
        "CII-15",
        "MI1-04",
        "MI2-05",
        "MI3-04",
        "MI4-04",
        "OI1-03",
        "OI1-06",
        "OI2-04",
        "OI3-05",
        "OI4-03",
        "TSI2-03",
        "TSI3-04",
        "TSI3-05",
      ].includes(item)
        ? 4
        : i % 5 === 0
          ? 5
          : 4;
    });
    rows.push({ id: "straight-high", items: high });
    const low: Partial<Record<PartAItem, number>> = {};
    PART_A_ITEMS.forEach((item, i) => {
      low[item] = i % 4 === 0 ? 1 : 2;
    });
    rows.push({ id: "straight-low", items: low });
    rows.push({
      id: "forward-only",
      items: { "CII-01": 5, "CII-02": 5, "CII-03": 4, "MI1-01": 5 },
    });
    rows.push({ id: "single", items: { "MI2-01": 4 } });
    rows.push({ id: "blank", items: {} });
    rows.push(fullRow(rand, 3.2, { id: "r9", partB: true, processes: ["p1", "p2"] }));
    rows.push(fullRow(rand, 2.8, { id: "r10", partB: true, processes: ["p2", "p3"] }));
    return {
      campaign: campaign("baseline"),
      unit: baseUnit(),
      snapshot: { members: members(12, undefined, "H") },
      responses: { members: rows },
    };
  },
);

// --- Half-yearly: Part A only ---------------------------------------------------------------------

add(
  "half-yearly",
  "A half-yearly campaign: Part A rows only, no Part B columns, so CASCADE, IA and PF are blank and their rates read 0 and LOW; 20 rows from 30 heads with one all-4s row excluded.",
  () => {
    const rand = lcg(5);
    const rows = Array.from({ length: 19 }, (_, i) => fullRow(rand, 3.4, { id: `h${i + 1}` }));
    const all4: Partial<Record<PartAItem, number>> = {};
    for (const item of PART_A_ITEMS) all4[item] = 4;
    rows.push({ id: "all-4", items: all4 });
    const c = campaign("half-yearly");
    c.deployed = { partA: [...PART_A_ITEMS] };
    return {
      campaign: c,
      unit: baseUnit(),
      snapshot: { members: members(30, undefined, "H") },
      responses: { members: rows },
    };
  },
);

// --- Small teams --------------------------------------------------------------------------------

add(
  "small-teams",
  "Team rows at the thresholds: 3 valid of 4 FTE (LOW on the count), 4 valid of 5 FTE (80%, ok), 7 valid of 10 FTE (70%, ok), 9 valid of 13 FTE (69%, LOW on the rate), a team named in the unit with no responses, and a response carrying a team not in the unit.",
  () => {
    const rand = lcg(13);
    const teams = [
      { id: "t3", name: "Three of four", heads: 4, valid: 3 },
      { id: "t4", name: "Four of five", heads: 5, valid: 4 },
      { id: "t7", name: "Seven of ten", heads: 10, valid: 7 },
      { id: "t9", name: "Nine of thirteen", heads: 13, valid: 9 },
      { id: "t0", name: "Nobody", heads: 3, valid: 0 },
    ];
    const snapshot: Member[] = [];
    const rows: MemberResponse[] = [];
    for (const team of teams) {
      snapshot.push(...members(team.heads, team.id, team.id.toUpperCase()));
      for (let i = 0; i < team.valid; i += 1) {
        rows.push(fullRow(rand, 3.5, { id: `${team.id}-${i + 1}`, teamId: team.id }));
      }
    }
    rows.push(fullRow(rand, 3.5, { id: "stray", teamId: "not-a-team" }));
    const unit = baseUnit();
    unit.teams = teams.map(({ id, name }) => ({ id, name }));
    return {
      campaign: campaign("baseline"),
      unit,
      snapshot: { members: snapshot },
      responses: { members: rows },
    };
  },
);

// --- Leadership -----------------------------------------------------------------------------------

add(
  "leadership-edges",
  "M-O1-LT with a blank role answer, a tied modal answer (two answers at two each of four), a decision type nobody answered, a respondent answering one decision only, and 4 respondents of a leadership team of 6 (67%, LOW).",
  () => {
    const decisionTypes = [
      { id: "d1", name: "Approve refund" },
      { id: "d2", name: "Waive fee" },
      { id: "d3", name: "Escalate complaint" },
    ];
    const rows: LeadershipRow[] = [
      {
        respondentId: "L1",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "B",
        perform: "C",
        input: "D",
        decides: "E",
        clarity: 4,
      },
      {
        respondentId: "L2",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "B",
        perform: "C",
        input: "D",
        decides: "F",
        clarity: 5,
      },
      {
        respondentId: "L3",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "X",
        perform: "Y",
        input: "D",
        decides: "F",
        clarity: 3,
      },
      {
        respondentId: "L4",
        decisionTypeId: "d1",
        recommend: "B",
        agree: "X",
        perform: "Y",
        input: "Z",
        decides: "E",
        clarity: 2,
      },
      {
        respondentId: "L1",
        decisionTypeId: "d2",
        recommend: "A",
        agree: "A",
        perform: "A",
        decides: "A",
        clarity: 3,
      },
      {
        respondentId: "L2",
        decisionTypeId: "d2",
        recommend: "A",
        agree: "A",
        input: "A",
        decides: "B",
      },
      {
        respondentId: "L3",
        decisionTypeId: "d2",
        recommend: "B",
        agree: "A",
        perform: "A",
        input: "A",
        decides: "A",
        clarity: 4,
      },
    ];
    const snapshot = members(6, undefined, "L").map((m) => ({ ...m, leadershipTeam: true }));
    const unit = baseUnit();
    unit.decisionTypes = decisionTypes;
    const c = campaign("annual");
    c.deployed = { leadershipTeam: true };
    return {
      campaign: c,
      unit,
      snapshot: { members: snapshot },
      responses: { leadershipTeam: rows },
    };
  },
);

// --- Write ----------------------------------------------------------------------------------------

const dir = new URL("../fixtures/parity/requests/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const request of requests) {
  writeFileSync(new URL(`${request.name}.json`, dir), `${JSON.stringify(request, null, 1)}\n`);
}
process.stdout.write(`${requests.length} requests written to ${dir.pathname}\n`);
