// ──────────────────────────────────────────────────────────────
// Interactive Excel — P&L (output) sheet builder
// ──────────────────────────────────────────────────────────────
// Aggregates country-level outputs into a consolidated P&L.
// All cells use formulaValue — no editable inputs.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { getEarliestLoeIndex } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  writeFormulaRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';

export function addInteractivePLSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('P&L');
  const sheetKey = 'pl';
  const { countries, plOutputs, config, periodLabels, periodConfig } = ctx;

  const NP = periodLabels.length;
  const colCount = NP + 1;
  const earliestLoeIdx = getEarliestLoeIndex(countries, periodConfig.startYear);

  setupSheet(ws, NP);
  writePeriodHeader(ws, periodLabels);

  let row = 3;

  // ════════════════════════════════════════════════════════════
  // Section: Revenue
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Revenue', colCount);
  row++;

  // Per-country supply revenue rows
  for (let ci = 0; ci < countries.length; ci++) {
    const countryName = countries[ci].name;

    if (config.apiPricingModel === 'percentage') {
      // FX-convert: netSupplyRevenue / fxRate
      writeFormulaRow(ws, row, `Supply Revenue — ${countryName}`, NP, (p) => {
        const nsRev = cellMap.get(`countryModel_${ci}`, 'netSupplyRevenue', p).toFormula();
        const fx = cellMap.get(`countryModel_${ci}`, 'fxRate', p).toFormula();
        return `IFERROR(${nsRev}/${fx},0)`;
      }, plOutputs.netSupplyRevenueByCountry[ci], cellMap, sheetKey, `supplyRevByCountry_${ci}`, NUM_FMT.integer);
    } else {
      // Fixed mode — already in model currency
      writeFormulaRow(ws, row, `Supply Revenue — ${countryName}`, NP, (p) => {
        return cellMap.get(`countryModel_${ci}`, 'netSupplyRevenue', p).toFormula();
      }, plOutputs.netSupplyRevenueByCountry[ci], cellMap, sheetKey, `supplyRevByCountry_${ci}`, NUM_FMT.integer);
    }
    row++;
  }

  // Net Supply Revenue (total)
  writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
    const refs = countries.map((_, ci) =>
      cellMap.get(sheetKey, `supplyRevByCountry_${ci}`, p).toLocal(),
    );
    return refs.join('+');
  }, plOutputs.totalNetSupplyRevenue, cellMap, sheetKey, 'totalNetSupplyRevenue', NUM_FMT.integer, true);
  row++;

  // Global Partner Net Sales (FX-converted, for tiered royalty calc)
  writeFormulaRow(ws, row, 'Global Partner Net Sales', NP, (p) => {
    const refs = countries.map((_, ci) => {
      const pns = cellMap.get(`countryModel_${ci}`, 'partnerNetSales', p).toFormula();
      const fx = cellMap.get(`countryModel_${ci}`, 'fxRate', p).toFormula();
      return `IFERROR(${pns}/${fx},0)`;
    });
    return refs.join('+');
  }, plOutputs.totalRoyaltyIncome.map(() => 0), cellMap, sheetKey, 'globalPartnerNetSales', NUM_FMT.integer);
  row++;

  // Royalty Income (flat per-country FX-converted — used when useFixedRoyaltyRate=1)
  writeFormulaRow(ws, row, 'Royalty (Flat Rate)', NP, (p) => {
    const refs = countries.map((_, ci) => {
      const royalty = cellMap.get(`countryModel_${ci}`, 'royaltyIncome', p).toFormula();
      const fx = cellMap.get(`countryModel_${ci}`, 'fxRate', p).toFormula();
      return `IFERROR(${royalty}/${fx},0)`;
    });
    return refs.join('+');
  }, plOutputs.totalRoyaltyIncome, cellMap, sheetKey, 'royaltyFlat', NUM_FMT.integer);
  row++;

  // Royalty Income (tiered marginal — used when useFixedRoyaltyRate=0)
  // Build tiered royalty formula using tier thresholds and rates from Config
  writeFormulaRow(ws, row, 'Royalty (Tiered)', NP, (p) => {
    const gpns = cellMap.get(sheetKey, 'globalPartnerNetSales', p).toLocal();
    // Build marginal tier formula: MIN(remaining, bracketSize) * rate for each tier
    const tierFormulas: string[] = [];
    for (let t = 0; t < 5; t++) {
      const threshRef = cellMap.getScalar('config', `royaltyTier_${t}_threshold`).toFormula();
      const rateRef = cellMap.getScalar('config', `royaltyTier_${t}_rate`).toFormula();
      if (t === 0) {
        tierFormulas.push(`MIN(${gpns},${threshRef})*${rateRef}`);
      } else {
        const prevThreshRef = cellMap.getScalar('config', `royaltyTier_${t - 1}_threshold`).toFormula();
        tierFormulas.push(`MAX(0,MIN(${gpns},${threshRef})-${prevThreshRef})*${rateRef}`);
      }
    }
    return tierFormulas.join('+');
  }, plOutputs.totalRoyaltyIncome, cellMap, sheetKey, 'royaltyTiered', NUM_FMT.integer);
  row++;

  // Royalty Income (switch: IF useFixedRoyaltyRate=1 then flat, else tiered)
  const useFixedRef = cellMap.getScalar('config', 'useFixedRoyaltyRate').toFormula();
  writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
    const flat = cellMap.get(sheetKey, 'royaltyFlat', p).toLocal();
    const tiered = cellMap.get(sheetKey, 'royaltyTiered', p).toLocal();
    return `IF(${useFixedRef}=1,${flat},${tiered})`;
  }, plOutputs.totalRoyaltyIncome, cellMap, sheetKey, 'totalRoyaltyIncome', NUM_FMT.integer);
  row++;

  // Milestone Income (no FX — already in model currency)
  writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
    const refs = countries.map((_, ci) =>
      cellMap.get(`countryModel_${ci}`, 'milestoneIncome', p).toFormula(),
    );
    return refs.join('+');
  }, plOutputs.totalMilestoneIncome, cellMap, sheetKey, 'totalMilestoneIncome', NUM_FMT.integer);
  row++;

  // Total Revenue
  writeFormulaRow(ws, row, 'Total Revenue', NP, (p) => {
    const nsRev = cellMap.get(sheetKey, 'totalNetSupplyRevenue', p).toLocal();
    const royalty = cellMap.get(sheetKey, 'totalRoyaltyIncome', p).toLocal();
    const milestone = cellMap.get(sheetKey, 'totalMilestoneIncome', p).toLocal();
    return `${nsRev}+${royalty}+${milestone}`;
  }, plOutputs.totalRevenue, cellMap, sheetKey, 'totalRevenue', NUM_FMT.integer, true);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: COGS
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Cost of Goods Sold', colCount);
  row++;

  const apiCostRef = cellMap.getScalar('config', 'apiCostPerGram').toFormula();
  const cogsInflRef = cellMap.getScalar('config', 'cogsInflation').toFormula();
  const cogsOverheadRef = cellMap.getScalar('config', 'cogsOverhead').toFormula();
  const cogsMarkupRef = cellMap.getScalar('config', 'cogsMarkup').toFormula();

  // #2: COGS now includes overhead % and markup %
  writeFormulaRow(ws, row, 'COGS', NP, (p) => {
    if (p < earliestLoeIdx) return '0';
    const yearsFromLOE = p - earliestLoeIdx;
    const gramsRefs = countries.map((_, ci) =>
      cellMap.get(`countryModel_${ci}`, 'apiGramsSupplied', p).toFormula(),
    );
    const gramsSum = gramsRefs.length === 1 ? gramsRefs[0] : `(${gramsRefs.join('+')})`;
    return `-(${apiCostRef}*POWER(1+${cogsInflRef},${yearsFromLOE})*(1+${cogsOverheadRef})*(1+${cogsMarkupRef})*${gramsSum})`;
  }, plOutputs.cogs, cellMap, sheetKey, 'cogs', NUM_FMT.integer);
  row++;

  // #6: Other Income
  writeFormulaRow(ws, row, 'Other Income', NP, (p) => {
    return cellMap.get('plAssumptions', 'otherIncome_active', p).toFormula();
  }, plOutputs.otherIncome, cellMap, sheetKey, 'otherIncome', NUM_FMT.integer);
  row++;

  // Gross Profit (includes Other Income)
  writeFormulaRow(ws, row, 'Gross Profit', NP, (p) => {
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    const cogs = cellMap.get(sheetKey, 'cogs', p).toLocal();
    const oi = cellMap.get(sheetKey, 'otherIncome', p).toLocal();
    return `${rev}+${cogs}+${oi}`;
  }, plOutputs.grossProfit, cellMap, sheetKey, 'grossProfit', NUM_FMT.integer, true);
  row++;

  // Gross Margin %
  writeFormulaRow(ws, row, 'Gross Margin %', NP, (p) => {
    const gp = cellMap.get(sheetKey, 'grossProfit', p).toLocal();
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    return `IFERROR(${gp}/${rev},0)`;
  }, plOutputs.grossMargin, cellMap, sheetKey, 'grossMargin', NUM_FMT.percent);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Operating Expenses
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Operating Expenses', colCount);
  row++;

  // Commercial & Sales
  writeFormulaRow(ws, row, 'Commercial & Sales', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'commercialSales_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.commercialSales, cellMap, sheetKey, 'commercialSales', NUM_FMT.integer);
  row++;

  // G&A
  writeFormulaRow(ws, row, 'G&A', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'gAndA_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.gAndA, cellMap, sheetKey, 'gAndA', NUM_FMT.integer);
  row++;

  // R&D
  writeFormulaRow(ws, row, 'R&D', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'rAndD_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.rAndD, cellMap, sheetKey, 'rAndD', NUM_FMT.integer);
  row++;

  // Total OpEx
  writeFormulaRow(ws, row, 'Total OpEx', NP, (p) => {
    const cs = cellMap.get(sheetKey, 'commercialSales', p).toLocal();
    const ga = cellMap.get(sheetKey, 'gAndA', p).toLocal();
    const rd = cellMap.get(sheetKey, 'rAndD', p).toLocal();
    return `${cs}+${ga}+${rd}`;
  }, plOutputs.totalOpEx, cellMap, sheetKey, 'totalOpEx', NUM_FMT.integer, true);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Earnings
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Earnings', colCount);
  row++;

  // EBITDA
  writeFormulaRow(ws, row, 'EBITDA', NP, (p) => {
    const gp = cellMap.get(sheetKey, 'grossProfit', p).toLocal();
    const opex = cellMap.get(sheetKey, 'totalOpEx', p).toLocal();
    return `${gp}+${opex}`;
  }, plOutputs.ebitda, cellMap, sheetKey, 'ebitda', NUM_FMT.integer, true);
  row++;

  // EBITDA Margin
  writeFormulaRow(ws, row, 'EBITDA Margin %', NP, (p) => {
    const ebitda = cellMap.get(sheetKey, 'ebitda', p).toLocal();
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    return `IFERROR(${ebitda}/${rev},0)`;
  }, plOutputs.ebitdaMargin, cellMap, sheetKey, 'ebitdaMargin', NUM_FMT.percent);
  row++;

  // D&A
  writeFormulaRow(ws, row, 'D&A', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'dAndA_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.dAndA, cellMap, sheetKey, 'dAndA', NUM_FMT.integer);
  row++;

  // EBIT
  writeFormulaRow(ws, row, 'EBIT', NP, (p) => {
    const ebitda = cellMap.get(sheetKey, 'ebitda', p).toLocal();
    const da = cellMap.get(sheetKey, 'dAndA', p).toLocal();
    return `${ebitda}+${da}`;
  }, plOutputs.ebit, cellMap, sheetKey, 'ebit', NUM_FMT.integer, true);
  row++;

  // EBIT Margin
  writeFormulaRow(ws, row, 'EBIT Margin %', NP, (p) => {
    const ebit = cellMap.get(sheetKey, 'ebit', p).toLocal();
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    return `IFERROR(${ebit}/${rev},0)`;
  }, plOutputs.ebitMargin, cellMap, sheetKey, 'ebitMargin', NUM_FMT.percent);
  row++;

  // #3: Financial Costs
  writeFormulaRow(ws, row, 'Financial Costs', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'financialCosts_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.financialCosts, cellMap, sheetKey, 'financialCosts', NUM_FMT.integer);
  row++;

  // EBT (Earnings Before Tax)
  writeFormulaRow(ws, row, 'EBT', NP, (p) => {
    const ebit = cellMap.get(sheetKey, 'ebit', p).toLocal();
    const fc = cellMap.get(sheetKey, 'financialCosts', p).toLocal();
    return `${ebit}+${fc}`;
  }, plOutputs.ebt, cellMap, sheetKey, 'ebt', NUM_FMT.integer, true);
  row++;

  // Income Tax (on EBT)
  writeFormulaRow(ws, row, 'Income Tax', NP, (p) => {
    const ebt = cellMap.get(sheetKey, 'ebt', p).toLocal();
    const taxRate = cellMap.get('plAssumptions', 'taxRate_active', p).toFormula();
    return `IF(${ebt}>0,-${ebt}*${taxRate},0)`;
  }, plOutputs.incomeTax, cellMap, sheetKey, 'incomeTax', NUM_FMT.integer);
  row++;

  // Net Income
  writeFormulaRow(ws, row, 'Net Income', NP, (p) => {
    const ebt = cellMap.get(sheetKey, 'ebt', p).toLocal();
    const tax = cellMap.get(sheetKey, 'incomeTax', p).toLocal();
    return `${ebt}+${tax}`;
  }, plOutputs.netIncome, cellMap, sheetKey, 'netIncome', NUM_FMT.integer, true);
  row++;

  // Net Income Margin
  writeFormulaRow(ws, row, 'Net Income Margin %', NP, (p) => {
    const ni = cellMap.get(sheetKey, 'netIncome', p).toLocal();
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    return `IFERROR(${ni}/${rev},0)`;
  }, plOutputs.netIncomeMargin, cellMap, sheetKey, 'netIncomeMargin', NUM_FMT.percent);
  row++;

  // #5: Cumulative Net Income
  writeFormulaRow(ws, row, 'Cumulative Net Income', NP, (p) => {
    const ni = cellMap.get(sheetKey, 'netIncome', p).toLocal();
    if (p === 0) return ni;
    const prev = cellMap.get(sheetKey, 'cumulativeNetIncome', p - 1).toLocal();
    return `${prev}+${ni}`;
  }, plOutputs.cumulativeNetIncome, cellMap, sheetKey, 'cumulativeNetIncome', NUM_FMT.integer, true);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Free Cash Flow
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Free Cash Flow', colCount);
  row++;

  // D&A Add-Back
  writeFormulaRow(ws, row, 'D&A Add-Back', NP, (p) => {
    const da = cellMap.get(sheetKey, 'dAndA', p).toLocal();
    return `-${da}`;
  }, plOutputs.dAndA.map(d => -d), cellMap, sheetKey, 'daAddBack', NUM_FMT.integer);
  row++;

  // Working Capital Change
  writeFormulaRow(ws, row, 'Working Capital Change', NP, (p) => {
    return cellMap.get('plAssumptions', 'workingCapital', p).toFormula();
  }, plOutputs.workingCapitalChange, cellMap, sheetKey, 'wcChange', NUM_FMT.integer);
  row++;

  // Capital Expenditure
  writeFormulaRow(ws, row, 'Capital Expenditure', NP, (p) => {
    return cellMap.get('plAssumptions', 'capitalExpenditure', p).toFormula();
  }, plOutputs.capitalExpenditure, cellMap, sheetKey, 'capex', NUM_FMT.integer);
  row++;

  // Free Cash Flow
  writeFormulaRow(ws, row, 'Free Cash Flow', NP, (p) => {
    const ni = cellMap.get(sheetKey, 'netIncome', p).toLocal();
    const daAdd = cellMap.get(sheetKey, 'daAddBack', p).toLocal();
    const wc = cellMap.get(sheetKey, 'wcChange', p).toLocal();
    const capex = cellMap.get(sheetKey, 'capex', p).toLocal();
    return `${ni}+${daAdd}+${wc}+${capex}`;
  }, plOutputs.freeCashFlow, cellMap, sheetKey, 'fcf', NUM_FMT.integer, true);
  row++;

  // Cumulative FCF
  writeFormulaRow(ws, row, 'Cumulative FCF', NP, (p) => {
    const fcf = cellMap.get(sheetKey, 'fcf', p).toLocal();
    if (p === 0) return fcf;
    const prev = cellMap.get(sheetKey, 'cumulativeFCF', p - 1).toLocal();
    return `${prev}+${fcf}`;
  }, plOutputs.cumulativeFCF, cellMap, sheetKey, 'cumulativeFCF', NUM_FMT.integer, true);
  row++;
}
