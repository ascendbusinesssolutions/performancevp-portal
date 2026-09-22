/**
 * The single table relating workbook cells to the engine's input and result.
 *
 * Input cells carry a getter and a setter on `UnitMeasurementInput`, used in both directions:
 * writing a fixture's input into a workbook copy, and reading a workbook's stored inputs (or a
 * scenario's edits) into an input. Formula cells carry a reader on `{ input, result }` that
 * yields the value the cell should hold, so a recalculated workbook can be compared cell by
 * cell. Nothing else in the repository knows a cell address.
 */

import { adjustItem } from "../src/survey";
import { isoToSerial, serialToIso } from "../src/excel";
import {
  CII_ITEMS,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  ROUTE_ROWS,
  SUB_DIMENSION_CODES,
  TSI2_ITEMS,
  TSI3_ITEMS,
  TRIP_WIRE_CODES,
  type ExcelError,
  type ItemCode,
  type SubDimensionCode,
  type UnitMeasurementInput,
  type UnitMeasurementResult,
} from "../src/types";
import { INTERNAL_COMPARISON_TEXT } from "../src/constants";

/** A cell value as the dump tool writes it: number, string, blank, or an Excel error. */
export type CellValue = number | string | undefined | ExcelError;

export type InputKind = "number" | "string" | "date" | "ignored";

export interface InputCell {
  cell: string;
  kind: InputKind;
  /** A readable name for the value, used as a fixture key and in messages. */
  path: string;
  get(input: UnitMeasurementInput): CellValue;
  /** Applies a raw cell value (a serial for dates); undefined clears. */
  set(input: UnitMeasurementInput, value: CellValue): void;
}

export interface OutputCell {
  cell: string;
  /** The fixture key: a result path where one exists, else the cell. */
  key: string;
  read(ctx: { input: UnitMeasurementInput; result: UnitMeasurementResult }): CellValue;
}

const DLP_ROWS = 43;

// ---------------------------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------------------------

type Obj = Record<string, unknown>;

function segments(path: string): (string | number)[] {
  return path.split(".").flatMap((part) => {
    const m = /^([^[]+)\[(\d+)\]$/.exec(part);
    return m ? [m[1] as string, Number(m[2])] : [part];
  });
}

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of segments(path)) {
    if (cur === undefined || cur === null) return undefined;
    cur = (cur as Obj)[String(seg)];
  }
  return cur;
}

function setPath(root: Obj, path: string, value: unknown): void {
  const segs = segments(path);
  let cur: Obj = root;
  for (let i = 0; i < segs.length - 1; i += 1) {
    const seg = String(segs[i]);
    const next = segs[i + 1];
    if (cur[seg] === undefined) {
      if (value === undefined) return;
      cur[seg] = typeof next === "number" ? [] : {};
    }
    cur = cur[seg] as Obj;
  }
  const last = String(segs[segs.length - 1]);
  if (value === undefined) delete cur[last];
  else cur[last] = value;
}

function inputCell(cell: string, path: string, kind: InputKind = "number"): InputCell {
  return {
    cell,
    kind,
    path,
    get(input) {
      const v = getPath(input, path);
      if (v === undefined || v === null) return undefined;
      if (kind === "date") return isoToSerial(v as string);
      return v as CellValue;
    },
    set(input, value) {
      if (kind === "ignored") return;
      if (value === undefined || value === "" || typeof value === "object") {
        setPath(input as unknown as Obj, path, undefined);
        return;
      }
      if (kind === "date") {
        setPath(input as unknown as Obj, path, serialToIso(Number(value)));
        return;
      }
      if (kind === "number") {
        setPath(input as unknown as Obj, path, Number(value));
        return;
      }
      setPath(input as unknown as Obj, path, String(value));
    },
  };
}

function ignoredCell(cell: string, reason: string): InputCell {
  return {
    cell,
    kind: "ignored",
    path: `ignored: ${reason}`,
    get: () => undefined,
    set: () => undefined,
  };
}

function col(letter: string, row: number): string {
  return `${letter}${row}`;
}

// ---------------------------------------------------------------------------------------------
// Input cells
// ---------------------------------------------------------------------------------------------

