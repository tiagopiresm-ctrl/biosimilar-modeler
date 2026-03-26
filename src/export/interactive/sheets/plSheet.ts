// ──────────────────────────────────────────────────────────────
// Interactive Excel — P&L (output) sheet — Clean standalone
// ──────────────────────────────────────────────────────────────
// Aggregates across ACTIVE countries only into a consolidated P&L.
// All cells are formulas. No mode switches — supply revenue is
// always OurVol x SupplyPrice, already resolved in Calculations.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { getEarliestLoeIndex } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  writeFormulaRow, writeInputRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';
import { getActiveRow } from '../../../calculations';

export function addInteractivePLSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('P&L');
  const sheetKey = 'pl';
  const { countries, plOutputs, periodLabels, periodConfig, config } = ctx;

  const NP = periodLabels.length;
  const colCount = NP + 1;
  const numCountries = countries.length;
  const earliestLoeIdx = getEarliestLoeIndex(countries, periodConfig.startYear);

  // Generate array of active country indices
  const SLOT_INDICES = Array.from({ length: numCountries }, (_, i) => i);

  setupSheet(ws, NP);
  writePeriodHeader(ws, periodLabels);

  let row = 3;

  // ════════════════════════════════════════════════════════════
  // Section: Revenue
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Revenue', colCount);
  row++;

  // Per-country supply revenue rows (FX-converted)
  for (const si of SLOT_INDICES) {
    const countryName = countries[si].name;
    const cachedValues = plOutputs.netSupplyRevenueByCountry[si] ?? Array(NP).fill(0);

    // Supply Revenue = grossSupplyRevenue / fxRate
    writeFormulaRow(ws, row, `Supply Revenue — ${countryName}`, NP, (p) => {
      const gsRev = cellMap.get(`countryModel_${si}`, 'grossSupplyRevenue', p).toFormula();
      const fx = cellMap.get(`countryModel_${si}`, 'fxRate', p).toFormula();
      return `IFERROR(${gsRev}/${fx},0)`;
    }, cachedValues, cellMap, sheetKey, `supplyRevByCountry_${si}`, NUM_FMT.integer);
    row++;
  }

  // Net Supply Revenue (total)
  writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
    const refs = SLOT_INDICES.map(si =>
      cellMap.get(sheetKey, `supplyRevByCountry_${si}`, p).toLocal(),
    );
    return refs.join('+');
  }, plOutputs.totalNetSupplyRevenue, cellMap, sheetKey, 'totalNetSupplyRevenue', NUM_FMT.integer, true);
  row++;

  // Royalty Income (FX-converted sum)
  writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
    const refs = SLOT_INDICES.map(si => {
      const royalty = cellMap.get(`countryModel_${si}`, 'royaltyIncome', p).toFormula();
      const fx = cellMap.get(`countryModel_${si}`, 'fxRate', p).toFormula();
      return `IFERROR(${royalty}/${fx},0)`;
    });
    return refs.join('+');
  }, plOutputs.totalRoyaltyIncome, cellMap, sheetKey, 'totalRoyaltyIncome', NUM_FMT.integer);
  row++;

  // Milestone Income (no FX)
  writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
    const refs = SLOT_INDICES.map(si =>
      cellMap.get(`countryModel_${si}`, 'milestoneIncome', p).toFormula(),
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

  const apiCostPerUnitRef = cellMap.getScalar('config', 'apiCostPerUnit').toFormula();
  const cogsInflRef = cellMap.getScalar('config', 'cogsInflation').toFormula();
  const cogsOverheadRef = cellMap.getScalar('config', 'cogsOverhead').toFormula();
  const cogsMarkupRef = cellMap.getScalar('config', 'cogsMarkup').toFormula();

  // COGS = -(apiCostPerUnit * (1+inflation)^years * (1+overhead) * (1+markup) * totalUnits)
  writeFormulaRow(ws, row, 'COGS', NP, (p) => {
    if (p < earliestLoeIdx) return '0';
    const yearsFromLOE = p - earliestLoeIdx;
    const unitsRefs = SLOT_INDICES.map(si =>
      cellMap.get(`countryModel_${si}`, 'biosimilarVolume', p).toFormula(),
    );
    const unitsSum = `(${unitsRefs.join('+')})`;
    const inflFactor = `POWER(1+${cogsInflRef},${yearsFromLOE})`;
    const overheadMarkup = `(1+${cogsOverheadRef})*(1+${cogsMarkupRef})`;
    return `-(${apiCostPerUnitRef}*${inflFactor}*${overheadMarkup}*${unitsSum})`;
  }, plOutputs.cogs, cellMap, sheetKey, 'cogs', NUM_FMT.integer);
  row++;

  // Other Income — simple input row
  {
    const activeOtherIncome = getActiveRow(ctx.plAssumptions.otherIncome, config.activeScenario);
    writeInputRow(ws, row, 'Other Income', activeOtherIncome,
      NP, cellMap, sheetKey, 'otherIncome', NUM_FMT.integer);
    row++;
  }

  // Gross Profit
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
  // Section: Operating Expenses (9 rows — simple inputs)
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Operating Expenses', colCount);
  row++;

  const opexCategories: Array<{ label: string; field: string; data: number[] }> = [
    { label: 'Commercial & Sales', field: 'commercialSales', data: getActiveRow(ctx.plAssumptions.commercialSales, config.activeScenario) },
    { label: 'G&A', field: 'gAndA', data: getActiveRow(ctx.plAssumptions.gAndA, config.activeScenario) },
    { label: 'R&D', field: 'rAndD', data: getActiveRow(ctx.plAssumptions.rAndD, config.activeScenario) },
    { label: 'Operations', field: 'operations', data: getActiveRow(ctx.plAssumptions.operations, config.activeScenario) },
    { label: 'Quality', field: 'quality', data: getActiveRow(ctx.plAssumptions.quality, config.activeScenario) },
    { label: 'Clinical', field: 'clinical', data: getActiveRow(ctx.plAssumptions.clinical, config.activeScenario) },
    { label: 'Regulatory', field: 'regulatory', data: getActiveRow(ctx.plAssumptions.regulatory, config.activeScenario) },
    { label: 'Pharmacovigilance', field: 'pharmacovigilance', data: getActiveRow(ctx.plAssumptions.pharmacovigilance, config.activeScenario) },
    { label: 'Patents', field: 'patents', data: getActiveRow(ctx.plAssumptions.patents, config.activeScenario) },
  ];

  // Write OpEx input rows
  for (const cat of opexCategories) {
    writeInputRow(ws, row, cat.label, cat.data,
      NP, cellMap, sheetKey, `opex_${cat.field}`, NUM_FMT.integer);
    row++;
  }

  // Total OpEx (formula: sum of all 9, negated)
  writeFormulaRow(ws, row, 'Total OpEx', NP, (p) => {
    const refs = opexCategories.map(cat =>
      cellMap.get(sheetKey, `opex_${cat.field}`, p).toLocal(),
    );
    return `-(${refs.map(r => `ABS(${r})`).join('+')})`;
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

  // D&A (input row)
  {
    const activeDandA = getActiveRow(ctx.plAssumptions.dAndA, config.activeScenario);
    writeInputRow(ws, row, 'D&A', activeDandA,
      NP, cellMap, sheetKey, 'dAndA_input', NUM_FMT.integer);
    row++;
  }

  // EBIT
  writeFormulaRow(ws, row, 'EBIT', NP, (p) => {
    const ebitda = cellMap.get(sheetKey, 'ebitda', p).toLocal();
    const da = cellMap.get(sheetKey, 'dAndA_input', p).toLocal();
    return `${ebitda}-ABS(${da})`;
  }, plOutputs.ebit, cellMap, sheetKey, 'ebit', NUM_FMT.integer, true);
  row++;

  // EBIT Margin
  writeFormulaRow(ws, row, 'EBIT Margin %', NP, (p) => {
    const ebit = cellMap.get(sheetKey, 'ebit', p).toLocal();
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    return `IFERROR(${ebit}/${rev},0)`;
  }, plOutputs.ebitMargin, cellMap, sheetKey, 'ebitMargin', NUM_FMT.percent);
  row++;

  // Financial Costs (input row)
  {
    const activeFinCosts = getActiveRow(ctx.plAssumptions.financialCosts, config.activeScenario);
    writeInputRow(ws, row, 'Financial Costs', activeFinCosts,
      NP, cellMap, sheetKey, 'financialCosts_input', NUM_FMT.integer);
    row++;
  }

  // EBT
  writeFormulaRow(ws, row, 'EBT', NP, (p) => {
    const ebit = cellMap.get(sheetKey, 'ebit', p).toLocal();
    const fc = cellMap.get(sheetKey, 'financialCosts_input', p).toLocal();
    return `${ebit}-ABS(${fc})`;
  }, plOutputs.ebt, cellMap, sheetKey, 'ebt', NUM_FMT.integer, true);
  row++;

  // Income Tax (on EBT, only if positive)
  const taxRateRef = cellMap.getScalar('config', 'taxRate').toFormula();
  writeFormulaRow(ws, row, 'Income Tax', NP, (p) => {
    const ebt = cellMap.get(sheetKey, 'ebt', p).toLocal();
    return `IF(${ebt}>0,-${ebt}*${taxRateRef},0)`;
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

  // Cumulative Net Income
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
    const da = cellMap.get(sheetKey, 'dAndA_input', p).toLocal();
    return `ABS(${da})`;
  }, plOutputs.dAndA.map(d => -d), cellMap, sheetKey, 'daAddBack', NUM_FMT.integer);
  row++;

  // Working Capital Change (auto from days in Config)
  const recvDaysRef = cellMap.getScalar('config', 'receivableDays').toFormula();
  const payDaysRef = cellMap.getScalar('config', 'payableDays').toFormula();
  const invDaysRef = cellMap.getScalar('config', 'inventoryDays').toFormula();

  writeFormulaRow(ws, row, 'Working Capital Change', NP, (p) => {
    const rev = cellMap.get(sheetKey, 'totalRevenue', p).toLocal();
    const cogsCurr = cellMap.get(sheetKey, 'cogs', p).toLocal();
    if (p === 0) {
      return `-(${rev}/365*${recvDaysRef})+(ABS(${cogsCurr})/365*${payDaysRef})-(ABS(${cogsCurr})/365*${invDaysRef})`;
    }
    const prevRev = cellMap.get(sheetKey, 'totalRevenue', p - 1).toLocal();
    const prevCogs = cellMap.get(sheetKey, 'cogs', p - 1).toLocal();
    return `-((${rev}-${prevRev})/365*${recvDaysRef})+((ABS(${cogsCurr})-ABS(${prevCogs}))/365*${payDaysRef})-((ABS(${cogsCurr})-ABS(${prevCogs}))/365*${invDaysRef})`;
  }, plOutputs.workingCapitalChange, cellMap, sheetKey, 'wcChange', NUM_FMT.integer);
  row++;

  // Capital Expenditure (input row)
  writeInputRow(ws, row, 'Capital Expenditure', ctx.fcfBridge.capitalExpenditure,
    NP, cellMap, sheetKey, 'capex', NUM_FMT.integer);
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
