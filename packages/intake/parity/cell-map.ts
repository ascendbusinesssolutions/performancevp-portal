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
import type { BlockRate } from "../src/means";
import {
  managerRows,
  type C1Result,
  type FamilyCoverage,
  type ManagerRow,
} from "../src/modules/c1-mgr";
import type { C3Result } from "../src/modules/c3-mgr";
import { RAPID_ROLES, type LtDecision, type LtResult, type LtRowHelper } from "../src/modules/lt";
import type { RowScreen } from "../src/screening";
import type { TeamCii, TeamO5 } from "../src/teams";
import {
  CII_ITEMS,
  OI5_ITEMS,
  type IntakeInput,
  type LeadershipRow,
  type MemberResponse,
  type TeamLeaderResponse,
} from "../src/types";
import { PART_A_ITEMS } from "../src/items";
import type { SurveyWorkbookResult } from "../src/workbook";
import type { CellValue } from "./compare";
import {
  OUTPUT_ITEM_ROWS,
  OUTPUT_O5_ROWS,
  ROWS,
  SHEET,
  TYPE_A_BLOCKS,
  TYPE_A_FIRST_ROW,
  TYPE_A_TEAM_ROWS,
  columnIndex,
  columnLetter,
  mainColumns,
  teamLeaderColumns,
} from "./layout";

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
    const row = (i: IntakeInput): LeadershipRow | undefined => leadershipRows(i)[n];
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

  const MG = SHEET.importManager;
  for (let n = 0; n < ROWS.manager.count; n += 1) {
    const r = ROWS.manager.first + n;
    const row = (i: IntakeInput): ManagerRow | undefined =>
      managerRows(i.ratings, i.unit.roleFamilies, i.snapshot)[n];
    cells.push(
      { cell: `${MG}!A${r}`, path: `manager row ${n} manager`, get: (i) => row(i)?.managerRef },
      {
        cell: `${MG}!B${r}`,
        path: `manager row ${n} role family (name)`,
        get: (i) => {
          const id = row(i)?.roleFamilyId;
          return id === undefined ? undefined : i.unit.roleFamilies.find((f) => f.id === id)?.name;
        },
      },
      {
        cell: `${MG}!C${r}`,
        path: `manager row ${n} direct report`,
        get: (i) => row(i)?.employeeRef,
      },
    );
    for (let k = 0; k < ROWS.skills; k += 1) {
      cells.push({
        cell: `${MG}!${columnLetter(columnIndex("D") + k)}${r}`,
        path: `manager row ${n} skill ${k + 1}`,
        get: (i) => row(i)?.skills[k],
      });
    }
    cells.push({ cell: `${MG}!S${r}`, path: `manager row ${n} band`, get: (i) => row(i)?.band });
  }

  const TL = SHEET.importTeamLeader;
  for (let n = 0; n < ROWS.teamLeader.count; n += 1) {
    const r = ROWS.teamLeader.first + n;
    const row = (i: IntakeInput): TeamLeaderResponse | undefined => i.responses?.teamLeaders?.[n];
    cells.push({
      cell: `${TL}!A${r}`,
      path: `team-leader row ${n} id`,
      get: (i) => row(i)?.id ?? (row(i) === undefined ? undefined : `leader-${r}`),
    });
    for (const c of teamLeaderColumns()) {
      cells.push({
        cell: `${TL}!${c.column}${r}`,
        path: `team-leader row ${n} ${c.item}`,
        get: (i) => row(i)?.items[c.item],
      });
    }
  }

  return cells;
}

