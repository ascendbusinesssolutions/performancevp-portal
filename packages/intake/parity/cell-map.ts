/**
 * The single table relating Survey Processing workbook cells to the intake's input and the
 * workbook mirror's result.
 *
 * Input cells carry a getter on `IntakeInput`, used to write a fixture's input into a workbook
 * copy; extract-input.ts reads a workbook's stored inputs the other way. Formula cells carry a
 * reader on `{ input, result }` that yields the value the cell should hold, so a recalculated
 * workbook can be compared cell by cell. Nothing else in the repository knows a cell address.
 */

import { C1_PROFICIENCY_THRESHOLD } from "../src/constants";
import { headcounts, roleFamilyFte, teamFte, unitFte } from "../src/directory";
import type { RowScreen } from "../src/screening";
import type { IntakeInput, MemberResponse } from "../src/types";
import type { SurveyWorkbookResult } from "../src/workbook";
import type { CellValue } from "./compare";
import { ROWS, SHEET, mainColumns } from "./layout";

export interface InputCell {
  cell: string;
  /** A readable name for the value, used in messages. */
  path: string;
  get(input: IntakeInput): CellValue;
}

export interface OutputCell {
  cell: string;
  /** The fixture key: a result path where one exists, else the cell. */
  key: string;
  read(ctx: Context): CellValue;
}

export interface Context {
  input: IntakeInput;
  result: SurveyWorkbookResult;
}

function blankIfZero(n: number): CellValue {
  return n === 0 ? undefined : n;
}

// ---------------------------------------------------------------------------------------------
// Input cells
// ---------------------------------------------------------------------------------------------

export function inputCells(): InputCell[] {
  const cells: InputCell[] = [];
  const S = SHEET.setup;
  cells.push(
    { cell: `${S}!B15`, path: "unit.name", get: (i) => i.unit.name },
    { cell: `${S}!B16`, path: "unit FTE (snapshot)", get: (i) => unitFte(i.snapshot) },
    { cell: `${S}!B17`, path: "campaign.cadence", get: (i) => i.campaign.cadence },
    {
      cell: `${S}!B20`,
      path: "headcounts.members",
      get: (i) => blankIfZero(headcounts(i.snapshot).members),
    },
    {
      cell: `${S}!B21`,
      path: "headcounts.managers",
      get: (i) => blankIfZero(headcounts(i.snapshot).managers),
    },
    {
      cell: `${S}!B22`,
      path: "headcounts.leadershipTeam",
      get: (i) => blankIfZero(headcounts(i.snapshot).leadershipTeam),
    },
    {
      cell: `${S}!B23`,
      path: "headcounts.teamLeaders",
      get: (i) => blankIfZero(headcounts(i.snapshot).teamLeaders),
    },
    { cell: `${S}!B24`, path: "DLP participants (not measured online)", get: () => undefined },
    { cell: `${S}!B27`, path: "C1 proficiency threshold", get: () => C1_PROFICIENCY_THRESHOLD },
  );
  for (let t = 0; t < ROWS.teams.count; t += 1) {
    const r = ROWS.teams.first + t;
    cells.push(
      { cell: `${S}!A${r}`, path: `unit.teams[${t}].name`, get: (i) => i.unit.teams[t]?.name },
      {
        cell: `${S}!B${r}`,
        path: `teams[${t}] FTE (snapshot)`,
        get: (i) => {
          const team = i.unit.teams[t];
          return team === undefined ? undefined : teamFte(i.snapshot, team.id);
        },
      },
    );
  }
  for (let d = 0; d < ROWS.decisionTypes.count; d += 1) {
    const r = ROWS.decisionTypes.first + d;
    cells.push({
      cell: `${S}!D${r}`,
      path: `unit.decisionTypes[${d}].name`,
      get: (i) => i.unit.decisionTypes[d]?.name,
    });
  }
  for (let f = 0; f < ROWS.roleFamilies.count; f += 1) {
    const r = ROWS.roleFamilies.first + f;
    cells.push(
      {
        cell: `${S}!K${r}`,
        path: `unit.roleFamilies[${f}].name`,
        get: (i) => i.unit.roleFamilies[f]?.name,
      },
      {
        cell: `${S}!L${r}`,
        path: `roleFamilies[${f}] FTE (snapshot)`,
        get: (i) => {
          const family = i.unit.roleFamilies[f];
          return family === undefined ? undefined : roleFamilyFte(i.snapshot, family.id);
        },
      },
      {
        cell: `${S}!M${r}`,
        path: `unit.roleFamilies[${f}].skills.length`,
        get: (i) => {
          const family = i.unit.roleFamilies[f];
          return family === undefined ? undefined : family.skills.length;
        },
      },
    );
  }

  const M = SHEET.importMain;
  const columns = mainColumns();
  for (let n = 0; n < ROWS.main.count; n += 1) {
    const r = ROWS.main.first + n;
    const row = (i: IntakeInput): MemberResponse | undefined => i.responses?.members?.[n];
    cells.push({
      cell: `${M}!B${r}`,
      path: `responses.members[${n}].teamId (name)`,
      get: (i) => {
        const teamId = row(i)?.teamId;
        return teamId === undefined ? undefined : i.unit.teams.find((t) => t.id === teamId)?.name;
      },
    });
    for (const c of columns) {
      cells.push({
        cell: `${M}!${c.column}${r}`,
        path:
          c.process === undefined
            ? `responses.members[${n}].items.${c.item}`
            : `responses.members[${n}].processes[${c.process}].items.${c.item}`,
        get: (i) => {
          const member = row(i);
          if (member === undefined) return undefined;
          if (c.process === undefined) {
            return (member.items as Partial<Record<string, number>>)[c.item];
          }
          const processId = i.unit.processes[c.process]?.id;
          const process = member.processes?.find((p) => p.processId === processId);
          return process?.items[c.item as keyof typeof process.items];
        },
      });
    }
  }

  const L = SHEET.importLeadership;
  const roles = ["recommend", "agree", "perform", "input", "decides"] as const;
  for (let n = 0; n < ROWS.leadership.count; n += 1) {
    const r = ROWS.leadership.first + n;
    const row = (
      i: IntakeInput,
    ):
      | {
          respondentId: string;
          decisionTypeId: string;
          recommend?: string;
          agree?: string;
          perform?: string;
          input?: string;
          decides?: string;
          clarity?: number;
        }
      | undefined => leadershipRows(i)[n];
    cells.push(
      {
        cell: `${L}!A${r}`,
        path: `leadership row ${n} respondent`,
        get: (i) => row(i)?.respondentId,
      },
      {
        cell: `${L}!B${r}`,
        path: `leadership row ${n} decision type (name)`,
        get: (i) => {
          const id = row(i)?.decisionTypeId;
          return id === undefined ? undefined : i.unit.decisionTypes.find((d) => d.id === id)?.name;
        },
      },
    );
    roles.forEach((role, k) => {
      cells.push({
        cell: `${L}!${String.fromCharCode(67 + k)}${r}`,
        path: `leadership row ${n} ${role}`,
        get: (i) => row(i)?.[role],
      });
    });
    cells.push({
      cell: `${L}!H${r}`,
      path: `leadership row ${n} clarity`,
      get: (i) => row(i)?.clarity,
    });
  }

  return cells;
}

