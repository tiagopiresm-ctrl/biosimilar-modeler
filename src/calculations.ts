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
  const biosimilarShareArr = getActiveRow(country.biosimilarMarketShare, s);
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

  if (config.volumeForecastMethod === 'atcShare') {
    // ATC Share method:
    //   Historical: direct input (no adjustment)
    //   Forecast: ATC class volume × molecule share (no adjustment)
    const atcGrowthArr = getActiveRow(country.atcClassGrowth, s);

    // Build ATC class volume: historical = direct input, forecast = compound growth
    const atcVolume = createPeriodArray(0, NP);
    for (let i = 0; i < NP; i++) {
      if (i < forecastStartIndex) {
        atcVolume[i] = country.atcClassVolume[i] ?? 0;
      } else {
        const prev = i === 0 ? 0 : atcVolume[i - 1];
        atcVolume[i] = safeNumber(prev * (1 + (atcGrowthArr[i] ?? 0)));
      }
    }

    // Molecule volume: historical = direct input, forecast = ATC volume × molecule share
    for (let i = 0; i < NP; i++) {
      if (i < forecastStartIndex) {
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
      if (i < forecastStartIndex) {
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
    if (i < forecastStart) {
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

  // ---- Pre-compute gated biosimilar share for originator derivation ----
  const gatedBiosimilarShare = createPeriodArray(0, NP);
  for (let i = 0; i < NP; i++) {
    gatedBiosimilarShare[i] = i < country.biosimilarLaunchPeriodIndex ? 0 : biosimilarShareArr[i];
  }

  // ---- B. Originator (DERIVED: 100% - sum(generics) - biosimilar) ----
  const originatorShare = createPeriodArray(0, NP);
  const originatorVolume = createPeriodArray(0, NP);
  const originatorSales = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    originatorShare[i] = safeNumber(
      Math.max(0, 1 - totalGenericShare[i] - gatedBiosimilarShare[i]),
    );
    originatorVolume[i] = safeNumber(marketVolume[i] * originatorShare[i]);
    originatorSales[i] = safeNumber(originatorVolume[i] * originatorRefPrice[i]);
  }

  // ---- D. Biosimilar ----
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

    biosimilarShare[i] = biosimilarShareArr[i];
    biosimilarVolume[i] = safeNumber(marketVolume[i] * biosimilarShare[i]);
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

    // API Grams Supplied = volume / unitsPerGramOfAPI × (1 + overage)
    const unitsPerGram = config.unitsPerGramOfAPI > 0 ? config.unitsPerGramOfAPI : 1;
    apiGramsSupplied[i] = safeNumber(
      (biosimilarVolume[i] / unitsPerGram) * (1 + config.manufacturingOverage),
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
      // Gross Supply Revenue = price per gram × total grams supplied (incl. overage)
      grossSupplyRevenue[i] = safeNumber(apiGramsSupplied[i] * apiPricePerGram[i]);
      // Back-calculate supply price per unit for display
      supplyPrice[i] = safeDivide(grossSupplyRevenue[i], biosimilarVolume[i]);
    }

    apiPricePerKg[i] = safeNumber(apiPricePerGram[i] * 1000);

    // 5. Net Supply Revenue = Gross Supply Revenue (no GTN deduction on our side)
    gtnDeduction[i] = 0;
    netSupplyRevenue[i] = grossSupplyRevenue[i];

    // 7. Royalty Income = % of Partner Net Sales (available in both modes)
    royaltyIncome[i] = safeNumber(partnerNetSales[i] * royaltyRatePctArr[i]);

    // 8. Milestone payments (not scenario-driven)
    milestoneIncome[i] = safeNumber(country.milestonePayments[i] ?? 0);
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

  // ---- Tiered Royalty Override ----
  // If useFixedRoyaltyRate is false, replace totalRoyaltyIncome with tiered marginal royalties
  // based on global (FX-converted) partner net sales
  if (!config.useFixedRoyaltyRate && config.royaltyTiers && config.royaltyTiers.length > 0) {
    const tiers = config.royaltyTiers;
    for (let i = 0; i < NP; i++) {
      // Compute global partner net sales (FX-converted to model currency)
      let globalPNS = 0;
      for (let c = 0; c < countryOutputs.length; c++) {
        const fxRate = countries[c]?.fxRate[i] ?? 1;
        const fx = fxRate !== 0 ? fxRate : 1;
        globalPNS += safeDivide(countryOutputs[c].partnerNetSales[i], fx);
      }

      // Apply tiered marginal rates
      let tieredRoyalty = 0;
      let remaining = globalPNS;
      let prevThreshold = 0;
      for (const tier of tiers) {
        if (remaining <= 0) break;
        const bracketSize = tier.threshold - prevThreshold;
        const applicable = Math.min(remaining, bracketSize);
        tieredRoyalty += applicable * tier.rate;
        remaining -= applicable;
        prevThreshold = tier.threshold;
      }

      totalRoyaltyIncome[i] = safeNumber(tieredRoyalty);

      // Recalculate totalRevenue for this period
      totalRevenue[i] = safeNumber(
        totalNetSupplyRevenue[i] + totalRoyaltyIncome[i] + totalMilestoneIncome[i],
      );
    }
  }

  // ---- COGS (Volume-driven: cost/gram × inflation × overhead × markup × total API grams) ----
  // #2: Added overhead % and markup % to COGS calculation (matches company Excel COPs structure)
  const apiCostPerGram = config.apiCostPerGram;
  const cogsInflation = config.cogsInflationRate;
  const cogsOverhead = config.cogsOverheadPct ?? 0;
  const cogsMarkup = config.cogsMarkupPct ?? 0;
  const cogs = createPeriodArray(0, NP);
  const earliestLoeIdx = getEarliestLoeIndex(countries, pc.startYear);

  for (let i = 0; i < NP; i++) {
    if (i >= earliestLoeIdx) {
      let totalGrams = 0;
      for (let c = 0; c < countryOutputs.length; c++) {
        totalGrams += countryOutputs[c].apiGramsSupplied[i];
      }
      const yearsFromLOE = i - earliestLoeIdx;
      // Base cost × inflation → Real COGs → ×(1+overhead) → ×(1+markup) → Final COGs
      const costPerGramAtT = apiCostPerGram
        * Math.pow(1 + cogsInflation, yearsFromLOE)
        * (1 + cogsOverhead)
        * (1 + cogsMarkup);
      cogs[i] = safeNumber(-(costPerGramAtT * totalGrams));
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

  const commercialSales = createPeriodArray(0, NP);
  const gAndA = createPeriodArray(0, NP);
  const rAndD = createPeriodArray(0, NP);
  const totalOpEx = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    // OpEx items are stored as positive values in assumptions;
    // negate for P&L display (expenses are negative).
    commercialSales[i] = safeNumber(-Math.abs(commercialSalesArr[i]));
    gAndA[i] = safeNumber(-Math.abs(gAndAArr[i]));
    rAndD[i] = safeNumber(-Math.abs(rAndDArr[i]));
    totalOpEx[i] = safeNumber(commercialSales[i] + gAndA[i] + rAndD[i]);
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
  const workingCapitalChange = createPeriodArray(0, NP);
  const capitalExpenditure = createPeriodArray(0, NP);
  const freeCashFlow = createPeriodArray(0, NP);
  const cumulativeFCF = createPeriodArray(0, NP);

  for (let i = 0; i < NP; i++) {
    workingCapitalChange[i] = safeNumber(fcfBridge.workingCapitalChange[i] ?? 0);
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

  const maxIterations = 200;
  const tolerance = 1e-9;
  let rate = 0.10;

  for (let iter = 0; iter < maxIterations; iter++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      if (!isFinite(factor) || factor === 0) break;
      npv += cashFlows[t] / factor;
      if (t > 0) {
        dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (dNpv === 0 || !isFinite(dNpv)) {
      rate += 0.01;
      continue;
    }

    const newRate = rate - npv / dNpv;

    if (!isFinite(newRate) || newRate < -0.999) {
      return computeIRRBisection(cashFlows);
    }

    rate = newRate;
  }

  return computeIRRBisection(cashFlows);
}

/**
 * Bisection fallback for IRR when Newton-Raphson fails.
 */
function computeIRRBisection(cashFlows: number[]): number | null {
  let lo = -0.99;
  let hi = 10.0;
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

  // ---- Discount Factor ----
  // LOE (loeIdx) = 1.0
  // Forward from LOE: DF[i] = DF[i-1] / (1 + WACC)
  // Backward from LOE: DF[i] = DF[i+1] * (1 + WACC)
  const discountFactor = createPeriodArray(0, NP);
  discountFactor[loeIdx] = 1.0;

  for (let i = loeIdx + 1; i < NP; i++) {
    discountFactor[i] = safeNumber(
      discountFactor[i - 1] / (1 + activeWACC),
    );
  }

  for (let i = loeIdx - 1; i >= 0; i--) {
    discountFactor[i] = safeNumber(
      discountFactor[i + 1] * (1 + activeWACC),
    );
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

  // ---- KPIs ----
  const npv = discountedFCF.reduce((sum, v) => sum + v, 0);
  const rnpv = riskAdjustedDiscountedFCF.reduce((sum, v) => sum + v, 0);
  const irr = computeIRR(fcf);
  const rirr = computeIRR(riskAdjustedFCF);
  const moneyAtRisk = Math.min(...cumulativeFCF);
  const fundingNeed = Math.min(...fcf);

  let paybackUndiscounted: number | null = null;
  for (let i = 0; i < NP; i++) {
    if (cumulativeFCF[i] > 0) {
      paybackUndiscounted = pc.startYear + i;
      break;
    }
  }

  let paybackDiscounted: number | null = null;
  for (let i = 0; i < NP; i++) {
    if (cumulativeDiscountedFCF[i] > 0) {
      paybackDiscounted = pc.startYear + i;
      break;
    }
  }

  let breakEvenYear: number | null = null;
  for (let i = 0; i < NP; i++) {
    if (fcf[i] > 0) {
      breakEvenYear = pc.startYear + i;
      break;
    }
  }

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
    npv,
    rnpv,
    irr,
    rirr,
    moneyAtRisk,
    fundingNeed,
    paybackUndiscounted,
    paybackDiscounted,
    breakEvenYear,
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
