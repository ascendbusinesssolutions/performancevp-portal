/**
 * The whole workbook, wired once. `evaluateWorkbook` takes the input and an optional set of
 * overrides, each of which replaces one calculated cell with a constant exactly as typing over the
 * formula would: the sub-dimension score cells (which projectImpact uses) and the O1 to O3
 * structural and perception layers (which the parity scenarios use). Every public function wraps
 * this one, so there is a single wiring.
 */

import { band } from "./bands";
import { scoreC1Table, scoreC2, scoreC3, scoreC4, scoreC5Blend } from "./capability";
import { compositeScores } from "./composite";
import { COMPONENT_OF, SUB_DIMENSION_LABELS } from "./constants";
import { scoreDlp } from "./dlp";
import { type Cell } from "./excel";
import {
  clientUnit,
  criticalFindings,
  exclusionsSummary,
  gapFlagText,
  internalComparison,
  nonStandardDefinitions,
  responseRate,
} from "./methodology";
import { scoreM1Tier3, scoreM2, scoreM3, scoreM4, scoreTripWires } from "./motivation";
import {
  combineTwoLayer,
  perceptionO1,
  perceptionO2,
  perceptionO3,
  perceptionO4,
  scoreO4,
  scoreO5,
  structuralO1,
  structuralO2,
  structuralO3,
} from "./opportunity";
import { pTypicalCheck, rankSubDimensions, sRangeCheck } from "./ranking";
import { confidenceBands, pConfidence, routeC1, routeC5, routeM1, tierMix } from "./routes";
import {
  behaviouralCompositeS2,
  combineS2,
  convertTelemetry,
  falseConsensusFlag,
  perceptionS2,
  scoreS1,
  scoreS3,
} from "./synergy";
import { scoreTriangulators } from "./triangulators";
import {
  RANKED_CODES,
  SUB_DIMENSION_CODES,
  type RankedCode,
  type SubDimensionCode,
  type SubDimensionResult,
  type UnitMeasurementInput,
  type UnitMeasurementResult,
} from "./types";

/** Calculated cells that may be replaced by a constant. */
export interface Overrides {
  /** The sub-dimension score cells: Capability Inputs D15, D24, D33, D56, D63; Motivation Inputs D19, D29, D39, D48; Opportunity Inputs D23, D40, D56, D67, D75; Synergy Inputs D8, D26, D36. */
  scores?: Partial<Record<SubDimensionCode, number>>;
  /** Opportunity Inputs D8, D20, D29, D37, D44, D53. */
  layers?: {
    o1Structural?: number;
    o1Perception?: number;
    o2Structural?: number;
    o2Perception?: number;
    o3Structural?: number;
    o3Perception?: number;
  };
}

