// KPI Summary sheet

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow,
  LABEL_FONT, BOLD_VALUE_FONT,
  SECTION_FILL, SECTION_FONT, THIN_BORDER,
} from '../excelStyles';
import { formatPercent, formatCurrency } from '../../calculations';

export function addKPIsSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('KPIs');
  const { npvOutputs, dtOutputs, waccOutputs, config, plOutputs, periodLabels } = ctx;

  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 22;

  // Header
  const headerRow = ws.addRow(['Key Performance Indicator', 'Value']);
  styleHeaderRow(headerRow, 2);

  const addKPI = (label: string, value: string) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = LABEL_FONT;
    row.getCell(2).font = BOLD_VALUE_FONT;
  };

  const addSection = (label: string) => {
    const row = ws.addRow([label, '']);
    row.font = SECTION_FONT;
    row.fill = SECTION_FILL;
    row.getCell(1).border = { bottom: THIN_BORDER };
    row.getCell(2).border = { bottom: THIN_BORDER };
  };

  // ---- Valuation ----
  addSection('Valuation Metrics');
  addKPI('NPV', formatCurrency(npvOutputs.npv, config.currency));
  addKPI('rNPV', formatCurrency(npvOutputs.rnpv, config.currency));
  addKPI('ENPV (Decision Tree)', formatCurrency(dtOutputs.enpv, config.currency));
  addKPI('ENPV from rNPV', formatCurrency(dtOutputs.enpvFromRnpv, config.currency));

  ws.addRow([]);

  // ---- Returns ----
  addSection('Return Metrics');
  addKPI('IRR', npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A');
  addKPI('rIRR', npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A');
  addKPI('WACC', formatPercent(waccOutputs.activeWACC));

  ws.addRow([]);

  // ---- Risk ----
  addSection('Risk & Timing');
  addKPI('Cumulative PoS (Decision Tree)', formatPercent(dtOutputs.cumulativePoS));
  addKPI('Money at Risk', formatCurrency(npvOutputs.moneyAtRisk, config.currency));
  addKPI('Funding Need (Peak Negative FCF)', formatCurrency(npvOutputs.fundingNeed, config.currency));
  addKPI('Break-Even Year', npvOutputs.breakEvenYear != null ? String(npvOutputs.breakEvenYear) : 'N/A');
  addKPI('Payback Year (Undiscounted)', npvOutputs.paybackUndiscounted != null ? String(npvOutputs.paybackUndiscounted) : 'N/A');
  addKPI('Payback Year (Discounted)', npvOutputs.paybackDiscounted != null ? String(npvOutputs.paybackDiscounted) : 'N/A');

  ws.addRow([]);

  // ---- Peak Performance ----
  addSection('Peak Performance');

  // Find peak revenue
  let peakRevenue = 0;
  let peakRevenueYear: string = 'N/A';
  for (let i = 0; i < plOutputs.totalRevenue.length; i++) {
    if (plOutputs.totalRevenue[i] > peakRevenue) {
      peakRevenue = plOutputs.totalRevenue[i];
      peakRevenueYear = periodLabels[i] ?? '';
    }
  }

  addKPI('Peak Revenue', formatCurrency(peakRevenue, config.currency));
  addKPI('Peak Revenue Year', peakRevenueYear);
  addKPI('Peak EBIT', formatCurrency(npvOutputs.peakEbitValue, config.currency));
  addKPI('Peak EBIT Year', npvOutputs.peakEbitYear != null ? String(npvOutputs.peakEbitYear) : 'N/A');

  // Peak EBIT margin
  let peakEbitMargin = 0;
  for (const m of plOutputs.ebitMargin) {
    if (m > peakEbitMargin) peakEbitMargin = m;
  }
  addKPI('Peak EBIT Margin', formatPercent(peakEbitMargin));
}
