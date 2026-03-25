// ──────────────────────────────────────────────────────────────
// Formula helper utilities for interactive Excel export
// ──────────────────────────────────────────────────────────────

import type { Worksheet, Fill, Font, Row } from 'exceljs';
import type { ScenarioRow } from '../../types';
import type { CellMap } from './cellMap';
import {
  LABEL_FONT, BOLD_VALUE_FONT,
  styleSectionRow, styleHeaderRow,
} from '../excelStyles';

// ── Styles for interactive sheets ──

export const INPUT_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' }, // light yellow
};

export const ACTIVE_ROW_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2EFDA' }, // light green
};

export const OUTPUT_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDCE6F1' }, // light blue-gray
};

/** Blue font for editable input cells */
export const INPUT_FONT: Partial<Font> = {
  name: 'Calibri',
  size: 10,
  color: { argb: '0000CC' },
};

// ── Column / cell address helpers ──

/** 1-based column index to letter(s): 1→A, 2→B, 26→Z, 27→AA */
export function colLetter(col: number): string {
  let result = '';
  let c = col;
  while (c > 0) {
    c--;
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26);
  }
  return result;
}

/** Cell address from 1-based row & column: (3, 2) → "B3" */
export function cellAddr(row: number, col: number): string {
  return `${colLetter(col)}${row}`;
}

/** Period data starts at column B (col 2). Period index i → column i+2. */
export function periodCol(periodIndex: number): number {
  return periodIndex + 2;
}

// ── Formula builders ──

/** Safe division: IFERROR(num/den, 0) */
export function safeDiv(numerator: string, denominator: string): string {
  return `IFERROR(${numerator}/${denominator},0)`;
}

/** CHOOSE(ActiveScenario, worst, base, best) */
export function chooseScenario(activeRef: string, worst: string, base: string, best: string): string {
  return `CHOOSE(${activeRef},${worst},${base},${best})`;
}

/** ExcelJS formula cell value with cached result */
export function formulaValue(formula: string, result: number | string = 0) {
  return { formula, result: typeof result === 'string' ? undefined : result };
}

// ── Reusable sheet writing patterns ──

/**
 * Write a 3-scenario input block + "Active" CHOOSE row.
 * Returns the row number after the block (nextRow).
 */
export function writeScenarioBlock(
  ws: Worksheet,
  startRow: number,
  label: string,
  data: ScenarioRow,
  NP: number,
  cellMap: CellMap,
  sheetKey: string,
  fieldName: string,
  numFmt: string,
  activeScenarioRef: string,
  activeScenarioIdx: number, // 0-based (0=worst → data.bear)
): { activeRow: number; nextRow: number } {
  const scenarios = ['Worst', 'Base', 'Best'] as const;
  const arrays = [data.bear, data.base, data.bull];

  // Write 3 scenario rows (input)
  for (let s = 0; s < 3; s++) {
    const row = startRow + s;
    const c1 = ws.getCell(row, 1);
    c1.value = `  ${label} (${scenarios[s]})`;
    c1.font = LABEL_FONT;
    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);
      cell.value = arrays[s][p] ?? 0;
      cell.numFmt = numFmt;
      cell.fill = INPUT_FILL;
      cell.font = INPUT_FONT;
      cellMap.register(sheetKey, `${fieldName}_${s}`, p, ws.name, cellAddr(row, col));
    }
  }

  // Active row (CHOOSE formula)
  const activeRowNum = startRow + 3;
  const ac1 = ws.getCell(activeRowNum, 1);
  ac1.value = `  ${label} (Active)`;
  ac1.font = BOLD_VALUE_FONT;

  const activeData = arrays[activeScenarioIdx];
  for (let p = 0; p < NP; p++) {
    const col = periodCol(p);
    const worstRef = cellAddr(startRow, col);
    const baseRef = cellAddr(startRow + 1, col);
    const bestRef = cellAddr(startRow + 2, col);
    const cell = ws.getCell(activeRowNum, col);
    cell.value = formulaValue(
      chooseScenario(activeScenarioRef, worstRef, baseRef, bestRef),
      activeData[p] ?? 0,
    );
    cell.numFmt = numFmt;
    cell.fill = ACTIVE_ROW_FILL;
    cellMap.register(sheetKey, `${fieldName}_active`, p, ws.name, cellAddr(activeRowNum, col));
  }

  return { activeRow: activeRowNum, nextRow: activeRowNum + 2 }; // +2 for blank line
}

/**
 * Write a single input row for base-only mode.
 * Registers as both the raw key and _active key so formulas that
 * reference `fieldName_active` still work.
 */
