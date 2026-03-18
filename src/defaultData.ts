// ============================================================
// Default Data Factories for the Biosimilar Business Case Model
// ============================================================
// ALL percentage values are stored as DECIMALS (0.45 = 45%).
// EditableCell with format='percent' displays value*100 and stores value/100.
// Calculations use values directly as ratios.
// ============================================================

import type {
  ModelState,
  ModelConfig,
  CountryAssumptions,
  PLAssumptions,
  WACCInputs,
  DecisionTreeGate,
  FCFBridgeInputs,
  NPVRiskInputs,
  ScenarioRow,
  PeriodArray,
  GenericCompetitor,
} from './types';

import { DEFAULT_LOE_INDEX, DEFAULT_NUM_PERIODS, computePeriodConfig } from './types';
import { getEcbFxRates, COUNTRY_CURRENCY_MAP } from './ecbFxData';

// ---- Helpers ----

export function createPeriodArray(defaultValue = 0, numPeriods = DEFAULT_NUM_PERIODS): PeriodArray {
  return Array.from({ length: numPeriods }, () => defaultValue);
}

export function createScenarioRow(defaultValue = 0, numPeriods = DEFAULT_NUM_PERIODS): ScenarioRow {
  return {
    bear: createPeriodArray(defaultValue, numPeriods),
    base: createPeriodArray(defaultValue, numPeriods),
    bull: createPeriodArray(defaultValue, numPeriods),
  };
}

/** Build a ScenarioRow from three separate arrays (bear, base, bull). */
function scenarioRowFrom(bear: number[], base: number[], bull: number[]): ScenarioRow {
  return { bear, base, bull };
}

/** Pad/truncate an array to numPeriods length, filling remainder with last value. */
function pad(arr: number[], numPeriods = DEFAULT_NUM_PERIODS): PeriodArray {
  const result = [...arr];
  const fill = result.length > 0 ? result[result.length - 1] : 0;
  while (result.length < numPeriods) result.push(fill);
  return result.slice(0, numPeriods);
}

/** Convert an array of whole-number percentages to decimals. e.g. [5, 10] => [0.05, 0.10] */
function pct(arr: number[], numPeriods = DEFAULT_NUM_PERIODS): PeriodArray {
  return pad(arr.map(v => v / 100), numPeriods);
}

// ---- Country Historical Defaults ----

