// ──────────────────────────────────────────────────────────────
// Export Context — single data bundle for Excel & PowerPoint
// ──────────────────────────────────────────────────────────────

import type {
  ModelConfig,
  CountryAssumptions,
  PLAssumptions,
  FCFBridgeInputs,
  WACCInputs,
  NPVRiskInputs,
  DecisionTreeGate,
  CountryOutputs,
  PLOutputs,
  WACCOutputs,
  NPVOutputs,
  DecisionTreeOutputs,
  PeriodConfig,
} from '../types';

import { computePeriodConfig, generatePeriodLabels, SCENARIO_LABELS } from '../types';

import {
  computeCountryOutputs,
  computePLOutputs,
  computeWACCOutputs,
  computeNPVOutputs,
  computeDecisionTreeOutputs,
} from '../calculations';

// ---- Types ----

export interface ExportContext {
  config: ModelConfig;
  countries: CountryAssumptions[];
  plAssumptions: PLAssumptions;
  fcfBridge: FCFBridgeInputs;
  waccInputs: WACCInputs;
  npvRisk: NPVRiskInputs;
  decisionTree: DecisionTreeGate[];
  // Computed
  countryOutputs: CountryOutputs[];
  plOutputs: PLOutputs;
  waccOutputs: WACCOutputs;
  npvOutputs: NPVOutputs;
  dtOutputs: DecisionTreeOutputs;
  // Helpers
  periodLabels: string[];
  periodConfig: PeriodConfig;
  scenarioLabel: string;
}

// ---- Store state shape (minimal) ----

export interface StoreSnapshot {
  config: ModelConfig;
  countries: CountryAssumptions[];
  plAssumptions: PLAssumptions;
  fcfBridge: FCFBridgeInputs;
  waccInputs: WACCInputs;
  npvRisk: NPVRiskInputs;
  decisionTree: DecisionTreeGate[];
}

// ---- Builder ----

/**
 * Builds a complete ExportContext by running the full calculation chain
 * against the current store state. Both exporters use this as their
 * single entry point.
 */
export function buildExportContext(state: StoreSnapshot): ExportContext {
  const { config, countries, plAssumptions, fcfBridge, waccInputs, npvRisk, decisionTree } = state;

  const periodConfig = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(periodConfig);

  // 1. Country outputs
  const countryOutputs = countries.map((c) => computeCountryOutputs(c, config));

  // 2. P&L
  const plOutputs = computePLOutputs(countryOutputs, countries, plAssumptions, fcfBridge, config);

  // 3. WACC
  const waccOutputs = computeWACCOutputs(waccInputs, config.activeScenario);

  // 4. NPV
  const npvOutputs = computeNPVOutputs(plOutputs, waccOutputs, npvRisk, config, countries);

  // 5. Decision Tree
  const dtOutputs = computeDecisionTreeOutputs(decisionTree, npvOutputs);

  return {
    config,
    countries,
    plAssumptions,
    fcfBridge,
    waccInputs,
    npvRisk,
    decisionTree,
    countryOutputs,
    plOutputs,
    waccOutputs,
    npvOutputs,
    dtOutputs,
    periodLabels,
    periodConfig,
    scenarioLabel: SCENARIO_LABELS[config.activeScenario],
  };
}
