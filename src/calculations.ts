// ============================================================
// Biosimilar Business Case Modeling Tool — Calculation Engine
// ============================================================
// Pure functions: no side-effects, no DOM, no state mutation.
// All financial logic mirrors the Excel reference model.
// ============================================================

import type {
  PeriodArray,
  ScenarioRow,
  Scenario,
  ModelConfig,
  CountryAssumptions,
  CountryOutputs,
  GenericOutputs,
  PLAssumptions,
  PLOutputs,
  FCFBridgeInputs,
  WACCInputs,
  WACCOutputs,
  NPVRiskInputs,
  NPVOutputs,
  DecisionTreeGate,
  DecisionTreeOutputs,
  PartnerCountryOutputs,
  PartnerViewOutputs,
} from './types';

import { computePeriodConfig, getEarliestLoeIndex } from './types';

// ============================================================
// Helpers
// ============================================================

/** Create a PeriodArray filled with a default value (0 by default). */
export function createPeriodArray(defaultValue: number = 0, numPeriods: number = 16): PeriodArray {
  return new Array(numPeriods).fill(defaultValue);
}

/** Create a ScenarioRow with all three scenarios filled with a default value. */
export function createScenarioRow(defaultValue: number = 0, numPeriods: number = 16): ScenarioRow {
  return {
    bear: createPeriodArray(defaultValue, numPeriods),
    base: createPeriodArray(defaultValue, numPeriods),
    bull: createPeriodArray(defaultValue, numPeriods),
  };
}

/** Safe division — returns 0 when the divisor is zero or non-finite. */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0 || !isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return isFinite(result) ? result : 0;
}

/** Clamp a value so NaN and Infinity become 0. */
function safeNumber(value: number): number {
  return isFinite(value) ? value : 0;
}

// ============================================================
// 1. Scenario Selection
// ============================================================

/**
 * Return the PeriodArray that corresponds to the active scenario.
 *   Scenario 1 = Worst, 2 = Base, 3 = Best
 */
export function getActiveRow(row: ScenarioRow, scenario: Scenario): PeriodArray {
  switch (scenario) {
    case 1:
      return row.bear;
    case 2:
      return row.base;
    case 3:
      return row.bull;
    default:
      return row.base;
  }
}

// ============================================================
// 2. Country Outputs
// ============================================================

