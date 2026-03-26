// ──────────────────────────────────────────────────────────────
// Interactive Excel Export — Orchestrator (consolidated version)
// ──────────────────────────────────────────────────────────────
// Generates a self-contained .xlsx with live formulas.
// Change inputs -> outputs recalculate. No VBA.
//
// Sheet structure:
//   1. Config        — model settings
//   2. P&L Assumptions — OpEx & FCF inputs
//   3. Inputs        — ALL country inputs in ONE sheet (stacked)
//   4. WACC          — cost of capital
//   5. Decision Tree — probability gates
//   6. NPV Risk      — risk PoS per period
//   7. Calculations  — ALL country calcs in ONE sheet (stacked)
//   8. P&L           — consolidated P&L
//   9. NPV Analysis  — DCF + KPIs
//  10. KPIs          — summary dashboard
//  11. Charts Data   — chart data tables
//  12. PBI Data      — Power BI flat table

import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExportContext } from '../exportTypes';
import { CellMap } from './cellMap';

// Input sheet builders
import { addInteractiveConfigSheet } from './sheets/configSheet';
import { addInteractivePLAssumptionsSheet } from './sheets/plAssumptionsSheet';
import { addConsolidatedInputSheet } from './sheets/countryInputSheet';
import { addInteractiveWACCSheet } from './sheets/waccSheet';
import { addInteractiveDecisionTreeSheet } from './sheets/decisionTreeSheet';
import { addInteractiveNPVRiskSheet } from './sheets/npvRiskSheet';

// Output sheet builders (formula-only)
import { addConsolidatedCalculationsSheet, CALCULATIONS_SHEET_NAME } from './sheets/countryModelSheet';
import { addInteractivePLSheet } from './sheets/plSheet';
import { addInteractiveNPVSheet } from './sheets/npvSheet';
import { addInteractiveKPIsSheet } from './sheets/kpisSheet';
import { addChartsDataSheet } from './sheets/chartsSheet';

// Power BI sheets
import { addPBIDataSheet } from './sheets/pbiDataSheet';

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

  // ── Phase 1: Input sheets (register cell addresses) ──
  addInteractiveConfigSheet(wb, ctx, cellMap);
  addInteractivePLAssumptionsSheet(wb, ctx, cellMap);
  addConsolidatedInputSheet(wb, ctx, cellMap);     // ONE consolidated Inputs sheet
  addInteractiveWACCSheet(wb, ctx, cellMap);
  addInteractiveDecisionTreeSheet(wb, ctx, cellMap);
  addInteractiveNPVRiskSheet(wb, ctx, cellMap);

  // ── Phase 2: Output sheets (read CellMap to build formulas) ──
  addConsolidatedCalculationsSheet(wb, ctx, cellMap);  // ONE consolidated Calculations sheet
  addInteractivePLSheet(wb, ctx, cellMap);
  addInteractiveNPVSheet(wb, ctx, cellMap);
  addInteractiveKPIsSheet(wb, ctx, cellMap);
  addChartsDataSheet(wb, ctx, cellMap);

  // ── Phase 3: Power BI sheets ──
  addPBIDataSheet(wb, ctx);

  // ── Phase 4: Protect output sheets ──
  const outputSheetNames = [
    CALCULATIONS_SHEET_NAME,
    'P&L',
    'NPV Analysis',
    'KPIs',
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