/** The leadership survey flattened to the workbook's one row per respondent per decision type. */
export function leadershipRows(input: IntakeInput): Array<{
  respondentId: string;
  decisionTypeId: string;
  recommend?: string;
  agree?: string;
  perform?: string;
  input?: string;
  decides?: string;
  clarity?: number;
}> {
  const rows = [];
  for (const respondent of input.responses?.leadershipTeam ?? []) {
    for (const decision of respondent.decisions) {
      rows.push({ respondentId: respondent.respondentId, ...decision });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------
// Formula cells
// ---------------------------------------------------------------------------------------------

function screenAt(result: SurveyWorkbookResult, n: number): RowScreen | undefined {
  return result.screening.members.rows.find((row) => row.index === n);
}

export function outputCells(): OutputCell[] {
  const cells: OutputCell[] = [];
  const SC = SHEET.screening;
  for (let n = 0; n < ROWS.main.count; n += 1) {
    const r = ROWS.main.first + n;
    const key = (field: string): string => `screening.members.rows[${n}].${field}`;
    const at = (ctx: Context): RowScreen | undefined => screenAt(ctx.result, n);
    cells.push(
      {
        cell: `${SC}!A${r}`,
        key: key("row"),
        read: (ctx) => (at(ctx) === undefined ? undefined : r),
      },
      { cell: `${SC}!B${r}`, key: key("count"), read: (ctx) => at(ctx)?.count ?? 0 },
      { cell: `${SC}!C${r}`, key: key("forwardMean"), read: (ctx) => at(ctx)?.forwardMean },
      { cell: `${SC}!D${r}`, key: key("reverseMean"), read: (ctx) => at(ctx)?.reverseMean },
      // MAX and MIN of an empty row are 0 in Excel, not an error, so IFERROR leaves them at 0.
      { cell: `${SC}!E${r}`, key: key("max"), read: (ctx) => at(ctx)?.max ?? 0 },
      { cell: `${SC}!F${r}`, key: key("min"), read: (ctx) => at(ctx)?.min ?? 0 },
      {
        cell: `${SC}!G${r}`,
        key: key("patterning"),
        read: (ctx) => {
          const s = at(ctx);
          return s === undefined ? undefined : s.patterning ? 1 : 0;
        },
      },
      {
        cell: `${SC}!H${r}`,
        key: key("straightLining"),
        read: (ctx) => (at(ctx)?.straightLining === true ? 1 : 0),
      },
      {
        cell: `${SC}!I${r}`,
        key: key("valid"),
        read: (ctx) => {
          const s = at(ctx);
          return s === undefined ? undefined : s.valid ? 1 : 0;
        },
      },
    );
  }
  const summary = (ctx: Context): SurveyWorkbookResult["screening"]["members"]["summary"] =>
    ctx.result.screening.members.summary;
  cells.push(
    {
      cell: `${SC}!B207`,
      key: "screening.members.summary.valid",
      read: (ctx) => summary(ctx).valid,
    },
    {
      cell: `${SC}!B208`,
      key: "screening.members.summary.received",
      read: (ctx) => summary(ctx).received,
    },
    {
      cell: `${SC}!B209`,
      key: "screening.members.summary.excluded",
      read: (ctx) => summary(ctx).excluded,
    },
    {
      cell: `${SC}!B210`,
      key: "screening.members.summary.exclusionRate",
      read: (ctx) => summary(ctx).exclusionRate,
    },
    {
      cell: `${SC}!B211`,
      key: "screening.members.summary.headcountReconciliation",
      read: (ctx) => summary(ctx).headcountReconciliation,
    },
  );
  return cells;
}
