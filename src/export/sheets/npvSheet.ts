// NPV / DCF Analysis sheet

import type { Workbook, Row } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow, styleSectionRow,
  LABEL_FONT, BOLD_VALUE_FONT, NUM_FMT,
  SECTION_FILL, SECTION_FONT, THIN_BORDER,
} from '../excelStyles';
import { formatPercent, formatCurrency } from '../../calculations';

export function addNPVSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('NPV Analysis');
  const { periodLabels, npvOutputs, config } = ctx;
  const NP = periodLabels.length;
  const colCount = NP + 1;

  ws.getColumn(1).width = 30;
  for (let c = 2; c <= colCount; c++) ws.getColumn(c).width = 14;

  const cur = NUM_FMT.integer;
  const dec4 = '#,##0.0000';
  const pct = NUM_FMT.percent;

  // Header row
  const headerRow = ws.addRow(['', ...periodLabels]);
  styleHeaderRow(headerRow, colCount);

  const addDataRow = (label: string, data: number[], fmt: string, bold: boolean = false): Row => {
    const values: (string | number)[] = [label];
    for (let i = 0; i < NP; i++) values.push(data[i] ?? 0);
    const row = ws.addRow(values);
    row.getCell(1).font = bold ? BOLD_VALUE_FONT : LABEL_FONT;
    for (let c = 2; c <= colCount; c++) {
      row.getCell(c).numFmt = fmt;
      if (bold) row.getCell(c).font = BOLD_VALUE_FONT;
    }
    return row;
  };

  const addSection = (label: string) => {
    const row = ws.addRow([label]);
    styleSectionRow(row, colCount);
  };

  // ---- DCF Build-up ----
  addSection('DCF Analysis');
  addDataRow('EBIT', npvOutputs.ebit, cur);
  addDataRow('D&A Add-Back', npvOutputs.daAddBack, cur);
  addDataRow('Income Tax', npvOutputs.incomeTax, cur);
  addDataRow('Working Capital Change', npvOutputs.wcChange, cur);
  addDataRow('Capital Expenditure', npvOutputs.capex, cur);
  addDataRow('Free Cash Flow', npvOutputs.fcf, cur, true);
  addDataRow('Cumulative FCF', npvOutputs.cumulativeFCF, cur);

  ws.addRow([]);

  // ---- Discounting ----
  addSection('Discounting');
  addDataRow('Discount Rate', npvOutputs.discountRate, pct);
  addDataRow('Discount Factor', npvOutputs.discountFactor, dec4);
  addDataRow('Discounted FCF', npvOutputs.discountedFCF, cur, true);
  addDataRow('Cumulative Discounted FCF', npvOutputs.cumulativeDiscountedFCF, cur);

  ws.addRow([]);

  // ---- Risk Adjustment ----
  addSection('Risk Adjustment');
  addDataRow('Risk-Adjusted FCF', npvOutputs.riskAdjustedFCF, cur);
  addDataRow('Risk-Adj. Discounted FCF', npvOutputs.riskAdjustedDiscountedFCF, cur, true);
  addDataRow('Cumulative Risk-Adj. Disc. FCF', npvOutputs.cumulativeRiskAdjDiscountedFCF, cur);

  ws.addRow([]);
  ws.addRow([]);

  // ---- KPI Summary ----
  const kpiHeader = ws.addRow(['Key Metrics', 'Value']);
  kpiHeader.font = SECTION_FONT;
  kpiHeader.fill = SECTION_FILL;
  kpiHeader.getCell(1).border = { bottom: THIN_BORDER };
  kpiHeader.getCell(2).border = { bottom: THIN_BORDER };

  const kpis: [string, string][] = [
    ['NPV', formatCurrency(npvOutputs.npv, config.currency)],
    ['rNPV', formatCurrency(npvOutputs.rnpv, config.currency)],
    ['IRR', npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A'],
    ['rIRR', npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A'],
    ['Money at Risk', formatCurrency(npvOutputs.moneyAtRisk, config.currency)],
    ['Funding Need', formatCurrency(npvOutputs.fundingNeed, config.currency)],
    ['Payback (Undiscounted)', npvOutputs.paybackUndiscounted != null ? String(npvOutputs.paybackUndiscounted) : 'N/A'],
    ['Payback (Discounted)', npvOutputs.paybackDiscounted != null ? String(npvOutputs.paybackDiscounted) : 'N/A'],
    ['Break-Even Year', npvOutputs.breakEvenYear != null ? String(npvOutputs.breakEvenYear) : 'N/A'],
    ['Peak EBIT', formatCurrency(npvOutputs.peakEbitValue, config.currency)],
    ['Peak EBIT Year', npvOutputs.peakEbitYear != null ? String(npvOutputs.peakEbitYear) : 'N/A'],
  ];

  for (const [label, value] of kpis) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = BOLD_VALUE_FONT;
  }

  // Freeze
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}