const COUNTRY_SEED_DEFAULTS: Record<string, {
  originatorPriceSeed: number;      // base originator price (used to fill all periods initially)
  numGenericsAtLOE: number;
  marketVolume: PeriodArray; // direct per-period market volume ('000 units)
}> = {
  'United States':  { originatorPriceSeed: 1.2, numGenericsAtLOE: 3, marketVolume: pad([5000, 5100, 5202, 5306, 5412, 5520, 5658, 5800, 5945, 6064, 6185, 6309, 6435, 6564, 6695, 6829]) },
  'Germany':        { originatorPriceSeed: 0.9, numGenericsAtLOE: 4, marketVolume: pad([2000, 2040, 2081, 2122, 2165, 2208, 2263, 2320, 2378, 2426, 2474, 2524, 2574, 2626, 2678, 2732]) },
  'France':         { originatorPriceSeed: 0.85, numGenericsAtLOE: 3, marketVolume: pad([1800, 1836, 1873, 1910, 1948, 1987, 2037, 2088, 2140, 2183, 2227, 2271, 2317, 2363, 2410, 2459]) },
  'United Kingdom': { originatorPriceSeed: 0.8, numGenericsAtLOE: 3, marketVolume: pad([1500, 1530, 1561, 1592, 1624, 1656, 1697, 1740, 1784, 1819, 1856, 1893, 1931, 1969, 2009, 2049]) },
  'Italy':          { originatorPriceSeed: 0.75, numGenericsAtLOE: 4, marketVolume: pad([1400, 1428, 1457, 1486, 1515, 1546, 1584, 1624, 1665, 1698, 1732, 1767, 1802, 1838, 1875, 1912]) },
  'Spain':          { originatorPriceSeed: 0.7, numGenericsAtLOE: 3, marketVolume: pad([1200, 1224, 1248, 1273, 1299, 1325, 1358, 1392, 1427, 1455, 1484, 1514, 1545, 1575, 1607, 1639]) },
  'Japan':          { originatorPriceSeed: 0.6, numGenericsAtLOE: 2, marketVolume: pad([1500, 1530, 1561, 1592, 1624, 1656, 1697, 1740, 1784, 1819, 1856, 1893, 1931, 1969, 2009, 2049]) },
  'China':          { originatorPriceSeed: 0.4, numGenericsAtLOE: 5, marketVolume: pad([2000, 2040, 2081, 2122, 2165, 2208, 2263, 2320, 2378, 2426, 2474, 2524, 2574, 2626, 2678, 2732]) },
  'Brazil':         { originatorPriceSeed: 0.5, numGenericsAtLOE: 2, marketVolume: pad([800, 816, 832, 849, 866, 883, 905, 928, 951, 970, 990, 1010, 1030, 1050, 1071, 1093]) },
  'Canada':         { originatorPriceSeed: 0.9, numGenericsAtLOE: 3, marketVolume: pad([900, 918, 936, 955, 974, 994, 1018, 1044, 1070, 1091, 1113, 1135, 1158, 1181, 1205, 1229]) },
  'Australia':      { originatorPriceSeed: 0.85, numGenericsAtLOE: 2, marketVolume: pad([600, 612, 624, 637, 649, 662, 679, 696, 713, 728, 742, 757, 772, 787, 803, 819]) },
  'South Korea':    { originatorPriceSeed: 0.5, numGenericsAtLOE: 4, marketVolume: pad([700, 714, 728, 743, 758, 773, 792, 812, 832, 849, 866, 883, 901, 919, 937, 956]) },
  'Switzerland':    { originatorPriceSeed: 1.0, numGenericsAtLOE: 2, marketVolume: pad([400, 408, 416, 424, 433, 442, 453, 464, 476, 485, 495, 505, 515, 526, 536, 547]) },
  'Netherlands':    { originatorPriceSeed: 0.8, numGenericsAtLOE: 3, marketVolume: pad([500, 510, 520, 531, 541, 552, 566, 580, 595, 606, 619, 631, 644, 657, 670, 683]) },
  'Sweden':         { originatorPriceSeed: 0.85, numGenericsAtLOE: 2, marketVolume: pad([350, 357, 364, 371, 379, 387, 396, 406, 416, 425, 433, 442, 451, 460, 469, 478]) },
};

// ---- Generic Competitor Helpers ----

/**
 * Create a default generic competitor.
 * Pre-launch periods have 0% share and 0% price.
 * Post-launch: default market share ramps from ~2% to ~5%, price starts at 60% of originator.
 */
export function createDefaultGenericCompetitor(
  name: string,
  launchPeriodIndex: number,
  numPeriods = DEFAULT_NUM_PERIODS,
): GenericCompetitor {
  // Build share arrays: 0 before launch, ramp after
  const makeShare = (peakPct: number) => {
    const arr = new Array(numPeriods).fill(0);
    for (let t = launchPeriodIndex; t < numPeriods; t++) {
      const yearsPost = t - launchPeriodIndex;
      // Ramp: starts at peakPct * 0.5, grows to peakPct over ~5 years
      arr[t] = (peakPct / 100) * Math.min(1, 0.5 + 0.1 * yearsPost);
    }
    return arr;
  };

  // Build price arrays: 0 before launch, gradual decline after
  const makePrice = (startPct: number, endPct: number) => {
    const arr = new Array(numPeriods).fill(0);
    for (let t = launchPeriodIndex; t < numPeriods; t++) {
      const yearsPost = t - launchPeriodIndex;
      const maxYears = numPeriods - launchPeriodIndex - 1;
      const ratio = maxYears > 0 ? yearsPost / maxYears : 0;
      arr[t] = (startPct + (endPct - startPct) * ratio) / 100;
    }
    return arr;
  };

  return {
    name,
    launchPeriodIndex,
    marketShare: scenarioRowFrom(
      makeShare(3),  // worst: lower individual share
      makeShare(4),  // base
      makeShare(5),  // best: higher individual share
    ),
    pricePct: scenarioRowFrom(
      makePrice(70, 55),  // worst: higher generic prices
      makePrice(65, 50),  // base
      makePrice(60, 45),  // best: lower generic prices
    ),
  };
}

/**
 * Synchronize the genericCompetitors array with the numGenerics counts.
 * Ensures the right number of generics exist at each launch wave.
 * Returns the updated array (does NOT mutate).
 */
