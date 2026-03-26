// ──────────────────────────────────────────────────────────────
// Interactive Excel — NPV Analysis (output) sheet builder
// ──────────────────────────────────────────────────────────────
// DCF, discounting, and KPI scalars.
// WACC is referenced from Config sheet.
// Risk PoS values are written as editable inputs.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { getEarliestLoeIndex } from '../../../types';
import { NUM_FMT, LABEL_FONT, BOLD_VALUE_FONT } from '../../excelStyles';
import {
  cellAddr,
  formulaValue,
  writeFormulaRow, writeInputRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';

export function addInteractiveNPVSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('NPV Analysis');
  const sheetKey = 'npv';
  const { countries, npvOutputs, periodLabels, periodConfig } = ctx;

  const NP = periodLabels.length;
  const colCount = NP + 1;
  const loeIdx = getEarliestLoeIndex(countries, periodConfig.startYear);

  setupSheet(ws, NP);
  writePeriodHeader(ws, periodLabels);

  let row = 3;

  // ════════════════════════════════════════════════════════════
  // Section: DCF Components
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'DCF Components', colCount);
  row++;

  // Free Cash Flow (reference P&L)
  writeFormulaRow(ws, row, 'Free Cash Flow', NP, (p) => {
    return cellMap.get('pl', 'fcf', p).toFormula();
  }, npvOutputs.fcf, cellMap, sheetKey, 'fcf', NUM_FMT.integer, true);
  row++;

  // Cumulative FCF (reference P&L)
  writeFormulaRow(ws, row, 'Cumulative FCF', NP, (p) => {
    return cellMap.get('pl', 'cumulativeFCF', p).toFormula();
  }, npvOutputs.cumulativeFCF, cellMap, sheetKey, 'cumulativeFCF', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Discounting
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Discounting', colCount);
  row++;

  // WACC reference from Config sheet
  const waccRef = cellMap.getScalar('config', 'wacc').toFormula();

  // Discount Factor — mid-period convention: DF = 1/(1+WACC)^(i - loeIdx + 0.5)
  writeFormulaRow(ws, row, 'Discount Factor', NP, (p) => {
    const yearsFromLOE = p - loeIdx;
    return `1/(1+${waccRef})^(${yearsFromLOE}+0.5)`;
  }, npvOutputs.discountFactor, cellMap, sheetKey, 'discountFactor', NUM_FMT.decimal2);
  row++;

  // Discounted FCF
  writeFormulaRow(ws, row, 'Discounted FCF', NP, (p) => {
    const fcf = cellMap.get(sheetKey, 'fcf', p).toLocal();
    const df = cellMap.get(sheetKey, 'discountFactor', p).toLocal();
    return `${fcf}*${df}`;
  }, npvOutputs.discountedFCF, cellMap, sheetKey, 'discountedFCF', NUM_FMT.integer);
  row++;

  // Cumulative Discounted FCF
  writeFormulaRow(ws, row, 'Cumulative Discounted FCF', NP, (p) => {
    const dFcf = cellMap.get(sheetKey, 'discountedFCF', p).toLocal();
    if (p === 0) return dFcf;
    const prev = cellMap.get(sheetKey, 'cumulativeDiscountedFCF', p - 1).toLocal();
    return `${prev}+${dFcf}`;
  }, npvOutputs.cumulativeDiscountedFCF, cellMap, sheetKey, 'cumulativeDiscountedFCF', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Risk Adjustment
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Risk Adjustment', colCount);
  row++;

  // Cumulative PoS (editable input — exported from current values)
  writeInputRow(ws, row, 'Cumulative PoS', ctx.npvRisk.cumulativePoS,
    NP, cellMap, sheetKey, 'riskPoS', NUM_FMT.percent);
  row++;

  // Risk-Adj FCF
  writeFormulaRow(ws, row, 'Risk-Adj FCF', NP, (p) => {
    const fcf = cellMap.get(sheetKey, 'fcf', p).toLocal();
    const pos = cellMap.get(sheetKey, 'riskPoS', p).toLocal();
    return `${fcf}*${pos}`;
  }, npvOutputs.riskAdjustedFCF, cellMap, sheetKey, 'riskAdjFCF', NUM_FMT.integer);
  row++;

  // Risk-Adj Discounted FCF
  writeFormulaRow(ws, row, 'Risk-Adj Discounted FCF', NP, (p) => {
    const rFcf = cellMap.get(sheetKey, 'riskAdjFCF', p).toLocal();
    const df = cellMap.get(sheetKey, 'discountFactor', p).toLocal();
    return `${rFcf}*${df}`;
  }, npvOutputs.riskAdjustedDiscountedFCF, cellMap, sheetKey, 'riskAdjDiscFCF', NUM_FMT.integer);
  row++;

  // Cumulative Risk-Adj Discounted FCF
  writeFormulaRow(ws, row, 'Cum Risk-Adj Disc FCF', NP, (p) => {
    const rdf = cellMap.get(sheetKey, 'riskAdjDiscFCF', p).toLocal();
    if (p === 0) return rdf;
    const prev = cellMap.get(sheetKey, 'cumRiskAdjDiscFCF', p - 1).toLocal();
    return `${prev}+${rdf}`;
  }, npvOutputs.cumulativeRiskAdjDiscountedFCF, cellMap, sheetKey, 'cumRiskAdjDiscFCF', NUM_FMT.integer);
  row++;

  // Blank
  row++;
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: KPIs (scalar values below period data)
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Key Performance Indicators', colCount);
  row++;

  // Helper: range string for a field across all periods
  const rangeStr = (field: string): string => {
    const firstRef = cellMap.get(sheetKey, field, 0).toLocal();
    const lastRef = cellMap.get(sheetKey, field, NP - 1).toLocal();
    return `${firstRef}:${lastRef}`;
  };

  // Helper: range string from launch period (for IRR from launch)
  const launchRangeStr = (field: string): string => {
    const firstRef = cellMap.get(sheetKey, field, loeIdx).toLocal();
    const lastRef = cellMap.get(sheetKey, field, NP - 1).toLocal();
    return `${firstRef}:${lastRef}`;
  };

  // NPV
  const npvLabel = ws.getCell(row, 1);
  npvLabel.value = 'NPV';
  npvLabel.font = BOLD_VALUE_FONT;
  const npvCell = ws.getCell(row, 2);
  npvCell.value = formulaValue(`SUM(${rangeStr('discountedFCF')})`, npvOutputs.npv);
  npvCell.numFmt = NUM_FMT.integer;
  npvCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'npvValue', ws.name, cellAddr(row, 2));
  row++;

  // rNPV
  const rnpvLabel = ws.getCell(row, 1);
  rnpvLabel.value = 'rNPV';
  rnpvLabel.font = BOLD_VALUE_FONT;
  const rnpvCell = ws.getCell(row, 2);
  rnpvCell.value = formulaValue(`SUM(${rangeStr('riskAdjDiscFCF')})`, npvOutputs.rnpv);
  rnpvCell.numFmt = NUM_FMT.integer;
  rnpvCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'rnpvValue', ws.name, cellAddr(row, 2));
  row++;

  // IRR (from launch period)
  const irrLabel = ws.getCell(row, 1);
  irrLabel.value = 'IRR (from launch)';
  irrLabel.font = BOLD_VALUE_FONT;
  const irrCell = ws.getCell(row, 2);
  irrCell.value = formulaValue(`IFERROR(IRR(${launchRangeStr('fcf')}),"N/A")`, npvOutputs.irr ?? 0);
  irrCell.numFmt = NUM_FMT.percent;
  irrCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'irr', ws.name, cellAddr(row, 2));
  row++;

  // Money at Risk
  const marLabel = ws.getCell(row, 1);
  marLabel.value = 'Money at Risk';
  marLabel.font = BOLD_VALUE_FONT;
  const marCell = ws.getCell(row, 2);
  marCell.value = formulaValue(`MIN(${rangeStr('cumulativeFCF')})`, npvOutputs.moneyAtRisk);
  marCell.numFmt = NUM_FMT.integer;
  marCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'moneyAtRisk', ws.name, cellAddr(row, 2));
  row++;

  // Payback Year (Undiscounted)
  const pbLabel = ws.getCell(row, 1);
  pbLabel.value = 'Payback Year (Undiscounted)';
  pbLabel.font = LABEL_FONT;
  const pbCell = ws.getCell(row, 2);
  pbCell.value = npvOutputs.paybackUndiscounted ?? 'N/A';
  pbCell.numFmt = NUM_FMT.year;
  pbCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'paybackUndiscounted', ws.name, cellAddr(row, 2));
  row++;

  // Payback Year (Discounted)
  const pbdLabel = ws.getCell(row, 1);
  pbdLabel.value = 'Payback Year (Discounted)';
  pbdLabel.font = LABEL_FONT;
  const pbdCell = ws.getCell(row, 2);
  pbdCell.value = npvOutputs.paybackDiscounted ?? 'N/A';
  pbdCell.numFmt = NUM_FMT.year;
  pbdCell.font = BOLD_VALUE_FONT;
  cellMap.registerScalar(sheetKey, 'paybackDiscounted', ws.name, cellAddr(row, 2));
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Terminal Value (Gordon Growth Model)
  // ════════════════════════════════════════════════════════════
  if (ctx.config.terminalValueEnabled) {
    row++;
    writeSection(ws, row, 'Terminal Value (Gordon Growth Model)', colCount);
    row++;

    const tvGrowthRef = cellMap.getScalar('config', 'terminalValueGrowthRate').toFormula();
    const lastFcfRef = cellMap.get(sheetKey, 'fcf', NP - 1).toLocal();
    const lastDfRef = cellMap.get(sheetKey, 'discountFactor', NP - 1).toLocal();

    // Terminal Value (undiscounted)
    const tvLabel = ws.getCell(row, 1);
    tvLabel.value = 'Terminal Value (undiscounted)';
    tvLabel.font = BOLD_VALUE_FONT;
    const tvCell = ws.getCell(row, 2);
    tvCell.value = formulaValue(
      `IFERROR(${lastFcfRef}*(1+${tvGrowthRef})/(${waccRef}-${tvGrowthRef}),0)`,
      npvOutputs.terminalValue,
    );
    tvCell.numFmt = NUM_FMT.integer;
    tvCell.font = BOLD_VALUE_FONT;
    cellMap.registerScalar(sheetKey, 'terminalValue', ws.name, cellAddr(row, 2));
    row++;

    // Discounted Terminal Value
    const dtvLabel = ws.getCell(row, 1);
    dtvLabel.value = 'Discounted Terminal Value';
    dtvLabel.font = BOLD_VALUE_FONT;
    const dtvCell = ws.getCell(row, 2);
    const tvRef = cellMap.getScalar(sheetKey, 'terminalValue').toLocal();
    dtvCell.value = formulaValue(`${tvRef}*${lastDfRef}`, npvOutputs.discountedTerminalValue);
    dtvCell.numFmt = NUM_FMT.integer;
    dtvCell.font = BOLD_VALUE_FONT;
    cellMap.registerScalar(sheetKey, 'discountedTerminalValue', ws.name, cellAddr(row, 2));
    row++;

    // NPV incl. TV
    const npvTvLabel = ws.getCell(row, 1);
    npvTvLabel.value = 'NPV incl. TV';
    npvTvLabel.font = BOLD_VALUE_FONT;
    const npvTvCell = ws.getCell(row, 2);
    const npvRef = cellMap.getScalar(sheetKey, 'npvValue').toLocal();
    const dtvRefLocal = cellMap.getScalar(sheetKey, 'discountedTerminalValue').toLocal();
    npvTvCell.value = formulaValue(`${npvRef}+${dtvRefLocal}`, npvOutputs.npvWithTV);
    npvTvCell.numFmt = NUM_FMT.integer;
    npvTvCell.font = BOLD_VALUE_FONT;
    cellMap.registerScalar(sheetKey, 'npvWithTV', ws.name, cellAddr(row, 2));
    row++;

    // rNPV incl. TV
    const rnpvTvLabel = ws.getCell(row, 1);
    rnpvTvLabel.value = 'rNPV incl. TV';
    rnpvTvLabel.font = BOLD_VALUE_FONT;
    const rnpvTvCell = ws.getCell(row, 2);
    const rnpvRef = cellMap.getScalar(sheetKey, 'rnpvValue').toLocal();
    const lastPosRef = cellMap.get(sheetKey, 'riskPoS', NP - 1).toLocal();
    rnpvTvCell.value = formulaValue(
      `${rnpvRef}+${dtvRefLocal}*${lastPosRef}`,
      npvOutputs.rnpvWithTV,
    );
    rnpvTvCell.numFmt = NUM_FMT.integer;
    rnpvTvCell.font = BOLD_VALUE_FONT;
    cellMap.registerScalar(sheetKey, 'rnpvWithTV', ws.name, cellAddr(row, 2));
    row++;
  }
}
