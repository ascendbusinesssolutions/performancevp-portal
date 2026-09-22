/**
 * The intake end to end: the workbook mirror, the online-only rules, the thresholds, and the
 * engine input with its routes. Every measured sub-dimension travels as Tier 3 with the campaign
 * close as its vintage; a sub-dimension the campaign did not deploy is carried forward from the
 * prior cycle with its original date; one that was deployed but fell below its threshold enters
 * as "Insufficient data" so the engine reallocates its weight. Nothing here names a person.
 */

import type {
  C1Inputs,
  C2Inputs,
  C3Inputs,
  CapabilityInputs,
  CiiItem,
  ItemCode,
  MotivationInputs,
  OpportunityInputs,
  RouteAssignment,
  RouteRow,
  SubDimensionCode,
  SynergyInputs,
  UnitMeasurementInput,
} from "@performancevp/engine";

import {
  scoreAdmO1,
  scoreAdmO2,
  scoreAdmO4,
  type AdmO1Result,
  type AdmO2Result,
  type AdmO4Result,
} from "./checklists";
import {
  evaluateFormalRatings,
  selectC3Route,
  type C3Selection,
  type FormalRatingsResult,
} from "./c3-route";
import { THRESHOLDS, TW_TO_ENGINE } from "./constants";
import { headcounts, sumFte, unitFte } from "./directory";
import { ge, isNumber, type Cell } from "./excel";
import { c3Adjustments, ratingDeduction } from "./guard";
import { scoreC2, type C2Result } from "./modules/c2-mgr";
import { scoreC5, type C5Result } from "./modules/c5-tl";
import { scoreS1, type S1Result } from "./s1";
import { screenResponses, type ScreenedRows } from "./screening";
import { applyTeamRules, type UnitTeamResult } from "./team-rules";
import { medianTenureMonths } from "./tenure";
import {
  anonymityFloor,
  blockStatuses,
  insufficient,
  notDeployed,
  rateStatus,
  reported,
  tripWireStatuses,
  type BlockStatus,
} from "./thresholds";
import {
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  TSI2_ITEMS,
  TSI3_ITEMS,
  type Adjustment,
  type C3RouteRecord,
  type InstrumentResult,
  type IntakeInput,
  type TeamLeaderResponse,
  type TwItem,
} from "./types";
import { runSurveyWorkbook, type SurveyWorkbookResult } from "./workbook";

/** Everything the assembly computed, for the result, the aggregates and the footer. */
export interface Assembly {
  workbook: SurveyWorkbookResult;
  teamLeaderScreening: ScreenedRows<TeamLeaderResponse>;
  blocks: BlockStatus[];
  tripWires: Record<TwItem, InstrumentResult>;
  teams: UnitTeamResult;
  c2: C2Result;
  c5: C5Result;
  s1: S1Result;
  formal: FormalRatingsResult | undefined;
  c3: C3Selection;
  admO1: AdmO1Result;
  admO2: AdmO2Result;
  admO4: AdmO4Result;
  medianTenureMonths: Cell;
  instruments: Record<string, InstrumentResult>;
  /** Per sub-dimension: reported, carried forward, or insufficient, with the reason. */
  subDimensions: Record<SubDimensionCode, SubDimensionStatus>;
  adjustments: Adjustment[];
  c3Route: C3RouteRecord;
  engineInput: UnitMeasurementInput;
}

export interface SubDimensionStatus {
  status: "reported" | "carried-forward" | "insufficient";
  reason: string;
  /** The measurement date the route carries. */
  measuredAt: string | undefined;
}

type Deployed = IntakeInput["campaign"]["deployed"];

function deployedPartAItems(deployed: Deployed): Set<string> {
  return new Set<string>(deployed.partA ?? []);
}

function deployedPartBItems(deployed: Deployed): Set<string> {
  return new Set<string>(deployed.partB?.items ?? []);
}

/** Item means restricted to the deployed items, for one block. */
function pick<K extends ItemCode>(
  means: Partial<Record<string, number>>,
  items: readonly K[],
  deployed: ReadonlySet<string>,
): Partial<Record<K, number>> | undefined {
  const out: Partial<Record<K, number>> = {};
  let any = false;
  for (const item of items) {
    const m = means[item];
    if (deployed.has(item) && isNumber(m)) {
      out[item] = m;
      any = true;
    }
  }
  return any ? out : undefined;
}