export function inputCells(): InputCell[] {
  const cells: InputCell[] = [];
  const EM = "Engagement Metadata";
  cells.push(
    inputCell(`${EM}!D11`, "engagement.clientName", "string"),
    inputCell(`${EM}!D12`, "engagement.unitName", "string"),
    inputCell(`${EM}!D13`, "engagement.unitFte"),
    inputCell(`${EM}!D14`, "engagement.sector", "string"),
    inputCell(`${EM}!D15`, "engagement.subSector", "string"),
    inputCell(`${EM}!D16`, "engagement.sizeBand", "string"),
    inputCell(`${EM}!D17`, "engagement.unitType", "string"),
    inputCell(`${EM}!D18`, "engagement.archetype", "string"),
    inputCell(`${EM}!D19`, "engagement.engagementDate", "date"),
    inputCell(`${EM}!D20`, "engagement.leadAnalyst", "string"),
    inputCell(`${EM}!D21`, "engagement.diagnosticReference", "string"),
  );

  const TA = "Tier Assignment";
  ROUTE_ROWS.forEach((row, i) => {
    const r = 5 + i;
    cells.push(
      inputCell(`${TA}!B${r}`, `routes.${row}.tier`, "string"),
      inputCell(`${TA}!C${r}`, `routes.${row}.source`, "string"),
      inputCell(`${TA}!D${r}`, `routes.${row}.vintage`, "date"),
      inputCell(`${TA}!F${r}`, `routes.${row}.notes`, "string"),
    );
  });

  const CI = "Capability Inputs";
  for (let i = 0; i < 3; i += 1) {
    const r = 7 + i;
    cells.push(
      inputCell(`${CI}!A${r}`, `capability.c1.families[${i}].name`, "string"),
      inputCell(`${CI}!B${r}`, `capability.c1.families[${i}].fte`),
      inputCell(`${CI}!C${r}`, `capability.c1.families[${i}].skillsRequired`),
      inputCell(`${CI}!D${r}`, `capability.c1.families[${i}].confirmedProficiencies`),
    );
  }
  cells.push(
    inputCell(`${CI}!D10`, "capability.c1.medianTenureMonths"),
    inputCell(`${CI}!D13`, "capability.c1.moduleScore"),
  );
  for (let i = 0; i < 4; i += 1) {
    const r = 19 + i;
    cells.push(
      inputCell(`${CI}!A${r}`, `capability.c2.domains[${i}].name`, "string"),
      inputCell(`${CI}!B${r}`, `capability.c2.domains[${i}].criticality`),
      inputCell(`${CI}!C${r}`, `capability.c2.domains[${i}].meanScore`),
      inputCell(`${CI}!D${r}`, `capability.c2.domains[${i}].coverage`),
    );
  }
  (["band5", "band4", "band3", "band2", "band1"] as const).forEach((band, i) => {
    cells.push(inputCell(`${CI}!B${28 + i}`, `capability.c3.${band}`));
  });
  CII_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${CI}!B${37 + i}`, `capability.c4.items.${item}`)),
  );
  cells.push(
    inputCell(`${CI}!B52`, "capability.c4.responseRate"),
    inputCell(`${CI}!B59`, "capability.c5.timeToCompetence"),
    inputCell(`${CI}!B60`, "capability.c5.adoption"),
    inputCell(`${CI}!B61`, "capability.c5.cycleImprovement"),
    inputCell(`${CI}!B62`, "capability.c5.moduleScore"),
  );

  const MI = "Motivation Inputs";
  cells.push(inputCell(`${MI}!D5`, "motivation.m1.platformComposite"));
  MI1_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${MI}!B${8 + i}`, `motivation.m1.items.${item}`)),
  );
  cells.push(inputCell(`${MI}!B16`, "motivation.m1.responseRate"));
  MI2_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${MI}!B${23 + i}`, `motivation.m2.items.${item}`)),
  );
  cells.push(inputCell(`${MI}!B28`, "motivation.m2.responseRate"));
  MI3_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${MI}!B${33 + i}`, `motivation.m3.items.${item}`)),
  );
  cells.push(inputCell(`${MI}!B38`, "motivation.m3.responseRate"));
  MI4_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${MI}!B${43 + i}`, `motivation.m4.items.${item}`)),
  );
  cells.push(inputCell(`${MI}!B47`, "motivation.m4.responseRate"));
  TRIP_WIRE_CODES.forEach((code, i) =>
    cells.push(inputCell(`${MI}!B${52 + i}`, `motivation.tripWires.${code}`)),
  );

  const OI = "Opportunity Inputs";
  cells.push(
    inputCell(`${OI}!D5`, "opportunity.o1.decisionRightsScore"),
    inputCell(`${OI}!D6`, "opportunity.o1.roleArchitectureScore"),
    inputCell(`${OI}!D7`, "opportunity.o1.cascadeScore"),
  );
  OI1_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${OI}!B${11 + i}`, `opportunity.o1.items.${item}`)),
  );
  cells.push(
    inputCell(`${OI}!B19`, "opportunity.o1.responseRate"),
    inputCell(`${OI}!D26`, "opportunity.o2.toolInventoryScore"),
    inputCell(`${OI}!D27`, "opportunity.o2.informationAccessScore"),
    inputCell(`${OI}!D28`, "opportunity.o2.integrationScore"),
  );
  OI2_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${OI}!B${32 + i}`, `opportunity.o2.items.${item}`)),
  );
  cells.push(
    inputCell(`${OI}!B36`, "opportunity.o2.responseRate"),
    inputCell(`${OI}!D43`, "opportunity.o3.processFrictionScore"),
  );
  OI3_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${OI}!B${47 + i}`, `opportunity.o3.items.${item}`)),
  );
  cells.push(
    inputCell(`${OI}!B52`, "opportunity.o3.responseRate"),
    inputCell(`${OI}!D59`, "opportunity.o4.capacityAnalysisScore"),
  );
  OI4_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${OI}!B${62 + i}`, `opportunity.o4.items.${item}`)),
  );
  cells.push(inputCell(`${OI}!B65`, "opportunity.o4.responseRate"));
  for (let i = 0; i < 4; i += 1) {
    const r = 71 + i;
    cells.push(
      inputCell(`${OI}!A${r}`, `opportunity.o5.teams[${i}].name`, "string"),
      inputCell(`${OI}!B${r}`, `opportunity.o5.teams[${i}].fte`),
      inputCell(`${OI}!C${r}`, `opportunity.o5.teams[${i}].score`),
    );
  }

  const SI = "Synergy Inputs";
  cells.push(
    inputCell(`${SI}!D5`, "synergy.s1.coverageBreadth"),
    inputCell(`${SI}!D6`, "synergy.s1.coverageDepth"),
    inputCell(`${SI}!D7`, "synergy.s1.distribution"),
    inputCell(`${SI}!B12`, "synergy.s2.telemetry.meetingHoursPerIc"),
    inputCell(`${SI}!B13`, "synergy.s2.telemetry.meetingHoursPerManager"),
    inputCell(`${SI}!B14`, "synergy.s2.telemetry.fragmentedTimeRatio"),
    inputCell(`${SI}!B15`, "synergy.s2.telemetry.afterHoursHours"),
  );
  TSI2_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${SI}!B${19 + i}`, `synergy.s2.items.${item}`)),
  );
  cells.push(inputCell(`${SI}!B22`, "synergy.s2.responseRate"));
  TSI3_ITEMS.forEach((item, i) =>
    cells.push(inputCell(`${SI}!B${30 + i}`, `synergy.s3.items.${item}`)),
  );
  cells.push(inputCell(`${SI}!B35`, "synergy.s3.responseRate"));

  for (let i = 0; i < DLP_ROWS; i += 1) {
    const r = 5 + i;
    cells.push(
      inputCell(`DLP!A${r}`, `dlp.decisions[${i}].id`, "string"),
      inputCell(`DLP!B${r}`, `dlp.decisions[${i}].class`, "string"),
      inputCell(`DLP!C${r}`, `dlp.decisions[${i}].latencyDays`),
      inputCell(`DLP!G${r}`, `dlp.decisions[${i}].description`, "string"),
    );
  }

  const BT = "Behavioural Triangulators";
  (["voluntaryTurnover", "unplannedAbsence", "enps", "goalAchievement"] as const).forEach(
    (key, i) => {
      cells.push(
        ignoredCell(
          `${BT}!B${5 + i}`,
          "raw triangulator value shown for reference; the converted score in column C is the input",
        ),
        inputCell(`${BT}!C${5 + i}`, `behaviouralTriangulators.${key}`),
      );
    },
  );

  cells.push(inputCell("Analyst Evidence!C13", "analystEvidence.nonStandardDefinitions", "string"));
  return cells;
}

