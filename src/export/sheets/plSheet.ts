// P&L Statement sheet — full period-by-period income statement + FCF

import type { Workbook, Row } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow, styleSectionRow,
  LABEL_FONT, BOLD_VALUE_FONT, NUM_FMT,
} from '../excelStyles';

export function addPLSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('P&L Statement');
  const { periodLabels, plOutputs, countries } = ctx;
  const NP = periodLabels.length;
  const colCount = NP + 1; // label column + period columns

  // Column widths
  ws.getColumn(1).width = 28;
  for (let c = 2; c <= colCount; c++) ws.getColumn(c).width = 14;

  // Header row
  const headerValues = ['', ...periodLabels];
  const headerRow = ws.addRow(headerValues);
  styleHeaderRow(headerRow, colCount);

  // Helper to add a data row
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

  const addSectionHeader = (label: string) => {
    const row = ws.addRow([label]);
    styleSectionRow(row, colCount);
  };

  const cur = NUM_FMT.integer;
  const pct = NUM_FMT.percent;

  // ---- Revenue ----
  addSectionHeader('Revenue');

  // Per-country supply revenue
  for (let c = 0; c < countries.length; c++) {
    addDataRow(`  Supply Revenue — ${countries[c].name}`, plOutputs.netSupplyRevenueByCountry[c], cur);
  }
  addDataRow('Net Supply Revenue', plOutputs.totalNetSupplyRevenue, cur, true);
  addDataRow('Royalty Income', plOutputs.totalRoyaltyIncome, cur);
  addDataRow('Milestone Income', plOutputs.totalMilestoneIncome, cur);
  addDataRow('Total Revenue', plOutputs.totalRevenue, cur, true);

  ws.addRow([]);

  // ---- Cost of Goods Sold ----
  addSectionHeader('Cost of Goods Sold');
  addDataRow('COGS', plOutputs.cogs, cur);
  addDataRow('Gross Profit', plOutputs.grossProfit, cur, true);
  addDataRow('Gross Margin %', plOutputs.grossMargin, pct);

  ws.addRow([]);

  // ---- Operating Expenses ----
  addSectionHeader('Operating Expenses');
  addDataRow('Commercial & Sales', plOutputs.commercialSales, cur);
  addDataRow('G&A', plOutputs.gAndA, cur);
  addDataRow('R&D', plOutputs.rAndD, cur);
  addDataRow('Total OpEx', plOutputs.totalOpEx, cur, true);

  ws.addRow([]);

  // ---- EBITDA → Net Income ----
  addSectionHeader('Earnings');
  addDataRow('EBITDA', plOutputs.ebitda, cur, true);
  addDataRow('EBITDA Margin %', plOutputs.ebitdaMargin, pct);
  addDataRow('D&A', plOutputs.dAndA, cur);
  addDataRow('EBIT', plOutputs.ebit, cur, true);
  addDataRow('EBIT Margin %', plOutputs.ebitMargin, pct);
  addDataRow('Income Tax', plOutputs.incomeTax, cur);
  addDataRow('Net Income', plOutputs.netIncome, cur, true);
  addDataRow('Net Income Margin %', plOutputs.netIncomeMargin, pct);

  ws.addRow([]);

  // ---- Free Cash Flow ----
  addSectionHeader('Free Cash Flow');
  addDataRow('Working Capital Change', plOutputs.workingCapitalChange, cur);
  addDataRow('Capital Expenditure', plOutputs.capitalExpenditure, cur);
  addDataRow('Free Cash Flow', plOutputs.freeCashFlow, cur, true);
  addDataRow('Cumulative FCF', plOutputs.cumulativeFCF, cur, true);

  // Freeze panes: row 1, column A
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}
