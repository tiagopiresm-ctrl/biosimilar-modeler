// ============================================================
// Biosimilar Business Case Modeling Tool — Type Definitions
// ============================================================

export type Scenario = 1 | 2 | 3; // 1=Worst, 2=Base, 3=Best
export const SCENARIO_LABELS: Record<Scenario, string> = { 1: 'Worst', 2: 'Base', 3: 'Best' };

export type ScenarioMode = 'three_scenario' | 'base_only';
export const SCENARIO_MODE_LABELS: Record<ScenarioMode, string> = {
  three_scenario: 'Worst / Base / Best',
  base_only: 'Base Case Only',
};
// Legacy defaults (used only for initial state creation when no config exists yet)
export const DEFAULT_NUM_PERIODS = 16;
export const DEFAULT_LOE_INDEX = 5;

// ---- DYNAMIC PERIOD CONFIGURATION ----
export interface PeriodConfig {
  numPeriods: number;
  startYear: number;
  endYear: number;
}

/** Compute the dynamic period configuration from model config. */
export function computePeriodConfig(config: { modelStartYear: number; forecastEndYear?: number }): PeriodConfig {
  const endYear = config.forecastEndYear ?? (config.modelStartYear + 15);
  const startYear = config.modelStartYear;
  const numPeriods = endYear - startYear + 1;
  return { numPeriods, startYear, endYear };
}

/** Generate period labels as calendar years. */
export function generatePeriodLabels(pc: PeriodConfig): string[] {
  return Array.from({ length: pc.numPeriods }, (_, i) => String(pc.startYear + i));
}

/** Get the earliest LOE index across all countries (for COGS start & NPV discount anchor). */
export function getEarliestLoeIndex(countries: { loeYear: number }[], startYear: number): number {
  if (countries.length === 0) return DEFAULT_LOE_INDEX; // fallback
  const earliest = Math.min(...countries.map(c => c.loeYear));
  return earliest - startYear;
}

/** Get the LOE index for a specific country. */
export function getCountryLoeIndex(country: { loeYear: number }, startYear: number): number {
  return country.loeYear - startYear;
}

// A row of 16 numbers, one per period
export type PeriodArray = number[];

// Three-scenario variant for an assumption row
export interface ScenarioRow {
  bear: PeriodArray;
  base: PeriodArray;
  bull: PeriodArray;
}

// ---- VOLUME & UNIT TYPES ----
export type VolumeMultiplier = 'none' | 'thousand' | 'million';
export type UnitType = 'standard_units';

export const VOLUME_MULTIPLIER_LABELS: Record<VolumeMultiplier, string> = {
  none: 'Units',
  thousand: "'000 units",
  million: "'000,000 units",
};

export const VOLUME_MULTIPLIER_VALUES: Record<VolumeMultiplier, number> = {
  none: 1,
  thousand: 1_000,
  million: 1_000_000,
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  standard_units: 'Standard Units (tablets/vials)',
};

/** Short singular form for use in column headers & labels (e.g. "€/unit") */
export const UNIT_TYPE_SHORT: Record<UnitType, string> = {
  standard_units: 'unit',
};

// ---- PREDEFINED COUNTRIES ----
export const PREDEFINED_COUNTRIES = [
  'United States', 'Germany', 'France', 'United Kingdom', 'Italy', 'Spain',
  'Japan', 'China', 'Brazil', 'Canada', 'Australia', 'South Korea',
  'Switzerland', 'Netherlands', 'Sweden',
] as const;

// ---- VOLUME FORECAST METHOD ----
export type VolumeForecastMethod = 'growth' | 'atcShare';

export const VOLUME_FORECAST_METHOD_LABELS: Record<VolumeForecastMethod, string> = {
  growth: 'Growth % YoY',
  atcShare: 'ATC Market Share %',
};

// ---- API PRICING MODEL ----
export type ApiPricingModel = 'percentage' | 'fixed';

export const API_PRICING_MODEL_LABELS: Record<ApiPricingModel, string> = {
  percentage: 'Percentage of Partner Net Price',
  fixed: 'Fixed Price per Gram',
};