// ---------------------------------------------------------------------------------------------
// Formula cells
// ---------------------------------------------------------------------------------------------

type Ctx = { input: UnitMeasurementInput; result: UnitMeasurementResult };

function out(cell: string, key: string, read: (ctx: Ctx) => CellValue): OutputCell {
  return { cell, key, read };
}
/** A cell whose fixture key is the cell itself: a helper column with no result field of its own. */
function helper(cell: string, read: (ctx: Ctx) => CellValue): OutputCell {
  return { cell, key: cell, read };
}

function adjusted(
  sheet: string,
  firstRow: number,
  items: readonly ItemCode[],
  means: (input: UnitMeasurementInput) => Partial<Record<string, number>> | undefined,
): OutputCell[] {
  return items.map((item, i) =>
    helper(`${sheet}!C${firstRow + i}`, ({ input }) => adjustItem(item, means(input)?.[item])),
  );
}

const SCORE_CELL: Record<SubDimensionCode, string> = {
  C1: "Capability Inputs!D15",
  C2: "Capability Inputs!D24",
  C3: "Capability Inputs!D33",
  C4: "Capability Inputs!D56",
  C5: "Capability Inputs!D63",
  M1: "Motivation Inputs!D19",
  M2: "Motivation Inputs!D29",
  M3: "Motivation Inputs!D39",
  M4: "Motivation Inputs!D48",
  O1: "Opportunity Inputs!D23",
  O2: "Opportunity Inputs!D40",
  O3: "Opportunity Inputs!D56",
  O4: "Opportunity Inputs!D67",
  O5: "Opportunity Inputs!D75",
  S1: "Synergy Inputs!D8",
  S2: "Synergy Inputs!D26",
  S3: "Synergy Inputs!D36",
};
/** Composite Scoring rows 6 to 25 and Report Data rows 14 to 30 for the seventeen sub-dimensions, in sheet order. */
const COMPOSITE_ROW: Record<SubDimensionCode, number> = {
  C1: 6,
  C2: 7,
  C3: 8,
  C4: 9,
  C5: 10,
  M1: 12,
  M2: 13,
  M3: 14,
  M4: 15,
  O1: 17,
  O2: 18,
  O3: 19,
  O4: 20,
  O5: 21,
  S1: 23,
  S2: 24,
  S3: 25,
};
/** Tier Assignment row of each route row's confidence cell mirrored in Report Data E14:E30. */
const TIER_ROW: Record<SubDimensionCode, number> = {
  C1: 5,
  C2: 6,
  C3: 7,
  C4: 8,
  C5: 9,
  M1: 10,
  M2: 11,
  M3: 12,
  M4: 13,
  O1: 17,
  O2: 18,
  O3: 19,
  O4: 20,
  O5: 21,
  S1: 22,
  S2: 23,
  S3: 24,
};

