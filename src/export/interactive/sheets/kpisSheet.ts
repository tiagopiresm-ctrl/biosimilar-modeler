// ──────────────────────────────────────────────────────────────
// Interactive Excel — KPIs (output) sheet builder
// ──────────────────────────────────────────────────────────────
// Simple label-value layout referencing NPV Analysis and Config.
// No period columns.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { NUM_FMT, LABEL_FONT, BOLD_VALUE_FONT, styleSectionRow } from '../../excelStyles';
import {
  cellAddr,
  formulaValue,
} from '../formulaHelpers';

export function addInteractiveKPIsSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('KPIs');
  const sheetKey = 'kpis';
  const { npvOutputs } = ctx;

  // Column widths
  ws.getColumn(1).width = 35;
  ws.getColumn(2).width = 20;

  // Freeze panes
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const COLS = 2;

  // ── Helpers ──

  const section = (row: number, label: string) => {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    styleSectionRow(r, COLS);
  };

  const writeKpiFormula = (
    row: number,
    label: string,
    formula: string,
    cachedValue: number | string,
    numFmt: string,
    registerAs?: string,
  ) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = LABEL_FONT;

    const val = ws.getCell(row, 2);
    if (typeof cachedValue === 'string') {
      val.value = cachedValue;
    } else {
      val.value = formulaValue(formula, cachedValue);
    }
    val.numFmt = numFmt;
    val.font = BOLD_VALUE_FONT;

    if (registerAs) {
      cellMap.registerScalar(sheetKey, registerAs, ws.name, cellAddr(row, 2));
    }
  };

  const writeKpiValue = (
    row: number,
    label: string,
    value: number | string | null,
    numFmt: string,
    registerAs?: string,
  ) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = LABEL_FONT;

    const val = ws.getCell(row, 2);
    val.value = value ?? 'N/A';
    val.numFmt = numFmt;
    val.font = BOLD_VALUE_FONT;

    if (registerAs) {
      cellMap.registerScalar(sheetKey, registerAs, ws.name, cellAddr(row, 2));
    }
  };

  let row = 1;

  // ════════════════════════════════════════════════════════════
  // Section: Valuation
  // ════════════════════════════════════════════════════════════
  section(row, 'Valuation');
  row++;

  // NPV
  const npvRef = cellMap.getScalar('npv', 'npvValue').toFormula();
  writeKpiFormula(row, 'NPV', npvRef, npvOutputs.npv, NUM_FMT.integer, 'npv');
  row++;

  // rNPV
  const rnpvRef = cellMap.getScalar('npv', 'rnpvValue').toFormula();
  writeKpiFormula(row, 'rNPV', rnpvRef, npvOutputs.rnpv, NUM_FMT.integer, 'rnpv');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Returns
  // ════════════════════════════════════════════════════════════
  section(row, 'Returns');
  row++;

  // IRR
  const irrRef = cellMap.getScalar('npv', 'irr').toFormula();
  writeKpiFormula(row, 'IRR', irrRef, npvOutputs.irr ?? 0, NUM_FMT.percent, 'irr');
  row++;

  // WACC
  const waccRef = cellMap.getScalar('config', 'wacc').toFormula();
  writeKpiFormula(row, 'WACC', waccRef, ctx.waccOutputs.activeWACC, NUM_FMT.percent, 'wacc');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Risk & Timing
  // ════════════════════════════════════════════════════════════
  section(row, 'Risk & Timing');
  row++;

  // Money at Risk
  const marRef = cellMap.getScalar('npv', 'moneyAtRisk').toFormula();
  writeKpiFormula(row, 'Money at Risk', marRef, npvOutputs.moneyAtRisk, NUM_FMT.integer, 'moneyAtRisk');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Payback
  // ════════════════════════════════════════════════════════════
  section(row, 'Payback');
  row++;

  // Payback Year (Undiscounted)
  const pbRef = cellMap.getScalar('npv', 'paybackUndiscounted').toFormula();
  writeKpiFormula(row, 'Payback Year (Undiscounted)', pbRef, npvOutputs.paybackUndiscounted ?? 'N/A', NUM_FMT.year, 'paybackUndiscounted');
  row++;

  // Payback Year (Discounted)
  const pbdRef = cellMap.getScalar('npv', 'paybackDiscounted').toFormula();
  writeKpiFormula(row, 'Payback Year (Discounted)', pbdRef, npvOutputs.paybackDiscounted ?? 'N/A', NUM_FMT.year, 'paybackDiscounted');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Peak Performance
  // ════════════════════════════════════════════════════════════
  section(row, 'Peak Performance');
  row++;

  writeKpiValue(row, 'Peak EBIT', npvOutputs.peakEbitValue, NUM_FMT.integer, 'peakEbit');
  row++;

  writeKpiValue(row, 'Peak EBIT Year', npvOutputs.peakEbitYear, NUM_FMT.year, 'peakEbitYear');
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Terminal Value (conditional)
  // ════════════════════════════════════════════════════════════
  if (ctx.config.terminalValueEnabled) {
    row++;
    section(row, 'Terminal Value');
    row++;

    try {
      const tvNpvRef = cellMap.getScalar('npv', 'npvWithTV').toFormula();
      writeKpiFormula(row, 'NPV incl. TV', tvNpvRef, npvOutputs.npvWithTV, NUM_FMT.integer, 'npvWithTV');
      row++;
    } catch { /* npvWithTV not registered if TV disabled */ }

    try {
      const tvRnpvRef = cellMap.getScalar('npv', 'rnpvWithTV').toFormula();
      writeKpiFormula(row, 'rNPV incl. TV', tvRnpvRef, npvOutputs.rnpvWithTV, NUM_FMT.integer, 'rnpvWithTV');
      row++;
    } catch { /* rnpvWithTV not registered if TV disabled */ }
  }
}