export function computeCountryOutputs(
  country: CountryAssumptions,
  config: ModelConfig,
): CountryOutputs {
  const s = config.activeScenario;
  const pc = computePeriodConfig(config);
  const NP = pc.numPeriods;

  // Resolve active scenario rows
  const volumeAdjustment = getActiveRow(country.volumeAdjustment, s);
  const originatorPriceGrowth = getActiveRow(country.originatorPriceGrowth, s);
  const biosimilarPenetrationArr = country.biosimilarPenetration
    ? getActiveRow(country.biosimilarPenetration, s)
    : getActiveRow(country.biosimilarMarketShare, s); // fallback for old data
  const ourShareOfBiosimilarArr = country.ourShareOfBiosimilar
    ? getActiveRow(country.ourShareOfBiosimilar, s)
    : createPeriodArray(1, NP); // fallback: assume 100% of biosimilar = ours
  const biosimilarPricePctArr = getActiveRow(country.biosimilarPricePct, s);
  const partnerGtnPctArr = getActiveRow(country.partnerGtnPct, s);
  const supplyPricePctArr = getActiveRow(country.supplyPricePct, s);
  const fixedSupplyPriceArr = country.fixedSupplyPricePerGram
    ? getActiveRow(country.fixedSupplyPricePerGram, s)
    : createPeriodArray(0, NP);
  const royaltyRatePctArr = getActiveRow(country.royaltyRatePct, s);

  // ---- A. Market Volume & Originator Reference Price ----
  const marketVolume = createPeriodArray(0, NP);
  const marketVolumeYoY = createPeriodArray(0, NP);
  const originatorRefPrice = createPeriodArray(0, NP);

  // Market volume depends on forecast method (global setting)
  const forecastStartIndex = config.forecastStartYear - pc.startYear;
  // Change 2: when no historical years, first year uses direct input as seed
  const noHistorical = forecastStartIndex <= 0;

  if (config.volumeForecastMethod === 'atcShare') {
    // ATC Share method:
    //   Historical: direct input (no adjustment)
    //   Forecast: ATC class volume × molecule share (no adjustment)
    const atcGrowthArr = getActiveRow(country.atcClassGrowth, s);

    // Build ATC class volume: historical = direct input, forecast = compound growth
    const atcVolume = createPeriodArray(0, NP);
    for (let i = 0; i < NP; i++) {
      if (i < forecastStartIndex || (noHistorical && i === 0)) {
        atcVolume[i] = country.atcClassVolume[i] ?? 0;
      } else {
        const prev = i === 0 ? 0 : atcVolume[i - 1];
        atcVolume[i] = safeNumber(prev * (1 + (atcGrowthArr[i] ?? 0)));
      }
    }

    // Molecule volume: historical = direct input, forecast = ATC volume × molecule share
    for (let i = 0; i < NP; i++) {
      if (i < forecastStartIndex || (noHistorical && i === 0)) {
        marketVolume[i] = country.marketVolume[i] ?? 0;
      } else {
        marketVolume[i] = safeNumber(
          atcVolume[i] * (country.moleculeAtcShare[i] ?? 0),
        );
      }
    }
  } else {
    // Growth method (default):
    //   Historical: direct input (no adjustment)
    //   Forecast: compound forward from last historical using volumeAdjustment growth rate
    for (let i = 0; i < NP; i++) {
      if (i < forecastStartIndex || (noHistorical && i === 0)) {
        marketVolume[i] = country.marketVolume[i] ?? 0;
      } else {
        const prev = i === 0 ? 0 : marketVolume[i - 1];
        marketVolume[i] = safeNumber(prev * (1 + (volumeAdjustment[i] ?? 0)));
      }
    }
  }

  // Originator reference price: historical = direct input, forecast = compound growth
  const forecastStart = config.forecastStartYear - pc.startYear;
  for (let i = 0; i < NP; i++) {
    // Market volume YoY
    marketVolumeYoY[i] = i === 0
      ? 0
      : safeDivide(marketVolume[i] - marketVolume[i - 1], marketVolume[i - 1]);

    // Originator price: historical periods use manual input, forecast compounds from last historical
    if (i < forecastStart || (noHistorical && i === 0)) {
      originatorRefPrice[i] = country.originatorPrice[i] ?? 0;
    } else {
      originatorRefPrice[i] = safeNumber(
        originatorRefPrice[i - 1] * (1 + originatorPriceGrowth[i]),
      );
    }
  }

  // ---- C. Individual Generic Competitors ----
  const genericOutputs: GenericOutputs[] = [];
  const totalGenericShare = createPeriodArray(0, NP);
  const totalGenericVolume = createPeriodArray(0, NP);
  const totalGenericSales = createPeriodArray(0, NP);

  for (const generic of country.genericCompetitors) {
    const shareArr = getActiveRow(generic.marketShare, s);
    const pricePctArr = getActiveRow(generic.pricePct, s);

    const gShare = createPeriodArray(0, NP);
    const gVolume = createPeriodArray(0, NP);
    const gPrice = createPeriodArray(0, NP);
    const gSales = createPeriodArray(0, NP);

    for (let i = 0; i < NP; i++) {
      // Generic only active from its launch period index onwards
      if (i < generic.launchPeriodIndex) {
        gShare[i] = 0;
        gVolume[i] = 0;
        gPrice[i] = 0;
        gSales[i] = 0;
      } else {
        gShare[i] = shareArr[i];
        gVolume[i] = safeNumber(marketVolume[i] * gShare[i]);
        gPrice[i] = safeNumber(originatorRefPrice[i] * pricePctArr[i]);
        gSales[i] = safeNumber(gVolume[i] * gPrice[i]);
      }

      // Accumulate totals
      totalGenericShare[i] += gShare[i];
      totalGenericVolume[i] += gVolume[i];
      totalGenericSales[i] += gSales[i];
    }

    genericOutputs.push({
      name: generic.name,
      share: gShare,
      volume: gVolume,
      price: gPrice,
      sales: gSales,
    });
  }

  // ---- Pre-compute gated biosimilar penetration for originator derivation ----
  const gatedBiosimilarPenetration = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    gatedBiosimilarPenetration[i] = i < country.biosimilarLaunchPeriodIndex ? 0 : biosimilarPenetrationArr[i];
  }

  // ---- B. Originator (DERIVED: 100% - biosimilar penetration) ----
  const originatorShare = createPeriodArray(0, NP);
  const originatorVolume = createPeriodArray(0, NP);
  const originatorSales = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    originatorShare[i] = safeNumber(
      Math.max(0, 1 - gatedBiosimilarPenetration[i]),
    );
    originatorVolume[i] = safeNumber(marketVolume[i] * originatorShare[i]);
    originatorSales[i] = safeNumber(originatorVolume[i] * originatorRefPrice[i]);
  }

  // ---- D. Biosimilar (simplified: penetration × our share) ----
  const totalBiosimilarVolume = createPeriodArray(0, NP);
  const ourShareOfBiosimilarArrOut = createPeriodArray(0, NP);
  const biosimilarShare = createPeriodArray(0, NP);
  const biosimilarVolume = createPeriodArray(0, NP);
  const biosimilarInMarketPrice = createPeriodArray(0, NP);
  const biosimilarInMarketSales = createPeriodArray(0, NP);

  // D1. Partner Economics
  const partnerNetSellingPrice = createPeriodArray(0, NP);
  const partnerNetSales = createPeriodArray(0, NP);
  const supplyPrice = createPeriodArray(0, NP);
  const grossSupplyRevenue = createPeriodArray(0, NP);
  const gtnDeduction = createPeriodArray(0, NP);
  const netSupplyRevenue = createPeriodArray(0, NP);
  const royaltyIncome = createPeriodArray(0, NP);
  const milestoneIncome = createPeriodArray(0, NP);

  // D2. API Economics
  const apiGramsSupplied = createPeriodArray(0, NP);
  const apiPricePerGram = createPeriodArray(0, NP);
  const apiPricePerKg = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    // Biosimilar launch gating: zero everything before launch period
    if (i < country.biosimilarLaunchPeriodIndex) {
      totalBiosimilarVolume[i] = 0;
      ourShareOfBiosimilarArrOut[i] = 0;
      biosimilarShare[i] = 0;
      biosimilarVolume[i] = 0;
      biosimilarInMarketPrice[i] = 0;
      biosimilarInMarketSales[i] = 0;
      partnerNetSellingPrice[i] = 0;
      partnerNetSales[i] = 0;
      supplyPrice[i] = 0;
      grossSupplyRevenue[i] = 0;
      gtnDeduction[i] = 0;
      netSupplyRevenue[i] = 0;
      royaltyIncome[i] = 0;
      milestoneIncome[i] = safeNumber(country.milestonePayments[i] ?? 0);
      apiGramsSupplied[i] = 0;
      apiPricePerGram[i] = 0;
      apiPricePerKg[i] = 0;
      continue;
    }

    // Simplified market share: total biosimilar volume, then our share of that
    totalBiosimilarVolume[i] = safeNumber(marketVolume[i] * biosimilarPenetrationArr[i]);
    ourShareOfBiosimilarArrOut[i] = ourShareOfBiosimilarArr[i];
    biosimilarShare[i] = safeNumber(biosimilarPenetrationArr[i] * ourShareOfBiosimilarArr[i]);
    biosimilarVolume[i] = safeNumber(totalBiosimilarVolume[i] * ourShareOfBiosimilarArr[i]);
    biosimilarInMarketPrice[i] = safeNumber(
      originatorRefPrice[i] * biosimilarPricePctArr[i],
    );
    biosimilarInMarketSales[i] = safeNumber(
      biosimilarVolume[i] * biosimilarInMarketPrice[i],
    );

    // Partner economics chain:
    // 1. Partner Net Selling Price = In-Market Price × (1 - Partner GTN%)
    partnerNetSellingPrice[i] = safeNumber(
      biosimilarInMarketPrice[i] * (1 - partnerGtnPctArr[i]),
    );

    // 2. Partner Net Sales = Partner Net Selling Price × Volume
    partnerNetSales[i] = safeNumber(
      partnerNetSellingPrice[i] * biosimilarVolume[i],
    );

    // API Grams Supplied = volume / unitsPerGramOfAPI (no overage)
    const unitsPerGram = config.unitsPerGramOfAPI > 0 ? config.unitsPerGramOfAPI : 1;
    apiGramsSupplied[i] = safeNumber(
      biosimilarVolume[i] / unitsPerGram,
    );

    // Revenue model depends on API pricing mode
    if (config.apiPricingModel === 'fixed') {
      // Mode 2: Fixed supply price per gram from country assumption (in EUR/model currency)
      // Note: apiCostPerGram in Setup is COGS only — this is the actual supply price to partner
      apiPricePerGram[i] = safeNumber(fixedSupplyPriceArr[i] ?? 0);
      grossSupplyRevenue[i] = safeNumber(apiGramsSupplied[i] * apiPricePerGram[i]);
      // supplyPrice per unit is back-calculated for display
      supplyPrice[i] = safeDivide(grossSupplyRevenue[i], biosimilarVolume[i]);
    } else {
      // Mode 1 (percentage): Supply price as % of partner net selling price
      // Step 1: Convert partner volume (standard units) to API grams (excl. overage)
      const gramsFromSalesVolume = safeDivide(biosimilarVolume[i], unitsPerGram);
      // Step 2: Net sales per gram of API = partner net sales ÷ grams from sales
      const netSalesPerGram = safeDivide(partnerNetSales[i], gramsFromSalesVolume);
      // Step 3: Supply price per gram = net sales per gram × supply price %
      apiPricePerGram[i] = safeNumber(netSalesPerGram * supplyPricePctArr[i]);
      // Gross Supply Revenue = price per gram × total grams supplied
      grossSupplyRevenue[i] = safeNumber(apiGramsSupplied[i] * apiPricePerGram[i]);
      // Back-calculate supply price per unit for display
      supplyPrice[i] = safeDivide(grossSupplyRevenue[i], biosimilarVolume[i]);
    }

    apiPricePerKg[i] = safeNumber(apiPricePerGram[i] * 1000);

    // 5. Net Supply Revenue = Gross Supply Revenue (no GTN deduction on our side)
    gtnDeduction[i] = 0;
    netSupplyRevenue[i] = grossSupplyRevenue[i];

    // 7. Royalty Income — depends on country's useFixedRoyaltyRate toggle
    //    If fixed: flat % of Partner Net Sales
    //    If tiered: computed below after the loop (needs cumulative tracking)
    if (country.useFixedRoyaltyRate) {
      royaltyIncome[i] = safeNumber(partnerNetSales[i] * royaltyRatePctArr[i]);
    }
    // Tiered royalty is computed in a second pass below

    // 8. Milestone payments (not scenario-driven)
    milestoneIncome[i] = safeNumber(country.milestonePayments[i] ?? 0);
  }

  // ---- Tiered Royalty (per-country, cumulative ratchet) ----
  if (!country.useFixedRoyaltyRate && country.royaltyTiers && country.royaltyTiers.length > 0) {
    const tiers = [...country.royaltyTiers].sort((a, b) => a.threshold - b.threshold);
    let cumulativePNS = 0;
    let highestTierRate = 0;

    for (let i = 0; i < NP; i++) {
      if (i < country.biosimilarLaunchPeriodIndex) continue;

      const annualPNS = partnerNetSales[i];
      cumulativePNS += annualPNS;

      let tierRate = 0;
      for (const tier of tiers) {
        if (cumulativePNS >= tier.threshold) {
          tierRate = tier.rate;
        } else {
          break;
        }
      }

      highestTierRate = Math.max(highestTierRate, tierRate);
      royaltyIncome[i] = safeNumber(annualPNS * highestTierRate);
    }
  }

  // ---- E. Checks ----
  const totalMarketValue = createPeriodArray(0, NP);
  const marketShareCheck = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    totalMarketValue[i] = safeNumber(
      originatorSales[i] + totalGenericSales[i] + biosimilarInMarketSales[i],
    );
    marketShareCheck[i] = safeNumber(
      originatorShare[i] + totalGenericShare[i] + biosimilarShare[i],
    );
  }

  return {
    marketVolume,
    marketVolumeYoY,
    originatorRefPrice,
    originatorShare,
    originatorVolume,
    originatorSales,
    genericOutputs,
    totalGenericShare,
    totalGenericVolume,
    totalGenericSales,
    totalBiosimilarVolume,
    ourShareOfBiosimilarArr: ourShareOfBiosimilarArrOut,
    biosimilarShare,
    biosimilarVolume,
    biosimilarInMarketPrice,
    biosimilarInMarketSales,
    partnerNetSellingPrice,
    partnerNetSales,
    supplyPrice,
    grossSupplyRevenue,
    gtnDeduction,
    netSupplyRevenue,
    royaltyIncome,
    milestoneIncome,
    apiGramsSupplied,
    apiPricePerGram,
    apiPricePerKg,
    totalMarketValue,
    marketShareCheck,
  };
}