const dateSerial = (iso: string | undefined): CellValue =>
  iso === undefined ? undefined : isoToSerial(iso);
/**
 * Sector Classification C4:C11 and Methodology Footer C6 and C8 are unguarded references
 * (='Engagement Metadata'!D11 and so on), which Excel shows as 0 when the source is empty. The
 * engine keeps a blank blank; the map applies Excel's rendering for the comparison.
 */
const zeroWhenBlank = (v: CellValue): CellValue => (v === undefined ? 0 : v);

export function outputCells(): OutputCell[] {
  const cells: OutputCell[] = [];
  const CI = "Capability Inputs";
  for (let i = 0; i < 3; i += 1) {
    const r = 7 + i;
    const fam = (ctx: Ctx) => ctx.result.capability.c1.families[i];
    cells.push(
      out(
        `${CI}!E${r}`,
        `capability.c1.families[${i}].coverageRatio`,
        (c) => fam(c)?.coverageRatio,
      ),
      out(`${CI}!F${r}`, `capability.c1.families[${i}].familyScore`, (c) => fam(c)?.familyScore),
      out(`${CI}!G${r}`, `capability.c1.families[${i}].fteValid`, (c) => fam(c)?.fteValid ?? 0),
      out(
        `${CI}!H${r}`,
        `capability.c1.families[${i}].contribution`,
        (c) => fam(c)?.contribution ?? 0,
      ),
    );
  }
  cells.push(
    out(
      `${CI}!D11`,
      "capability.c1.tenureModerator",
      (c) => c.result.capability.c1.tenureModerator,
    ),
    out(`${CI}!D12`, "capability.c1.tier12Score", (c) => c.result.capability.c1.tier12Score),
  );
  for (let i = 0; i < 4; i += 1) {
    const r = 19 + i;
    const dom = (ctx: Ctx) => ctx.result.capability.c2.domains[i];
    cells.push(
      out(
        `${CI}!E${r}`,
        `capability.c2.domains[${i}].coverageAdjusted`,
        (c) => dom(c)?.coverageAdjusted ?? 0,
      ),
      out(
        `${CI}!F${r}`,
        `capability.c2.domains[${i}].criticalityValid`,
        (c) => dom(c)?.criticalityValid ?? 0,
      ),
      out(`${CI}!G${r}`, `capability.c2.domains[${i}].weighted`, (c) => dom(c)?.weighted ?? 0),
    );
  }
  cells.push(
    out(`${CI}!D23`, "capability.c2.coverageCheck", (c) => c.result.capability.c2.coverageCheck),
  );
  (["band5", "band4", "band3", "band2", "band1"] as const).forEach((band, i) => {
    cells.push(
      out(
        `${CI}!D${28 + i}`,
        `capability.c3.bandShares.${band}`,
        (c) => c.result.capability.c3.bandShares[band],
      ),
    );
  });
  cells.push(...adjusted(CI, 37, CII_ITEMS, (input) => input.capability?.c4?.items));
  cells.push(
    out(`${CI}!B53`, "capability.c4.clarity", (c) => c.result.capability.c4.clarity),
    out(`${CI}!B54`, "capability.c4.trust", (c) => c.result.capability.c4.trust),
    out(`${CI}!B55`, "capability.c4.flow", (c) => c.result.capability.c4.flow),
  );

  const MI = "Motivation Inputs";
  cells.push(...adjusted(MI, 8, MI1_ITEMS, (input) => input.motivation?.m1?.items));
  cells.push(
    out(`${MI}!D17`, "motivation.m1.tier3Score", (c) => c.result.motivation.m1.tier3Score),
  );
  cells.push(...adjusted(MI, 23, MI2_ITEMS, (input) => input.motivation?.m2?.items));
  cells.push(...adjusted(MI, 33, MI3_ITEMS, (input) => input.motivation?.m3?.items));
  cells.push(...adjusted(MI, 43, MI4_ITEMS, (input) => input.motivation?.m4?.items));
  TRIP_WIRE_CODES.forEach((code, i) => {
    cells.push(
      out(
        `${MI}!C${52 + i}`,
        `motivation.tripWires.${code}.score`,
        (c) => c.result.motivation.tripWires[code].score,
      ),
      out(
        `${MI}!D${52 + i}`,
        `motivation.tripWires.${code}.flag`,
        (c) => c.result.motivation.tripWires[code].flag,
      ),
    );
  });

  const OI = "Opportunity Inputs";
  const layer = (
    name: "o1" | "o2" | "o3",
    structural: number,
    perception: number,
    gap: number,
    flag: number,
  ) => {
    cells.push(
      out(
        `${OI}!D${structural}`,
        `opportunity.${name}.structural`,
        (c) => c.result.opportunity[name].structural,
      ),
      out(
        `${OI}!D${perception}`,
        `opportunity.${name}.perception`,
        (c) => c.result.opportunity[name].perception,
      ),
      out(`${OI}!D${gap}`, `opportunity.${name}.gap`, (c) => c.result.opportunity[name].gap),
      out(
        `${OI}!D${flag}`,
        `opportunity.${name}.gapFlag`,
        (c) => c.result.opportunity[name].gapFlag,
      ),
    );
  };
  layer("o1", 8, 20, 21, 22);
  cells.push(...adjusted(OI, 11, OI1_ITEMS, (input) => input.opportunity?.o1?.items));
  layer("o2", 29, 37, 38, 39);
  cells.push(...adjusted(OI, 32, OI2_ITEMS, (input) => input.opportunity?.o2?.items));
  layer("o3", 44, 53, 54, 55);
  cells.push(...adjusted(OI, 47, OI3_ITEMS, (input) => input.opportunity?.o3?.items));
  cells.push(...adjusted(OI, 62, OI4_ITEMS, (input) => input.opportunity?.o4?.items));
  cells.push(
    out(`${OI}!D66`, "opportunity.o4.perception", (c) => c.result.opportunity.o4.perception),
  );
  for (let i = 0; i < 4; i += 1) {
    cells.push(
      out(
        `${OI}!D${71 + i}`,
        `opportunity.o5.contributions[${i}]`,
        (c) => c.result.opportunity.o5.contributions[i] ?? 0,
      ),
    );
  }

  const SI = "Synergy Inputs";
  (
    [
      "meetingHoursPerIc",
      "meetingHoursPerManager",
      "fragmentedTimeRatio",
      "afterHoursHours",
    ] as const
  ).forEach((key, i) => {
    cells.push(
      out(
        `${SI}!C${12 + i}`,
        `synergy.s2.telemetryConverted.${key}`,
        (c) => c.result.synergy.s2.telemetryConverted[key],
      ),
    );
  });
  cells.push(
    out(
      `${SI}!C16`,
      "synergy.s2.behaviouralComposite",
      (c) => c.result.synergy.s2.behaviouralComposite,
    ),
  );
  cells.push(...adjusted(SI, 19, TSI2_ITEMS, (input) => input.synergy?.s2?.items));
  cells.push(
    out(`${SI}!D23`, "synergy.s2.perception", (c) => c.result.synergy.s2.perception),
    out(`${SI}!D24`, "synergy.s2.gap", (c) => c.result.synergy.s2.gap),
    out(`${SI}!D25`, "synergy.s2.gapFlag", (c) => c.result.synergy.s2.gapFlag),
  );
  cells.push(...adjusted(SI, 30, TSI3_ITEMS, (input) => input.synergy?.s3?.items));
  cells.push(
    out(
      `${SI}!D37`,
      "synergy.s3.falseConsensusFlag",
      (c) => c.result.synergy.s3.falseConsensusFlag,
    ),
  );

  for (const code of SUB_DIMENSION_CODES) {
    cells.push(
      out(
        SCORE_CELL[code],
        `subDimensions.${code}.score`,
        (c) => c.result.subDimensions[code].score,
      ),
    );
  }

  ROUTE_ROWS.forEach((row, i) => {
    cells.push(
      out(`Tier Assignment!E${5 + i}`, `confidence.${row}`, (c) => c.result.confidence[row]),
    );
  });

  const BT = "Behavioural Triangulators";
  cells.push(
    out(`${BT}!C9`, "triangulators.composite", (c) => c.result.triangulators.composite),
    out(`${BT}!C10`, "triangulators.m1Gap", (c) => c.result.triangulators.m1Gap),
    out(`${BT}!C11`, "triangulators.m1GapFlag", (c) => c.result.triangulators.m1GapFlag),
  );

  const SC = "Sector Classification";
  cells.push(
    helper(`${SC}!C4`, (c) => zeroWhenBlank(c.input.engagement.clientName)),
    helper(`${SC}!C5`, (c) => zeroWhenBlank(c.input.engagement.unitName)),
    helper(`${SC}!C6`, (c) => zeroWhenBlank(c.input.engagement.unitFte)),
    helper(`${SC}!C7`, (c) => zeroWhenBlank(c.input.engagement.sector)),
    helper(`${SC}!C8`, (c) => zeroWhenBlank(c.input.engagement.subSector)),
    helper(`${SC}!C9`, (c) => zeroWhenBlank(c.input.engagement.sizeBand)),
    helper(`${SC}!C10`, (c) => zeroWhenBlank(c.input.engagement.unitType)),
    helper(`${SC}!C11`, (c) => zeroWhenBlank(dateSerial(c.input.engagement.engagementDate))),
  );

  for (let i = 0; i < DLP_ROWS; i += 1) {
    cells.push(
      out(
        `DLP!D${5 + i}`,
        `dlp.decisions[${i}].latencyScore`,
        (c) => c.result.dlp.decisions[i]?.latencyScore,
      ),
    );
  }
  (["operational", "tactical", "strategic"] as const).forEach((key, i) => {
    const r = 49 + i;
    cells.push(
      out(`DLP!B${r}`, `dlp.${key}.dls`, (c) => c.result.dlp[key].dls),
      out(`DLP!D${r}`, `dlp.${key}.sample`, (c) => c.result.dlp[key].sample),
      out(`DLP!E${r}`, `dlp.${key}.warning`, (c) => c.result.dlp[key].warning),
    );
  });
  cells.push(out("DLP!B52", "dlp.overall", (c) => c.result.dlp.overall));

  const CS = "Composite Scoring";
  for (const code of SUB_DIMENSION_CODES) {
    const r = COMPOSITE_ROW[code];
    const sd = (ctx: Ctx) => ctx.result.subDimensions[code];
    cells.push(
      helper(`${CS}!B${r}`, (c) => sd(c).score),
      out(`${CS}!C${r}`, `subDimensions.${code}.weight`, (c) => sd(c).weight),
      out(`${CS}!D${r}`, `subDimensions.${code}.available`, (c) => (sd(c).available ? 1 : 0)),
      helper(`${CS}!E${r}`, (c) => (sd(c).available ? (sd(c).score as number) * sd(c).weight : 0)),
      helper(`${CS}!F${r}`, (c) => sd(c).weight * (sd(c).available ? 1 : 0)),
    );
  }
  const RANK_COLUMNS = ["K", "L", "M", "N", "O", "P", "Q", "R", "S"] as const;
  const RANK_FIELDS = [
    "score",
    "normalisedWeight",
    "componentScore",
    "exponent",
    "deltaS",
    "deltaP",
    "rel",
    "priority",
    "sortKey",
  ] as const;
  for (let i = 0; i < 14; i += 1) {
    RANK_COLUMNS.forEach((column, j) => {
      const field = RANK_FIELDS[j] as (typeof RANK_FIELDS)[number];
      cells.push(
        out(
          `${CS}!${column}${5 + i}`,
          `ranking.rows[${i}].${field}`,
          (c) => c.result.ranking.rows[i]?.[field],
        ),
      );
    });
  }
  cells.push(
    out(`${CS}!B27`, "components.C", (c) => c.result.components.C),
    out(`${CS}!B28`, "components.M", (c) => c.result.components.M),
    out(`${CS}!B29`, "components.O", (c) => c.result.components.O),
    out(`${CS}!B30`, "components.sInternal", (c) => c.result.components.sInternal),
    out(`${CS}!B31`, "components.S", (c) => c.result.components.S),
    out(`${CS}!B32`, "components.P", (c) => c.result.components.P),
  );
  for (let i = 0; i < 6; i += 1) {
    const r = 36 + i;
    const row = (ctx: Ctx) => ctx.result.ranking.topSix[i];
    cells.push(
      out(`${CS}!B${r}`, `ranking.topSix[${i}].component`, (c) => row(c)?.component),
      out(`${CS}!C${r}`, `ranking.topSix[${i}].label`, (c) => row(c)?.label),
      out(`${CS}!D${r}`, `ranking.topSix[${i}].rawScore`, (c) => row(c)?.rawScore),
      out(`${CS}!E${r}`, `ranking.topSix[${i}].realisticPGain`, (c) => row(c)?.realisticPGain),
      out(`${CS}!F${r}`, `ranking.topSix[${i}].priority`, (c) => row(c)?.priority),
    );
  }
  cells.push(
    out(`${CS}!B44`, "ranking.bindingComponent", (c) => c.result.ranking.bindingComponent),
    out(`${CS}!B45`, "ranking.statement", (c) => c.result.ranking.statement),
    out(`${CS}!B46`, "ranking.tripWireOverride", (c) => c.result.ranking.tripWireOverride),
    out(`${CS}!B49`, "validation.sInRange", (c) => c.result.validation.sInRange),
    out(`${CS}!B50`, "validation.pTypical", (c) => c.result.validation.pTypical),
    out(`${CS}!B51`, "validation.pConfidence", (c) => c.result.validation.pConfidence),
  );

  const MF = "Methodology Footer";
  const m = (ctx: Ctx) => ctx.result.methodology;
  cells.push(
    out(`${MF}!C5`, "methodology.clientUnit", (c) => m(c).clientUnit),
    out(`${MF}!C6`, "methodology.unitFte", (c) => zeroWhenBlank(m(c).unitFte)),
    out(`${MF}!C7`, "methodology.archetype", (c) => m(c).archetype),
    out(`${MF}!C8`, "methodology.engagementDate", (c) =>
      zeroWhenBlank(dateSerial(m(c).engagementDate)),
    ),
    out(`${MF}!C10`, "methodology.tier1Count", (c) => m(c).tier1Count),
    out(`${MF}!C11`, "methodology.tier2Count", (c) => m(c).tier2Count),
    out(`${MF}!C12`, "methodology.tier3Count", (c) => m(c).tier3Count),
    out(`${MF}!C13`, "methodology.tierMixRating", (c) => m(c).tierMixRating),
    out(`${MF}!C15`, "methodology.pConfidence", (c) => m(c).pConfidence),
    out(
      `${MF}!C17`,
      "methodology.gapFlags.m1SurveyBehavioural",
      (c) => m(c).gapFlags.m1SurveyBehavioural,
    ),
    out(`${MF}!C18`, "methodology.gapFlags.falseConsensus", (c) => m(c).gapFlags.falseConsensus),
    out(
      `${MF}!C19`,
      "methodology.gapFlags.s2TelemetryPerception",
      (c) => m(c).gapFlags.s2TelemetryPerception,
    ),
    out(`${MF}!C20`, "methodology.gapFlags.o1", (c) => m(c).gapFlags.o1),
    out(`${MF}!C21`, "methodology.gapFlags.o2", (c) => m(c).gapFlags.o2),
    out(`${MF}!C22`, "methodology.gapFlags.o3", (c) => m(c).gapFlags.o3),
    out(`${MF}!C24`, "methodology.criticalFindings", (c) => m(c).criticalFindings),
    out(`${MF}!C25`, "methodology.internalComparison", () => INTERNAL_COMPARISON_TEXT),
  );
  (["C4", "M1", "M2", "M3", "M4", "O1", "O2", "O3", "O4", "S2", "S3"] as const).forEach(
    (key, i) => {
      cells.push(
        out(`${MF}!C${29 + i}`, `methodology.responseRates.${key}`, (c) => m(c).responseRates[key]),
      );
    },
  );
  cells.push(
    out(`${MF}!C41`, "methodology.exclusionsSummary", (c) => m(c).exclusionsSummary),
    out(`${MF}!C43`, "methodology.nonStandardDefinitions", (c) => m(c).nonStandardDefinitions),
  );

  const RD = "Report Data";
  const rd = (ctx: Ctx) => ctx.result.reportData;
  cells.push(
    helper(`${RD}!C5`, (c) => c.result.components.P),
    out(`${RD}!D5`, "reportData.pBand", (c) => rd(c).pBand),
    helper(`${RD}!C6`, (c) => c.result.validation.pConfidence),
    helper(`${RD}!C7`, (c) => c.result.components.C),
    out(`${RD}!D7`, "reportData.cBand", (c) => rd(c).cBand),
    helper(`${RD}!C8`, (c) => c.result.components.M),
    out(`${RD}!D8`, "reportData.mBand", (c) => rd(c).mBand),
    helper(`${RD}!C9`, (c) => c.result.components.O),
    out(`${RD}!D9`, "reportData.oBand", (c) => rd(c).oBand),
    helper(`${RD}!C10`, (c) => c.result.components.S),
    helper(`${RD}!C11`, (c) => c.result.ranking.statement),
    out(`${RD}!C12`, "reportData.tripWireOverride", (c) => rd(c).tripWireOverride),
  );
  SUB_DIMENSION_CODES.forEach((code, i) => {
    const r = 14 + i;
    void TIER_ROW;
    cells.push(
      helper(`${RD}!C${r}`, (c) => c.result.subDimensions[code].score),
      out(`${RD}!D${r}`, `subDimensions.${code}.band`, (c) => c.result.subDimensions[code].band),
      helper(`${RD}!E${r}`, (c) => c.result.subDimensions[code].confidence),
    );
  });
  cells.push(
    helper(`${RD}!C32`, (c) => c.result.dlp.overall),
    helper(`${RD}!C33`, (c) => c.result.dlp.operational.dls),
    helper(`${RD}!C34`, (c) => c.result.dlp.tactical.dls),
    helper(`${RD}!C35`, (c) => c.result.dlp.strategic.dls),
  );
  TRIP_WIRE_CODES.forEach((code, i) => {
    cells.push(
      helper(`${RD}!C${37 + i}`, (c) => c.result.motivation.tripWires[code].score),
      helper(`${RD}!D${37 + i}`, (c) => c.result.motivation.tripWires[code].flag),
    );
  });
  cells.push(
    helper(`${RD}!C42`, (c) => c.result.components.sInternal),
    helper(`${RD}!C45`, (c) => c.result.capability.c4.clarity),
    helper(`${RD}!C46`, (c) => c.result.capability.c4.trust),
    helper(`${RD}!C47`, (c) => c.result.capability.c4.flow),
  );
  (["o1", "o2", "o3"] as const).forEach((name, i) => {
    const r = 51 + i;
    cells.push(
      helper(`${RD}!B${r}`, (c) => c.result.opportunity[name].structural),
      helper(`${RD}!C${r}`, (c) => c.result.opportunity[name].perception),
      helper(`${RD}!D${r}`, (c) => c.result.opportunity[name].gap),
      helper(`${RD}!E${r}`, (c) => c.result.opportunity[name].gapFlag),
    );
  });
  cells.push(helper(`${RD}!C56`, (c) => c.result.ranking.bindingComponent));
  for (let i = 0; i < 6; i += 1) {
    const r = 60 + i;
    const row = (ctx: Ctx) => ctx.result.ranking.topSix[i];
    cells.push(
      helper(`${RD}!A${r}`, () => i + 1),
      helper(`${RD}!B${r}`, (c) => row(c)?.component),
      helper(`${RD}!C${r}`, (c) => row(c)?.label),
      helper(`${RD}!D${r}`, (c) => row(c)?.rawScore),
      helper(`${RD}!E${r}`, (c) => row(c)?.realisticPGain),
      helper(`${RD}!F${r}`, (c) => row(c)?.priority),
    );
  }
  cells.push(
    helper(`${RD}!C68`, (c) => c.result.opportunity.o1.gapFlag),
    helper(`${RD}!C69`, (c) => c.result.opportunity.o2.gapFlag),
    helper(`${RD}!C70`, (c) => c.result.opportunity.o3.gapFlag),
    helper(`${RD}!C71`, (c) => c.result.triangulators.m1GapFlag),
    helper(`${RD}!C72`, (c) => c.result.synergy.s3.falseConsensusFlag),
    helper(`${RD}!C73`, (c) => c.result.methodology.criticalFindings),
    out(`${RD}!C76`, "dlp.sampleN", (c) => c.result.dlp.sampleN),
  );
  for (let i = 0; i < 5; i += 1) {
    const r = 80 + i;
    const d = (ctx: Ctx) => ctx.result.dlp.longestFive[i];
    cells.push(
      out(`${RD}!B${r}`, `dlp.longestFive[${i}].class`, (c) => d(c)?.class),
      out(`${RD}!C${r}`, `dlp.longestFive[${i}].description`, (c) => d(c)?.description),
      out(`${RD}!D${r}`, `dlp.longestFive[${i}].latencyDays`, (c) => d(c)?.latencyDays),
    );
  }
  const e = (ctx: Ctx) => ctx.input.engagement;
  cells.push(
    helper(`${RD}!C87`, (c) => e(c).clientName),
    helper(`${RD}!C88`, (c) => e(c).unitName),
    helper(`${RD}!C89`, (c) => e(c).unitFte),
    helper(`${RD}!C90`, (c) => e(c).sector),
    helper(`${RD}!C91`, (c) => e(c).subSector),
    helper(`${RD}!C92`, (c) => e(c).sizeBand),
    helper(`${RD}!C93`, (c) => e(c).unitType),
    helper(`${RD}!C94`, (c) => e(c).archetype),
    helper(`${RD}!C95`, (c) => dateSerial(e(c).engagementDate)),
    helper(`${RD}!C96`, (c) => e(c).leadAnalyst),
    helper(`${RD}!C97`, (c) => e(c).diagnosticReference),
    out(`${RD}!A101`, "reportData.comparisonRow.unit", (c) => rd(c).comparisonRow.unit),
    helper(`${RD}!B101`, (c) => rd(c).comparisonRow.P),
    helper(`${RD}!C101`, (c) => rd(c).comparisonRow.pBand),
    helper(`${RD}!D101`, (c) => rd(c).comparisonRow.C),
    helper(`${RD}!E101`, (c) => rd(c).comparisonRow.M),
    helper(`${RD}!F101`, (c) => rd(c).comparisonRow.O),
    helper(`${RD}!G101`, (c) => rd(c).comparisonRow.S),
    out(
      `${RD}!H101`,
      "reportData.comparisonRow.topBindingSubDimension",
      (c) => rd(c).comparisonRow.topBindingSubDimension,
    ),
  );
  return cells;
}

/** The six formula cells a scenario may replace with a constant, and the override each maps to. */
export const LAYER_OVERRIDE_CELLS: Record<
  string,
  keyof NonNullable<import("../src/evaluate").Overrides["layers"]>
> = {
  "Opportunity Inputs!D8": "o1Structural",
  "Opportunity Inputs!D20": "o1Perception",
  "Opportunity Inputs!D29": "o2Structural",
  "Opportunity Inputs!D37": "o2Perception",
  "Opportunity Inputs!D44": "o3Structural",
  "Opportunity Inputs!D53": "o3Perception",
};

/** The seventeen score cells a projection replaces, keyed by cell. */
export const SCORE_OVERRIDE_CELLS: Record<string, SubDimensionCode> = Object.fromEntries(
  SUB_DIMENSION_CODES.map((code) => [SCORE_CELL[code], code]),
) as Record<string, SubDimensionCode>;

export const WORKBOOK_ROW_CAPACITY = {
  families: 3,
  domains: 4,
  teams: 4,
  decisions: DLP_ROWS,
} as const;

export { col };
