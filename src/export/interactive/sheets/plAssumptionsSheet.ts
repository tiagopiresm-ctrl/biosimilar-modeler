// ──────────────────────────────────────────────────────────────
// Interactive P&L Assumptions Sheet — Scenario-driven OpEx + FCF inputs
// Supports both 3-scenario and base-only modes
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { ScenarioRow } from '../../../types';
import {
  setupSheet, writePeriodHeader, writeSection,
  writeScenarioBlock, writeBaseOnlyBlock,
  writeInputRow, writeColorLegend,
} from '../formulaHelpers';
import { NUM_FMT } from '../../excelStyles';

export function addInteractivePLAssumptionsSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('P&L Assumptions');
  const { config, plAssumptions, fcfBridge, periodLabels } = ctx;

  const NP = periodLabels.length;
  const colCount = NP + 1;
  const sheetKey = 'plAssumptions';
  const activeScenarioRef = "Config!B5";
  const activeScenarioIdx = config.activeScenario - 1; // 0-based
  const isBaseOnly = config.scenarioMode === 'base_only';

  setupSheet(ws, NP);
  writePeriodHeader(ws, periodLabels);

  // Color legend on row 2
  writeColorLegend(ws, 2);

  let row = 4;

  // Helper: write scenario or base-only block depending on mode
  const writeBlock = (
    label: string, data: ScenarioRow, fieldName: string, numFmt: string,
  ): { activeRow: number; nextRow: number } => {
    if (isBaseOnly) {
      return writeBaseOnlyBlock(
        ws, row, label, data, NP, cellMap, sheetKey, fieldName, numFmt, activeScenarioIdx,
      );
    }
    return writeScenarioBlock(
      ws, row, label, data, NP, cellMap, sheetKey, fieldName, numFmt,
      activeScenarioRef, activeScenarioIdx,
    );
  };

  // ── Commercial & Sales ──
  writeSection(ws, row, 'Commercial & Sales', colCount);
  row++;
  row = writeBlock('Commercial & Sales', plAssumptions.commercialSales, 'commercialSales', NUM_FMT.integer).nextRow;

  // ── G&A ──
  writeSection(ws, row, 'General & Administrative', colCount);
  row++;
  row = writeBlock('G&A', plAssumptions.gAndA, 'gAndA', NUM_FMT.integer).nextRow;

  // ── R&D ──
  writeSection(ws, row, 'Research & Development', colCount);
  row++;
  row = writeBlock('R&D', plAssumptions.rAndD, 'rAndD', NUM_FMT.integer).nextRow;

  // ── D&A ──
  writeSection(ws, row, 'Depreciation & Amortization', colCount);
  row++;
  row = writeBlock('D&A', plAssumptions.dAndA, 'dAndA', NUM_FMT.integer).nextRow;

  // ── Tax Rate ──
  writeSection(ws, row, 'Tax Rate', colCount);
  row++;
  row = writeBlock('Tax Rate', plAssumptions.taxRate, 'taxRate', NUM_FMT.percent).nextRow;

  // ── Financial Costs ──
  writeSection(ws, row, 'Financial Costs', colCount);
  row++;
  row = writeBlock('Financial Costs', plAssumptions.financialCosts, 'financialCosts', NUM_FMT.integer).nextRow;

  // ── Other Income ──
  writeSection(ws, row, 'Other Income', colCount);
  row++;
  row = writeBlock('Other Income', plAssumptions.otherIncome, 'otherIncome', NUM_FMT.integer).nextRow;

  // ── FCF Bridge ──
  writeSection(ws, row, 'FCF Bridge Inputs', colCount);
  row++;

  // Working Capital Days (scalar inputs in column A/B)
  const daysFields: Array<{ label: string; field: string; value: number }> = [
    { label: 'Receivable Days', field: 'receivableDays', value: fcfBridge.receivableDays },
    { label: 'Payable Days', field: 'payableDays', value: fcfBridge.payableDays },
    { label: 'Inventory Days', field: 'inventoryDays', value: fcfBridge.inventoryDays },
  ];
  for (const d of daysFields) {
    ws.getCell(row, 1).value = d.label;
    ws.getCell(row, 1).font = { size: 10 };
    ws.getCell(row, 2).value = d.value;
    ws.getCell(row, 2).numFmt = NUM_FMT.integer;
    ws.getCell(row, 2).font = { size: 10, color: { argb: '0000CC' } };
    cellMap.registerScalar(sheetKey, d.field, 'P&L Assumptions', ws.getCell(row, 2).address);
    row++;
  }

  writeInputRow(ws, row, 'Capital Expenditure', fcfBridge.capitalExpenditure,
    NP, cellMap, sheetKey, 'capitalExpenditure', NUM_FMT.integer);
}