// ============================================================
// 3. P&L Outputs
// ============================================================

export function computePLOutputs(
  countryOutputs: CountryOutputs[],
  countries: CountryAssumptions[],
  plAssumptions: PLAssumptions,
  fcfBridge: FCFBridgeInputs,
  config: ModelConfig,
): PLOutputs {
  const s = config.activeScenario;
  const pc = computePeriodConfig(config);
  const NP = pc.numPeriods;

  // ---- Aggregate country-level revenues (with FX conversion) ----
  // Convention: fxRate = local currency units per 1 model currency unit
  // revenue_in_model_currency = revenue_local / fxRate
  // For countries using the same currency as the model, fxRate = 1.0

  const netSupplyRevenueByCountry: PeriodArray[] = countryOutputs.map(
    () => createPeriodArray(0, NP),
  );

  const totalNetSupplyRevenue = createPeriodArray(0, NP);
  const totalRoyaltyIncome = createPeriodArray(0, NP);
  const totalMilestoneIncome = createPeriodArray(0, NP);
  const totalRevenue = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    for (let c = 0; c < countryOutputs.length; c++) {
      const co = countryOutputs[c];
      const fxRate = countries[c]?.fxRate[i] ?? 1;
      const fx = fxRate !== 0 ? fxRate : 1; // prevent division by zero

      // Supply revenue: FX convert only in Mode 1 (local currency)
      // Mode 2 fixed supply price is in EUR → revenue already in model currency
      let convertedSupplyRev: number;
      if (config.apiPricingModel === 'percentage') {
        convertedSupplyRev = safeDivide(co.netSupplyRevenue[i], fx);
      } else {
        convertedSupplyRev = co.netSupplyRevenue[i];
      }
      netSupplyRevenueByCountry[c][i] = convertedSupplyRev;
      totalNetSupplyRevenue[i] += convertedSupplyRev;

      // Royalties: always FX convert (% of partner net sales → local currency)
      totalRoyaltyIncome[i] += safeDivide(co.royaltyIncome[i], fx);

      // Milestones: never FX convert (always in model currency / EUR)
      totalMilestoneIncome[i] += co.milestoneIncome[i];
    }
    totalRevenue[i] = safeNumber(
      totalNetSupplyRevenue[i] + totalRoyaltyIncome[i] + totalMilestoneIncome[i],
    );
  }

  // ---- COGS (Volume-driven: supports both per-gram and per-unit input methods) ----
  // #2: Added overhead % and markup % to COGS calculation (matches company Excel COPs structure)
  const cogsInputMethod = config.cogsInputMethod ?? 'perGram';
  const apiCostPerGram = config.apiCostPerGram;
  const apiCostPerUnit = config.apiCostPerUnit ?? 48;
  const cogsInflation = config.cogsInflationRate;
  const cogsOverhead = config.cogsOverheadPct ?? 0;
  const cogsMarkup = config.cogsMarkupPct ?? 0;
  const cogs = createPeriodArray(0, NP);
  const earliestLoeIdx = getEarliestLoeIndex(countries, pc.startYear);

  for (let i = 0; i < NP; i++) {
    if (i >= earliestLoeIdx) {
      const yearsFromLOE = i - earliestLoeIdx;

      if (cogsInputMethod === 'perUnit') {
        // Per-unit method: costPerUnit × inflation × overhead × markup × totalUnits
        let totalUnits = 0;
        for (let c = 0; c < countryOutputs.length; c++) {
          totalUnits += countryOutputs[c].biosimilarVolume[i];
        }
        const costPerUnitAtT = apiCostPerUnit
          * Math.pow(1 + cogsInflation, yearsFromLOE)
          * (1 + cogsOverhead)
          * (1 + cogsMarkup);
        cogs[i] = safeNumber(-(costPerUnitAtT * totalUnits));
      } else {
        // Per-gram method (existing): costPerGram × inflation × overhead × markup × totalGrams
        let totalGrams = 0;
        for (let c = 0; c < countryOutputs.length; c++) {
          totalGrams += countryOutputs[c].apiGramsSupplied[i];
        }
        const costPerGramAtT = apiCostPerGram
          * Math.pow(1 + cogsInflation, yearsFromLOE)
          * (1 + cogsOverhead)
          * (1 + cogsMarkup);
        cogs[i] = safeNumber(-(costPerGramAtT * totalGrams));
      }
    }
  }

  // ---- #6: Other Income (non-product revenue: grants, license fees, etc.) ----
  const otherIncomeArr = plAssumptions.otherIncome
    ? getActiveRow(plAssumptions.otherIncome, s)
    : createPeriodArray(0, NP);
  const otherIncome = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    otherIncome[i] = safeNumber(otherIncomeArr[i] ?? 0);
  }

  // ---- Gross Profit (includes Other Income) ----
  const grossProfit = createPeriodArray(0, NP);
  const grossMargin = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    grossProfit[i] = safeNumber(totalRevenue[i] + cogs[i] + otherIncome[i]);
    grossMargin[i] = safeDivide(grossProfit[i], totalRevenue[i]);
  }

  // ---- OpEx ----
  const commercialSalesArr = getActiveRow(plAssumptions.commercialSales, s);
  const gAndAArr = getActiveRow(plAssumptions.gAndA, s);
  const rAndDArr = getActiveRow(plAssumptions.rAndD, s);
  // Expanded OpEx categories (Change 3)
  const operationsArr = plAssumptions.operations ? getActiveRow(plAssumptions.operations, s) : createPeriodArray(0, NP);
  const qualityArr = plAssumptions.quality ? getActiveRow(plAssumptions.quality, s) : createPeriodArray(0, NP);
  const clinicalArr = plAssumptions.clinical ? getActiveRow(plAssumptions.clinical, s) : createPeriodArray(0, NP);
  const regulatoryArr = plAssumptions.regulatory ? getActiveRow(plAssumptions.regulatory, s) : createPeriodArray(0, NP);
  const pharmacovigilanceArr = plAssumptions.pharmacovigilance ? getActiveRow(plAssumptions.pharmacovigilance, s) : createPeriodArray(0, NP);
  const patentsArr = plAssumptions.patents ? getActiveRow(plAssumptions.patents, s) : createPeriodArray(0, NP);

  const commercialSales = createPeriodArray(0, NP);
  const gAndA = createPeriodArray(0, NP);
  const rAndD = createPeriodArray(0, NP);
  const operations = createPeriodArray(0, NP);
  const quality = createPeriodArray(0, NP);
  const clinical = createPeriodArray(0, NP);
  const regulatory = createPeriodArray(0, NP);
  const pharmacovigilance = createPeriodArray(0, NP);
  const patents = createPeriodArray(0, NP);
  const totalOpEx = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    // OpEx items are stored as positive values in assumptions;
    // negate for P&L display (expenses are negative).
    commercialSales[i] = safeNumber(-Math.abs(commercialSalesArr[i]));
    gAndA[i] = safeNumber(-Math.abs(gAndAArr[i]));
    rAndD[i] = safeNumber(-Math.abs(rAndDArr[i]));
    operations[i] = safeNumber(-Math.abs(operationsArr[i]));
    quality[i] = safeNumber(-Math.abs(qualityArr[i]));
    clinical[i] = safeNumber(-Math.abs(clinicalArr[i]));
    regulatory[i] = safeNumber(-Math.abs(regulatoryArr[i]));
    pharmacovigilance[i] = safeNumber(-Math.abs(pharmacovigilanceArr[i]));
    patents[i] = safeNumber(-Math.abs(patentsArr[i]));
    totalOpEx[i] = safeNumber(
      commercialSales[i] + gAndA[i] + rAndD[i] +
      operations[i] + quality[i] + clinical[i] +
      regulatory[i] + pharmacovigilance[i] + patents[i]
    );
  }

  // ---- EBITDA ----
  const ebitda = createPeriodArray(0, NP);
  const ebitdaMargin = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    ebitda[i] = safeNumber(grossProfit[i] + totalOpEx[i]);
    ebitdaMargin[i] = safeDivide(ebitda[i], totalRevenue[i]);
  }

  // ---- D&A and EBIT ----
  const dAndAArr = getActiveRow(plAssumptions.dAndA, s);
  const dAndA = createPeriodArray(0, NP);
  const ebit = createPeriodArray(0, NP);
  const ebitMargin = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    dAndA[i] = safeNumber(-Math.abs(dAndAArr[i]));
    ebit[i] = safeNumber(ebitda[i] + dAndA[i]);
    ebitMargin[i] = safeDivide(ebit[i], totalRevenue[i]);
  }

  // ---- #3: Financial Costs (interest, bank fees, etc.) ----
  const financialCostsArr = plAssumptions.financialCosts
    ? getActiveRow(plAssumptions.financialCosts, s)
    : createPeriodArray(0, NP);
  const financialCosts = createPeriodArray(0, NP);
  const ebt = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    financialCosts[i] = safeNumber(-Math.abs(financialCostsArr[i] ?? 0));
    ebt[i] = safeNumber(ebit[i] + financialCosts[i]);
  }

  // ---- Income Tax (on EBT, not EBIT) ----
  const taxRateArr = getActiveRow(plAssumptions.taxRate, s);
  const incomeTax = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    incomeTax[i] = ebt[i] > 0 ? safeNumber(-ebt[i] * taxRateArr[i]) : 0;
  }

  // ---- Net Income ----
  const netIncome = createPeriodArray(0, NP);
  const netIncomeMargin = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    netIncome[i] = safeNumber(ebt[i] + incomeTax[i]);
    netIncomeMargin[i] = safeDivide(netIncome[i], totalRevenue[i]);
  }

  // ---- #5: Cumulative Net Income ----
  const cumulativeNetIncome = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    cumulativeNetIncome[i] = i === 0
      ? netIncome[0]
      : safeNumber(cumulativeNetIncome[i - 1] + netIncome[i]);
  }

  // ---- Free Cash Flow ----
  // Working Capital Change: automatic calculation from days-based inputs
  // WC[0] = -(Revenue/365 × recvDays) + (|COGS|/365 × payDays) - (|COGS|/365 × invDays)
  // WC[i] = -(ΔRevenue/365 × recvDays) + (Δ|COGS|/365 × payDays) - (Δ|COGS|/365 × invDays)
  const workingCapitalChange = createPeriodArray(0, NP);
  const capitalExpenditure = createPeriodArray(0, NP);
  const freeCashFlow = createPeriodArray(0, NP);
  const cumulativeFCF = createPeriodArray(0, NP);

  const recvDays = fcfBridge.receivableDays ?? 0;
  const payDays = fcfBridge.payableDays ?? 0;
  const invDays = fcfBridge.inventoryDays ?? 0;

  for (let i = 0; i < NP; i++) {
    // Compute WC change from days
    const rev = totalRevenue[i];
    const absCogs = Math.abs(cogs[i]);

    if (i === 0) {
      // Year 0: full balance build-up
      workingCapitalChange[i] = safeNumber(
        -(rev / 365 * recvDays) + (absCogs / 365 * payDays) - (absCogs / 365 * invDays),
      );
    } else {
      // Year 1+: delta-based
      const prevRev = totalRevenue[i - 1];
      const prevAbsCogs = Math.abs(cogs[i - 1]);
      const deltaRev = rev - prevRev;
      const deltaCogs = absCogs - prevAbsCogs;
      workingCapitalChange[i] = safeNumber(
        -(deltaRev / 365 * recvDays) + (deltaCogs / 365 * payDays) - (deltaCogs / 365 * invDays),
      );
    }

    capitalExpenditure[i] = safeNumber(fcfBridge.capitalExpenditure[i] ?? 0);

    // FCF = Net Income - D&A (add back depreciation: subtract the negative D&A)
    //       + Working Capital Change + CapEx
    freeCashFlow[i] = safeNumber(
      netIncome[i] - dAndA[i] + workingCapitalChange[i] + capitalExpenditure[i],
    );

    cumulativeFCF[i] =
      i === 0
        ? freeCashFlow[0]
        : safeNumber(cumulativeFCF[i - 1] + freeCashFlow[i]);
  }

  return {
    netSupplyRevenueByCountry,
    totalNetSupplyRevenue,
    totalRoyaltyIncome,
    totalMilestoneIncome,
    totalRevenue,
    cogs,
    otherIncome,
    grossProfit,
    grossMargin,
    commercialSales,
    gAndA,
    rAndD,
    operations,
    quality,
    clinical,
    regulatory,
    pharmacovigilance,
    patents,
    totalOpEx,
    ebitda,
    ebitdaMargin,
    dAndA,
    ebit,
    ebitMargin,
    financialCosts,
    ebt,
    incomeTax,
    netIncome,
    netIncomeMargin,
    cumulativeNetIncome,
    workingCapitalChange,
    capitalExpenditure,
    freeCashFlow,
    cumulativeFCF,
  };
}