export function syncGenericCompetitors(
  existing: GenericCompetitor[],
  numAtLOE: number,
  numAtY1: number,
  numAtY2: number,
  numAtY3: number,
  loeIndex = DEFAULT_LOE_INDEX,
  numPeriods = DEFAULT_NUM_PERIODS,
): GenericCompetitor[] {
  // Calculate total number of generics (use max of cumulative values)
  const totalNeeded = Math.max(numAtLOE, numAtY1, numAtY2, numAtY3);

  // Determine launch period for each generic based on which "wave" they belong to
  const launchWaves: { count: number; periodIndex: number }[] = [];
  if (numAtLOE > 0) launchWaves.push({ count: numAtLOE, periodIndex: loeIndex });
  if (numAtY1 > numAtLOE) launchWaves.push({ count: numAtY1 - numAtLOE, periodIndex: loeIndex + 1 });
  if (numAtY2 > numAtY1) launchWaves.push({ count: numAtY2 - numAtY1, periodIndex: loeIndex + 2 });
  if (numAtY3 > numAtY2) launchWaves.push({ count: numAtY3 - numAtY2, periodIndex: loeIndex + 3 });

  // Build flat list of (name, launchIndex) assignments
  const assignments: { name: string; launchPeriodIndex: number }[] = [];
  let idx = 1;
  for (const wave of launchWaves) {
    for (let j = 0; j < wave.count; j++) {
      assignments.push({ name: `Generic ${idx}`, launchPeriodIndex: wave.periodIndex });
      idx++;
    }
  }

  // Reuse existing competitors if possible, create new ones otherwise
  const result: GenericCompetitor[] = [];
  for (let i = 0; i < totalNeeded; i++) {
    if (i < existing.length) {
      // Reuse existing data, but update launchPeriodIndex if assignment differs
      result.push({
        ...existing[i],
        name: assignments[i]?.name ?? existing[i].name,
        launchPeriodIndex: assignments[i]?.launchPeriodIndex ?? existing[i].launchPeriodIndex,
      });
    } else {
      // Create new default
      const assignment = assignments[i] ?? { name: `Generic ${i + 1}`, launchPeriodIndex: loeIndex };
      result.push(createDefaultGenericCompetitor(assignment.name, assignment.launchPeriodIndex, numPeriods));
    }
  }

  return result;
}

// ---- Model Configuration ----

export function createDefaultConfig(): ModelConfig {
  return {
    moleculeName: 'Adalimumab',
    currency: '\u20AC',
    volumeMultiplier: 'thousand',
    unitType: 'standard_units',
    activeScenario: 2,
    scenarioMode: 'three_scenario',
    unitsPerGramOfAPI: 25,       // 25 finished units per gram of API (equiv. ~40mg per unit)
    manufacturingOverage: 0.15,
    apiPricingModel: 'percentage',
    apiCostPerGram: 5,              // €5 per gram of API (matches seed data price levels)
    cogsInflationRate: 0.025,       // 2.5% annual COGS inflation
    cogsOverheadPct: 0.15,          // 15% other expenses / overhead
    cogsMarkupPct: 0,               // 0% internal markup (set to 0.40 for 40%)
    modelStartYear: new Date().getFullYear() - 4,    // e.g. 2022
    forecastStartYear: new Date().getFullYear(),      // e.g. 2026
    forecastEndYear: 2040,                            // explicit end year
    volumeForecastMethod: 'growth',
    terminalValueEnabled: false,
    terminalValueGrowthRate: -0.02,  // -2% decline (conservative for biosimilars)
    partnerViewEnabled: false,
    modelVersion: 21,  // Must match CURRENT_MODEL_VERSION in migrate.ts
  };
}

// ---- Country Assumptions ----

