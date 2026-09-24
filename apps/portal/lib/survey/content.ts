import { constants } from "@performancevp/intake";

import { surveyCopy } from "@/lib/copy/survey";
import { fill } from "@/lib/copy/template";
import { REFERENCE, type ReferenceSet } from "@/lib/reference";

/**
 * What a survey link opens, as screens (Milestone 5 plan, 3.2 to 3.4; Survey Blueprint Part 6;
 * layout notes of 24 September 2026). Pure: it takes what survey_for_token returned (the campaign
 * unit's frozen deployment, teams, processes, decision types and positions) and the instrument's
 * wording from the reference set, and returns the screens the page shows, with no name, email or
 * identifier of anyone.
 *
 * - Part A: the team question where the unit has two or more team keys, then the three Part 6
 *   sections in order, in groups of up to four items per screen.
 * - Part B: the cascade and information-access items, then each process with its own six items and
 *   "I do not work on this process" (D25).
 * - Team leaders: the twelve items, each with its own anchors.
 * - Leadership team: the disclosure on the landing, then one screen per decision type.
 */

export type SurveyAudience =
  "members_part_a" | "members_part_b" | "team_leaders" | "leadership_team";

export interface OpenSurvey {
  state: "open";
  audience: SurveyAudience;
  organisationName: string;
  unitName: string;
  cadence: string;
  closesAt: string;
  items: string[];
  teams: Array<{ id: string; name: string }>;
  processes: Array<{ id: string; name: string }>;
  decisionTypes: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; title: string }>;
  audienceSize: number;
  partB: boolean;
}

export interface Anchor {
  value: number;
  label: string;
}

export interface Question {
  code: string;
  wording: string;
  /** Labels by value; the agreement scale has all five, some module items only their ends. */
  anchors: Anchor[];
}

export type Screen =
  | { kind: "team"; options: Array<{ id: string; name: string }> }
  | {
      kind: "items";
      group: number;
      heading: string;
      /** The scale line under the heading, where the items share one. */
      scaleLine: string | null;
      questions: Question[];
      process?: { id: string; name: string };
    }
  | { kind: "decision"; group: number; decisionType: { id: string; name: string } };

export type RoleKey = "recommend" | "agree" | "perform" | "input" | "decides";

export interface SurveyContent {
  audience: SurveyAudience;
  organisationName: string;
  unitName: string;
  closesAt: string;
  /** Questions asked, counting six for each process and each decision type. */
  questionCount: number;
  groupCount: number;
  minutes: number;
  /** A second, shorter survey follows (Part A at baseline and annual). */
  partBFollows: boolean;
  disclosure: "leadershipTeam" | "smallGroup" | null;
  floor: number;
  positions: Array<{ id: string; title: string }>;
  roles: Array<{ key: RoleKey; wording: string; single: boolean }>;
  clarity: Question | null;
  screens: Screen[];
}

const PER_SCREEN = 4;
/** The team-leader module's audience below which its small-group line shows (D24). */
const SMALL_GROUP = constants.ANONYMITY_FLOOR.standard;
const ROLE_CODES: ReadonlyArray<[RoleKey, string]> = [
  ["recommend", "O1L-01"],
  ["agree", "O1L-02"],
  ["perform", "O1L-03"],
  ["input", "O1L-04"],
  ["decides", "O1L-05"],
];

const AGREE: Anchor[] = [1, 2, 3, 4, 5].map((value) => ({
  value,
  label: surveyCopy[`scale.${value}` as "scale.1"],
}));

/**
 * About how long a survey takes: twelve seconds a question for the member surveys (71 is about 15
 * minutes, as the Blueprint says), and the Module Library's own estimates for the team-leader
 * module (5.1, 15 to 20 minutes) and the leadership-team module (3.1, 10 to 15).
 */
export function minutesFor(audience: SurveyAudience, questions: number): number {
  if (audience === "team_leaders") return 15;
  if (audience === "leadership_team") return 10;
  return Math.max(3, Math.ceil((questions * 12) / 60));
}