// ============================================================
// 4. WACC Outputs
// ============================================================

export function computeWACCOutputs(
  wacc: WACCInputs,
  scenario: Scenario,
): WACCOutputs {
  const costOfEquity: [number, number, number] = [0, 0, 0];
  const afterTaxCostOfDebt: [number, number, number] = [0, 0, 0];
  const waccArr: [number, number, number] = [0, 0, 0];

  for (let s = 0; s < 3; s++) {
    // CAPM: Ke = Rf + Beta * ERP
    costOfEquity[s] = safeNumber(
      wacc.riskFreeRate[s] + wacc.beta[s] * wacc.equityRiskPremium[s],
    );

    // After-tax cost of debt: Kd * (1 - T)
    afterTaxCostOfDebt[s] = safeNumber(
      wacc.preTaxCostOfDebt[s] * (1 - wacc.taxRate[s]),
    );

    // WACC = Ke * E% + Kd_AT * (1 - E%)
    const equityWeight = wacc.equityPct[s];
    const debtWeight = 1 - equityWeight;
    waccArr[s] = safeNumber(
      costOfEquity[s] * equityWeight + afterTaxCostOfDebt[s] * debtWeight,
    );
  }

  const activeWACC = waccArr[scenario - 1];

  return {
    costOfEquity,
    afterTaxCostOfDebt,
    wacc: waccArr,
    activeWACC,
  };
}

