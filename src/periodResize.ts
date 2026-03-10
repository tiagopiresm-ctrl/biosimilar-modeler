// ============================================================
// Period Resize Utilities
// ============================================================
// Handles resizing all PeriodArrays and ScenarioRows when the
// model's period range changes (due to lastHistoricalYear or
// loeYear modifications).
// ============================================================

import type {
  PeriodArray,
  ScenarioRow,
  PeriodConfig,
  CountryAssumptions,
  PLAssumptions,
  FCFBridgeInputs,
  NPVRiskInputs,
  GenericCompetitor,
  ModelState,
} from './types';

/**
 * Resize a PeriodArray from one period config to another,
 * aligning elements by absolute year.
 */
export function resizePeriodArray(
  arr: PeriodArray,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
  fillValue: number = 0,
): PeriodArray {
  const result = new Array(newPc.numPeriods).fill(fillValue);
  for (let i = 0; i < arr.length; i++) {
    const year = oldPc.startYear + i;
    const newIndex = year - newPc.startYear;
    if (newIndex >= 0 && newIndex < newPc.numPeriods) {
      result[newIndex] = arr[i];
    }
  }
  return result;
}

/** Resize all three arrays in a ScenarioRow. */
export function resizeScenarioRow(
  row: ScenarioRow,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
  fillValue: number = 0,
): ScenarioRow {
  return {
    bear: resizePeriodArray(row.bear, oldPc, newPc, fillValue),
    base: resizePeriodArray(row.base, oldPc, newPc, fillValue),
    bull: resizePeriodArray(row.bull, oldPc, newPc, fillValue),
  };
}

/** Shift a period index (like launchPeriodIndex) from old to new config. */
function shiftPeriodIndex(index: number, oldPc: PeriodConfig, newPc: PeriodConfig): number {
  // Convert to absolute year, then back to new index
  const year = oldPc.startYear + index;
  return year - newPc.startYear;
}

/** Resize a single GenericCompetitor's arrays and shift launch index. */
function resizeGenericCompetitor(
  g: GenericCompetitor,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): GenericCompetitor {
  return {
    ...g,
    launchPeriodIndex: shiftPeriodIndex(g.launchPeriodIndex, oldPc, newPc),
    marketShare: resizeScenarioRow(g.marketShare, oldPc, newPc, 0),
    pricePct: resizeScenarioRow(g.pricePct, oldPc, newPc, 0),
  };
}

/** Resize all PeriodArrays and ScenarioRows in a CountryAssumptions. */
export function resizeCountry(
  c: CountryAssumptions,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): CountryAssumptions {
  return {
    ...c,
    fxRate: resizePeriodArray(c.fxRate, oldPc, newPc, 1.0),
    originatorPrice: resizePeriodArray(c.originatorPrice, oldPc, newPc, 0),
    marketVolume: resizePeriodArray(c.marketVolume, oldPc, newPc, 0),
    atcClassVolume: resizePeriodArray(c.atcClassVolume, oldPc, newPc, 10000),
    moleculeAtcShare: resizePeriodArray(c.moleculeAtcShare, oldPc, newPc, 0.10),
    milestonePayments: resizePeriodArray(c.milestonePayments, oldPc, newPc, 0),
    volumeAdjustment: resizeScenarioRow(c.volumeAdjustment, oldPc, newPc, 0),
    originatorPriceGrowth: resizeScenarioRow(c.originatorPriceGrowth, oldPc, newPc, 0),
    biosimilarPricePct: resizeScenarioRow(c.biosimilarPricePct, oldPc, newPc, 0),
    biosimilarMarketShare: resizeScenarioRow(c.biosimilarMarketShare, oldPc, newPc, 0),
    partnerGtnPct: resizeScenarioRow(c.partnerGtnPct, oldPc, newPc, 0),
    supplyPricePct: resizeScenarioRow(c.supplyPricePct, oldPc, newPc, 0),
    royaltyRatePct: resizeScenarioRow(c.royaltyRatePct, oldPc, newPc, 0),
    atcClassGrowth: resizeScenarioRow(c.atcClassGrowth, oldPc, newPc, 0.03),
    biosimilarLaunchPeriodIndex: shiftPeriodIndex(c.biosimilarLaunchPeriodIndex, oldPc, newPc),
    genericCompetitors: c.genericCompetitors.map(g => resizeGenericCompetitor(g, oldPc, newPc)),
  };
}

/** Resize PLAssumptions ScenarioRows. */
export function resizePLAssumptions(
  pl: PLAssumptions,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): PLAssumptions {
  return {
    ...pl,
    commercialSales: resizeScenarioRow(pl.commercialSales, oldPc, newPc, 0),
    gAndA: resizeScenarioRow(pl.gAndA, oldPc, newPc, 0),
    rAndD: resizeScenarioRow(pl.rAndD, oldPc, newPc, 0),
    dAndA: resizeScenarioRow(pl.dAndA, oldPc, newPc, 0),
    taxRate: resizeScenarioRow(pl.taxRate, oldPc, newPc, 0.25),
  };
}

/** Resize FCF Bridge inputs. */
export function resizeFCFBridge(
  fb: FCFBridgeInputs,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): FCFBridgeInputs {
  return {
    workingCapitalChange: resizePeriodArray(fb.workingCapitalChange, oldPc, newPc, 0),
    capitalExpenditure: resizePeriodArray(fb.capitalExpenditure, oldPc, newPc, 0),
  };
}

/** Resize NPV risk inputs. */
export function resizeNPVRisk(
  nr: NPVRiskInputs,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): NPVRiskInputs {
  return {
    cumulativePoS: resizePeriodArray(nr.cumulativePoS, oldPc, newPc, 1.0),
  };
}

/** Resize the entire model state when period config changes. */
export function resizeModelState(
  state: ModelState,
  oldPc: PeriodConfig,
  newPc: PeriodConfig,
): Partial<ModelState> {
  if (oldPc.numPeriods === newPc.numPeriods && oldPc.startYear === newPc.startYear) {
    return {}; // No resize needed
  }
  return {
    countries: state.countries.map(c => resizeCountry(c, oldPc, newPc)),
    plAssumptions: resizePLAssumptions(state.plAssumptions, oldPc, newPc),
    fcfBridge: resizeFCFBridge(state.fcfBridge, oldPc, newPc),
    npvRisk: resizeNPVRisk(state.npvRisk, oldPc, newPc),
  };
}