export function createDefaultCountry(
  name: string,
  numPeriods = DEFAULT_NUM_PERIODS,
  _loeIndex = DEFAULT_LOE_INDEX,  // deprecated — computed from loeYear & startYear
  startYear = new Date().getFullYear() - 4,
  loeYear = 2030,
): CountryAssumptions {
  // Compute the actual LOE index from loeYear and startYear (ignore passed loeIndex)
  const loeIndex = Math.max(0, loeYear - startYear);

  const seeds = COUNTRY_SEED_DEFAULTS[name] ?? {
    originatorPriceSeed: 0.7,
    numGenericsAtLOE: 3,
    marketVolume: pad([1000, 1020, 1040, 1061, 1082, 1104, 1131, 1159, 1188, 1212, 1236, 1261, 1286, 1312, 1338, 1365]),
  };

  const numAtLOE = seeds.numGenericsAtLOE;
  const numAtY1 = numAtLOE + 1;  // 1 additional generic at LOE+1
  const numAtY2 = numAtY1;       // no additional at LOE+2
  const numAtY3 = numAtY2 + 1;   // 1 additional at LOE+3

  // Build initial generic competitors
  const genericCompetitors = syncGenericCompetitors([], numAtLOE, numAtY1, numAtY2, numAtY3, loeIndex, numPeriods);

  // --- LOE-aligned array builder ---
  // Fills pre-LOE periods with `preFill`, places post-LOE values starting at loeIndex,
  // and extends the last post-LOE value to fill remaining periods.
  const loeArr = (preFill: number, postLoeVals: number[]): number[] => {
    const arr = new Array(numPeriods).fill(preFill);
    for (let i = 0; i < postLoeVals.length && loeIndex + i < numPeriods; i++) {
      arr[loeIndex + i] = postLoeVals[i];
    }
    const lastVal = postLoeVals.length > 0 ? postLoeVals[postLoeVals.length - 1] : preFill;
    for (let i = loeIndex + postLoeVals.length; i < numPeriods; i++) {
      arr[i] = lastVal;
    }
    return arr;
  };
  // LOE-aligned percentage builder: takes whole-number percentages, returns decimals
  const loePct = (preFill: number, postLoeVals: number[]): number[] =>
    loeArr(preFill / 100, postLoeVals.map(v => v / 100));

  // --- Volume adjustment (%) --- all zeros
  const volAdj = createPeriodArray(0, numPeriods);

  // --- Originator price growth (% YoY) --- stored as decimals
  const origPriceGrowthBear = loePct(2.0, [-5.0, -3.0, -2.0, -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
  const origPriceGrowthBase = loePct(3.0, [-3.0, -2.0, -1.0, -0.5, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0]);
  const origPriceGrowthBull = loePct(3.5, [-2.0, -1.0, 0.0, 0.5, 1.0, 1.0, 1.5, 1.5, 1.5, 1.5, 1.5]);

  // --- Biosimilar market share (%) (the company's share) --- stored as decimals
  const bioShareBear = loePct(0, [5, 10, 13, 14, 15, 16, 17, 18, 18, 19, 20]);
  const bioShareBase = loePct(0, [8, 12, 14, 15, 15, 15, 16, 16, 16, 17, 18]);
  const bioShareBull = loePct(0, [10, 14, 16, 17, 17, 17, 17, 17, 17, 17, 18]);

  // --- Biosimilar price % of originator (in-market) --- stored as decimals
  const bioPriceBear = loePct(0, [85, 83, 82, 80, 80, 78, 78, 77, 77, 76, 75]);
  const bioPriceBase = loePct(0, [82, 80, 80, 78, 78, 77, 76, 76, 75, 75, 75]);
  const bioPriceBull = loePct(0, [80, 78, 77, 76, 75, 75, 74, 74, 73, 73, 73]);

  // --- Partner Gross-to-Net (%) --- stored as decimals
  const partnerGtnBear = loePct(0, [15, 15, 16, 16, 17, 17, 18, 18, 18, 18, 18]);
  const partnerGtnBase = loePct(0, [12, 12, 13, 13, 14, 14, 15, 15, 15, 15, 15]);
  const partnerGtnBull = loePct(0, [10, 10, 11, 11, 12, 12, 12, 12, 12, 12, 12]);

  // --- Supply price (% of partner NET selling price) --- stored as decimals
  const supplyPriceBear = loePct(0, [42, 42, 41, 41, 40, 40, 40, 39, 39, 38, 38]);
  const supplyPriceBase = loePct(0, [40, 40, 40, 39, 39, 38, 38, 38, 37, 37, 37]);
  const supplyPriceBull = loePct(0, [38, 38, 38, 37, 37, 37, 36, 36, 36, 35, 35]);

  // --- Fixed supply price per gram (EUR/gram, Mode 2) --- absolute values, NOT percentages
  const fixedPriceBear = loeArr(0, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const fixedPriceBase = loeArr(0, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const fixedPriceBull = loeArr(0, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);

  // --- Royalty rate (% of partner NET sales) --- stored as decimals
  const royBear = loePct(0, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  const royBase = loePct(0, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  const royBull = loePct(0, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);

  // --- Milestone payments (currency '000, NOT a percentage) ---
  const milestones = loeArr(0, [500, 0, 1000, 0, 0, 0, 0, 0, 0, 0, 0]);

  return {
    name,
    localCurrency: COUNTRY_CURRENCY_MAP[name] ?? 'EUR',
    loeYear,
    fxRate: getEcbFxRates(name, numPeriods, startYear),
    numGenericsAtLOE: numAtLOE,
    numGenericsAtY1: numAtY1,
    numGenericsAtY2: numAtY2,
    numGenericsAtY3: numAtY3,
    originatorPrice: createPeriodArray(seeds.originatorPriceSeed, numPeriods),

    marketVolume: pad([...seeds.marketVolume], numPeriods),
    atcClass: '',
    atcClassVolume: createPeriodArray(10000, numPeriods),
    atcClassGrowth: createScenarioRow(0.03, numPeriods),
    moleculeAtcShare: createPeriodArray(0.10, numPeriods),
    volumeAdjustment: scenarioRowFrom([...volAdj], [...volAdj], [...volAdj]),
    originatorPriceGrowth: scenarioRowFrom(origPriceGrowthBear, origPriceGrowthBase, origPriceGrowthBull),

    genericCompetitors,

    biosimilarLaunchPeriodIndex: loeIndex, // default: launches at LOE
    biosimilarPricePct: scenarioRowFrom(bioPriceBear, bioPriceBase, bioPriceBull),
    biosimilarMarketShare: scenarioRowFrom(bioShareBear, bioShareBase, bioShareBull),

    partnerGtnPct: scenarioRowFrom(partnerGtnBear, partnerGtnBase, partnerGtnBull),
    supplyPricePct: scenarioRowFrom(supplyPriceBear, supplyPriceBase, supplyPriceBull),
    fixedSupplyPricePerGram: scenarioRowFrom(fixedPriceBear, fixedPriceBase, fixedPriceBull),
    royaltyRatePct: scenarioRowFrom(royBear, royBase, royBull),
    milestonePayments: milestones,
    royaltyTiers: [
      { threshold: 250000, rate: 0 },
      { threshold: 750000, rate: 0 },
      { threshold: 1250000, rate: 0 },
      { threshold: 1750000, rate: 0 },
      { threshold: 99999999, rate: 0 },
    ],
    useFixedRoyaltyRate: true,  // default to existing flat rate behavior
    // Partner View costs
    partnerPromotionalCosts: createPeriodArray(0, numPeriods),
    partnerSalesForceCosts: createPeriodArray(0, numPeriods),
    partnerDistributionCosts: createPeriodArray(0, numPeriods),
    partnerManufacturingCosts: createPeriodArray(0, numPeriods),
    partnerGAndA: createPeriodArray(0, numPeriods),
    partnerTaxRate: 0.25,
  };
}

// ---- P&L Assumptions ----

export function createDefaultPLAssumptions(numPeriods = DEFAULT_NUM_PERIODS): PLAssumptions {
  // Commercial & Sales (currency '000 absolute)
  const commBear = pad([500, 800, 1200, 1800, 2500, 3500, 3200, 3000, 2800, 2500, 2300, 2200, 2100, 2000, 2000, 2000], numPeriods);
  const commBase = pad([500, 800, 1200, 2000, 3000, 4000, 3800, 3500, 3200, 3000, 2800, 2600, 2500, 2400, 2300, 2200], numPeriods);
  const commBull = pad([600, 1000, 1500, 2500, 3500, 5000, 4500, 4000, 3500, 3200, 3000, 2800, 2600, 2500, 2400, 2300], numPeriods);

  // G&A (currency '000 absolute)
  const gaBear = pad([800, 850, 900, 1000, 1100, 1500, 1600, 1650, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700], numPeriods);
  const gaBase = pad([900, 950, 1000, 1100, 1200, 1700, 1800, 1850, 1900, 1900, 1900, 1900, 1900, 1900, 1900, 1900], numPeriods);
  const gaBull = pad([1000, 1050, 1100, 1200, 1300, 1900, 2000, 2050, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100], numPeriods);

  // R&D (currency '000 absolute) -- heavier pre-LOE
  const rdBear = pad([4000, 4200, 4500, 4800, 5000, 3000, 2000, 1500, 1000, 800, 600, 500, 500, 500, 500, 500], numPeriods);
  const rdBase = pad([4500, 4800, 5000, 5000, 5000, 3500, 2500, 1800, 1200, 1000, 800, 600, 600, 600, 600, 600], numPeriods);
  const rdBull = pad([5000, 5200, 5500, 5500, 5500, 4000, 3000, 2000, 1500, 1200, 1000, 800, 700, 700, 700, 700], numPeriods);

  // D&A (currency '000 absolute)
  const daBear = pad([300, 350, 400, 450, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500], numPeriods);
  const daBase = pad([350, 400, 450, 500, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550], numPeriods);
  const daBull = pad([400, 450, 500, 550, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600], numPeriods);

  // Tax rate (%) \u2014 stored as decimals (0.25 = 25%)
  const taxBear = pct(Array.from({ length: numPeriods }, () => 27), numPeriods);
  const taxBase = pct(Array.from({ length: numPeriods }, () => 25), numPeriods);
  const taxBull = pct(Array.from({ length: numPeriods }, () => 23), numPeriods);

  // Financial Costs (currency '000 absolute — interest, bank fees, etc.)
  const finCostZero = createPeriodArray(0, numPeriods);

  // Other Income (currency '000 absolute — non-product income, grants, etc.)
  const otherIncZero = createPeriodArray(0, numPeriods);

  return {
    commercialSales: scenarioRowFrom(commBear, commBase, commBull),
    gAndA: scenarioRowFrom(gaBear, gaBase, gaBull),
    rAndD: scenarioRowFrom(rdBear, rdBase, rdBull),
    dAndA: scenarioRowFrom(daBear, daBase, daBull),
    taxRate: scenarioRowFrom(taxBear, taxBase, taxBull),
    financialCosts: scenarioRowFrom([...finCostZero], [...finCostZero], [...finCostZero]),
    otherIncome: scenarioRowFrom([...otherIncZero], [...otherIncZero], [...otherIncZero]),
  };
}

// ---- WACC Inputs ----

export function createDefaultWACCInputs(): WACCInputs {
  return {
    riskFreeRate:      [0.045, 0.040, 0.035],
    equityRiskPremium: [0.060, 0.055, 0.050],
    beta:              [1.1,   1.0,   0.9],
    preTaxCostOfDebt:  [0.055, 0.045, 0.035],
    taxRate:           [0.27,  0.25,  0.23],
    equityPct:         [0.70,  0.75,  0.80],
  };
}

// ---- Decision Tree ----

export function createDefaultDecisionTree(): DecisionTreeGate[] {
  return [
    { name: 'Regulatory Filing', probability: 1.0, description: 'Dossier submission to regulatory authorities' },
    { name: 'Approval', probability: 0.80, description: 'Regulatory approval (MA/BLA) granted' },
    { name: 'First Sale', probability: 0.90, description: 'Commercial launch and first in-market sale' },
    { name: 'Sustained Success', probability: 0.85, description: 'Achieving target market share and sustained commercial performance' },
  ];
}

// ---- FCF Bridge Inputs ----

export function createDefaultFCFBridge(numPeriods = DEFAULT_NUM_PERIODS): FCFBridgeInputs {
  const wcChange = createPeriodArray(0, numPeriods);
  const capex = createPeriodArray(0, numPeriods);
  return { workingCapitalChange: wcChange, capitalExpenditure: capex };
}

// ---- NPV Risk Adjustment ----

export function createDefaultNPVRisk(numPeriods = DEFAULT_NUM_PERIODS): NPVRiskInputs {
  return { cumulativePoS: createPeriodArray(1.0, numPeriods) };
}

// ---- Initial State Factory (shared by store + migrate) ----

export function createInitialState(): ModelState {
  const config = createDefaultConfig();
  const pc = computePeriodConfig(config);
  // Default: 3 countries
  const countries: CountryAssumptions[] = [
    createDefaultCountry('United States', pc.numPeriods, DEFAULT_LOE_INDEX, pc.startYear, 2030),
    createDefaultCountry('Germany', pc.numPeriods, DEFAULT_LOE_INDEX, pc.startYear, 2030),
    createDefaultCountry('Japan', pc.numPeriods, DEFAULT_LOE_INDEX, pc.startYear, 2030),
  ];
  return {
    config,
    plAssumptions: createDefaultPLAssumptions(pc.numPeriods),
    countries,
    waccInputs: createDefaultWACCInputs(),
    decisionTree: createDefaultDecisionTree(),
    fcfBridge: createDefaultFCFBridge(pc.numPeriods),
    npvRisk: createDefaultNPVRisk(pc.numPeriods),
    currentPage: 'setup',
  };
}
