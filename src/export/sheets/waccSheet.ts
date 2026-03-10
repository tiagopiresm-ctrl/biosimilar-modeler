// WACC breakdown sheet

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow,
  LABEL_FONT, BOLD_VALUE_FONT, VALUE_FONT,
  NUM_FMT, SECTION_FILL, SECTION_FONT, THIN_BORDER,
} from '../excelStyles';
import { SCENARIO_LABELS } from '../../types';

export function addWACCSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('WACC');
  const { waccInputs, waccOutputs } = ctx;

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 16;

  const pct = NUM_FMT.percent;
  const dec2 = NUM_FMT.decimal2;

  // Header
  const headerRow = ws.addRow(['', SCENARIO_LABELS[1], SCENARIO_LABELS[2], SCENARIO_LABELS[3]]);
  styleHeaderRow(headerRow, 4);

  const addRow = (label: string, vals: [number, number, number], fmt: string, bold: boolean = false) => {
    const row = ws.addRow([label, vals[0], vals[1], vals[2]]);
    row.getCell(1).font = bold ? BOLD_VALUE_FONT : LABEL_FONT;
    for (let c = 2; c <= 4; c++) {
      row.getCell(c).numFmt = fmt;
      row.getCell(c).font = bold ? BOLD_VALUE_FONT : VALUE_FONT;
    }
    return row;
  };

  // ---- Cost of Equity ----
  const sec1 = ws.addRow(['Cost of Equity (CAPM)']);
  sec1.font = SECTION_FONT;
  sec1.fill = SECTION_FILL;
  sec1.getCell(1).border = { bottom: THIN_BORDER };

  addRow('Risk-Free Rate', waccInputs.riskFreeRate, pct);
  addRow('Equity Risk Premium', waccInputs.equityRiskPremium, pct);
  addRow('Beta', waccInputs.beta, dec2);
  addRow('Cost of Equity (Ke)', waccOutputs.costOfEquity, pct, true);

  ws.addRow([]);

  // ---- Cost of Debt ----
  const sec2 = ws.addRow(['Cost of Debt']);
  sec2.font = SECTION_FONT;
  sec2.fill = SECTION_FILL;
  sec2.getCell(1).border = { bottom: THIN_BORDER };

  addRow('Pre-Tax Cost of Debt', waccInputs.preTaxCostOfDebt, pct);
  addRow('Tax Rate', waccInputs.taxRate, pct);
  addRow('After-Tax Cost of Debt (Kd)', waccOutputs.afterTaxCostOfDebt, pct, true);

  ws.addRow([]);

  // ---- WACC ----
  const sec3 = ws.addRow(['Weighted Average Cost of Capital']);
  sec3.font = SECTION_FONT;
  sec3.fill = SECTION_FILL;
  sec3.getCell(1).border = { bottom: THIN_BORDER };

  addRow('Equity Weight', waccInputs.equityPct, pct);
  const debtWeight: [number, number, number] = [
    1 - waccInputs.equityPct[0],
    1 - waccInputs.equityPct[1],
    1 - waccInputs.equityPct[2],
  ];
  addRow('Debt Weight', debtWeight, pct);
  addRow('WACC', waccOutputs.wacc, pct, true);

  ws.addRow([]);

  // Active WACC highlight
  const activeRow = ws.addRow([`Active WACC (${ctx.scenarioLabel})`, waccOutputs.activeWACC]);
  activeRow.getCell(1).font = BOLD_VALUE_FONT;
  activeRow.getCell(2).numFmt = pct;
  activeRow.getCell(2).font = BOLD_VALUE_FONT;
}