export function writeBaseOnlyBlock(
  ws: Worksheet,
  startRow: number,
  label: string,
  data: ScenarioRow,
  NP: number,
  cellMap: CellMap,
  sheetKey: string,
  fieldName: string,
  numFmt: string,
  activeScenarioIdx: number,
): { activeRow: number; nextRow: number } {
  const arrays = [data.bear, data.base, data.bull];
  const activeData = arrays[activeScenarioIdx];

  const c1 = ws.getCell(startRow, 1);
  c1.value = `  ${label}`;
  c1.font = LABEL_FONT;

  for (let p = 0; p < NP; p++) {
    const col = periodCol(p);
    const cell = ws.getCell(startRow, col);
    cell.value = activeData[p] ?? 0;
    cell.numFmt = numFmt;
    cell.fill = INPUT_FILL;
    cell.font = INPUT_FONT;
    // Register as both _active and raw so all formula refs work
    cellMap.register(sheetKey, `${fieldName}_active`, p, ws.name, cellAddr(startRow, col));
    cellMap.register(sheetKey, `${fieldName}_${activeScenarioIdx}`, p, ws.name, cellAddr(startRow, col));
  }

  return { activeRow: startRow, nextRow: startRow + 2 };
}

/**
 * Write a color legend row at the top of a sheet.
 */
export function writeColorLegend(ws: Worksheet, row: number): void {
  // Cell A
  ws.getCell(row, 1).value = 'Legend:';
  ws.getCell(row, 1).font = { ...BOLD_VALUE_FONT, size: 8 };

  // Yellow = Input
  const b = ws.getCell(row, 2);
  b.value = 'Editable Input';
  b.fill = INPUT_FILL;
  b.font = { name: 'Calibri', size: 8 };

  // Green = Active Scenario
  const c = ws.getCell(row, 3);
  c.value = 'Auto (Scenario)';
  c.fill = ACTIVE_ROW_FILL;
  c.font = { name: 'Calibri', size: 8 };

  // Blue = Formula
  const d = ws.getCell(row, 4);
  d.value = 'Formula (locked)';
  d.fill = OUTPUT_FILL;
  d.font = { name: 'Calibri', size: 8 };
}

/**
 * Write a single data row with static values (input row).
 */
export function writeInputRow(
  ws: Worksheet,
  row: number,
  label: string,
  data: number[],
  NP: number,
  cellMap: CellMap,
  sheetKey: string,
  fieldName: string,
  numFmt: string,
  bold: boolean = false,
): void {
  const c1 = ws.getCell(row, 1);
  c1.value = label;
  c1.font = bold ? BOLD_VALUE_FONT : LABEL_FONT;
  for (let p = 0; p < NP; p++) {
    const col = periodCol(p);
    const cell = ws.getCell(row, col);
    cell.value = data[p] ?? 0;
    cell.numFmt = numFmt;
    cell.fill = INPUT_FILL;
    cell.font = INPUT_FONT;
    cellMap.register(sheetKey, fieldName, p, ws.name, cellAddr(row, col));
  }
}

/**
 * Write a formula row where each period cell is a formula.
 */
export function writeFormulaRow(
  ws: Worksheet,
  row: number,
  label: string,
  NP: number,
  buildFormula: (periodIndex: number, col: number) => string,
  cachedValues: number[],
  cellMap: CellMap,
  sheetKey: string,
  fieldName: string,
  numFmt: string,
  bold: boolean = false,
): void {
  const c1 = ws.getCell(row, 1);
  c1.value = label;
  c1.font = bold ? BOLD_VALUE_FONT : LABEL_FONT;
  for (let p = 0; p < NP; p++) {
    const col = periodCol(p);
    const cell = ws.getCell(row, col);
    cell.value = formulaValue(buildFormula(p, col), cachedValues[p] ?? 0);
    cell.numFmt = numFmt;
    if (bold) cell.font = BOLD_VALUE_FONT;
    cellMap.register(sheetKey, fieldName, p, ws.name, cellAddr(row, col));
  }
}

/**
 * Write a section header row.
 */
export function writeSection(ws: Worksheet, row: number, label: string, colCount: number): void {
  const r = ws.getRow(row);
  r.getCell(1).value = label;
  styleSectionRow(r, colCount);
}

/**
 * Standard sheet setup: column widths, freeze panes.
 */
export function setupSheet(ws: Worksheet, NP: number): void {
  ws.getColumn(1).width = 32;
  const colCount = NP + 1;
  for (let c = 2; c <= colCount; c++) ws.getColumn(c).width = 14;
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

/**
 * Write the period header row (row 1).
 */
export function writePeriodHeader(ws: Worksheet, periodLabels: string[]): Row {
  const headerRow = ws.addRow(['', ...periodLabels]);
  styleHeaderRow(headerRow, periodLabels.length + 1);
  return headerRow;
}