export function assemble(input: IntakeInput): Assembly {
  const { campaign, unit, snapshot } = input;
  const deployed = campaign.deployed;
  const counts = headcounts(snapshot);
  const fte = unitFte(snapshot);
  const workbook = runSurveyWorkbook(input);
  const validRows = workbook.screening.members.valid;
  const partA = deployedPartAItems(deployed);
  const partB = deployedPartBItems(deployed);

  // Team leaders: screened online for patterning and speed (no reverse items), then scored.
  const teamLeaderScreening = screenResponses(input.responses?.teamLeaders ?? [], {
    headcount: counts.teamLeaders,
  });
  const c5 = scoreC5(teamLeaderScreening.valid, counts.teamLeaders);

  const blocks = blockStatuses(campaign.cadence, partA, validRows, counts.members);
  const tripWires = tripWireStatuses(campaign.cadence, partA, validRows, counts.members);
  const teams = applyTeamRules(workbook.typeA.teamCii, workbook.typeA.teamO5, validRows, snapshot);

  const managers = deployed.managers;
  const c2 = scoreC2(input.ratings?.knowledge, unit.knowledgeDomains, snapshot);
  const s1 = scoreS1(input.ratings?.skills, unit.roleFamilies, snapshot);
  const formal = evaluateFormalRatings(input.formalRatings, snapshot, campaign.launchDate);
  const ratedForC3 = new Set(
    workbook.typeC.c1.rows.filter((r) => r.band !== undefined).map((r) => r.employeeRef),
  );
  const moduleRatedFte = sumFte(snapshot.members.filter((m) => ratedForC3.has(m.employeeRef)));
  const c3 = selectC3Route(formal, workbook.typeC.c3, moduleRatedFte, snapshot);
  const admO1 = scoreAdmO1(input.checklists?.admO1, unit.roleFamilies, snapshot);
  const admO2 = scoreAdmO2(input.checklists?.admO2);
  const admO4 = scoreAdmO4(input.checklists?.admO4);
  const tenure = medianTenureMonths(snapshot, campaign.launchDate);

  // --- Instrument statuses ------------------------------------------------------------------

  const instruments: Record<string, InstrumentResult> = {};
  const blockOf = (key: BlockStatus["key"]): BlockStatus =>
    blocks.find((b) => b.key === key) as BlockStatus;
  for (const block of blocks) instruments[`Part A ${block.key}`] = block;
  for (const item of ["TW-01", "TW-02", "TW-03"] as const) instruments[item] = tripWires[item];

  const lt = workbook.typeC.leadership;
  instruments["M-O1-LT"] = rateStatus(
    deployed.leadershipTeam === true,
    lt.distinctRespondents,
    lt.responseRate,
    THRESHOLDS.leadership,
    "the leadership team",
    THRESHOLDS.leadershipMinimumRespondents,
  );
  if (instruments["M-O1-LT"].status === "reported" && lt.score === undefined) {
    instruments["M-O1-LT"] = insufficient(
      "No decision type carries both agreement and clarity.",
      lt.distinctRespondents,
      lt.responseRate,
    );
  }

  const partBStatus = (
    key: "CASCADE" | "IA",
    firstItem: string,
    score: Cell,
    rate: Cell,
  ): InstrumentResult => {
    if (!partB.has(firstItem)) return notDeployed();
    const count = validRows.filter((r) =>
      isNumber((r.items as Partial<Record<string, number>>)[firstItem]),
    ).length;
    const decided = rateStatus(
      true,
      count,
      rate,
      THRESHOLDS.allMember,
      "the unit",
      anonymityFloorFor(key),
    );
    if (decided.status === "reported" && score === undefined)
      return insufficient("No item answered.", count, rate);
    return decided;
  };
  instruments["M-O1-CASCADE"] = partBStatus(
    "CASCADE",
    "O1C-01",
    workbook.typeC.cascade.score,
    workbook.typeC.cascade.responseRate,
  );
  instruments["M-O2-IA"] = partBStatus(
    "IA",
    "O2I-01",
    workbook.typeC.informationAccess.score,
    workbook.typeC.informationAccess.responseRate,
  );

  // PF: each process needs the anonymity floor; the mean is over the processes that reach it.
  const processIds = new Set(deployed.partB?.processIds ?? []);
  const pfProcesses = workbook.typeC.processFriction.processes.map((p) => {
    const answered = validRows.filter((r) =>
      r.processes?.some((x) => x.processId === p.processId),
    ).length;
    const enough = answered >= anonymityFloorFor("PF");
    return { ...p, answered, enough, score: enough ? p.score : undefined };
  });
  const pfScores = pfProcesses.map((p) => p.score).filter(isNumber);
  const pfMean =
    pfScores.length === 0 ? undefined : pfScores.reduce((a, b) => a + b, 0) / pfScores.length;
  instruments["M-O3-PF"] =
    processIds.size === 0
      ? notDeployed()
      : pfMean === undefined
        ? insufficient(`No process reached ${anonymityFloorFor("PF")} valid respondents.`, 0)
        : reported(
            `${pfScores.length} of ${pfProcesses.length} processes scored.`,
            pfScores.length,
          );

  const c1 = workbook.typeC.c1;
  const ratedForC1 = new Set(
    c1.rows.filter((r) => r.coverage !== undefined).map((r) => r.employeeRef),
  );
  const c1RatedFte = sumFte(snapshot.members.filter((m) => ratedForC1.has(m.employeeRef)));
  const c1Coverage = fte === 0 ? undefined : c1RatedFte / fte;
  {
    const managersStatus = rateStatus(
      managers?.c1 === true,
      c1.distinctManagers,
      c1.responseRate,
      THRESHOLDS.managers,
      "managers",
    );
    if (managersStatus.status !== "reported") instruments["M-C1-MGR"] = managersStatus;
    else if (c1Coverage === undefined || !ge(c1Coverage, THRESHOLDS.c1FteCoverage)) {
      instruments["M-C1-MGR"] = insufficient(
        `Ratings cover ${((c1Coverage ?? 0) * 100).toFixed(1)}% of unit FTE, below 70%.`,
        c1.distinctManagers,
        c1.responseRate,
      );
    } else
      instruments["M-C1-MGR"] = reported(
        `${managersStatus.reason} Ratings cover ${((c1Coverage ?? 0) * 100).toFixed(1)}% of unit FTE.`,
        c1.distinctManagers,
        c1.responseRate,
      );
  }

  {
    const c2Rate = counts.managers === 0 ? undefined : c2.distinctManagers / counts.managers;
    const critical = c2.domains.filter(
      (d) =>
        d.criticality === 3 &&
        d.coverage !== undefined &&
        ge(d.coverage, THRESHOLDS.c2CriticalDomainCoverage),
    );
    if (managers?.c2 !== true) instruments["M-C2-MGR"] = notDeployed();
    else if (c2.ratings.length === 0)
      instruments["M-C2-MGR"] = insufficient("No knowledge ratings entered.", 0, c2Rate);
    else if (critical.length === 0) {
      instruments["M-C2-MGR"] = insufficient(
        "No criticality-3 domain reaches 60% coverage.",
        c2.distinctManagers,
        c2Rate,
      );
    } else
      instruments["M-C2-MGR"] = reported(
        `${critical.length} criticality-3 domain${critical.length === 1 ? "" : "s"} at 60% coverage or better.`,
        c2.distinctManagers,
        c2Rate,
      );
  }

  {
    const formalRoute = c3.record.source === "formal";
    if (formalRoute) {
      instruments["C3 formal ratings"] = reported(
        `Current formal ratings cover ${((c3.coverage ?? 0) * 100).toFixed(1)}% of unit FTE, ${c3.record.treatment === "as-declared" ? "used as declared" : "top band capped at 15%, confidence capped at Medium"}.`,
        formal?.ratedCount,
        c3.coverage,
      );
    } else if (managers?.c3 !== true) {
      instruments["M-C3-MGR"] = notDeployed();
      if (formal !== undefined && !formal.qualifies)
        instruments["C3 formal ratings"] = insufficient(
          formal.reason ?? "",
          formal.ratedCount,
          formal.coverage,
        );
    } else if (c3.bands === undefined) {
      instruments["M-C3-MGR"] = insufficient("No talent bands entered.", 0, c1.responseRate);
    } else if (c3.coverage === undefined || !ge(c3.coverage, THRESHOLDS.c3FteRated)) {
      instruments["M-C3-MGR"] = insufficient(
        `${((c3.coverage ?? 0) * 100).toFixed(1)}% of in-scope FTE rated, below 80%.`,
        workbook.typeC.c3.total,
        c3.coverage,
      );
    } else
      instruments["M-C3-MGR"] = reported(
        `${((c3.coverage ?? 0) * 100).toFixed(1)}% of in-scope FTE rated.`,
        workbook.typeC.c3.total,
        c3.coverage,
      );
  }

  instruments["M-C5-TL"] = rateStatus(
    deployed.teamLeaders === true,
    c5.leaderScores.filter(isNumber).length,
    c5.responseRate,
    THRESHOLDS.teamLeaders,
    "team leaders",
  );
  if (instruments["M-C5-TL"].status === "reported" && c5.score === undefined)
    instruments["M-C5-TL"] = insufficient("No leader answered.", 0, c5.responseRate);

  instruments["S1"] =
    managers?.c1 !== true
      ? notDeployed()
      : s1.sufficient
        ? reported(
            `Skills data for ${((s1.dataCoverage ?? 0) * 100).toFixed(1)}% of unit FTE.`,
            s1.skillCounts.length,
            s1.dataCoverage,
          )
        : insufficient(
            `Skills data for ${((s1.dataCoverage ?? 0) * 100).toFixed(1)}% of unit FTE, below 75%.`,
            s1.skillCounts.length,
            s1.dataCoverage,
          );

  const checklists = new Set(deployed.checklists ?? []);
  instruments["ADM-O1"] = !checklists.has("ADM-O1")
    ? notDeployed()
    : admO1.score === undefined
      ? insufficient("No role family answered.")
      : reported(`${admO1.families.length} role families answered.`, admO1.families.length);
  instruments["ADM-O2"] = !checklists.has("ADM-O2")
    ? notDeployed()
    : admO2.toolInventoryScore === undefined
      ? insufficient("No system answered.")
      : reported(`${admO2.systems.length} systems answered.`, admO2.systems.length);
  instruments["ADM-O4"] = !checklists.has("ADM-O4")
    ? notDeployed()
    : admO4.score === undefined
      ? insufficient(`${admO4.facts.length} facts entered, below 3.`, admO4.facts.length)
      : reported(`${admO4.facts.length} facts entered.`, admO4.facts.length);

  // --- Sub-dimension statuses and the engine input ------------------------------------------

  const closeDate = campaign.closeDate;
  const prior = input.prior;
  const subDimensions = {} as Record<SubDimensionCode, SubDimensionStatus>;
  const routes: Partial<Record<RouteRow, RouteAssignment>> = {};
  const adjustments: Adjustment[] = [];

  const means = workbook.typeA.means as Partial<Record<string, number>>;
  const capability: CapabilityInputs = {};
  const motivation: MotivationInputs = {};
  const opportunity: OpportunityInputs = {};
  const synergy: SynergyInputs = {};

  /** Decides a sub-dimension: reported now, carried forward, or insufficient; sets its route row. */
  const decide = (
    code: SubDimensionCode,
    deployedNow: boolean,
    reportedNow: boolean,
    reason: string,
    source: string,
    vintage: string | undefined = closeDate,
  ): SubDimensionStatus["status"] => {
    // C1 travels as Type B rows, which the engine takes on its Tier 1/2 table route (with the
    // tenure moderator); its row is labelled Tier 2, the Measurement Reference's tier for manager
    // assessment against a framework. Everything else online is Tier 3.
    const tier = code === "C1" ? "Tier 2" : "Tier 3";
    if (deployedNow && reportedNow) {
      subDimensions[code] = { status: "reported", reason, measuredAt: vintage };
      routes[code] = { tier, source, ...(vintage === undefined ? {} : { vintage }) };
      return "reported";
    }
    if (!deployedNow) {
      const priorDate = prior?.measuredAt[code];
      if (prior !== undefined && priorDate !== undefined) {
        subDimensions[code] = {
          status: "carried-forward",
          reason: `Not deployed; carried forward from ${priorDate}.`,
          measuredAt: priorDate,
        };
        routes[code] = { tier, source: `${source} (carried forward)`, vintage: priorDate };
        return "carried-forward";
      }
      subDimensions[code] = {
        status: "insufficient",
        reason: "Not deployed and no prior cycle to carry forward.",
        measuredAt: undefined,
      };
      routes[code] = {
        tier: "Insufficient data",
        source,
        notes: "Not deployed and no prior cycle to carry forward.",
      };
      return "insufficient";
    }
    subDimensions[code] = { status: "insufficient", reason, measuredAt: undefined };
    routes[code] = { tier: "Insufficient data", source, notes: reason };
    return "insufficient";
  };

  // C1 and S1 from the ratings matrix.
  {
    const status = instruments["M-C1-MGR"];
    const outcome = decide(
      "C1",
      managers?.c1 === true,
      status.status === "reported",
      status.reason,
      "M-C1-MGR",
    );
    if (outcome === "reported") {
      const c1Input: C1Inputs = {
        families: c1RowsForEngine(workbook, snapshot, unit.roleFamilies),
      };
      if (tenure !== undefined) c1Input.medianTenureMonths = tenure;
      capability.c1 = c1Input;
      const deduction = ratingDeduction(
        "C1",
        (input.ratings?.skills ?? []).map((r) => r.rating),
      );
      if (deduction !== undefined) adjustments.push(deduction);
    } else if (outcome === "carried-forward" && prior?.engineInput.capability?.c1 !== undefined) {
      capability.c1 = prior.engineInput.capability.c1;
    }
    const s1Status = instruments["S1"];
    const s1Outcome = decide(
      "S1",
      managers?.c1 === true,
      outcome === "reported" && s1Status.status === "reported",
      outcome === "reported" ? s1Status.reason : `C1 ${subDimensions.C1.status}: S1 inherits C1.`,
      "M-C1-MGR ratings matrix",
    );
    if (
      s1Outcome === "reported" &&
      s1.coverageBreadth !== undefined &&
      s1.coverageDepth !== undefined &&
      s1.distribution !== undefined
    ) {
      synergy.s1 = {
        coverageBreadth: s1.coverageBreadth,
        coverageDepth: s1.coverageDepth,
        distribution: s1.distribution,
      };
    } else if (s1Outcome === "carried-forward" && prior?.engineInput.synergy?.s1 !== undefined) {
      synergy.s1 = prior.engineInput.synergy.s1;
    }
  }

  // C2.
  {
    const status = instruments["M-C2-MGR"];
    const outcome = decide(
      "C2",
      managers?.c2 === true,
      status.status === "reported",
      status.reason,
      "M-C2-MGR",
    );
    if (outcome === "reported") {
      const c2Input: C2Inputs = {
        domains: c2.domains.map((d) => {
          const row: NonNullable<C2Inputs["domains"]>[number] = {
            name: d.name,
            criticality: d.criticality,
          };
          if (d.meanScore !== undefined) row.meanScore = d.meanScore;
          if (d.coverage !== undefined) row.coverage = d.coverage;
          return row;
        }),
      };
      capability.c2 = c2Input;
      const deduction = ratingDeduction("C2", c2.ratings);
      if (deduction !== undefined) adjustments.push(deduction);
    } else if (outcome === "carried-forward" && prior?.engineInput.capability?.c2 !== undefined) {
      capability.c2 = prior.engineInput.capability.c2;
    }
  }

  // C3, on whichever route applies.
  {
    const formalRoute = c3.record.source === "formal";
    const status = formalRoute ? instruments["C3 formal ratings"] : instruments["M-C3-MGR"];
    const deployedNow = formalRoute || managers?.c3 === true;
    const outcome = decide(
      "C3",
      deployedNow,
      status?.status === "reported",
      status?.reason ?? "",
      formalRoute ? "Formal performance ratings" : "M-C3-MGR",
      formalRoute ? c3.record.ratingDate : closeDate,
    );
    if (outcome === "reported" && c3.bands !== undefined) {
      const [band1, band2, band3, band4, band5] = c3.bands;
      const c3Input: C3Inputs = { band5, band4, band3, band2, band1 };
      capability.c3 = c3Input;
      if (!formalRoute) adjustments.push(...c3Adjustments(workbook.typeC.c3));
      if (formalRoute && c3.record.treatment === "uncalibrated-capped" && formal !== undefined) {
        adjustments.push({
          subDimension: "C3",
          rule: "Formal ratings not accepted as calibrated: top band capped at 15%, excess to Band 4; confidence capped at Medium",
          amount: formal.raw[4] - formal.final[4],
          applied: true,
          note: "The confidence cap is recorded here and in the footer; the engine's band stands until the Tier Assignment cap exists (workbook pass pending).",
        });
      }
    } else if (outcome === "carried-forward" && prior?.engineInput.capability?.c3 !== undefined) {
      capability.c3 = prior.engineInput.capability.c3;
    }
  }

  // C4: the team rule and the block threshold.
  {
    const block = blockOf("C4");
    const deployedNow = block.status !== "not-deployed";
    const reportedNow = block.status === "reported" && teams.enoughTeams;
    const reason =
      block.status !== "reported"
        ? block.reason
        : teams.enoughTeams
          ? `${block.reason} ${teams.statuses.filter((s) => s.valid).length} of ${teams.statuses.length} teams valid.`
          : `${teams.statuses.filter((s) => s.valid).length} of ${teams.statuses.length} teams valid, below 75%.`;
    const outcome = decide("C4", deployedNow, reportedNow, reason, "Part A CII, per team");
    if (outcome === "reported") {
      const c4Items = pick<CiiItem>(teams.c4Items, Object.keys(teams.c4Items) as CiiItem[], partA);
      capability.c4 = {
        ...(c4Items === undefined ? {} : { items: c4Items }),
        ...(block.responseRate === undefined ? {} : { responseRate: block.responseRate }),
      };
    } else if (outcome === "carried-forward" && prior?.engineInput.capability?.c4 !== undefined) {
      capability.c4 = prior.engineInput.capability.c4;
    }
  }

  // C5.
  {
    const status = instruments["M-C5-TL"];
    const outcome = decide(
      "C5",
      deployed.teamLeaders === true,
      status.status === "reported",
      status.reason,
      "M-C5-TL",
    );
    if (outcome === "reported" && c5.score !== undefined) capability.c5 = { moduleScore: c5.score };
    else if (outcome === "carried-forward" && prior?.engineInput.capability?.c5 !== undefined)
      capability.c5 = prior.engineInput.capability.c5;
  }

  // M1 to M4: Part A blocks.
  const surveyBlock = <K extends ItemCode>(
    code: SubDimensionCode,
    key: BlockStatus["key"],
    items: readonly K[],
  ): { items?: Partial<Record<K, number>>; responseRate?: number } | undefined => {
    const block = blockOf(key);
    const outcome = decide(
      code,
      block.status !== "not-deployed",
      block.status === "reported",
      block.reason,
      `Part A ${key}`,
    );
    if (outcome === "reported") {
      const picked = pick(means, items, partA);
      return {
        ...(picked === undefined ? {} : { items: picked }),
        ...(block.responseRate === undefined ? {} : { responseRate: block.responseRate }),
      };
    }
    return undefined;
  };
  {
    const m1 = surveyBlock("M1", "M1", MI1_ITEMS);
    if (m1 !== undefined) motivation.m1 = m1;
    else if (
      subDimensions.M1.status === "carried-forward" &&
      prior?.engineInput.motivation?.m1 !== undefined
    )
      motivation.m1 = prior.engineInput.motivation.m1;
    const m2 = surveyBlock("M2", "M2", MI2_ITEMS);
    if (m2 !== undefined) motivation.m2 = m2;
    else if (
      subDimensions.M2.status === "carried-forward" &&
      prior?.engineInput.motivation?.m2 !== undefined
    )
      motivation.m2 = prior.engineInput.motivation.m2;
    const m3 = surveyBlock("M3", "M3", MI3_ITEMS);
    if (m3 !== undefined) motivation.m3 = m3;
    else if (
      subDimensions.M3.status === "carried-forward" &&
      prior?.engineInput.motivation?.m3 !== undefined
    )
      motivation.m3 = prior.engineInput.motivation.m3;
    const m4 = surveyBlock("M4", "M4", MI4_ITEMS);
    if (m4 !== undefined) motivation.m4 = m4;
    else if (
      subDimensions.M4.status === "carried-forward" &&
      prior?.engineInput.motivation?.m4 !== undefined
    )
      motivation.m4 = prior.engineInput.motivation.m4;
  }

  // Trip-wires: each on its own row, outside P.
  {
    const tw: NonNullable<MotivationInputs["tripWires"]> = {};
    for (const item of ["TW-01", "TW-02", "TW-03"] as const) {
      const code = TW_TO_ENGINE[item];
      const status = tripWires[item];
      const mean = means[item];
      if (status.status === "reported" && isNumber(mean)) {
        tw[code] = mean;
        routes[code] = { tier: "Tier 3", source: `Part A ${item}`, vintage: closeDate };
      } else if (status.status === "not-deployed") {
        const priorDate = prior?.measuredAt[code];
        const priorMean = prior?.engineInput.motivation?.tripWires?.[code];
        if (priorDate !== undefined && priorMean !== undefined) {
          tw[code] = priorMean;
          routes[code] = {
            tier: "Tier 3",
            source: `Part A ${item} (carried forward)`,
            vintage: priorDate,
          };
        } else
          routes[code] = {
            tier: "Insufficient data",
            source: `Part A ${item}`,
            notes: "Not deployed and no prior cycle to carry forward.",
          };
      } else
        routes[code] = {
          tier: "Insufficient data",
          source: `Part A ${item}`,
          notes: status.reason,
        };
    }
    if (Object.keys(tw).length > 0) motivation.tripWires = tw;
  }

  // O1 to O4: perception from Part A, structural from the modules and checklists. Each component
  // resolves on its own: measured now, carried forward from the prior cycle when this campaign did
  // not deploy it, or missing. The sub-dimension reports when every component resolves, with the
  // earliest component date as its vintage (a half-yearly check refreshes perception and carries
  // the structural layer forward).
  {
    type Resolved = { value: number; date: string; carried: boolean } | { missing: string };
    const resolve = (
      name: string,
      status: InstrumentResult,
      current: Cell,
      priorValue: Cell,
      priorDate: string | undefined,
    ): Resolved => {
      if (status.status === "reported" && current !== undefined) {
        return { value: current, date: closeDate, carried: false };
      }
      if (status.status === "not-deployed") {
        if (priorValue !== undefined && priorDate !== undefined) {
          return { value: priorValue, date: priorDate, carried: true };
        }
        return { missing: `${name}: not deployed and no prior cycle to carry forward.` };
      }
      return { missing: `${name}: ${status.reason}` };
    };
    type Perception<K extends ItemCode> =
      | {
          items: Partial<Record<K, number>> | undefined;
          rate: number | undefined;
          date: string;
          carried: boolean;
        }
      | { missing: string };
    const decideComposite = <K extends ItemCode>(
      code: "O1" | "O2" | "O3" | "O4",
      key: BlockStatus["key"],
      items: readonly K[],
      priorItems: Partial<Record<K, number>> | undefined,
      priorRate: number | undefined,
      components: Array<[string, Resolved]>,
      source: string,
    ):
      | {
          items?: Partial<Record<K, number>>;
          responseRate?: number;
          values: Record<string, number>;
        }
      | undefined => {
      const block = blockOf(key);
      const priorDate = prior?.measuredAt[code];
      let perception: Perception<K>;
      if (block.status === "reported") {
        perception = {
          items: pick(means, items, partA),
          rate: block.responseRate,
          date: closeDate,
          carried: false,
        };
      } else if (block.status === "not-deployed") {
        perception =
          priorItems !== undefined && priorDate !== undefined
            ? { items: priorItems, rate: priorRate, date: priorDate, carried: true }
            : { missing: `Part A ${key}: not deployed and no prior cycle to carry forward.` };
      } else {
        perception = { missing: `Part A ${key}: ${block.reason}` };
      }
      const missing = [
        ...("missing" in perception ? [perception.missing] : []),
        ...components.flatMap(([, r]) => ("missing" in r ? [r.missing] : [])),
      ];
      const deployedNow =
        block.status !== "not-deployed" ||
        components.some(([, r]) => !("missing" in r) && !r.carried);
      if ("missing" in perception || missing.length > 0) {
        decide(code, deployedNow, false, missing.join(" "), source);
        return undefined;
      }
      const resolved = components.map(
        ([name, r]) => [name, r as { value: number; date: string; carried: boolean }] as const,
      );
      const dates = [perception.date, ...resolved.map(([, r]) => r.date)].sort();
      const carried = [
        ...(perception.carried ? [`Part A ${key}`] : []),
        ...resolved.filter(([, r]) => r.carried).map(([name]) => name),
      ];
      const vintage = dates[0] as string;
      if (perception.carried && resolved.every(([, r]) => r.carried)) {
        subDimensions[code] = {
          status: "carried-forward",
          reason: `Not deployed; carried forward from ${vintage}.`,
          measuredAt: vintage,
        };
        routes[code] = { tier: "Tier 3", source: `${source} (carried forward)`, vintage };
      } else {
        const reason =
          carried.length === 0
            ? block.reason
            : `${block.reason} Carried forward: ${carried.join(", ")}.`;
        subDimensions[code] = { status: "reported", reason, measuredAt: vintage };
        routes[code] = { tier: "Tier 3", source, vintage };
      }
      const values: Record<string, number> = {};
      for (const [name, r] of resolved) values[name] = r.value;
      return {
        ...(perception.items === undefined ? {} : { items: perception.items }),
        ...(perception.rate === undefined ? {} : { responseRate: perception.rate }),
        values,
      };
    };

    const priorO = prior?.engineInput.opportunity;
    const o1 = decideComposite(
      "O1",
      "O1",
      OI1_ITEMS,
      priorO?.o1?.items,
      priorO?.o1?.responseRate,
      [
        [
          "M-O1-LT",
          resolve(
            "M-O1-LT",
            instruments["M-O1-LT"] as InstrumentResult,
            lt.score,
            priorO?.o1?.decisionRightsScore,
            prior?.measuredAt.O1,
          ),
        ],
        [
          "ADM-O1",
          resolve(
            "ADM-O1",
            instruments["ADM-O1"] as InstrumentResult,
            admO1.score,
            priorO?.o1?.roleArchitectureScore,
            prior?.measuredAt.O1,
          ),
        ],
        [
          "M-O1-CASCADE",
          resolve(
            "M-O1-CASCADE",
            instruments["M-O1-CASCADE"] as InstrumentResult,
            workbook.typeC.cascade.score,
            priorO?.o1?.cascadeScore,
            prior?.measuredAt.O1,
          ),
        ],
      ],
      "Part A O1 with M-O1-LT, ADM-O1, M-O1-CASCADE",
    );
    if (o1 !== undefined) {
      const { values, ...rest } = o1;
      opportunity.o1 = {
        ...rest,
        decisionRightsScore: values["M-O1-LT"] as number,
        roleArchitectureScore: values["ADM-O1"] as number,
        cascadeScore: values["M-O1-CASCADE"] as number,
      };
    }

    const admO2Status = instruments["ADM-O2"] as InstrumentResult;
    const integrationStatus: InstrumentResult =
      admO2Status.status === "reported" && admO2.integrationScore === undefined
        ? insufficient("Every system excluded from integration.", admO2.systems.length)
        : admO2Status;
    const o2 = decideComposite(
      "O2",
      "O2",
      OI2_ITEMS,
      priorO?.o2?.items,
      priorO?.o2?.responseRate,
      [
        [
          "ADM-O2 tool inventory",
          resolve(
            "ADM-O2 tool inventory",
            admO2Status,
            admO2.toolInventoryScore,
            priorO?.o2?.toolInventoryScore,
            prior?.measuredAt.O2,
          ),
        ],
        [
          "M-O2-IA",
          resolve(
            "M-O2-IA",
            instruments["M-O2-IA"] as InstrumentResult,
            workbook.typeC.informationAccess.score,
            priorO?.o2?.informationAccessScore,
            prior?.measuredAt.O2,
          ),
        ],
        [
          "ADM-O2 integration",
          resolve(
            "ADM-O2 integration",
            integrationStatus,
            admO2.integrationScore,
            priorO?.o2?.integrationScore,
            prior?.measuredAt.O2,
          ),
        ],
      ],
      "Part A O2 with ADM-O2, M-O2-IA",
    );
    if (o2 !== undefined) {
      const { values, ...rest } = o2;
      opportunity.o2 = {
        ...rest,
        toolInventoryScore: values["ADM-O2 tool inventory"] as number,
        informationAccessScore: values["M-O2-IA"] as number,
        integrationScore: values["ADM-O2 integration"] as number,
      };
    }

    const o3 = decideComposite(
      "O3",
      "O3",
      OI3_ITEMS,
      priorO?.o3?.items,
      priorO?.o3?.responseRate,
      [
        [
          "M-O3-PF",
          resolve(
            "M-O3-PF",
            instruments["M-O3-PF"] as InstrumentResult,
            pfMean,
            priorO?.o3?.processFrictionScore,
            prior?.measuredAt.O3,
          ),
        ],
      ],
      "Part A O3 with M-O3-PF",
    );
    if (o3 !== undefined) {
      const { values, ...rest } = o3;
      opportunity.o3 = { ...rest, processFrictionScore: values["M-O3-PF"] as number };
    }

    const o4 = decideComposite(
      "O4",
      "O4",
      OI4_ITEMS,
      priorO?.o4?.items,
      priorO?.o4?.responseRate,
      [
        [
          "ADM-O4",
          resolve(
            "ADM-O4",
            instruments["ADM-O4"] as InstrumentResult,
            admO4.score,
            priorO?.o4?.capacityAnalysisScore,
            prior?.measuredAt.O4,
          ),
        ],
      ],
      "Part A O4 with ADM-O4",
    );
    if (o4 !== undefined) {
      const { values, ...rest } = o4;
      opportunity.o4 = { ...rest, capacityAnalysisScore: values["ADM-O4"] as number };
    }

    // O5: per team, the same team rule as C4.
    const block = blockOf("O5");
    const o5Ok = block.status === "reported" && teams.enoughTeams && teams.o5Teams.length > 0;
    const o5 = decide(
      "O5",
      block.status !== "not-deployed",
      o5Ok,
      block.status !== "reported"
        ? block.reason
        : teams.enoughTeams
          ? `${block.reason} ${teams.o5Teams.length} teams scored.`
          : `${teams.statuses.filter((s) => s.valid).length} of ${teams.statuses.length} teams valid, below 75%.`,
      "Part A OI5, per team",
    );
    if (o5 === "reported") opportunity.o5 = { teams: teams.o5Teams };
    else if (o5 === "carried-forward" && priorO?.o5 !== undefined) opportunity.o5 = priorO.o5;
  }

  // S2 and S3 from Part A; no telemetry online.
  {
    const s2 = surveyBlock("S2", "S2", TSI2_ITEMS);
    if (s2 !== undefined) synergy.s2 = s2;
    else if (
      subDimensions.S2.status === "carried-forward" &&
      prior?.engineInput.synergy?.s2 !== undefined
    )
      synergy.s2 = prior.engineInput.synergy.s2;
    const s3 = surveyBlock("S3", "S3", TSI3_ITEMS);
    if (s3 !== undefined) synergy.s3 = s3;
    else if (
      subDimensions.S3.status === "carried-forward" &&
      prior?.engineInput.synergy?.s3 !== undefined
    )
      synergy.s3 = prior.engineInput.synergy.s3;
  }

  routes.DLP = {
    tier: "Insufficient data",
    source: "Not measured on the online route",
    notes: "Decision latency is measured in the consultant-led Diagnostic only.",
  };

  const engineInput: UnitMeasurementInput = {
    engagement: {
      archetype: "Default",
      unitName: unit.name,
      unitFte: fte,
      engagementDate: closeDate,
      ...(unit.clientName === undefined ? {} : { clientName: unit.clientName }),
      ...(unit.sector === undefined ? {} : { sector: unit.sector }),
      ...(unit.subSector === undefined ? {} : { subSector: unit.subSector }),
      ...(unit.sizeBand === undefined ? {} : { sizeBand: unit.sizeBand }),
      ...(unit.unitType === undefined ? {} : { unitType: unit.unitType }),
    },
    routes,
    capability,
    motivation,
    opportunity,
    synergy,
  };

  return {
    workbook,
    teamLeaderScreening,
    blocks,
    tripWires,
    teams,
    c2,
    c5,
    s1,
    formal,
    c3,
    admO1,
    admO2,
    admO4,
    medianTenureMonths: tenure,
    instruments,
    subDimensions,
    adjustments,
    c3Route: c3.record,
    engineInput,
  };
}

