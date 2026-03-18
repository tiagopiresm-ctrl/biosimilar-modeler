// ============================================================
// Migration, Validation & Defensive Merge for JSON Import
// ============================================================

import type {
  ModelState,
  ModelConfig,
  CountryAssumptions,
  PLAssumptions,
  ScenarioRow,
  ScenarioMode,
  PeriodConfig,
  VolumeForecastMethod,
} from './types';

import { computePeriodConfig } from './types';
import { createInitialState, createPeriodArray, createScenarioRow } from './defaultData';
import { resizeModelState } from './periodResize';
import { COUNTRY_CURRENCY_MAP } from './ecbFxData';

/** Single source of truth for the current model version. */
export const CURRENT_MODEL_VERSION = 19;

// ---- Validation ----

/**
 * Validate that `parsed` has the minimum shape expected of a saved model file.
 * Returns `null` if valid, or an error message string if invalid.
 */
export function validateImportShape(parsed: unknown): string | null {
  if (parsed == null || typeof parsed !== 'object') {
    return 'File does not contain a valid JSON object.';
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj.config || typeof obj.config !== 'object') {
    return 'Missing or invalid "config" section.';
  }
  const config = obj.config as Record<string, unknown>;
  if (typeof config.modelVersion !== 'number') {
    return 'Missing or invalid "config.modelVersion".';
  }
  if (!Array.isArray(obj.countries)) {
    return 'Missing or invalid "countries" array.';
  }
  return null;
}

// ---- Defensive Merge ----

/**
 * Merge an imported ModelState with fresh defaults so that any missing
 * top-level sections are filled with sensible values instead of `undefined`.
 */
export function mergeWithDefaults(imported: ModelState): ModelState {
  const defaults = createInitialState();
  return {
    config: { ...defaults.config, ...imported.config },
    plAssumptions: imported.plAssumptions
      ? { ...defaults.plAssumptions, ...imported.plAssumptions }
      : defaults.plAssumptions,
    countries: Array.isArray(imported.countries) && imported.countries.length > 0
      ? imported.countries
      : defaults.countries,
    waccInputs: imported.waccInputs
      ? { ...defaults.waccInputs, ...imported.waccInputs }
      : defaults.waccInputs,
    decisionTree: imported.decisionTree ?? defaults.decisionTree,
    fcfBridge: imported.fcfBridge
      ? { ...defaults.fcfBridge, ...imported.fcfBridge }
      : defaults.fcfBridge,
    npvRisk: imported.npvRisk
      ? { ...defaults.npvRisk, ...imported.npvRisk }
      : defaults.npvRisk,
    currentPage: imported.currentPage ?? 'setup',
  };
}

// ---- Sequential Migration ----

/**
 * Run sequential migrations from `fromVersion` up to CURRENT_MODEL_VERSION.
 * This is the same logic previously inlined in the Zustand `persist.migrate` callback.
 * Pure function: takes raw persisted data + version, returns a valid ModelState.
 */
