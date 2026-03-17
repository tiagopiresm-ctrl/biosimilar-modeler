// ──────────────────────────────────────────────────────────────
// Interactive NPV Risk Sheet — Cumulative PoS per period
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { setupSheet, writePeriodHeader, writeSection, writeInputRow } from '../formulaHelpers';
import { NUM_FMT } from '../../excelStyles';

export function addInteractiveNPVRiskSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('NPV Risk');
  const { npvRisk, periodLabels } = ctx;

  const NP = periodLabels.length;
  const colCount = NP + 1;
  const sheetKey = 'npvRisk';

  // Setup: column widths + freeze panes
  setupSheet(ws, NP);

  // ── Row 1: Period header ──
  writePeriodHeader(ws, periodLabels);

  // Row 2: blank

  // ── Row 3: Section ──
  writeSection(ws, 3, 'Risk Adjustment', colCount);

  // ── Row 4: Cumulative PoS input row ──
  writeInputRow(
    ws, 4, 'Cumulative PoS', npvRisk.cumulativePoS,
    NP, cellMap, sheetKey, 'cumulativePoS', NUM_FMT.percent,
  );
}
