// ──────────────────────────────────────────────────────────────
// Excel Export Orchestrator
// ──────────────────────────────────────────────────────────────

import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExportContext } from './exportTypes';
import { addConfigSheet } from './sheets/configSheet';
import { addPLSheet } from './sheets/plSheet';
import { addCountrySheets } from './sheets/countrySheet';
import { addNPVSheet } from './sheets/npvSheet';
import { addWACCSheet } from './sheets/waccSheet';
import { addKPIsSheet } from './sheets/kpisSheet';
import { addDecisionTreeSheet } from './sheets/decisionTreeSheet';

/**
 * Generate and download a full Excel workbook from the export context.
 */
export async function exportToExcel(ctx: ExportContext): Promise<void> {
  const wb = new Workbook();
  wb.creator = 'Biosimilar BC Model';
  wb.created = new Date();

  // Add sheets in order
  addConfigSheet(wb, ctx);
  addPLSheet(wb, ctx);
  addCountrySheets(wb, ctx);
  addNPVSheet(wb, ctx);
  addWACCSheet(wb, ctx);
  addKPIsSheet(wb, ctx);
  addDecisionTreeSheet(wb, ctx);

  // Generate buffer and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const name = ctx.config.moleculeName || 'Biosimilar Model';
  saveAs(blob, `${name} - Business Case.xlsx`);
}