export function migrateState(persisted: unknown, fromVersion: number): ModelState {
  // If version < 2 (old format), reset to fresh defaults
  if (fromVersion < 2) {
    return createInitialState();
  }

  const state = persisted as ModelState & Record<string, unknown>;

  // Migrate from v2 to v3: add new fields
  if (fromVersion < 3) {
    // Migrate config: apiContentPerUnit → unitsPerGramOfAPI, add apiPricingModel
    const oldConfig = state.config as ModelConfig & { apiContentPerUnit?: number };
    const apiContentPerUnit = oldConfig.apiContentPerUnit ?? 40;
    const unitsPerGramOfAPI = apiContentPerUnit > 0 ? Math.round(1000 / apiContentPerUnit) : 25;
    state.config = {
      ...state.config,
      unitsPerGramOfAPI,
      apiPricingModel: 'percentage' as const,
      modelVersion: 3,
    };
    // Remove old field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (state.config as any)['apiContentPerUnit'];

    // Migrate countries: add biosimilarLaunchPeriodIndex (fixedApiPricePerGram removed in v14)
    state.countries = state.countries.map((c) => ({
      ...c,
      biosimilarLaunchPeriodIndex: c.biosimilarLaunchPeriodIndex ?? 5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fixedApiPricePerGram: (c as any).fixedApiPricePerGram ?? createScenarioRow(),
    }));
  }

  // Migrate from v3 to v4: historicalMarketVolume + marketVolumeGrowth → marketVolume PeriodArray
  if (fromVersion < 4) {
    state.config = { ...state.config, modelVersion: 4 };
    state.countries = state.countries.map((c) => {
      const old = c as CountryAssumptions & {
        historicalMarketVolume?: number;
        marketVolumeGrowth?: ScenarioRow;
      };
      if (old.marketVolume) return c; // already migrated
      // Compute marketVolume from old historicalMarketVolume + base growth rates
      const baseVol = old.historicalMarketVolume ?? 1000;
      const growthRates = old.marketVolumeGrowth?.base ?? createPeriodArray(0.02);
      const vol = createPeriodArray(0, 16); // v4 used fixed 16 periods
      vol[0] = baseVol;
      for (let i = 1; i < 16; i++) {
        vol[i] = vol[i - 1] * (1 + (growthRates[i] ?? 0.02));
      }
      const migrated = { ...c, marketVolume: vol };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (migrated as any)['historicalMarketVolume'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (migrated as any)['marketVolumeGrowth'];
      return migrated as CountryAssumptions;
    });
  }

  // Migrate from v4 to v5: add ATC volume forecasting fields
  if (fromVersion < 5) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfgAny = state.config as any;
    cfgAny.lastHistoricalYear = cfgAny.lastHistoricalYear ?? ((state.config as any).loeYear - 1);
    cfgAny.modelVersion = 5;
    state.config = { ...cfgAny };
    state.countries = state.countries.map((c) => ({
      ...c,
      volumeForecastMethod: (c as any).volumeForecastMethod ?? 'growth',
      atcClass: c.atcClass ?? '',
      atcClassVolume: c.atcClassVolume ?? createPeriodArray(10000),
      atcClassGrowth: c.atcClassGrowth ?? createScenarioRow(0.03),
      moleculeAtcShare: c.moleculeAtcShare ?? createPeriodArray(0.10),
    }));
  }

  // Migrate from v5 to v6: dynamic period range
  // Data was previously fixed at 16 periods. Resize all arrays to match
  // the dynamic period config based on current loeYear and lastHistoricalYear.
  if (fromVersion < 6) {
    state.config = { ...state.config, modelVersion: 6 };
    const cfgV6 = state.config as any;
    const oldPc: PeriodConfig = {
      numPeriods: 16,
      startYear: (cfgV6.loeYear ?? 2030) - 5,
      endYear: (cfgV6.loeYear ?? 2030) + 10,
    };
    const newPc = computePeriodConfig(state.config);
    if (oldPc.numPeriods !== newPc.numPeriods || oldPc.startYear !== newPc.startYear) {
      const resized = resizeModelState(state, oldPc, newPc);
      Object.assign(state, resized);
    }
  }

  // Migrate from v6 to v7: lastHistoricalYear → modelStartYear + forecastStartYear,
  // add localCurrency per country
  if (fromVersion < 7) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg7 = state.config as any;
    const loeYearV7 = (state.config as any).loeYear ?? 2030;
    const oldLastHistorical = cfg7.lastHistoricalYear ?? loeYearV7 - 1;
    cfg7.modelStartYear = cfg7.modelStartYear
      ?? Math.min(oldLastHistorical - 3, loeYearV7 - 5);
    cfg7.forecastStartYear = cfg7.forecastStartYear
      ?? (oldLastHistorical + 1);
    cfg7.modelVersion = 7;
    delete cfg7.lastHistoricalYear;
    state.config = { ...cfg7 };
    // Add localCurrency to existing countries
    state.countries = state.countries.map((c) => ({
      ...c,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      localCurrency: (c as any).localCurrency ?? COUNTRY_CURRENCY_MAP[c.name] ?? 'EUR',
    }));
  }

  // Migrate from v7 to v8: add forecastEndYear
  if (fromVersion < 8) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg8 = state.config as any;
    cfg8.forecastEndYear = cfg8.forecastEndYear ?? ((state.config as any).loeYear + 10);
    cfg8.modelVersion = 8;
    state.config = { ...cfg8 };
  }

  // Migrate from v8 to v9: historicalOriginatorPrice (scalar) → originatorPrice (PeriodArray)
  if (fromVersion < 9) {
    state.config = { ...state.config, modelVersion: 9 };
    const pc = computePeriodConfig(state.config);
    state.countries = state.countries.map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const old = c as any;
      const seedPrice = old.historicalOriginatorPrice ?? 0.7;
      const originatorPrice = old.originatorPrice ?? createPeriodArray(seedPrice, pc.numPeriods);
      const migrated = { ...c, originatorPrice };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (migrated as any)['historicalOriginatorPrice'];
      return migrated as CountryAssumptions;
    });
  }

  // Migrate from v9 to v10: move volumeForecastMethod from country to global config
  if (fromVersion < 10) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstCountry = state.countries[0] as any;
    const method: VolumeForecastMethod = firstCountry?.volumeForecastMethod ?? 'growth';
    state.config = { ...state.config, volumeForecastMethod: method, modelVersion: 10 };
    state.countries = state.countries.map((c) => {
      const migrated = { ...c };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (migrated as any).volumeForecastMethod;
      return migrated as CountryAssumptions;
    });
  }

  // Migrate from v10 to v11: move loeYear from global config to per-country
  if (fromVersion < 11) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalLoeYear = (state.config as any).loeYear ?? 2030;
    state.countries = state.countries.map((c: CountryAssumptions) => ({
      ...c,
      loeYear: (c as any).loeYear ?? globalLoeYear,
    }));
    // Remove loeYear from config, bump version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { loeYear: _, ...restConfig } = state.config as any;
    state.config = { ...restConfig, modelVersion: 11 } as ModelConfig;
  }

  // Migrate from v11 to v12: add scenarioMode
  if (fromVersion < 12) {
    state.config = { ...state.config, scenarioMode: 'three_scenario' as ScenarioMode, modelVersion: 12 };
  }

  // Migrate from v12 to v13: move COGS to config (apiCostPerGram + cogsInflationRate), remove from PLAssumptions
  if (fromVersion < 13) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { cogs: _removedCogs, ...restPL } = state.plAssumptions as any;
    if (restPL.commercialSales) {
      state.plAssumptions = restPL as PLAssumptions;
    }
    state.config = {
      ...state.config,
      apiCostPerGram: (state.config as any).apiCostPerGram ?? 180,
      cogsInflationRate: (state.config as any).cogsInflationRate ?? 0.025,
      modelVersion: 13,
    };
  }

  // Migrate from v13 to v14: remove fixedApiPricePerGram & gtnDeductionPct from countries
  if (fromVersion < 14) {
    state.countries = state.countries.map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { fixedApiPricePerGram: _f, gtnDeductionPct: _g, ...rest } = c as any;
      return rest;
    });
    state.config = { ...state.config, modelVersion: 14 };
  }

  // Migrate from v14 to v15: convert unitType 'packs' → 'standard_units'
  if (fromVersion < 15) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((state.config as any).unitType === 'packs') {
      state.config = { ...state.config, unitType: 'standard_units' as const };
    }
    state.config = { ...state.config, modelVersion: 15 };
  }

  // Migrate from v15 to v16: add fixedSupplyPricePerGram per country
  if (fromVersion < 16) {
    const pc = computePeriodConfig(state.config);
    state.countries = state.countries.map((c: CountryAssumptions) => ({
      ...c,
      fixedSupplyPricePerGram: (c as any).fixedSupplyPricePerGram ?? createScenarioRow(0, pc.numPeriods),
    }));
    state.config = { ...state.config, modelVersion: 16 };
  }

  // Migrate from v16 to v17: add cogsOverheadPct, cogsMarkupPct, financialCosts, otherIncome
  if (fromVersion < 17) {
    const pc = computePeriodConfig(state.config);
    state.config = {
      ...state.config,
      cogsOverheadPct: (state.config as any).cogsOverheadPct ?? 0.15,
      cogsMarkupPct: (state.config as any).cogsMarkupPct ?? 0,
      modelVersion: 17,
    };
    state.plAssumptions = {
      ...state.plAssumptions,
      financialCosts: (state.plAssumptions as any).financialCosts ?? createScenarioRow(0, pc.numPeriods),
      otherIncome: (state.plAssumptions as any).otherIncome ?? createScenarioRow(0, pc.numPeriods),
    };
  }

  // Migrate from v17 to v18: temporarily add royaltyTiers to config (moved to countries in v19)
  if (fromVersion < 18) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg18 = state.config as any;
    cfg18.royaltyTiers = cfg18.royaltyTiers ?? [
      { threshold: 250000, rate: 0 },
      { threshold: 750000, rate: 0 },
      { threshold: 1250000, rate: 0 },
      { threshold: 1750000, rate: 0 },
      { threshold: 99999999, rate: 0 },
    ];
    cfg18.useFixedRoyaltyRate = cfg18.useFixedRoyaltyRate ?? true;
    cfg18.modelVersion = 18;
    state.config = { ...cfg18 };
  }

  // Migrate from v18 to v19: move royaltyTiers and useFixedRoyaltyRate from config to each country
  if (fromVersion < 19) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg19 = state.config as any;
    const globalTiers = cfg19.royaltyTiers ?? [
      { threshold: 250000, rate: 0 },
      { threshold: 750000, rate: 0 },
      { threshold: 1250000, rate: 0 },
      { threshold: 1750000, rate: 0 },
      { threshold: 99999999, rate: 0 },
    ];
    const globalUseFixed = cfg19.useFixedRoyaltyRate ?? true;

    // Copy global royalty settings to each country
    state.countries = state.countries.map((c: CountryAssumptions) => ({
      ...c,
      royaltyTiers: (c as any).royaltyTiers ?? globalTiers.map((t: any) => ({ ...t })),
      useFixedRoyaltyRate: (c as any).useFixedRoyaltyRate ?? globalUseFixed,
    }));

    // Remove from config
    delete cfg19.royaltyTiers;
    delete cfg19.useFixedRoyaltyRate;
    cfg19.modelVersion = 19;
    state.config = { ...cfg19 };
  }

  return state as ModelState;
}
