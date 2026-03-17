// ──────────────────────────────────────────────────────────────
// Interactive WACC Sheet — Cost of equity, debt, capital structure
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import {
  INPUT_FILL, ACTIVE_ROW_FILL,
  formulaValue, chooseScenario, cellAddr,
} from '../formulaHelpers';
import {
  HEADER_FONT, HEADER_FILL, LABEL_FONT, BOLD_VALUE_FONT,
  CENTER_ALIGN, THIN_BORDER, NUM_FMT,
  styleSectionRow,
} from '../../excelStyles';

export function addInteractiveWACCSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('WACC');
  const { waccInputs, waccOutputs, config } = ctx;
  const activeRef = "Config!B5";

  // Column widths: A=labels, B=Worst, C=Base, D=Best, E=Active
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;

  const COL_W = 2; // B
  const COL_BA = 3; // C
  const COL_BU = 4; // D
  const COL_ACT = 5; // E
  const COLS = 5;

  // ── Row 1: Header ──
  const headerRow = ws.getRow(1);
  headerRow.getCell(1).value = '';
  headerRow.getCell(2).value = 'Worst';
  headerRow.getCell(3).value = 'Base';
  headerRow.getCell(4).value = 'Best';
  headerRow.getCell(5).value = 'Active';
  headerRow.font = HEADER_FONT;
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = CENTER_ALIGN;
  for (let c = 1; c <= COLS; c++) {
    headerRow.getCell(c).border = { bottom: THIN_BORDER };
  }

  // Freeze panes
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  // ── Helpers ──

  const section = (row: number, label: string) => {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    styleSectionRow(r, COLS);
  };

  /** Write a 3-scenario input row + CHOOSE in col E */
  const writeInputRow = (
    row: number,
    label: string,
    values: [number, number, number],
    numFmt: string,
  ) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = LABEL_FONT;

    for (let s = 0; s < 3; s++) {
      const col = COL_W + s;
      const cell = ws.getCell(row, col);
      cell.value = values[s];
      cell.numFmt = numFmt;
      cell.fill = INPUT_FILL;
    }

    // Active (CHOOSE)
    const activeCell = ws.getCell(row, COL_ACT);
    const activeIdx = config.activeScenario - 1;
    activeCell.value = formulaValue(
      chooseScenario(activeRef, cellAddr(row, COL_W), cellAddr(row, COL_BA), cellAddr(row, COL_BU)),
      values[activeIdx],
    );
    activeCell.numFmt = numFmt;
    activeCell.fill = ACTIVE_ROW_FILL;
  };

  /** Write a formula row across B:D + CHOOSE in E */
  const writeFormulaRow = (
    row: number,
    label: string,
    buildFormula: (col: number) => string,
    cachedValues: [number, number, number],
    activeValue: number,
    numFmt: string,
    bold: boolean = false,
  ) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = bold ? BOLD_VALUE_FONT : LABEL_FONT;

    for (let s = 0; s < 3; s++) {
      const col = COL_W + s;
      const cell = ws.getCell(row, col);
      cell.value = formulaValue(buildFormula(col), cachedValues[s]);
      cell.numFmt = numFmt;
      cell.fill = ACTIVE_ROW_FILL;
      if (bold) cell.font = BOLD_VALUE_FONT;
    }

    // Active CHOOSE
    const activeCell = ws.getCell(row, COL_ACT);
    activeCell.value = formulaValue(
      chooseScenario(activeRef, cellAddr(row, COL_W), cellAddr(row, COL_BA), cellAddr(row, COL_BU)),
      activeValue,
    );
    activeCell.numFmt = numFmt;
    activeCell.fill = ACTIVE_ROW_FILL;
    if (bold) activeCell.font = BOLD_VALUE_FONT;
  };

  // ── Row 3: Cost of Equity (CAPM) ──
  section(3, 'Cost of Equity (CAPM)');

  // Row 4: Risk-Free Rate
  writeInputRow(4, 'Risk-Free Rate', waccInputs.riskFreeRate, NUM_FMT.percent);

  // Row 5: Equity Risk Premium
  writeInputRow(5, 'Equity Risk Premium', waccInputs.equityRiskPremium, NUM_FMT.percent);

  // Row 6: Beta
  writeInputRow(6, 'Beta', waccInputs.beta, NUM_FMT.decimal2);

  // Row 7: Cost of Equity = Rf + Beta * ERP
  writeFormulaRow(
    7,
    'Cost of Equity (Ke)',
    (col) => `${cellAddr(4, col)}+${cellAddr(6, col)}*${cellAddr(5, col)}`,
    waccOutputs.costOfEquity,
    waccOutputs.costOfEquity[config.activeScenario - 1],
    NUM_FMT.percent,
    true,
  );

  // ── Row 9: Cost of Debt ──
  section(9, 'Cost of Debt');

  // Row 10: Pre-Tax Cost of Debt
  writeInputRow(10, 'Pre-Tax Cost of Debt', waccInputs.preTaxCostOfDebt, NUM_FMT.percent);

  // Row 11: Tax Rate
  writeInputRow(11, 'Tax Rate', waccInputs.taxRate, NUM_FMT.percent);

  // Row 12: After-Tax Cost of Debt = Kd * (1 - t)
  writeFormulaRow(
    12,
    'After-Tax Cost of Debt',
    (col) => `${cellAddr(10, col)}*(1-${cellAddr(11, col)})`,
    waccOutputs.afterTaxCostOfDebt,
    waccOutputs.afterTaxCostOfDebt[config.activeScenario - 1],
    NUM_FMT.percent,
    true,
  );

  // ── Row 14: Capital Structure ──
  section(14, 'Capital Structure');

  // Row 15: Equity Weight
  writeInputRow(15, 'Equity Weight', waccInputs.equityPct, NUM_FMT.percent);

  // Row 16: Debt Weight = 1 - Equity
  const debtWeights: [number, number, number] = [
    1 - waccInputs.equityPct[0],
    1 - waccInputs.equityPct[1],
    1 - waccInputs.equityPct[2],
  ];
  writeFormulaRow(
    16,
    'Debt Weight',
    (col) => `1-${cellAddr(15, col)}`,
    debtWeights,
    debtWeights[config.activeScenario - 1],
    NUM_FMT.percent,
  );

  // ── Row 18: WACC Result ──
  section(18, 'WACC Result');

  // Row 19: WACC = Ke * We + Kd_at * Wd
  writeFormulaRow(
    19,
    'WACC',
    (col) => `${cellAddr(7, col)}*${cellAddr(15, col)}+${cellAddr(12, col)}*${cellAddr(16, col)}`,
    waccOutputs.wacc,
    waccOutputs.activeWACC,
    NUM_FMT.percent,
    true,
  );

  // ── Register in CellMap ──
  cellMap.registerScalar('wacc', 'activeWACC', 'WACC', 'E19');
  cellMap.registerScenario('wacc', 'wacc', 0, 'WACC', 'B19');
  cellMap.registerScenario('wacc', 'wacc', 1, 'WACC', 'C19');
  cellMap.registerScenario('wacc', 'wacc', 2, 'WACC', 'D19');
}