// ---- ROYALTY TIERS ----
export interface RoyaltyTier {
  threshold: number;  // '000 EUR cumulative sales threshold
  rate: number;       // royalty rate (decimal, e.g. 0.05 = 5%)
}

// ---- MODEL CONFIGURATION ----
export interface ModelConfig {
  moleculeName: string;
  currency: string;
  volumeMultiplier: VolumeMultiplier;
  unitType: UnitType;
  activeScenario: Scenario;
  scenarioMode: ScenarioMode;
  // API Economics (global, independent of country)
  unitsPerGramOfAPI: number;       // how many finished units 1 gram of API produces
  manufacturingOverage: number;    // % overage (decimal, e.g. 0.15 = 15%)
  apiPricingModel: ApiPricingModel; // 'percentage' or 'fixed'
  apiCostPerGram: number;          // cost per gram of API (model currency, e.g. €180)
  cogsInflationRate: number;       // annual COGS inflation rate (decimal, e.g. 0.025 = 2.5%)
  cogsOverheadPct: number;         // COGS other expenses / overhead % (decimal, e.g. 0.15 = 15%)
  cogsMarkupPct: number;           // COGS internal markup % (decimal, e.g. 0.40 = 40%)
  // Timeline controls (global)
  modelStartYear: number;           // e.g. 2022 — first year of the model timeline
  forecastStartYear: number;        // e.g. 2026 — first forecast year (years before are historical)
  forecastEndYear: number;          // e.g. 2040 — last year of the model (replaces hardcoded loeYear+10)
  // Volume forecast method (global — applies to all countries)
  volumeForecastMethod: VolumeForecastMethod;
  // Version for localStorage migration
  modelVersion: number;
}

// ---- GENERIC COMPETITOR ----
export interface GenericCompetitor {
  name: string;                // e.g. "Generic 1"
  launchPeriodIndex: number;   // 5 = LOE, 6 = LOE+1, etc.
  marketShare: ScenarioRow;    // % of total market (decimal)
  pricePct: ScenarioRow;       // % of originator price (decimal)
}

// ---- P&L ASSUMPTIONS (scenario-driven) ----
export interface PLAssumptions {
  commercialSales: ScenarioRow;  // currency'000 absolute
  gAndA: ScenarioRow;            // currency'000 absolute
  rAndD: ScenarioRow;            // currency'000 absolute
  dAndA: ScenarioRow;            // currency'000 absolute
  taxRate: ScenarioRow;          // % (decimal)
  financialCosts: ScenarioRow;   // currency'000 absolute (interest, bank fees, etc.)
  otherIncome: ScenarioRow;      // currency'000 absolute (non-product income)
}

