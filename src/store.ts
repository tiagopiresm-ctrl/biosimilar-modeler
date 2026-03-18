// ============================================================
// Zustand Store — Biosimilar Business Case Model
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  ModelState,
  ModelConfig,
  Page,
  Scenario,
  ScenarioRow,
  CountryAssumptions,
  PLAssumptions,
  WACCInputs,
  DecisionTreeGate,
  FCFBridgeInputs,
  GenericCompetitor,
} from './types';

import { computePeriodConfig, getCountryLoeIndex, DEFAULT_LOE_INDEX } from './types';

import {
  createInitialState,
  createDefaultCountry,
  createPeriodArray,
  createScenarioRow,
  syncGenericCompetitors,
} from './defaultData';

import { resizeModelState } from './periodResize';
import {
  migrateState,
  CURRENT_MODEL_VERSION,
  validateImportShape,
  mergeWithDefaults,
} from './migrate';

// ---- Scenario key helper ----

type ScenarioKey = keyof ScenarioRow; // 'bear' | 'base' | 'bull'

const SCENARIO_KEYS: Record<Scenario, ScenarioKey> = {
  1: 'bear',
  2: 'base',
  3: 'bull',
};

function scenarioKey(s: Scenario): ScenarioKey {
  return SCENARIO_KEYS[s];
}

// ---- Store Actions Interface ----

interface StoreActions {
  // Navigation
  setPage: (page: Page) => void;

  // Scenario
  setScenario: (s: Scenario) => void;

  // Country assumptions — scenario-driven array cell
  updateCountryAssumption: (
    countryIndex: number,
    field: keyof CountryAssumptions,
    scenarioKey: ScenarioKey,
    periodIndex: number,
    value: number,
  ) => void;

  // Country assumptions — scalar fields
  updateCountryScalar: (
    countryIndex: number,
    field: keyof CountryAssumptions,
    value: string | number,
  ) => void;

  // Country FX rate — per-period
  updateCountryFxRate: (
    countryIndex: number,
    periodIndex: number,
    value: number,
  ) => void;

  // Generic competitor management
  updateGenericCompetitor: (
    countryIndex: number,
    genericIndex: number,
    field: 'marketShare' | 'pricePct',
    scenarioKey: ScenarioKey,
    periodIndex: number,
    value: number,
  ) => void;

  updateGenericCompetitorScalar: (
    countryIndex: number,
    genericIndex: number,
    field: keyof GenericCompetitor,
    value: string | number,
  ) => void;

  syncGenericCounts: (countryIndex: number) => void;

  // P&L assumptions — scenario-driven array cell
  updatePLAssumption: (
    field: keyof PLAssumptions,
    scenarioKey: ScenarioKey,
    periodIndex: number,
    value: number,
  ) => void;

  // Country management
  addCountryByName: (name: string) => void;
  removeCountry: (index: number) => void;

  // WACC
  updateWACCInput: (
    field: keyof WACCInputs,
    scenarioIndex: number,
    value: number,
  ) => void;

  // Decision Tree
  updateDecisionTreeGate: (
    index: number,
    field: keyof DecisionTreeGate,
    value: string | number,
  ) => void;

  // FCF Bridge
  updateFCFBridge: (
    field: keyof FCFBridgeInputs,
    periodIndex: number,
    value: number,
  ) => void;

  // NPV Risk
  updateNPVRisk: (
    periodIndex: number,
    value: number,
  ) => void;

  // Country LOE Year
  updateCountryLoeYear: (
    countryIndex: number,
    loeYear: number,
  ) => void;

  // Config
  updateConfig: (
    field: keyof ModelConfig,
    value: string | number,
  ) => void;