/** Splits a list into screens of up to four, as evenly as possible: 5 is 3 and 2, not 4 and 1. */
export function chunk<T>(list: readonly T[], size = PER_SCREEN): T[][] {
  if (list.length === 0) return [];
  const screens = Math.ceil(list.length / size);
  const base = Math.floor(list.length / screens);
  const extra = list.length % screens;
  const out: T[][] = [];
  let start = 0;
  for (let i = 0; i < screens; i += 1) {
    const n = base + (i < extra ? 1 : 0);
    out.push(list.slice(start, start + n));
    start += n;
  }
  return out;
}

function moduleQuestions(reference: ReferenceSet, module: string): Question[] {
  return reference.module_items
    .filter((i) => i.module_code === module && i.online)
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      code: i.code,
      wording: i.wording,
      anchors:
        i.response_kind === "agree5"
          ? AGREE
          : (i.anchors ?? []).map((a) => ({ value: a.value, label: a.label })),
    }));
}

export function buildSurvey(open: OpenSurvey, reference: ReferenceSet = REFERENCE): SurveyContent {
  const deployed = new Set(open.items);
  const screens: Screen[] = [];
  let group = 0;
  const itemScreens = (heading: string, questions: Question[], extra: Partial<Screen> = {}) => {
    for (const part of chunk(questions)) {
      group += 1;
      screens.push({
        kind: "items",
        group,
        heading,
        scaleLine: part.every((q) => q.anchors === AGREE) ? surveyCopy["scale.agree"] : null,
        questions: part,
        ...extra,
      } as Screen);
    }
  };
  let questionCount = 0;
  let roles: SurveyContent["roles"] = [];
  let clarity: Question | null = null;

  switch (open.audience) {
    case "members_part_a": {
      if (open.teams.length > 1) screens.push({ kind: "team", options: open.teams });
      const sections = [...reference.survey_sections].sort((a, b) => a.position - b.position);
      for (const section of sections) {
        const questions = reference.survey_items
          .filter((i) => i.section === section.code && deployed.has(i.code))
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ code: i.code, wording: i.wording, anchors: AGREE }));
        questionCount += questions.length;
        itemScreens(section.heading, questions);
      }
      break;
    }
    case "members_part_b": {
      const cascade = moduleQuestions(reference, "M-O1-CASCADE").filter((q) =>
        deployed.has(q.code),
      );
      const access = moduleQuestions(reference, "M-O2-IA").filter((q) => deployed.has(q.code));
      const friction = moduleQuestions(reference, "M-O3-PF");
      itemScreens(surveyCopy["partB.cascade"], cascade);
      itemScreens(surveyCopy["partB.informationAccess"], access);
      for (const process of open.processes) {
        itemScreens(fill(surveyCopy["partB.process"], { process: process.name }), friction, {
          process,
        });
      }
      questionCount = cascade.length + access.length + friction.length * open.processes.length;
      break;
    }
    case "team_leaders": {
      const questions = moduleQuestions(reference, "M-C5-TL").filter((q) => deployed.has(q.code));
      itemScreens(surveyCopy["teamLeaders.heading"], questions);
      questionCount = questions.length;
      break;
    }
    case "leadership_team": {
      const lt = moduleQuestions(reference, "M-O1-LT");
      roles = ROLE_CODES.map(([key, code]) => ({
        key,
        wording: lt.find((q) => q.code === code)?.wording ?? "",
        single: key === "decides",
      }));
      clarity = lt.find((q) => q.code === "O1L-06") ?? null;
      for (const decisionType of open.decisionTypes) {
        group += 1;
        screens.push({ kind: "decision", group, decisionType });
      }
      questionCount = open.decisionTypes.length * ROLE_CODES.length + open.decisionTypes.length;
      break;
    }
  }

  return {
    audience: open.audience,
    organisationName: open.organisationName,
    unitName: open.unitName,
    closesAt: open.closesAt,
    questionCount,
    groupCount: group,
    minutes: minutesFor(open.audience, questionCount),
    partBFollows: open.audience === "members_part_a" && open.partB,
    disclosure:
      open.audience === "leadership_team"
        ? "leadershipTeam"
        : open.audience === "team_leaders" && open.audienceSize < SMALL_GROUP
          ? "smallGroup"
          : null,
    floor: constants.ANONYMITY_FLOOR.standard,
    positions: open.audience === "leadership_team" ? open.positions : [],
    roles,
    clarity,
    screens,
  };
}
