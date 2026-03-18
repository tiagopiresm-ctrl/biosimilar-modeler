// ──────────────────────────────────────────────────────────────
// Interactive P&L Assumptions Sheet — Scenario-driven OpEx + FCF inputs
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import {
  setupSheet, writePeriodHeader, writeSection, writeScenarioBlock, writeInputRow,
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

  // Setup: column widths + freeze panes
  setupSheet(ws, NP);

  // ── Row 1: Period header ──
  writePeriodHeader(ws, periodLabels);

  // Row 2: blank — start content at row 3

  let row = 3;

  // ── Commercial & Sales ──
  writeSection(ws, row, 'Commercial & Sales', colCount);
  row++;
  const csResult = writeScenarioBlock(
    ws, row, 'Commercial & Sales', plAssumptions.commercialSales,
    NP, cellMap, sheetKey, 'commercialSales', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = csResult.nextRow;

  // ── G&A ──
  writeSection(ws, row, 'General & Administrative', colCount);
  row++;
  const gaResult = writeScenarioBlock(
    ws, row, 'G&A', plAssumptions.gAndA,
    NP, cellMap, sheetKey, 'gAndA', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = gaResult.nextRow;

  // ── R&D ──
  writeSection(ws, row, 'Research & Development', colCount);
  row++;
  const rdResult = writeScenarioBlock(
    ws, row, 'R&D', plAssumptions.rAndD,
    NP, cellMap, sheetKey, 'rAndD', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = rdResult.nextRow;

  // ── D&A ──
  writeSection(ws, row, 'Depreciation & Amortization', colCount);
  row++;
  const daResult = writeScenarioBlock(
    ws, row, 'D&A', plAssumptions.dAndA,
    NP, cellMap, sheetKey, 'dAndA', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = daResult.nextRow;

  // ── Tax Rate ──
  writeSection(ws, row, 'Tax Rate', colCount);
  row++;
  const trResult = writeScenarioBlock(
    ws, row, 'Tax Rate', plAssumptions.taxRate,
    NP, cellMap, sheetKey, 'taxRate', NUM_FMT.percent,
    activeScenarioRef, activeScenarioIdx,
  );
  row = trResult.nextRow;

  // ── Financial Costs ──
  writeSection(ws, row, 'Financial Costs', colCount);
  row++;
  const fcResult = writeScenarioBlock(
    ws, row, 'Financial Costs', plAssumptions.financialCosts,
    NP, cellMap, sheetKey, 'financialCosts', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = fcResult.nextRow;

  // ── Other Income ──
  writeSection(ws, row, 'Other Income', colCount);
  row++;
  const oiResult = writeScenarioBlock(
    ws, row, 'Other Income', plAssumptions.otherIncome,
    NP, cellMap, sheetKey, 'otherIncome', NUM_FMT.integer,
    activeScenarioRef, activeScenarioIdx,
  );
  row = oiResult.nextRow;

  // ── FCF Bridge ──
  writeSection(ws, row, 'FCF Bridge Inputs', colCount);
  row++;

  // Working Capital Change (single input row)
  writeInputRow(
    ws, row, 'Working Capital Change', fcfBridge.workingCapitalChange,
    NP, cellMap, sheetKey, 'workingCapital', NUM_FMT.integer,
  );
  row++;

  // Capital Expenditure (single input row)
  writeInputRow(
    ws, row, 'Capital Expenditure', fcfBridge.capitalExpenditure,
    NP, cellMap, sheetKey, 'capitalExpenditure', NUM_FMT.integer,
  );
}