// ---- PER-COUNTRY ASSUMPTIONS ----
export interface CountryAssumptions {
  name: string;
  localCurrency: string;                 // ISO 4217 currency code (e.g. 'USD', 'GBP', 'EUR')
  loeYear: number;                       // Loss of Exclusivity year (per-country)
  fxRate: PeriodArray;                   // per-period FX rate (local per model currency)
  numGenericsAtLOE: number;
  numGenericsAtY1: number;               // total generics at LOE+1
  numGenericsAtY2: number;               // total generics at LOE+2
  numGenericsAtY3: number;               // total generics at LOE+3
  // Originator pricing (per-period: historical = manual input, forecast = derived from growth)
  originatorPrice: PeriodArray;          // currency/unit per period
  // Volume data (per-country; forecast method is global in ModelConfig)
  marketVolume: PeriodArray;             // molecule market volume per period (historical: input, forecast: computed)
  // ATC class-based forecasting (used when volumeForecastMethod = 'atcShare')
  atcClass: string;                      // ATC 3rd-level code (e.g. 'L04A')
  atcClassVolume: PeriodArray;           // ATC class total volume (historical: manual, forecast: computed)
  atcClassGrowth: ScenarioRow;           // ATC class volume growth % (for forecast periods)
  moleculeAtcShare: PeriodArray;         // molecule's share of ATC class volume (0-1)
  // Scenario-driven arrays
  volumeAdjustment: ScenarioRow;         // % adjustment (decimal)
  originatorPriceGrowth: ScenarioRow;    // % YoY (decimal)
  // Individual generic competitors
  genericCompetitors: GenericCompetitor[];
  // Biosimilar assumptions
  biosimilarLaunchPeriodIndex: number;   // period index when biosimilar launches (default: 5 = LOE)
  biosimilarPricePct: ScenarioRow;       // % of originator (in-market price, decimal)
  biosimilarMarketShare: ScenarioRow;    // % of total market (decimal)
  // Partner economics
  partnerGtnPct: ScenarioRow;            // Partner Gross-to-Net % (decimal)
  supplyPricePct: ScenarioRow;           // % of partner NET selling price (decimal, Mode 1)
  fixedSupplyPricePerGram: ScenarioRow;  // EUR/gram fixed supply price to partner (Mode 2, always in model currency)
  royaltyRatePct: ScenarioRow;           // % of partner NET sales (decimal)
  milestonePayments: PeriodArray;        // model-currency'000 (not scenario-driven, always EUR)
  // Tiered Royalties (per-country)
  royaltyTiers: RoyaltyTier[];           // tiered royalty thresholds (applied to this country's cumulative partner net sales)
  useFixedRoyaltyRate: boolean;          // if true, use flat royaltyRatePct; if false, use tiered structure
}

// ---- WACC ----
export interface WACCInputs {
  riskFreeRate: [number, number, number];    // Worst, Base, Best
  equityRiskPremium: [number, number, number];
  beta: [number, number, number];
  preTaxCostOfDebt: [number, number, number];
  taxRate: [number, number, number];
  equityPct: [number, number, number];
}

// ---- DECISION TREE ----
export interface DecisionTreeGate {
  name: string;
  probability: number; // 0-1
  description: string;
}

// ---- FCF BRIDGE INPUTS ----
export interface FCFBridgeInputs {
  workingCapitalChange: PeriodArray;   // currency'000
  capitalExpenditure: PeriodArray;     // currency'000 (negative)
}

// ---- NPV RISK ADJUSTMENT ----
export interface NPVRiskInputs {
  cumulativePoS: PeriodArray; // 0-1 per period
}

// ---- COMPUTED OUTPUTS: per-generic ----
export interface GenericOutputs {
  name: string;
  share: PeriodArray;          // % (decimal)
  volume: PeriodArray;         // units
  price: PeriodArray;          // currency/unit
  sales: PeriodArray;          // currency'000
}

// ---- COMPUTED OUTPUTS (per country) ----
export interface CountryOutputs {
  // A. Total Market
  marketVolume: PeriodArray;          // units
  marketVolumeYoY: PeriodArray;       // % (decimal)
  originatorRefPrice: PeriodArray;    // currency/unit
  // B. Originator (DERIVED: 100% - sum(generics) - biosimilar)
  originatorShare: PeriodArray;       // % (decimal, derived)
  originatorVolume: PeriodArray;      // units
  originatorSales: PeriodArray;       // currency'000
  // C. Individual Generics
  genericOutputs: GenericOutputs[];
  totalGenericShare: PeriodArray;     // % (decimal, sum of individual)
  totalGenericVolume: PeriodArray;    // units
  totalGenericSales: PeriodArray;     // currency'000
  // D. Biosimilar
  biosimilarShare: PeriodArray;       // % (decimal)
  biosimilarVolume: PeriodArray;      // units
  biosimilarInMarketPrice: PeriodArray; // currency/unit
  biosimilarInMarketSales: PeriodArray; // currency'000
  // D1. Partner Economics
  partnerNetSellingPrice: PeriodArray;  // currency/unit
  partnerNetSales: PeriodArray;         // currency'000
  supplyPrice: PeriodArray;             // currency/unit
  grossSupplyRevenue: PeriodArray;      // currency'000
  gtnDeduction: PeriodArray;            // currency'000
  netSupplyRevenue: PeriodArray;        // currency'000
  royaltyIncome: PeriodArray;           // currency'000
  milestoneIncome: PeriodArray;         // currency'000
  // D2. API Economics
  apiGramsSupplied: PeriodArray;      // grams
  apiPricePerGram: PeriodArray;       // currency/g (actual price used, from either mode)
  apiPricePerKg: PeriodArray;         // currency/kg
  // E. Checks
  totalMarketValue: PeriodArray;      // currency'000
  marketShareCheck: PeriodArray;      // % (should = 100%)
}

