// ──────────────────────────────────────────────────────────────
// Interactive Excel — P&L (output) sheet builder (10-slot version)
// ──────────────────────────────────────────────────────────────
// Aggregates across all 10 country model slots into a consolidated P&L.
// Inactive slots contribute 0 (their model sheets already return 0).
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
import { MAX_COUNTRY_SLOTS } from './configSheet';

/** Generate array [0, 1, 2, ..., MAX_COUNTRY_SLOTS-1] for iteration. */
const SLOT_INDICES = Array.from({ length: MAX_COUNTRY_SLOTS }, (_, i) => i);

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

  // Per-slot supply revenue rows (all 10 — inactive ones contribute 0)
  for (const si of SLOT_INDICES) {
    const countryName = si < countries.length ? countries[si].name : `Country ${si + 1}`;
    const cachedValues = si < countries.length
      ? (plOutputs.netSupplyRevenueByCountry[si] ?? Array(NP).fill(0))
      : Array(NP).fill(0);

    if (config.apiPricingModel === 'percentage') {
      // FX-convert: netSupplyRevenue / fxRate
      writeFormulaRow(ws, row, `Supply Revenue — ${countryName}`, NP, (p) => {
        const nsRev = cellMap.get(`countryModel_${si}`, 'netSupplyRevenue', p).toFormula();
        const fx = cellMap.get(`countryModel_${si}`, 'fxRate', p).toFormula();
        return `IFERROR(${nsRev}/${fx},0)`;
      }, cachedValues, cellMap, sheetKey, `supplyRevByCountry_${si}`, NUM_FMT.integer);
    } else {
      // Fixed mode — already in model currency
      writeFormulaRow(ws, row, `Supply Revenue — ${countryName}`, NP, (p) => {
        return cellMap.get(`countryModel_${si}`, 'netSupplyRevenue', p).toFormula();
      }, cachedValues, cellMap, sheetKey, `supplyRevByCountry_${si}`, NUM_FMT.integer);
    }
    row++;
  }

  // Net Supply Revenue (total across all 10 slots)
  writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
    const refs = SLOT_INDICES.map(si =>
      cellMap.get(sheetKey, `supplyRevByCountry_${si}`, p).toLocal(),
    );
    return refs.join('+');
  }, plOutputs.totalNetSupplyRevenue, cellMap, sheetKey, 'totalNetSupplyRevenue', NUM_FMT.integer, true);
  row++;

  // Royalty Income (FX-converted sum across all 10 slots)
  writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
    const refs = SLOT_INDICES.map(si => {
      const royalty = cellMap.get(`countryModel_${si}`, 'royaltyIncome', p).toFormula();
      const fx = cellMap.get(`countryModel_${si}`, 'fxRate', p).toFormula();
      return `IFERROR(${royalty}/${fx},0)`;
    });
    return refs.join('+');
  }, plOutputs.totalRoyaltyIncome, cellMap, sheetKey, 'totalRoyaltyIncome', NUM_FMT.integer);
  row++;

  // Milestone Income (no FX — already in model currency, sum across all 10 slots)
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

  const cogsInputMethodRef = cellMap.getScalar('config', 'cogsInputMethod').toFormula();
  const apiCostRef = cellMap.getScalar('config', 'apiCostPerGram').toFormula();
  const apiCostPerUnitRef = cellMap.getScalar('config', 'apiCostPerUnit').toFormula();
  const cogsInflRef = cellMap.getScalar('config', 'cogsInflation').toFormula();
  const cogsOverheadRef = cellMap.getScalar('config', 'cogsOverhead').toFormula();
  const cogsMarkupRef = cellMap.getScalar('config', 'cogsMarkup').toFormula();

  // COGS: aggregate grams and units across all 10 slots
  writeFormulaRow(ws, row, 'COGS', NP, (p) => {
    if (p < earliestLoeIdx) return '0';
    const yearsFromLOE = p - earliestLoeIdx;
    const gramsRefs = SLOT_INDICES.map(si =>
      cellMap.get(`countryModel_${si}`, 'apiGramsSupplied', p).toFormula(),
    );
    const gramsSum = `(${gramsRefs.join('+')})`;
    const unitsRefs = SLOT_INDICES.map(si =>
      cellMap.get(`countryModel_${si}`, 'biosimilarVolume', p).toFormula(),
    );
    const unitsSum = `(${unitsRefs.join('+')})`;
    const inflFactor = `POWER(1+${cogsInflRef},${yearsFromLOE})`;
    const overheadMarkup = `(1+${cogsOverheadRef})*(1+${cogsMarkupRef})`;
    // IF(method="perUnit", -costPerUnit*infl*OH*MU*units, -costPerGram*infl*OH*MU*grams)
    return `IF(${cogsInputMethodRef}="perUnit",-(${apiCostPerUnitRef}*${inflFactor}*${overheadMarkup}*${unitsSum}),-(${apiCostRef}*${inflFactor}*${overheadMarkup}*${gramsSum}))`;
  }, plOutputs.cogs, cellMap, sheetKey, 'cogs', NUM_FMT.integer);
  row++;

  // Other Income
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

  // Operations
  writeFormulaRow(ws, row, 'Operations', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'operations_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.operations, cellMap, sheetKey, 'operations', NUM_FMT.integer);
  row++;

  // Quality
  writeFormulaRow(ws, row, 'Quality', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'quality_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.quality, cellMap, sheetKey, 'quality', NUM_FMT.integer);
  row++;

  // Clinical
  writeFormulaRow(ws, row, 'Clinical', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'clinical_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.clinical, cellMap, sheetKey, 'clinical', NUM_FMT.integer);
  row++;

  // Regulatory
  writeFormulaRow(ws, row, 'Regulatory', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'regulatory_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.regulatory, cellMap, sheetKey, 'regulatory', NUM_FMT.integer);
  row++;

  // Pharmacovigilance
  writeFormulaRow(ws, row, 'Pharmacovigilance', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'pharmacovigilance_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.pharmacovigilance, cellMap, sheetKey, 'pharmacovigilance', NUM_FMT.integer);
  row++;

  // Patents
  writeFormulaRow(ws, row, 'Patents', NP, (p) => {
    const ref = cellMap.get('plAssumptions', 'patents_active', p).toFormula();
    return `-ABS(${ref})`;
  }, plOutputs.patents, cellMap, sheetKey, 'patents', NUM_FMT.integer);
  row++;

  // Total OpEx (all 9 categories)
  writeFormulaRow(ws, row, 'Total OpEx', NP, (p) => {
    const cs = cellMap.get(sheetKey, 'commercialSales', p).toLocal();
    const ga = cellMap.get(sheetKey, 'gAndA', p).toLocal();
    const rd = cellMap.get(sheetKey, 'rAndD', p).toLocal();
    const ops = cellMap.get(sheetKey, 'operations', p).toLocal();
    const qual = cellMap.get(sheetKey, 'quality', p).toLocal();
    const clin = cellMap.get(sheetKey, 'clinical', p).toLocal();
    const reg = cellMap.get(sheetKey, 'regulatory', p).toLocal();
    const pv = cellMap.get(sheetKey, 'pharmacovigilance', p).toLocal();
    const pat = cellMap.get(sheetKey, 'patents', p).toLocal();
    return `${cs}+${ga}+${rd}+${ops}+${qual}+${clin}+${reg}+${pv}+${pat}`;
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

  // Financial Costs
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
    const da = cellMap.get(sheetKey, 'dAndA', p).toLocal();
    return `-${da}`;
  }, plOutputs.dAndA.map(d => -d), cellMap, sheetKey, 'daAddBack', NUM_FMT.integer);
  row++;

  // Working Capital Change (days-based automatic calculation)
  writeFormulaRow(ws, row, 'Working Capital Change', NP, (p) => {
    const recvDaysRef = cellMap.getScalar('plAssumptions', 'receivableDays').toFormula();
    const payDaysRef = cellMap.getScalar('plAssumptions', 'payableDays').toFormula();
    const invDaysRef = cellMap.getScalar('plAssumptions', 'inventoryDays').toFormula();
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