// ============================================================
// 7. IRR (Internal Rate of Return) — Newton-Raphson
// ============================================================

/**
 * Compute the Internal Rate of Return for a series of cash flows.
 * Uses Newton-Raphson iteration. Returns null if it fails to converge
 * or if all cash flows are zero.
 */
export function computeIRR(cashFlows: number[]): number | null {
  if (cashFlows.every((cf) => cf === 0)) return null;

  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return null;

  // Always use bisection — more robust than Newton-Raphson for
  // biosimilar cash flow profiles (many leading zeros, large swings)
  return computeIRRBisection(cashFlows);
}

/**
 * Bisection fallback for IRR when Newton-Raphson fails.
 */
function computeIRRBisection(cashFlows: number[]): number | null {
  let lo = -0.99;
  let hi = 2.0;  // max 200% IRR — reasonable upper bound for biosimilars
  const maxIter = 300;
  const tol = 1e-9;

  const npvAt = (r: number): number => {
    let sum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + r, t);
      if (!isFinite(factor) || factor === 0) return NaN;
      sum += cashFlows[t] / factor;
    }
    return sum;
  };

  let fLo = npvAt(lo);
  if (!isFinite(fLo)) return null;

  for (let iter = 0; iter < maxIter; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAt(mid);
    if (!isFinite(fMid)) return null;

    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) {
      return mid;
    }

    if ((fLo > 0 && fMid > 0) || (fLo < 0 && fMid < 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }

  return null;
}

