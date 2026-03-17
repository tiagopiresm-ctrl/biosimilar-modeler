// ──────────────────────────────────────────────────────────────
// Interactive Decision Tree Sheet — Probability gates & cumulative PoS
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { INPUT_FILL, ACTIVE_ROW_FILL, formulaValue, cellAddr } from '../formulaHelpers';
import {
  HEADER_FONT, HEADER_FILL, LABEL_FONT, BOLD_VALUE_FONT,
  CENTER_ALIGN, THIN_BORDER, NUM_FMT,
  styleSectionRow,
} from '../../excelStyles';

export function addInteractiveDecisionTreeSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('Decision Tree');
  const { decisionTree, dtOutputs } = ctx;

  // Column widths
  ws.getColumn(1).width = 25; // Gate
  ws.getColumn(2).width = 14; // Probability
  ws.getColumn(3).width = 35; // Description
  ws.getColumn(4).width = 18; // Cumulative PoS

  const COLS = 4;

  // ── Row 1: Title ──
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'Decision Tree — Probability Gates';
  titleCell.font = { ...HEADER_FONT, size: 12 };
  titleCell.fill = HEADER_FILL;
  for (let c = 2; c <= COLS; c++) {
    ws.getCell(1, c).fill = HEADER_FILL;
  }

  // Row 2: blank

  // ── Row 3: Column headers ──
  const headerRow = ws.getRow(3);
  headerRow.getCell(1).value = 'Gate';
  headerRow.getCell(2).value = 'Probability';
  headerRow.getCell(3).value = 'Description';
  headerRow.getCell(4).value = 'Cumulative PoS';
  headerRow.font = HEADER_FONT;
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = CENTER_ALIGN;
  for (let c = 1; c <= COLS; c++) {
    headerRow.getCell(c).border = { bottom: THIN_BORDER };
  }

  // ── Rows 4+: Gate data ──
  const firstGateRow = 4;
  let cumulativePoS = 1;

  for (let i = 0; i < decisionTree.length; i++) {
    const gate = decisionTree[i];
    const row = firstGateRow + i;
    cumulativePoS *= gate.probability;

    // A: Gate name (input)
    const nameCell = ws.getCell(row, 1);
    nameCell.value = gate.name;
    nameCell.font = LABEL_FONT;
    nameCell.fill = INPUT_FILL;

    // B: Probability (input)
    const probCell = ws.getCell(row, 2);
    probCell.value = gate.probability;
    probCell.numFmt = NUM_FMT.percent;
    probCell.fill = INPUT_FILL;

    // C: Description (input)
    const descCell = ws.getCell(row, 3);
    descCell.value = gate.description;
    descCell.font = LABEL_FONT;
    descCell.fill = INPUT_FILL;

    // D: Cumulative PoS (formula: PRODUCT of B4:B{row})
    const dCell = ws.getCell(row, 4);
    const rangeStr = `B${firstGateRow}:B${row}`;
    dCell.value = formulaValue(`PRODUCT(${rangeStr})`, cumulativePoS);
    dCell.numFmt = NUM_FMT.percent;
    dCell.fill = ACTIVE_ROW_FILL;
    dCell.font = BOLD_VALUE_FONT;
  }

  const lastGateRow = firstGateRow + decisionTree.length - 1;

  // ── Summary section ──
  const summaryHeaderRow = lastGateRow + 2;
  const summaryRow = ws.getRow(summaryHeaderRow);
  summaryRow.getCell(1).value = 'Summary';
  styleSectionRow(summaryRow, COLS);

  const cumPosRow = summaryHeaderRow + 1;
  const lbl = ws.getCell(cumPosRow, 1);
  lbl.value = 'Cumulative PoS';
  lbl.font = BOLD_VALUE_FONT;

  const cumPosCell = ws.getCell(cumPosRow, 2);
  const fullRange = `B${firstGateRow}:B${lastGateRow}`;
  cumPosCell.value = formulaValue(`PRODUCT(${fullRange})`, dtOutputs.cumulativePoS);
  cumPosCell.numFmt = NUM_FMT.percent;
  cumPosCell.fill = ACTIVE_ROW_FILL;
  cumPosCell.font = BOLD_VALUE_FONT;

  // Register scalar
  cellMap.registerScalar('decisionTree', 'cumulativePoS', 'Decision Tree', cellAddr(cumPosRow, 2));

  // Freeze panes
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
}