export function leadershipRows(input: IntakeInput): LeadershipRow[] {
  return input.responses?.leadershipTeam ?? [];
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

  // 8 Type A Means: item rows, block rates and flags, team rows.
  const TA = SHEET.typeA;
  PART_A_ITEMS.forEach((item, i) => {
    const r = TYPE_A_FIRST_ROW + i;
    cells.push({
      cell: `${TA}!C${r}`,
      key: `typeA.means.${item}`,
      read: (ctx) => ctx.result.typeA.means[item],
    });
  });
  TYPE_A_BLOCKS.forEach((block, b) => {
    const at = (ctx: Context): BlockRate | undefined => ctx.result.typeA.blocks[b];
    cells.push(
      {
        cell: `${TA}!E${block.first}`,
        key: `typeA.blocks[${b}].responseRate`,
        read: (ctx) => at(ctx)?.responseRate,
      },
      {
        cell: `${TA}!F${block.first}`,
        key: `typeA.blocks[${b}].flag`,
        read: (ctx) => at(ctx)?.flag,
      },
    );
  });
  for (let t = 0; t < TYPE_A_TEAM_ROWS.cii.count; t += 1) {
    const r = TYPE_A_TEAM_ROWS.cii.first + t;
    const at = (ctx: Context): TeamCii | undefined => ctx.result.typeA.teamCii[t];
    const key = (field: string): string => `typeA.teamCii[${t}].${field}`;
    cells.push(
      { cell: `${TA}!A${r}`, key: key("name"), read: (ctx) => at(ctx)?.name },
      { cell: `${TA}!B${r}`, key: key("validCount"), read: (ctx) => at(ctx)?.validCount },
      { cell: `${TA}!C${r}`, key: key("responseRate"), read: (ctx) => at(ctx)?.responseRate },
    );
    CII_ITEMS.forEach((item, i) => {
      cells.push({
        cell: `${TA}!${columnLetter(columnIndex("D") + i)}${r}`,
        key: key(`means.${item}`),
        read: (ctx) => at(ctx)?.means[item],
      });
    });
    cells.push({ cell: `${TA}!S${r}`, key: key("flag"), read: (ctx) => at(ctx)?.flag });
  }
  for (let t = 0; t < TYPE_A_TEAM_ROWS.o5.count; t += 1) {
    const r = TYPE_A_TEAM_ROWS.o5.first + t;
    const at = (ctx: Context): TeamO5 | undefined => ctx.result.typeA.teamO5[t];
    const key = (field: string): string => `typeA.teamO5[${t}].${field}`;
    cells.push(
      { cell: `${TA}!A${r}`, key: key("name"), read: (ctx) => at(ctx)?.name },
      // The Setup FTE link: blank when the team has none.
      { cell: `${TA}!B${r}`, key: key("fte"), read: (ctx) => blankIfZero(at(ctx)?.fte ?? 0) },
      { cell: `${TA}!C${r}`, key: key("validCount"), read: (ctx) => at(ctx)?.validCount },
      { cell: `${TA}!D${r}`, key: key("responseRate"), read: (ctx) => at(ctx)?.responseRate },
    );
    OI5_ITEMS.forEach((item, i) => {
      cells.push({
        cell: `${TA}!${columnLetter(columnIndex("E") + i)}${r}`,
        key: key(`means.${item}`),
        read: (ctx) => at(ctx)?.means[item],
      });
    });
    cells.push(
      { cell: `${TA}!H${r}`, key: key("score"), read: (ctx) => at(ctx)?.score },
      { cell: `${TA}!I${r}`, key: key("flag"), read: (ctx) => at(ctx)?.flag },
    );
  }

  // 4 Import Leadership helpers I:N and 9 Type C Scoring: M-O1-LT, CASCADE, IA, PF.
  const L = SHEET.importLeadership;
  for (let n = 0; n < ROWS.leadership.count; n += 1) {
    const r = ROWS.leadership.first + n;
    const at = (ctx: Context): LtRowHelper | undefined => ctx.result.typeC.leadership.rows[n];
    RAPID_ROLES.forEach((role, k) => {
      cells.push({
        cell: `${L}!${String.fromCharCode(73 + k)}${r}`,
        key: `typeC.leadership.rows[${n}].counts.${role}`,
        read: (ctx) => at(ctx)?.counts[role],
      });
    });
    cells.push({
      cell: `${L}!N${r}`,
      key: `typeC.leadership.rows[${n}].newRespondent`,
      read: (ctx) => at(ctx)?.newRespondent ?? 0,
    });
  }
  const TC = SHEET.typeC;
  for (let d = 0; d < ROWS.decisionTypes.count; d += 1) {
    const r = 6 + d;
    const at = (ctx: Context): LtDecision | undefined => ctx.result.typeC.leadership.decisions[d];
    const key = (field: string): string => `typeC.leadership.decisions[${d}].${field}`;
    cells.push(
      { cell: `${TC}!A${r}`, key: key("name"), read: (ctx) => at(ctx)?.name },
      { cell: `${TC}!B${r}`, key: key("n"), read: (ctx) => at(ctx)?.n },
    );
    RAPID_ROLES.forEach((role, k) => {
      cells.push({
        cell: `${TC}!${String.fromCharCode(67 + k)}${r}`,
        key: key(`agreement.${role}`),
        read: (ctx) => at(ctx)?.agreement[role],
      });
    });
    cells.push(
      { cell: `${TC}!H${r}`, key: key("mean"), read: (ctx) => at(ctx)?.mean },
      { cell: `${TC}!A${21 + d}`, key: key("clarityName"), read: (ctx) => at(ctx)?.name },
      { cell: `${TC}!B${21 + d}`, key: key("clarity"), read: (ctx) => at(ctx)?.clarity },
    );
  }
  const lt = (ctx: Context): LtResult => ctx.result.typeC.leadership;
  cells.push(
    {
      cell: `${TC}!B34`,
      key: "typeC.leadership.aggregateAgreement",
      read: (ctx) => lt(ctx).aggregateAgreement,
    },
    {
      cell: `${TC}!B35`,
      key: "typeC.leadership.aggregateClarity",
      read: (ctx) => lt(ctx).aggregateClarity,
    },
    {
      cell: `${TC}!B36`,
      key: "typeC.leadership.responseRate",
      read: (ctx) => lt(ctx).responseRate,
    },
    { cell: `${TC}!A37`, key: "typeC.leadership.rateFlag", read: (ctx) => lt(ctx).rateFlag },
    {
      cell: `${TC}!B38`,
      key: "typeC.leadership.score",
      read: (ctx) => lt(ctx).score,
    },
    {
      cell: `${TC}!B43`,
      key: "typeC.cascade.score",
      read: (ctx) => ctx.result.typeC.cascade.score,
    },
    {
      cell: `${TC}!C43`,
      key: "typeC.cascade.responseRate",
      read: (ctx) => ctx.result.typeC.cascade.responseRate,
    },
    { cell: `${TC}!D43`, key: "typeC.cascade.flag", read: (ctx) => ctx.result.typeC.cascade.flag },
    {
      cell: `${TC}!B44`,
      key: "typeC.informationAccess.score",
      read: (ctx) => ctx.result.typeC.informationAccess.score,
    },
    {
      cell: `${TC}!C44`,
      key: "typeC.informationAccess.responseRate",
      read: (ctx) => ctx.result.typeC.informationAccess.responseRate,
    },
    {
      cell: `${TC}!D44`,
      key: "typeC.informationAccess.flag",
      read: (ctx) => ctx.result.typeC.informationAccess.flag,
    },
  );
  for (let p = 0; p < ROWS.processes; p += 1) {
    cells.push({
      cell: `${TC}!B${45 + p}`,
      key: `typeC.processFriction.processes[${p}].score`,
      read: (ctx) => ctx.result.typeC.processFriction.processes[p]?.score,
    });
  }
  cells.push({
    cell: `${TC}!B48`,
    key: "typeC.processFriction.mean",
    read: (ctx) => ctx.result.typeC.processFriction.mean,
  });

  // 3 Import Manager helpers T:U, 5 Import TeamLeader N, and 9 Type C Scoring rows 52 to 82.
  const MG = SHEET.importManager;
  for (let n = 0; n < ROWS.manager.count; n += 1) {
    const r = ROWS.manager.first + n;
    const at = (ctx: Context): ManagerRow | undefined => ctx.result.typeC.c1.rows[n];
    cells.push(
      {
        cell: `${MG}!T${r}`,
        key: `typeC.c1.rows[${n}].coverage`,
        read: (ctx) => at(ctx)?.coverage,
      },
      {
        cell: `${MG}!U${r}`,
        key: `typeC.c1.rows[${n}].newManager`,
        read: (ctx) => at(ctx)?.newManager ?? 0,
      },
    );
  }
  const TL = SHEET.importTeamLeader;
  for (let n = 0; n < ROWS.teamLeader.count; n += 1) {
    const r = ROWS.teamLeader.first + n;
    cells.push({
      cell: `${TL}!N${r}`,
      key: `typeC.c5.leaderScores[${n}]`,
      read: (ctx) => ctx.result.typeC.c5.leaderScores[n],
    });
  }
  for (let f = 0; f < ROWS.roleFamilies.count; f += 1) {
    const r = 52 + f;
    const at = (ctx: Context): FamilyCoverage | undefined => ctx.result.typeC.c1.families[f];
    const key = (field: string): string => `typeC.c1.families[${f}].${field}`;
    cells.push(
      { cell: `${TC}!A${r}`, key: key("name"), read: (ctx) => at(ctx)?.name },
      { cell: `${TC}!B${r}`, key: key("coverage"), read: (ctx) => at(ctx)?.coverage },
      { cell: `${TC}!C${r}`, key: key("score"), read: (ctx) => at(ctx)?.score },
      { cell: `${TC}!D${r}`, key: key("fte"), read: (ctx) => at(ctx)?.fte },
    );
  }
  const c1 = (ctx: Context): C1Result => ctx.result.typeC.c1;
  cells.push(
    { cell: `${TC}!B63`, key: "typeC.c1.responseRate", read: (ctx) => c1(ctx).responseRate },
    { cell: `${TC}!A64`, key: "typeC.c1.rateFlag", read: (ctx) => c1(ctx).rateFlag },
    { cell: `${TC}!B65`, key: "typeC.c1.score", read: (ctx) => c1(ctx).score },
    // B77 repeats the manager response-rate formula below the C3 block; a stray copy, mirrored.
    {
      cell: `${TC}!B77`,
      key: "typeC.c1.responseRateRepeated",
      read: (ctx) => c1(ctx).responseRate,
    },
  );
  const c3 = (ctx: Context): C3Result => ctx.result.typeC.c3;
  for (let b = 0; b < 5; b += 1) {
    const r = 69 + b;
    cells.push(
      { cell: `${TC}!B${r}`, key: `typeC.c3.raw[${b}]`, read: (ctx) => c3(ctx).raw[b] },
      { cell: `${TC}!C${r}`, key: `typeC.c3.capped[${b}]`, read: (ctx) => c3(ctx).capped[b] },
      { cell: `${TC}!D${r}`, key: `typeC.c3.skewed[${b}]`, read: (ctx) => c3(ctx).skewed[b] },
      { cell: `${TC}!F${r}`, key: `typeC.c3.final[${b}]`, read: (ctx) => c3(ctx).final[b] },
    );
  }
  cells.push(
    { cell: `${TC}!B74`, key: "typeC.c3.total", read: (ctx) => c3(ctx).total },
    { cell: `${TC}!B75`, key: "typeC.c3.rawMean", read: (ctx) => c3(ctx).rawMean },
    { cell: `${TC}!B76`, key: "typeC.c3.band1Check", read: (ctx) => c3(ctx).band1Check },
    {
      cell: `${TC}!B80`,
      key: "typeC.c5.responseRate",
      read: (ctx) => ctx.result.typeC.c5.responseRate,
    },
    { cell: `${TC}!A81`, key: "typeC.c5.rateFlag", read: (ctx) => ctx.result.typeC.c5.rateFlag },
    { cell: `${TC}!B82`, key: "typeC.c5.score", read: (ctx) => ctx.result.typeC.c5.score },
  );

  // 11 Output: pass-throughs of what the intake models. A link to a formula cell's "" stays blank;
  // only a link to a typed blank (the excluded Layer 2 cells) would show 0.
  const OUT = SHEET.output;
  cells.push(
    { cell: `${OUT}!B6`, key: "output.c1", read: (ctx) => c1(ctx).score },
    {
      cell: `${OUT}!B20`,
      key: "output.c5",
      read: (ctx) => ctx.result.typeC.c5.score,
    },
    { cell: `${OUT}!B57`, key: "output.lt", read: (ctx) => lt(ctx).score },
    {
      cell: `${OUT}!B58`,
      key: "output.cascade",
      read: (ctx) => ctx.result.typeC.cascade.score,
    },
    {
      cell: `${OUT}!B64`,
      key: "output.informationAccess",
      read: (ctx) => ctx.result.typeC.informationAccess.score,
    },
    {
      cell: `${OUT}!B72`,
      key: "output.processFriction",
      read: (ctx) => ctx.result.typeC.processFriction.mean,
    },
  );
  for (let b = 0; b < 5; b += 1) {
    cells.push({
      cell: `${OUT}!B${15 + b}`,
      key: `output.c3[${b}]`,
      read: (ctx) => c3(ctx).final[b],
    });
  }
  OUTPUT_ITEM_ROWS.forEach(([item, r]) => {
    cells.push({
      cell: `${OUT}!B${r}`,
      key: `output.means.${item}`,
      read: (ctx) => ctx.result.typeA.means[item],
    });
  });
  for (let t = 0; t < OUTPUT_O5_ROWS.count; t += 1) {
    const r = OUTPUT_O5_ROWS.first + t;
    const at = (ctx: Context): TeamO5 | undefined => ctx.result.typeA.teamO5[t];
    cells.push(
      {
        cell: `${OUT}!A${r}`,
        key: `output.o5[${t}].name`,
        read: (ctx) => (at(ctx) === undefined ? undefined : `  ${at(ctx)?.name}`),
      },
      { cell: `${OUT}!B${r}`, key: `output.o5[${t}].score`, read: (ctx) => at(ctx)?.score },
      {
        cell: `${OUT}!C${r}`,
        key: `output.o5[${t}].fte`,
        read: (ctx) => {
          const team = at(ctx);
          if (team === undefined) return undefined;
          // "FTE " & a blank Setup FTE gives "FTE ".
          return `FTE ${team.fte === 0 ? "" : excelText(team.fte)}`;
        },
      },
    );
  }
  return cells;
}