// ============================================================
// 5. NPV Outputs
// ============================================================

export function computeNPVOutputs(
  plOutputs: PLOutputs,
  waccOutputs: WACCOutputs,
  npvRisk: NPVRiskInputs,
  config: ModelConfig,
  countries: { loeYear: number }[],
): NPVOutputs {
  const activeWACC = waccOutputs.activeWACC;
  const pc = computePeriodConfig(config);
  const NP = pc.numPeriods;
  const loeIdx = getEarliestLoeIndex(countries, pc.startYear);

  const ebit = [...plOutputs.ebit];
  const daAddBack = plOutputs.dAndA.map((d) => -d);
  const incomeTax = [...plOutputs.incomeTax];
  const wcChange = [...plOutputs.workingCapitalChange];
  const capex = [...plOutputs.capitalExpenditure];
  const fcf = [...plOutputs.freeCashFlow];

  // ---- Cumulative FCF ----
  const cumulativeFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    cumulativeFCF[i] = i === 0 ? fcf[0] : safeNumber(cumulativeFCF[i - 1] + fcf[i]);
  }

  // ---- Discount Rate (flat across periods) ----
  const discountRate = createPeriodArray(activeWACC, NP);

  // ---- Discount Factor (mid-period convention) ----
  // Mid-period discounting: DF[i] = 1 / (1+WACC)^(i - loeIdx + 0.5)
  // The +0.5 shift means cash at LOE year is discounted by half a year (mid-period convention).
  const discountFactor = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    const yearsFromLOE = i - loeIdx;
    discountFactor[i] = safeNumber(1 / Math.pow(1 + activeWACC, yearsFromLOE + 0.5));
  }

  // ---- Discounted FCF ----
  const discountedFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    discountedFCF[i] = safeNumber(fcf[i] * discountFactor[i]);
  }

  // ---- Cumulative Discounted FCF ----
  const cumulativeDiscountedFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    cumulativeDiscountedFCF[i] =
      i === 0
        ? discountedFCF[0]
        : safeNumber(cumulativeDiscountedFCF[i - 1] + discountedFCF[i]);
  }

  // ---- Risk-Adjusted FCF ----
  const cumulativePoS = npvRisk.cumulativePoS;
  const riskAdjustedFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    riskAdjustedFCF[i] = safeNumber(fcf[i] * (cumulativePoS[i] ?? 1));
  }

  // ---- Risk-Adjusted Discounted FCF ----
  const riskAdjustedDiscountedFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    riskAdjustedDiscountedFCF[i] = safeNumber(
      riskAdjustedFCF[i] * discountFactor[i],
    );
  }

  // ---- Cumulative Risk-Adjusted Discounted FCF ----
  const cumulativeRiskAdjDiscountedFCF = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    cumulativeRiskAdjDiscountedFCF[i] =
      i === 0
        ? riskAdjustedDiscountedFCF[0]
        : safeNumber(
            cumulativeRiskAdjDiscountedFCF[i - 1] +
              riskAdjustedDiscountedFCF[i],
          );
  }

  // ---- Terminal Value (Gordon Growth Model) ----
  let terminalValue = 0;
  let discountedTerminalValue = 0;
  if (config.terminalValueEnabled) {
    const lastFCF = fcf[NP - 1];
    const g = config.terminalValueGrowthRate;
    if (activeWACC > g) {
      terminalValue = (lastFCF * (1 + g)) / (activeWACC - g);
      discountedTerminalValue = terminalValue * discountFactor[NP - 1];
    }
  }

  // ---- KPIs ----
  const npv = discountedFCF.reduce((sum, v) => sum + v, 0);
  const rnpv = riskAdjustedDiscountedFCF.reduce((sum, v) => sum + v, 0);
  const npvWithTV = npv + discountedTerminalValue;
  // For risk-adjusted: use last period's PoS
  const riskAdjTV = discountedTerminalValue * (cumulativePoS[NP - 1] ?? 1);
  const rnpvWithTV = rnpv + riskAdjTV;
  // IRR: compute from LOE onwards (pre-launch cash flows distort IRR)
  // Include one period before LOE to capture the investment outflow
  const irrStartIdx = Math.max(0, loeIdx - 1);
  const irr = computeIRR(fcf.slice(irrStartIdx));
  const rirr = computeIRR(riskAdjustedFCF.slice(irrStartIdx));
  const moneyAtRisk = Math.min(...cumulativeFCF, 0); // cap at 0, never positive
  const fundingNeed = Math.min(...fcf);

  // Payback undiscounted: first year where cumulative FCF crosses from negative to positive
  // Uses full timeline — captures pre-launch investment then recovery
  let paybackUndiscounted: number | null = null;
  let seenNegativeCum = false;
  for (let i = 0; i < NP; i++) {
    if (cumulativeFCF[i] < 0) seenNegativeCum = true;
    if (seenNegativeCum && cumulativeFCF[i] > 0) {
      paybackUndiscounted = pc.startYear + i;
      break;
    }
  }

  // Payback discounted: same logic on cumulative discounted FCF
  let paybackDiscounted: number | null = null;
  let seenNegativeDiscCum = false;
  for (let i = 0; i < NP; i++) {
    if (cumulativeDiscountedFCF[i] < 0) seenNegativeDiscCum = true;
    if (seenNegativeDiscCum && cumulativeDiscountedFCF[i] > 0) {
      paybackDiscounted = pc.startYear + i;
      break;
    }
  }

  // Break-even year: first year where annual FCF turns positive AFTER a negative year
  let breakEvenYear: number | null = null;
  let seenNegativeFCF = false;
  for (let i = 0; i < NP; i++) {
    if (fcf[i] < 0) seenNegativeFCF = true;
    if (seenNegativeFCF && fcf[i] > 0) {
      breakEvenYear = pc.startYear + i;
      break;
    }
  }

  // Payback from launch: accumulate FCF starting from launch year only
  // This isolates the product economics from pre-launch milestone cash
  const earliestLaunchIdx = countries.length > 0
    ? Math.min(...countries.map(c => (c as any).biosimilarLaunchPeriodIndex ?? loeIdx))
    : loeIdx;

  let paybackFromLaunchUndiscounted: number | null = null;
  let cumFCFFromLaunch = 0;
  for (let i = earliestLaunchIdx; i < NP; i++) {
    cumFCFFromLaunch += fcf[i];
    if (cumFCFFromLaunch > 0) {
      paybackFromLaunchUndiscounted = i - earliestLaunchIdx; // years from launch
      break;
    }
  }

  // Discounted payback from launch: same logic on discounted FCF starting from launch
  let discountedPaybackFromLaunch: number | null = null;
  let cumDiscFCFFromLaunch = 0;
  for (let i = earliestLaunchIdx; i < NP; i++) {
    cumDiscFCFFromLaunch += discountedFCF[i];
    if (cumDiscFCFFromLaunch > 0) {
      discountedPaybackFromLaunch = i - earliestLaunchIdx; // years from launch
      break;
    }
  }

  // Legacy aliases kept for backward compat
  const breakEvenFromLaunchYears = paybackFromLaunchUndiscounted;
  const discountedPaybackYears = discountedPaybackFromLaunch;

  let peakEbitValue = -Infinity;
  let peakEbitYear: number | null = null;
  for (let i = 0; i < NP; i++) {
    if (ebit[i] > peakEbitValue) {
      peakEbitValue = ebit[i];
      peakEbitYear = pc.startYear + i;
    }
  }
  if (!isFinite(peakEbitValue)) {
    peakEbitValue = 0;
    peakEbitYear = null;
  }

  return {
    ebit,
    daAddBack,
    incomeTax,
    wcChange,
    capex,
    fcf,
    cumulativeFCF,
    discountRate,
    discountFactor,
    discountedFCF,
    cumulativeDiscountedFCF,
    riskAdjustedFCF,
    riskAdjustedDiscountedFCF,
    cumulativeRiskAdjDiscountedFCF,
    terminalValue,
    discountedTerminalValue,
    npvWithTV,
    rnpvWithTV,
    npv,
    rnpv,
    irr,
    rirr,
    moneyAtRisk,
    fundingNeed,
    paybackUndiscounted,
    paybackDiscounted,
    breakEvenYear,
    breakEvenFromLaunchYears,
    discountedPaybackYears,
    paybackFromLaunchUndiscounted,
    discountedPaybackFromLaunch,
    peakEbitYear,
    peakEbitValue,
  };
}