// ---- P&L OUTPUTS ----
export interface PLOutputs {
  netSupplyRevenueByCountry: PeriodArray[]; // one per country
  totalNetSupplyRevenue: PeriodArray;
  totalRoyaltyIncome: PeriodArray;
  totalMilestoneIncome: PeriodArray;
  totalRevenue: PeriodArray;
  cogs: PeriodArray;
  otherIncome: PeriodArray;
  grossProfit: PeriodArray;
  grossMargin: PeriodArray;
  commercialSales: PeriodArray;
  gAndA: PeriodArray;
  rAndD: PeriodArray;
  totalOpEx: PeriodArray;
  ebitda: PeriodArray;
  ebitdaMargin: PeriodArray;
  dAndA: PeriodArray;
  ebit: PeriodArray;
  ebitMargin: PeriodArray;
  financialCosts: PeriodArray;
  ebt: PeriodArray;
  incomeTax: PeriodArray;
  netIncome: PeriodArray;
  netIncomeMargin: PeriodArray;
  cumulativeNetIncome: PeriodArray;
  workingCapitalChange: PeriodArray;
  capitalExpenditure: PeriodArray;
  freeCashFlow: PeriodArray;
  cumulativeFCF: PeriodArray;
}

// ---- WACC OUTPUTS ----
export interface WACCOutputs {
  costOfEquity: [number, number, number];
  afterTaxCostOfDebt: [number, number, number];
  wacc: [number, number, number];
  activeWACC: number;
}

// ---- NPV OUTPUTS ----
export interface NPVOutputs {
  ebit: PeriodArray;
  daAddBack: PeriodArray;
  incomeTax: PeriodArray;
  wcChange: PeriodArray;
  capex: PeriodArray;
  fcf: PeriodArray;
  cumulativeFCF: PeriodArray;
  discountRate: PeriodArray;
  discountFactor: PeriodArray;
  discountedFCF: PeriodArray;
  cumulativeDiscountedFCF: PeriodArray;
  riskAdjustedFCF: PeriodArray;
  riskAdjustedDiscountedFCF: PeriodArray;
  cumulativeRiskAdjDiscountedFCF: PeriodArray;
  // KPIs
  npv: number;
  rnpv: number;
  irr: number | null;
  rirr: number | null;
  moneyAtRisk: number;
  fundingNeed: number;
  paybackUndiscounted: number | null;
  paybackDiscounted: number | null;
  breakEvenYear: number | null;
  peakEbitYear: number | null;
  peakEbitValue: number;
}

// ---- DECISION TREE OUTPUTS ----
export interface DecisionTreeOutputs {
  cumulativePoS: number;
  enpv: number;
  enpvFromRnpv: number;
}

// ---- NAVIGATION ----
export type Page =
  | 'setup'
  | 'assumptions'
  | `country-${number}`
  | 'summary'
  | 'pnl'
  | 'wacc'
  | 'npv'
  | 'kpis'
  | 'decision-tree'
  | 'charts'
  | 'library';

// ---- FULL MODEL STATE ----
export interface ModelState {
  config: ModelConfig;
  plAssumptions: PLAssumptions;
  countries: CountryAssumptions[];
  waccInputs: WACCInputs;
  decisionTree: DecisionTreeGate[];
  fcfBridge: FCFBridgeInputs;
  npvRisk: NPVRiskInputs;
  currentPage: Page;
}
