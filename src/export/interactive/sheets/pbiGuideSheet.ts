// Power BI Guide sheet — step-by-step instructions for connecting Power BI

import type { Workbook } from 'exceljs';
import { HEADER_FILL, HEADER_FONT, SECTION_FONT, LABEL_FONT, BOLD_VALUE_FONT } from '../../excelStyles';

export function addPBIGuideSheet(wb: Workbook): void {
  const ws = wb.addWorksheet('Power BI Guide');

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 80;

  let row = 1;

  // Title
  const titleRow = ws.getRow(row);
  ws.mergeCells(row, 1, row, 2);
  titleRow.getCell(1).value = 'Power BI Connection Guide';
  titleRow.getCell(1).font = { ...HEADER_FONT, size: 14 };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 30;
  row += 2;

  const addSection = (title: string) => {
    ws.getCell(row, 1).value = '';
    ws.mergeCells(row, 1, row, 2);
    ws.getCell(row, 1).value = title;
    ws.getCell(row, 1).font = { ...SECTION_FONT, size: 12 };
    row++;
  };

  const addStep = (step: string, text: string) => {
    ws.getCell(row, 1).value = step;
    ws.getCell(row, 1).font = BOLD_VALUE_FONT;
    ws.getCell(row, 2).value = text;
    ws.getCell(row, 2).font = LABEL_FONT;
    ws.getRow(row).height = 20;
    row++;
  };

  const addText = (text: string, bold = false) => {
    ws.mergeCells(row, 1, row, 2);
    ws.getCell(row, 1).value = text;
    ws.getCell(row, 1).font = bold ? BOLD_VALUE_FONT : LABEL_FONT;
    row++;
  };

  // ── Step 1: Connect ──
  addSection('Step 1: Connect Power BI to This Workbook');
  addStep('1.1', 'Open Power BI Desktop');
  addStep('1.2', 'Click "Get Data" → "Excel Workbook"');
  addStep('1.3', 'Navigate to this .xlsx file (on SharePoint/OneDrive or local)');
  addStep('1.4', 'In the Navigator, check the "tbl_PBI_Data" table → Click "Load"');
  addText('This loads the flat data table from the "PBI Data" sheet.', true);
  row++;

  // ── Step 2: Data Model ──
  addSection('Step 2: Set Up the Data Model');
  addText('The tbl_PBI_Data table has these columns:');
  addStep('', 'Country — Filter by country or use as a slicer');
  addStep('', 'Period — Year (text). Convert to number or date for time axes');
  addStep('', 'Category — Revenue, Costs, Earnings, Cash Flow, NPV, Market, etc.');
  addStep('', 'Metric — Specific metric name (e.g., "Total Revenue", "EBIT")');
  addStep('', 'Value — The numeric value');
  row++;

  addText('Recommended: Create a "Period" dimension table for sorting:', true);
  addStep('', 'In Power Query: add a column PeriodNum = Number.FromText([Period])');
  addStep('', 'Sort the Period column by PeriodNum for correct chronological order');
  row++;

  // ── Step 3: DAX Measures ──
  addSection('Step 3: Suggested DAX Measures');
  addText('Create these measures in Power BI for common calculations:', true);
  row++;

  const addDax = (name: string, formula: string) => {
    ws.getCell(row, 1).value = name;
    ws.getCell(row, 1).font = BOLD_VALUE_FONT;
    row++;
    ws.getCell(row, 1).value = '';
    ws.getCell(row, 2).value = formula;
    ws.getCell(row, 2).font = { name: 'Consolas', size: 9 };
    row++;
  };

  addDax('Total Revenue (measure)',
    'Total Revenue = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Total Revenue")');
  addDax('EBIT (measure)',
    'EBIT = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "EBIT")');
  addDax('Free Cash Flow (measure)',
    'FCF = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Free Cash Flow")');
  addDax('Gross Margin %',
    'Gross Margin % = DIVIDE([Gross Profit], [Total Revenue], 0)');
  addDax('EBIT Margin %',
    'EBIT Margin % = DIVIDE([EBIT], [Total Revenue], 0)');
  addDax('NPV (scalar)',
    'NPV = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "NPV", tbl_PBI_Data[Category] = "KPI")');
  row++;

  // ── Step 4: Visuals ──
  addSection('Step 4: Recommended Dashboard Pages');
  row++;

  addText('Page 1: Executive Summary', true);
  addStep('', 'KPI Cards: NPV, rNPV, IRR, WACC, Cumulative PoS');
  addStep('', 'Slicer: Country (for filtering)');
  addStep('', 'Card: Active Scenario label');
  row++;

  addText('Page 2: P&L Waterfall', true);
  addStep('', 'Waterfall chart: Revenue → COGS → Gross Profit → OpEx → EBIT → Tax → Net Income');
  addStep('', 'Filter by Period to show a single year, or use a slicer');
  row++;

  addText('Page 3: Country Comparison', true);
  addStep('', 'Stacked bar: Supply Revenue by Country over time');
  addStep('', 'Pie chart: Revenue split by Country for a selected year');
  row++;

  addText('Page 4: NPV Bridge', true);
  addStep('', 'Line chart: Cumulative Discounted FCF over time');
  addStep('', 'Mark break-even point with a reference line');
  row++;

  addText('Page 5: Timeline', true);
  addStep('', 'Combo chart: Revenue (bars) + EBIT Margin % (line) over time');
  addStep('', 'Add a vertical line at LOE year');
  row++;

  // ── Step 5: Refresh ──
  addSection('Step 5: Refreshing Data');
  addText('When you update inputs in Excel and save:', true);
  addStep('1', 'Open Power BI Desktop');
  addStep('2', 'Click "Refresh" on the Home ribbon');
  addStep('3', 'Power BI reloads the tbl_PBI_Data table from the Excel file');
  addText('Note: If the Excel file is on SharePoint, Power BI Service can auto-refresh on a schedule.', true);

  // No freeze panes for this instructional sheet
}
