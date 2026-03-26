// ──────────────────────────────────────────────────────────────
// Interactive Excel Export — Clean Standalone Financial Model
// ──────────────────────────────────────────────────────────────
// Generates a self-contained .xlsx with live formulas.
// Change inputs -> outputs recalculate. No VBA.
//
// Sheet structure (7 tabs):
//   1. Config         — model settings (key-value pairs + country table)
//   2. Inputs         — per-country input assumptions (active countries only)
//   3. Calculations   — per-country formula-based calculations
//   4. P&L            — consolidated P&L with OpEx inputs + FCF
//   5. NPV Analysis   — DCF + KPIs
//   6. Charts Data    — chart data tables
//   7. KPIs           — summary dashboard

import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExportContext } from '../exportTypes';
import { CellMap } from './cellMap';

// Sheet builders
import { addInteractiveConfigSheet } from './sheets/configSheet';
import { addConsolidatedInputSheet } from './sheets/countryInputSheet';
import { addConsolidatedCalculationsSheet, CALCULATIONS_SHEET_NAME } from './sheets/countryModelSheet';
import { addInteractivePLSheet } from './sheets/plSheet';
import { addInteractiveNPVSheet } from './sheets/npvSheet';
import { addInteractiveKPIsSheet } from './sheets/kpisSheet';
import { addChartsDataSheet } from './sheets/chartsSheet';

/**
 * Generate and download an interactive Excel workbook with live formulas.
 */
export async function exportInteractiveExcel(ctx: ExportContext): Promise<void> {
  const wb = new Workbook();
  wb.creator = 'Biosimilar BC Model';
  wb.created = new Date();
  // Tell Excel to recalculate all formulas on open
  wb.calcProperties = { fullCalcOnLoad: true };

  const cellMap = new CellMap();

  // ── Phase 1: Config + Inputs (register cell addresses) ──
  addInteractiveConfigSheet(wb, ctx, cellMap);
  addConsolidatedInputSheet(wb, ctx, cellMap);

  // ── Phase 2: Calculations + P&L (formulas referencing inputs) ──
  addConsolidatedCalculationsSheet(wb, ctx, cellMap);
  addInteractivePLSheet(wb, ctx, cellMap);

  // ── Phase 3: NPV Analysis ──
  addInteractiveNPVSheet(wb, ctx, cellMap);

  // ── Phase 4: Charts Data + KPIs ──
  addChartsDataSheet(wb, ctx, cellMap);
  addInteractiveKPIsSheet(wb, ctx, cellMap);

  // ── Phase 5: Protect output sheets ──
  const outputSheetNames = [
    CALCULATIONS_SHEET_NAME,
    'NPV Analysis',
  ];

  for (const name of outputSheetNames) {
    const ws = wb.getWorksheet(name);
    if (ws) {
      ws.protect('', {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });
    }
  }

  // ── Generate and download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const name = ctx.config.moleculeName || 'Biosimilar Model';
  saveAs(blob, `${name} - Interactive Business Case.xlsx`);
}