  // Import / Export
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

// ---- Flatten to Base (data wipe for base_only mode) ----

function flattenToBase(state: ModelState): Partial<ModelState> {
  const flatRow = (r: ScenarioRow): ScenarioRow => ({
    bear: [...r.base],
    base: r.base,
    bull: [...r.base],
  });
  const flatTuple = (t: [number, number, number]): [number, number, number] => [t[1], t[1], t[1]];

  const countries = state.countries.map(c => ({
    ...c,
    atcClassGrowth: flatRow(c.atcClassGrowth),
    volumeAdjustment: flatRow(c.volumeAdjustment),
    originatorPriceGrowth: flatRow(c.originatorPriceGrowth),
    biosimilarPricePct: flatRow(c.biosimilarPricePct),
    biosimilarMarketShare: flatRow(c.biosimilarMarketShare),
    partnerGtnPct: flatRow(c.partnerGtnPct),
    supplyPricePct: flatRow(c.supplyPricePct),
    fixedSupplyPricePerGram: flatRow(c.fixedSupplyPricePerGram),
    royaltyRatePct: flatRow(c.royaltyRatePct),
    genericCompetitors: c.genericCompetitors.map(g => ({
      ...g,
      marketShare: flatRow(g.marketShare),
      pricePct: flatRow(g.pricePct),
    })),
  }));

  const plAssumptions: PLAssumptions = {
    ...state.plAssumptions,
    commercialSales: flatRow(state.plAssumptions.commercialSales),
    gAndA: flatRow(state.plAssumptions.gAndA),
    rAndD: flatRow(state.plAssumptions.rAndD),
    dAndA: flatRow(state.plAssumptions.dAndA),
    taxRate: flatRow(state.plAssumptions.taxRate),
    financialCosts: state.plAssumptions.financialCosts ? flatRow(state.plAssumptions.financialCosts) : { bear: [], base: [], bull: [] },
    otherIncome: state.plAssumptions.otherIncome ? flatRow(state.plAssumptions.otherIncome) : { bear: [], base: [], bull: [] },
  };

  const waccInputs: WACCInputs = {
    riskFreeRate: flatTuple(state.waccInputs.riskFreeRate),
    equityRiskPremium: flatTuple(state.waccInputs.equityRiskPremium),
    beta: flatTuple(state.waccInputs.beta),
    preTaxCostOfDebt: flatTuple(state.waccInputs.preTaxCostOfDebt),
    taxRate: flatTuple(state.waccInputs.taxRate),
    equityPct: flatTuple(state.waccInputs.equityPct),
  };

  return { countries, plAssumptions, waccInputs };
}

// ---- The Store ----

export const useStore = create<ModelState & StoreActions>()(
  persist(
    (set, get) => ({
      // ---- Initial state ----
      ...createInitialState(),

      // ---- Navigation ----
      setPage: (page: Page) => set({ currentPage: page }),

      // ---- Scenario ----
      setScenario: (s: Scenario) =>
        set((state) => ({
          config: {
            ...state.config,
            activeScenario: state.config.scenarioMode === 'base_only' ? 2 : s,
          },
        })),

      // ---- Country assumptions: scenario-driven array cell ----
      updateCountryAssumption: (
        countryIndex: number,
        field: keyof CountryAssumptions,
        scenKey: ScenarioKey,
        periodIndex: number,
        value: number,
      ) =>
        set((state) => {
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };

          // Handle PeriodArray fields (not ScenarioRow)
          if (field === 'milestonePayments' || field === 'marketVolume' || field === 'atcClassVolume' || field === 'moleculeAtcShare' || field === 'originatorPrice') {
            const arr = [...(country[field] as number[])];
            arr[periodIndex] = value;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (country as any)[field] = arr;
          } else {
            // ScenarioRow fields
            const scenarioRow = country[field] as ScenarioRow;
            const updatedRow = { ...scenarioRow };
            const updatedArr = [...updatedRow[scenKey]];
            updatedArr[periodIndex] = value;
            updatedRow[scenKey] = updatedArr;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (country as any)[field] = updatedRow;
          }

          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Country assumptions: scalar fields ----
      updateCountryScalar: (
        countryIndex: number,
        field: keyof CountryAssumptions,
        value: string | number,
      ) =>
        set((state) => {
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (country as any)[field] = value;
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Country FX rate per period ----
      updateCountryFxRate: (
        countryIndex: number,
        periodIndex: number,
        value: number,
      ) =>
        set((state) => {
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };
          const fxRate = [...country.fxRate];
          fxRate[periodIndex] = value;
          country.fxRate = fxRate;
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Generic competitor: scenario-driven cell ----
      updateGenericCompetitor: (
        countryIndex: number,
        genericIndex: number,
        field: 'marketShare' | 'pricePct',
        scenKey: ScenarioKey,
        periodIndex: number,
        value: number,
      ) =>
        set((state) => {
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };
          const genericCompetitors = [...country.genericCompetitors];
          const generic = { ...genericCompetitors[genericIndex] };
          const row = { ...generic[field] };
          const arr = [...row[scenKey]];
          arr[periodIndex] = value;
          row[scenKey] = arr;
          generic[field] = row;
          genericCompetitors[genericIndex] = generic;
          country.genericCompetitors = genericCompetitors;
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Generic competitor: scalar fields ----
      updateGenericCompetitorScalar: (
        countryIndex: number,
        genericIndex: number,
        field: keyof GenericCompetitor,
        value: string | number,
      ) =>
        set((state) => {
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };
          const genericCompetitors = [...country.genericCompetitors];
          const generic = { ...genericCompetitors[genericIndex] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (generic as any)[field] = value;
          genericCompetitors[genericIndex] = generic;
          country.genericCompetitors = genericCompetitors;
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Sync generic competitor counts ----
      syncGenericCounts: (countryIndex: number) =>
        set((state) => {
          const pc = computePeriodConfig(state.config);
          const countries = [...state.countries];
          const country = { ...countries[countryIndex] };
          country.genericCompetitors = syncGenericCompetitors(
            country.genericCompetitors,
            country.numGenericsAtLOE,
            country.numGenericsAtY1,
            country.numGenericsAtY2,
            country.numGenericsAtY3,
            getCountryLoeIndex(country, pc.startYear),
            pc.numPeriods,
          );
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- P&L assumptions ----
      updatePLAssumption: (
        field: keyof PLAssumptions,
        scenKey: ScenarioKey,
        periodIndex: number,
        value: number,
      ) =>
        set((state) => {
          const plAssumptions = { ...state.plAssumptions };
          const scenarioRow = { ...(plAssumptions[field] as ScenarioRow) };
          const updatedArr = [...scenarioRow[scenKey]];
          updatedArr[periodIndex] = value;
          scenarioRow[scenKey] = updatedArr;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (plAssumptions as any)[field] = scenarioRow;
          return { plAssumptions };
        }),

      // ---- Country management ----
      addCountryByName: (name: string) =>
        set((state) => {
          // Don't add duplicates
          if (state.countries.some(c => c.name === name)) return state;
          const pc = computePeriodConfig(state.config);
          const countries = [...state.countries, createDefaultCountry(name, pc.numPeriods, DEFAULT_LOE_INDEX, pc.startYear, 2030)];
          return { countries };
        }),

      removeCountry: (index: number) =>
        set((state) => {
          if (state.countries.length <= 1) return state; // keep at least 1
          const countries = state.countries.filter((_, i) => i !== index);
          // If we're viewing the removed country's page, go to setup
          let { currentPage } = state;
          if (currentPage === `country-${index}` || currentPage === `country-${state.countries.length - 1}`) {
            currentPage = 'setup';
          }
          return { countries, currentPage };
        }),

      // ---- WACC ----
      updateWACCInput: (
        field: keyof WACCInputs,
        scenarioIndex: number,
        value: number,
      ) =>
        set((state) => {
          const waccInputs = { ...state.waccInputs };
          const tuple = [...waccInputs[field]] as [number, number, number];
          tuple[scenarioIndex] = value;
          waccInputs[field] = tuple;
          return { waccInputs };
        }),

      // ---- Decision Tree ----
      updateDecisionTreeGate: (
        index: number,
        field: keyof DecisionTreeGate,
        value: string | number,
      ) =>
        set((state) => {
          const decisionTree = [...state.decisionTree];
          decisionTree[index] = { ...decisionTree[index], [field]: value };
          return { decisionTree };
        }),

      // ---- FCF Bridge ----
      updateFCFBridge: (
        field: keyof FCFBridgeInputs,
        periodIndex: number,
        value: number,
      ) =>
        set((state) => {
          const fcfBridge = { ...state.fcfBridge };
          const arr = [...fcfBridge[field]];
          arr[periodIndex] = value;
          fcfBridge[field] = arr;
          return { fcfBridge };
        }),

      // ---- NPV Risk ----
      updateNPVRisk: (periodIndex: number, value: number) =>
        set((state) => {
          const npvRisk = { ...state.npvRisk };
          const arr = [...npvRisk.cumulativePoS];
          arr[periodIndex] = value;
          npvRisk.cumulativePoS = arr;
          return { npvRisk };
        }),

      // ---- Country LOE Year ----
      updateCountryLoeYear: (countryIndex: number, loeYear: number) =>
        set((state) => {
          const pc = computePeriodConfig(state.config);
          const countries = [...state.countries];
          const country = { ...countries[countryIndex], loeYear };
          // Update biosimilar launch period index to match new LOE year
          country.biosimilarLaunchPeriodIndex = getCountryLoeIndex(country, pc.startYear);
          // Re-sync generic competitor launch periods
          country.genericCompetitors = syncGenericCompetitors(
            country.genericCompetitors,
            country.numGenericsAtLOE,
            country.numGenericsAtY1,
            country.numGenericsAtY2,
            country.numGenericsAtY3,
            getCountryLoeIndex(country, pc.startYear),
            pc.numPeriods,
          );
          countries[countryIndex] = country;
          return { countries };
        }),

      // ---- Config ----
      updateConfig: (field: keyof ModelConfig, value: string | number) =>
        set((state) => {
          const config = { ...state.config, [field]: value };
          // When modelStartYear or forecastEndYear changes, resize all PeriodArrays
          if (field === 'modelStartYear' || field === 'forecastEndYear') {
            const oldPc = computePeriodConfig(state.config);
            const newPc = computePeriodConfig(config);
            const resized = resizeModelState(state, oldPc, newPc);
            return { config, ...resized };
          }
          // When switching to base_only: wipe bear/bull data and force activeScenario = 2
          if (field === 'scenarioMode' && value === 'base_only') {
            config.activeScenario = 2;
            const wiped = flattenToBase({ ...state, config });
            return { config, ...wiped };
          }
          return { config };
        }),

      // ---- Export / Import ----
      exportJSON: (): string => {
        const state = get();
        const modelState: ModelState = {
          config: state.config,
          plAssumptions: state.plAssumptions,
          countries: state.countries,
          waccInputs: state.waccInputs,
          decisionTree: state.decisionTree,
          fcfBridge: state.fcfBridge,
          npvRisk: state.npvRisk,
          currentPage: state.currentPage,
        };
        return JSON.stringify(modelState, null, 2);
      },

      importJSON: (json: string) => {
        try {
          const parsed = JSON.parse(json);
          // Structural validation
          const validationError = validateImportShape(parsed);
          if (validationError) {
            alert(`Import failed: ${validationError}`);
            return;
          }
          const version = parsed.config.modelVersion ?? 1;
          let state: ModelState;
          if (version < CURRENT_MODEL_VERSION) {
            // Run inline migration (no page reload needed)
            state = migrateState(parsed, version);
          } else {
            state = parsed as ModelState;
          }
          // Merge with defaults to fill any missing fields
          state = mergeWithDefaults(state);
          set({
            config: state.config,
            plAssumptions: state.plAssumptions,
            countries: state.countries,
            waccInputs: state.waccInputs,
            decisionTree: state.decisionTree,
            fcfBridge: state.fcfBridge,
            npvRisk: state.npvRisk,
            currentPage: state.currentPage,
          });
        } catch (e) {
          console.error('Failed to import JSON:', e);
          alert('Failed to import model — invalid file format.');
        }
      },
    }),
    {
      name: 'biosimilar-model-storage',
      version: CURRENT_MODEL_VERSION,
      migrate: (persisted, version) => migrateState(persisted, version),
    },
  ),
);

// Re-export helpers that UI components may need
export { createPeriodArray, createScenarioRow, scenarioKey };
export type { ScenarioKey };