// ============================================================
// 6. Decision Tree Outputs
// ============================================================

export function computeDecisionTreeOutputs(
  gates: DecisionTreeGate[],
  npvOutputs: NPVOutputs,
): DecisionTreeOutputs {
  const cumulativePoS =
    gates.length > 0
      ? gates.reduce((product, gate) => product * gate.probability, 1)
      : 1;

  const enpv = safeNumber(npvOutputs.npv * cumulativePoS);
  const enpvFromRnpv = safeNumber(npvOutputs.rnpv * cumulativePoS);

  return {
    cumulativePoS,
    enpv,
    enpvFromRnpv,
  };
}

// ============================================================
// 8. Partner View Outputs
// ============================================================

export function computePartnerViewOutputs(
  countryOutputs: CountryOutputs[],
  countries: CountryAssumptions[],
  config: ModelConfig,
  npvOutputs: NPVOutputs,
): PartnerViewOutputs | null {
  if (!config.partnerViewEnabled) return null;

  const pc = computePeriodConfig(config);
  const NP = pc.numPeriods;

  const perCountry: PartnerCountryOutputs[] = [];
  const totalPartnerRevenue = createPeriodArray(0, NP);
  const totalPartnerNetIncome = createPeriodArray(0, NP);
  const totalPartnerFCF = createPeriodArray(0, NP);

  for (let c = 0; c < countryOutputs.length; c++) {
    const co = countryOutputs[c];
    const ca = countries[c];
    const fxRate = ca.fxRate;

    const partnerRevenue = createPeriodArray(0, NP);
    const partnerCOGS = createPeriodArray(0, NP);
    const partnerGrossProfit = createPeriodArray(0, NP);
    const partnerTotalCosts = createPeriodArray(0, NP);
    const partnerEBITDA = createPeriodArray(0, NP);
    const partnerNetIncome = createPeriodArray(0, NP);
    const partnerFCF = createPeriodArray(0, NP);

    for (let i = 0; i < NP; i++) {
      // Partner revenue = partner net sales (after GTN deductions, local currency)
      // This is what the partner actually receives after discounts to buyers
      partnerRevenue[i] = safeNumber(co.partnerNetSales[i]);

      // Partner COGS = supply price paid to us (grossSupplyRevenue)
      // For Mode 2 (fixed), grossSupplyRevenue is in EUR — convert to local currency
      if (config.apiPricingModel === 'fixed') {
        const fx = fxRate[i] !== 0 ? fxRate[i] : 1;
        partnerCOGS[i] = safeNumber(co.grossSupplyRevenue[i] * fx);
      } else {
        partnerCOGS[i] = safeNumber(co.grossSupplyRevenue[i]);
      }

      // Partner GP = revenue - COGS - milestones paid to us - royalties paid to us
      // Milestones are in model currency — convert to local
      const fx = fxRate[i] !== 0 ? fxRate[i] : 1;
      const milestonesLocal = safeNumber(co.milestoneIncome[i] * fx);
      partnerGrossProfit[i] = safeNumber(
        partnerRevenue[i] - partnerCOGS[i] - milestonesLocal - co.royaltyIncome[i]
      );

      // Partner costs = sum of all cost lines
      partnerTotalCosts[i] = safeNumber(
        (ca.partnerPromotionalCosts[i] ?? 0) +
        (ca.partnerSalesForceCosts[i] ?? 0) +
        (ca.partnerDistributionCosts[i] ?? 0) +
        (ca.partnerManufacturingCosts[i] ?? 0) +
        (ca.partnerGAndA[i] ?? 0)
      );

      // Partner EBITDA = GP - costs
      partnerEBITDA[i] = safeNumber(partnerGrossProfit[i] - partnerTotalCosts[i]);

      // Partner NI = EBITDA * (1 - tax) if positive, else EBITDA (no tax benefit)
      const taxRate = ca.partnerTaxRate ?? 0.25;
      partnerNetIncome[i] = partnerEBITDA[i] > 0
        ? safeNumber(partnerEBITDA[i] * (1 - taxRate))
        : partnerEBITDA[i];

      // Partner FCF = NI (simplified)
      partnerFCF[i] = partnerNetIncome[i];

      // Aggregate to totals (FX convert to model currency)
      const fxConvert = fx !== 0 ? fx : 1;
      totalPartnerRevenue[i] += safeDivide(partnerRevenue[i], fxConvert);
      totalPartnerNetIncome[i] += safeDivide(partnerNetIncome[i], fxConvert);
      totalPartnerFCF[i] += safeDivide(partnerFCF[i], fxConvert);
    }

    perCountry.push({
      partnerRevenue,
      partnerCOGS,
      partnerGrossProfit,
      partnerTotalCosts,
      partnerEBITDA,
      partnerNetIncome,
      partnerFCF,
    });
  }

  // Discount partner FCF using same discount factors from NPV outputs
  let partnerNPV = 0;
  let partnerRNPV = 0;
  for (let i = 0; i < NP; i++) {
    const discountedFCF = safeNumber(totalPartnerFCF[i] * npvOutputs.discountFactor[i]);
    partnerNPV += discountedFCF;
    // Risk-adjusted: use same PoS
    const riskFactor = npvOutputs.riskAdjustedFCF[i] !== 0 && npvOutputs.fcf[i] !== 0
      ? safeDivide(npvOutputs.riskAdjustedFCF[i], npvOutputs.fcf[i])
      : 1;
    partnerRNPV += safeNumber(discountedFCF * riskFactor);
  }

  const totalNPV = npvOutputs.npv + partnerNPV;
  const companyNPVShare = totalNPV !== 0 ? safeDivide(npvOutputs.npv, totalNPV) : 0.5;
  const partnerNPVShare = totalNPV !== 0 ? safeDivide(partnerNPV, totalNPV) : 0.5;

  return {
    perCountry,
    totalPartnerRevenue,
    totalPartnerNetIncome,
    totalPartnerFCF,
    partnerNPV,
    partnerRNPV,
    companyNPVShare,
    partnerNPVShare,
  };
}

// ============================================================
// Formatting Utilities
// ============================================================

/**
 * Format a number with thousand separators and optional decimal places.
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (!isFinite(value)) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as a percentage.
 * The input is assumed to be a decimal (0.15 => "15.0%").
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (!isFinite(value)) return '-';
  return (
    (value * 100).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + '%'
  );
}

/**
 * Format a number with a currency symbol.
 */
export function formatCurrency(
  value: number,
  currency: string,
  decimals: number = 0,
): string {
  if (!isFinite(value)) return '-';
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${formatted}`;
}
