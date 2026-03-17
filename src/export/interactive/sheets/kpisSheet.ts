// ──────────────────────────────────────────────────────────────
// Interactive Excel — KPIs (output) sheet builder
// ──────────────────────────────────────────────────────────────
// Simple label-value layout referencing NPV, WACC, and
// Decision Tree sheets. No period columns.
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
  const { npvOutputs, dtOutputs } = ctx;

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

  // eNPV = NPV * Decision Tree cumulative PoS
  const dtPosRef = cellMap.getScalar('decisionTree', 'cumulativePoS').toFormula();
  const npvKpiRef = cellAddr(row - 2, 2); // reference the NPV cell we just wrote
  writeKpiFormula(
    row, 'eNPV',
    `${npvKpiRef}*${dtPosRef}`,
    dtOutputs.enpv,
    NUM_FMT.integer, 'enpv',
  );
  row++;

  // eNPV from rNPV
  const rnpvKpiRef = cellAddr(row - 2, 2); // reference the rNPV cell
  writeKpiFormula(
    row, 'eNPV (from rNPV)',
    `${rnpvKpiRef}*${dtPosRef}`,
    dtOutputs.enpvFromRnpv,
    NUM_FMT.integer, 'enpvFromRnpv',
  );
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

  // rIRR
  const rirrRef = cellMap.getScalar('npv', 'rirr').toFormula();
  writeKpiFormula(row, 'rIRR', rirrRef, npvOutputs.rirr ?? 0, NUM_FMT.percent, 'rirr');
  row++;

  // WACC
  const waccRef = cellMap.getScalar('wacc', 'activeWACC').toFormula();
  writeKpiFormula(row, 'WACC', waccRef, ctx.waccOutputs.activeWACC, NUM_FMT.percent, 'wacc');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Risk & Timing
  // ════════════════════════════════════════════════════════════
  section(row, 'Risk & Timing');
  row++;

  // Cumulative PoS
  writeKpiFormula(row, 'Cumulative PoS', dtPosRef, dtOutputs.cumulativePoS, NUM_FMT.percent, 'cumulativePoS');
  row++;

  // Money at Risk
  const marRef = cellMap.getScalar('npv', 'moneyAtRisk').toFormula();
  writeKpiFormula(row, 'Money at Risk', marRef, npvOutputs.moneyAtRisk, NUM_FMT.integer, 'moneyAtRisk');
  row++;

  // Funding Need
  const fnRef = cellMap.getScalar('npv', 'fundingNeed').toFormula();
  writeKpiFormula(row, 'Funding Need', fnRef, npvOutputs.fundingNeed, NUM_FMT.integer, 'fundingNeed');
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Peak Performance
  // ════════════════════════════════════════════════════════════
  section(row, 'Peak Performance');
  row++;

  // Peak EBIT (cached value)
  writeKpiValue(row, 'Peak EBIT', npvOutputs.peakEbitValue, NUM_FMT.integer, 'peakEbit');
  row++;

  // Peak EBIT Year (cached value)
  writeKpiValue(row, 'Peak EBIT Year', npvOutputs.peakEbitYear, NUM_FMT.year, 'peakEbitYear');
  row++;
}