/** The anonymity floor for a Part B module: 5 respondents, as for any survey-derived score. */
function anonymityFloorFor(key: "CASCADE" | "IA" | "PF"): number {
  return anonymityFloor(key);
}

/**
 * C1 as Type B rows: per role family, `fte` is the FTE of its rated members and
 * `confirmedProficiencies` is the FTE-weighted count of their proficient skills, so the engine's
 * coverage (confirmed over FTE × skills required) is the FTE-weighted mean of per-person
 * coverage. With whole FTE that equals the workbook's unweighted family mean.
 */
function c1RowsForEngine(
  workbook: SurveyWorkbookResult,
  snapshot: IntakeInput["snapshot"],
  families: IntakeInput["unit"]["roleFamilies"],
): NonNullable<C1Inputs["families"]> {
  return families.map((family) => {
    let fteRated = 0;
    let confirmed = 0;
    for (const row of workbook.typeC.c1.rows) {
      if (row.roleFamilyId !== family.id || row.coverage === undefined) continue;
      const member = snapshot.members.find((m) => m.employeeRef === row.employeeRef);
      const memberFte = member?.fte ?? 0;
      fteRated += memberFte;
      confirmed += memberFte * row.coverage * family.skills.length;
    }
    return {
      name: family.name,
      fte: fteRated,
      skillsRequired: family.skills.length,
      confirmedProficiencies: confirmed,
    };
  });
}