export function evaluateWorkbook(
  input: UnitMeasurementInput,
  overrides: Overrides = {},
): UnitMeasurementResult {
  const { engagement } = input;
  const routes = input.routes ?? {};
  const override = <K extends SubDimensionCode>(code: K, computed: Cell): Cell => {
    const value = overrides.scores?.[code];
    return value === undefined ? computed : value;
  };

  // Capability Inputs
  const c1Inputs = input.capability?.c1;
  const c1Table = scoreC1Table(c1Inputs?.families, c1Inputs?.medianTenureMonths);
  const c1 = override("C1", routeC1(routes.C1?.tier, c1Table.tier12Score, c1Inputs?.moduleScore));
  const c2 = scoreC2(input.capability?.c2?.domains);
  const c3 = scoreC3(input.capability?.c3);
  const c4 = scoreC4(input.capability?.c4?.items);
  const c5Inputs = input.capability?.c5;
  const c5 = override(
    "C5",
    routeC5(routes.C5?.tier, scoreC5Blend(c5Inputs), c5Inputs?.moduleScore),
  );

  // Motivation Inputs
  const m1Inputs = input.motivation?.m1;
  const m1Tier3 = scoreM1Tier3(m1Inputs?.items);
  const m1 = override("M1", routeM1(routes.M1?.tier, m1Tier3, m1Inputs?.platformComposite));
  const m2 = override("M2", scoreM2(input.motivation?.m2?.items));
  const m3 = override("M3", scoreM3(input.motivation?.m3?.items));
  const m4 = override("M4", scoreM4(input.motivation?.m4?.items));
  const tripWires = scoreTripWires(input.motivation?.tripWires);

  // Opportunity Inputs
  const layers = overrides.layers ?? {};
  const o1 = combineTwoLayer(
    layers.o1Structural ?? structuralO1(input.opportunity?.o1),
    layers.o1Perception ?? perceptionO1(input.opportunity?.o1?.items),
  );
  const o2 = combineTwoLayer(
    layers.o2Structural ?? structuralO2(input.opportunity?.o2),
    layers.o2Perception ?? perceptionO2(input.opportunity?.o2?.items),
  );
  const o3 = combineTwoLayer(
    layers.o3Structural ?? structuralO3(input.opportunity?.o3),
    layers.o3Perception ?? perceptionO3(input.opportunity?.o3?.items),
  );
  const o4Perception = perceptionO4(input.opportunity?.o4?.items);
  const o4 = override("O4", scoreO4(input.opportunity?.o4?.capacityAnalysisScore, o4Perception));
  const o5 = scoreO5(input.opportunity?.o5?.teams);

  // Synergy Inputs
  const s1 = override("S1", scoreS1(input.synergy?.s1));
  const telemetryConverted = convertTelemetry(input.synergy?.s2?.telemetry);
  const s2Composite = behaviouralCompositeS2(telemetryConverted);
  const s2Perception = perceptionS2(input.synergy?.s2?.items);
  const s2 = combineS2(s2Composite, s2Perception);
  const s3 = override("S3", scoreS3(input.synergy?.s3?.items));
  const tsi3 = input.synergy?.s3?.items;
  const falseConsensus = falseConsensusFlag(tsi3?.["TSI3-01"], tsi3?.["TSI3-02"], m2);

  // Behavioural Triangulators
  const triangulators = scoreTriangulators(input.behaviouralTriangulators, m1);

  // The seventeen score cells
  const scores: Record<SubDimensionCode, Cell> = {
    C1: c1,
    C2: override("C2", c2.score),
    C3: override("C3", c3.score),
    C4: override("C4", c4.score),
    C5: c5,
    M1: m1,
    M2: m2,
    M3: m3,
    M4: m4,
    O1: override("O1", o1.score),
    O2: override("O2", o2.score),
    O3: override("O3", o3.score),
    O4: o4,
    O5: override("O5", o5.score),
    S1: s1,
    S2: override("S2", s2.score),
    S3: s3,
  };

  // Composite Scoring
  const composite = compositeScores(scores, engagement.archetype);
  const rankedScores = {} as Record<RankedCode, Cell>;
  const rankedWeights = {} as Record<RankedCode, number>;
  for (const code of RANKED_CODES) {
    rankedScores[code] = scores[code];
    rankedWeights[code] = composite.normalisedWeights[code];
  }
  const tripWireFlags = {
    TW1: tripWires.TW1.flag,
    TW2: tripWires.TW2.flag,
    TW3: tripWires.TW3.flag,
  };
  const ranking = rankSubDimensions({
    scores: rankedScores,
    normalisedWeights: rankedWeights,
    components: { C: composite.C, M: composite.M, O: composite.O },
    P: composite.P,
    tripWireFlags,
  });

  // Tier Assignment
  const confidence = confidenceBands(routes, engagement.engagementDate);
  const pConf = pConfidence(confidence, composite.P);
  const mix = tierMix(routes);

  // DLP
  const dlp = scoreDlp(input.dlp?.decisions);

  // Sub-dimension rows
  const subDimensions = {} as Record<SubDimensionCode, SubDimensionResult>;
  let unavailable = 0;
  for (const code of SUB_DIMENSION_CODES) {
    const available = composite.available[code];
    if (!available) unavailable += 1;
    subDimensions[code] = {
      code,
      component: COMPONENT_OF[code],
      label: SUB_DIMENSION_LABELS[code],
      score: scores[code],
      available,
      weight: composite.weights[code],
      normalisedWeight: composite.normalisedWeights[code],
      band: band(scores[code]),
      confidence: confidence[code],
    };
  }

  const components = {
    C: composite.C,
    M: composite.M,
    O: composite.O,
    sInternal: composite.sInternal,
    S: composite.S,
    P: composite.P,
    weightSums: composite.weightSums,
  };

  const pBand = band(composite.P);
  const findings = criticalFindings(tripWires, dlp.overall);

  return {
    subDimensions,
    capability: {
      c1: {
        families: c1Table.families,
        tenureModerator: c1Table.tenureModerator,
        tier12Score: c1Table.tier12Score,
      },
      c2: { domains: c2.domains, coverageCheck: c2.coverageCheck },
      c3: { bandShares: c3.bandShares },
      c4: { clarity: c4.clarity, trust: c4.trust, flow: c4.flow },
    },
    motivation: { m1: { tier3Score: m1Tier3 }, tripWires },
    opportunity: {
      o1,
      o2,
      o3,
      o4: { perception: o4Perception },
      o5: { contributions: o5.contributions },
    },
    synergy: {
      s2: {
        telemetryConverted,
        behaviouralComposite: s2Composite,
        perception: s2Perception,
        gap: s2.gap,
        gapFlag: s2.gapFlag,
      },
      s3: { falseConsensusFlag: falseConsensus },
    },
    triangulators,
    components,
    ranking,
    validation: {
      sInRange: sRangeCheck(composite.S),
      pTypical: pTypicalCheck(composite.P),
      pConfidence: pConf,
    },
    dlp,
    confidence,
    methodology: {
      clientUnit: clientUnit(engagement.clientName, engagement.unitName),
      unitFte: engagement.unitFte,
      archetype: engagement.archetype,
      engagementDate: engagement.engagementDate,
      tier1Count: mix.tier1,
      tier2Count: mix.tier2,
      tier3Count: mix.tier3,
      tierMixRating: mix.rating,
      pConfidence: pConf,
      gapFlags: {
        m1SurveyBehavioural: gapFlagText(triangulators.m1GapFlag),
        falseConsensus: gapFlagText(falseConsensus),
        s2TelemetryPerception: gapFlagText(s2.gapFlag),
        o1: gapFlagText(o1.gapFlag),
        o2: gapFlagText(o2.gapFlag),
        o3: gapFlagText(o3.gapFlag),
      },
      criticalFindings: findings,
      internalComparison: internalComparison(),
      responseRates: {
        C4: responseRate(input.capability?.c4?.responseRate),
        M1: responseRate(m1Inputs?.responseRate),
        M2: responseRate(input.motivation?.m2?.responseRate),
        M3: responseRate(input.motivation?.m3?.responseRate),
        M4: responseRate(input.motivation?.m4?.responseRate),
        O1: responseRate(input.opportunity?.o1?.responseRate),
        O2: responseRate(input.opportunity?.o2?.responseRate),
        O3: responseRate(input.opportunity?.o3?.responseRate),
        O4: responseRate(input.opportunity?.o4?.responseRate),
        S2: responseRate(input.synergy?.s2?.responseRate),
        S3: responseRate(input.synergy?.s3?.responseRate),
      },
      exclusionsSummary: exclusionsSummary(unavailable),
      nonStandardDefinitions: nonStandardDefinitions(input.analystEvidence?.nonStandardDefinitions),
    },
    reportData: {
      pBand,
      cBand: band(composite.C),
      mBand: band(composite.M),
      oBand: band(composite.O),
      tripWireOverride: ranking.tripWireOverride === "" ? "none" : ranking.tripWireOverride,
      comparisonRow: {
        unit: engagement.unitName ?? "",
        P: composite.P,
        pBand,
        C: composite.C,
        M: composite.M,
        O: composite.O,
        S: composite.S,
        topBindingSubDimension: ranking.topSix[0]?.label ?? "",
      },
    },
  };
}