/** A number as Excel's & operator renders it: up to 15 significant digits, no trailing zeros. */
export function excelText(value: number): string {
  return String(Number(value.toPrecision(15)));
}

/** Formula cells the intake does not model, each with the reason. The coverage test accepts these. */
export function excludedCells(): Array<{ pattern: RegExp; reason: string }> {
  return [
    {
      pattern: /^6 Import DLP!/,
      reason:
        "Decision latency is not measured on the online route (Online Measurement Specification 3.5).",
    },
    {
      pattern: /^9 Type C Scoring![A-Z]+(9[7-9]|1[0-9][0-9])$/,
      reason: "M-DLP-PART scoring rows: not on the online route.",
    },
    {
      pattern: /^9 Type C Scoring![A-Z]+(8[7-9]|9[0-2])$/,
      reason:
        "M-C2-KDS rows: online, C2 comes from M-C2-MGR (Online Measurement Specification 4.1).",
    },
    {
      pattern: /^11 Output![A-C](8|9|1[0-3])$/,
      reason: "M-C2-KDS pass-throughs: not on the online route.",
    },
    {
      pattern: /^11 Output!B(59|65|66|76|89)$/,
      reason:
        "Layer 2 analyst inputs: online, the checklists and S1 supply these (Online Measurement Specification Part 4, 3.4).",
    },
    {
      pattern: /^11 Output![A-C](10[0-9]|1[1-9][0-9])$/,
      reason: "M-DLP-PART pass-throughs: not on the online route.",
    },
  ];
}
