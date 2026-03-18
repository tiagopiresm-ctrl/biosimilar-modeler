// Power BI Guide sheet — comprehensive step-by-step dashboard building guide

import type { Workbook } from 'exceljs';
import { HEADER_FILL, HEADER_FONT, SECTION_FONT, LABEL_FONT, BOLD_VALUE_FONT } from '../../excelStyles';

export function addPBIGuideSheet(wb: Workbook): void {
  const ws = wb.addWorksheet('Power BI Guide');

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 90;

  let row = 1;

  // Title
  const titleRow = ws.getRow(row);
  ws.mergeCells(row, 1, row, 2);
  titleRow.getCell(1).value = 'Power BI Dashboard — Complete Setup Guide';
  titleRow.getCell(1).font = { ...HEADER_FONT, size: 14 };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 30;
  row += 2;

  const addSection = (title: string) => {
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

  const addDax = (name: string, formula: string) => {
    ws.getCell(row, 1).value = name;
    ws.getCell(row, 1).font = BOLD_VALUE_FONT;
    row++;
    ws.getCell(row, 1).value = '';
    ws.getCell(row, 2).value = formula;
    ws.getCell(row, 2).font = { name: 'Consolas', size: 9 };
    row++;
  };

  // ════════════════════════════════════════════════════════════════
  // STEP 1: CONNECT
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 1: Connect Power BI to This Workbook');
  addStep('1.1', 'Open Power BI Desktop on your work computer');
  addStep('1.2', 'Home tab → Get Data → Excel Workbook');
  addStep('1.3', 'Navigate to this .xlsx file (OneDrive/SharePoint or local)');
  addStep('1.4', 'In the Navigator panel, check "tbl_PBI_Data" → Click "Load"');
  addText('This loads the flat data table from the "PBI Data" sheet into Power BI.', true);
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 2: DATA MODEL
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 2: Understand the Data Model');
  addText('The tbl_PBI_Data table has 5 columns in a flat/unpivoted structure:');
  addStep('', 'Country — Country name (e.g., "United States", "Germany", "Consolidated")');
  addStep('', 'Period — Year as text (e.g., "2022", "2030"). Use as axis or slicer');
  addStep('', 'Category — Groups metrics: Revenue, Costs, Earnings, Cash Flow, Market, NPV, KPI');
  addStep('', 'Metric — Specific metric name (e.g., "Total Revenue", "EBIT", "Biosimilar Share")');
  addStep('', 'Value — The numeric value for that Country + Period + Metric combination');
  row++;
  addText('Available Metrics by Category:', true);
  addStep('Revenue', 'Net Supply Revenue, Royalty Income, Milestone Income, Total Revenue');
  addStep('Costs', 'COGS, Commercial & Sales, G&A, R&D, Total OpEx');
  addStep('Earnings', 'Gross Profit, EBITDA, D&A, EBIT, Financial Costs, EBT, Income Tax, Net Income');
  addStep('Cash Flow', 'D&A Add-Back, Working Capital Change, CapEx, Free Cash Flow, Cumulative FCF');
  addStep('Market', 'Market Volume, Originator Share, Biosimilar Share, Biosimilar Volume, In-Market Sales');
  addStep('NPV', 'Discount Factor, Discounted FCF, Cumulative Discounted FCF, Risk-Adjusted FCF');
  addStep('KPI', 'NPV, rNPV, IRR, rIRR, Money at Risk, WACC, Cumulative PoS, ENPV');
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 3: PERIOD SORT FIX
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 3: Fix Period Sorting (Important!)');
  addText('Power BI sorts text alphabetically, so "2030" comes before "2022". Fix this:', true);
  addStep('3.1', 'Go to Transform Data (Power Query Editor)');
  addStep('3.2', 'Select the "Period" column');
  addStep('3.3', 'Add Column → Custom Column → Name: "PeriodNum" → Formula: Number.FromText([Period])');
  addStep('3.4', 'Close & Apply');
  addStep('3.5', 'In the model view, select Period column → Sort by Column → PeriodNum');
  addText('Now all charts with Period on the axis will sort chronologically.', true);
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 4: DAX MEASURES
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 4: Create DAX Measures (copy-paste these exactly)');
  addText('Right-click tbl_PBI_Data in the Fields pane → New Measure. Paste each formula:', true);
  row++;

  addText('--- Core P&L Measures ---', true);
  addDax('Total Revenue',
    'Total Revenue = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Total Revenue", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('COGS',
    'COGS = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "COGS", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('Gross Profit',
    'Gross Profit = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Gross Profit", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('EBITDA',
    'EBITDA = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "EBITDA", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('EBIT',
    'EBIT = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "EBIT", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('Net Income',
    'Net Income = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Net Income", tbl_PBI_Data[Country] = "Consolidated")');
  addDax('Free Cash Flow',
    'FCF = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Free Cash Flow", tbl_PBI_Data[Country] = "Consolidated")');

  addText('--- Margin Measures ---', true);
  addDax('Gross Margin %',
    'Gross Margin % = DIVIDE([Gross Profit], [Total Revenue], 0)');
  addDax('EBITDA Margin %',
    'EBITDA Margin % = DIVIDE([EBITDA], [Total Revenue], 0)');
  addDax('EBIT Margin %',
    'EBIT Margin % = DIVIDE([EBIT], [Total Revenue], 0)');
  addDax('Net Margin %',
    'Net Margin % = DIVIDE([Net Income], [Total Revenue], 0)');

  addText('--- KPI Measures (single values, no period context) ---', true);
  addDax('NPV',
    'NPV = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "NPV", tbl_PBI_Data[Category] = "KPI", ALL(tbl_PBI_Data[Period]))');
  addDax('rNPV',
    'rNPV = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "rNPV", tbl_PBI_Data[Category] = "KPI", ALL(tbl_PBI_Data[Period]))');
  addDax('IRR',
    'IRR = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "IRR", tbl_PBI_Data[Category] = "KPI", ALL(tbl_PBI_Data[Period]))');
  addDax('ENPV',
    'ENPV = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "ENPV", tbl_PBI_Data[Category] = "KPI", ALL(tbl_PBI_Data[Period]))');
  addDax('WACC',
    'WACC = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "WACC", tbl_PBI_Data[Category] = "KPI", ALL(tbl_PBI_Data[Period]))');

  addText('--- Country-Level Measures (respond to Country slicer) ---', true);
  addDax('Supply Revenue (by country)',
    'Supply Revenue = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Net Supply Revenue")');
  addDax('Biosimilar Share',
    'BS Share = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Biosimilar Share")');
  addDax('Biosimilar Volume',
    'BS Volume = CALCULATE(SUM(tbl_PBI_Data[Value]), tbl_PBI_Data[Metric] = "Biosimilar Volume")');
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 5: BUILD PAGES
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 5: Build Dashboard Pages (5 pages)');
  row++;

  addText('═══ PAGE 1: Executive Summary ═══', true);
  addStep('Layout', '4 KPI cards across the top + 1 combo chart below');
  addStep('Card 1', 'Drag [NPV] measure → Card visual. Format: currency, 0 decimals');
  addStep('Card 2', 'Drag [rNPV] measure → Card visual');
  addStep('Card 3', 'Drag [IRR] measure → Card visual. Format: percentage');
  addStep('Card 4', 'Drag [ENPV] measure → Card visual');
  addStep('Chart', 'Clustered Bar Chart: Axis = Period, Values = [Total Revenue], [EBITDA], [FCF]');
  addStep('Slicer', 'Add a slicer for Country (optional — KPIs show Consolidated by default)');
  row++;

  addText('═══ PAGE 2: P&L Over Time ═══', true);
  addStep('Layout', 'Combo chart (full width) + margin line');
  addStep('Chart', 'Clustered Bar + Line: Axis = Period');
  addStep('Bars', 'Column values: [Total Revenue] (blue), [COGS] (red)');
  addStep('Lines', 'Line values: [EBITDA] (orange), [Net Income] (green)');
  addStep('How', 'Insert Clustered Bar → drag measures to Values → right-click EBITDA → "Show as Line"');
  addStep('Table', 'Below the chart: Matrix visual with Metric on Rows, Period on Columns, Value as Values');
  addStep('Filter', 'Filter the Matrix to Category = "Earnings" to show only P&L lines');
  row++;

  addText('═══ PAGE 3: Country Comparison ═══', true);
  addStep('Layout', 'Stacked bar (left) + Donut chart (right)');
  addStep('Stacked Bar', 'Axis = Period, Values = [Supply Revenue], Legend = Country');
  addStep('Filter', 'Exclude "Consolidated" from Country in this visual');
  addStep('Donut', 'Values = [Supply Revenue], Legend = Country. Shows revenue split');
  addStep('Slicer', 'Add a Period slicer so users can pick a year for the donut');
  addStep('Table', 'Add a table: Country, Peak BS Volume, Peak BS Share, Peak Supply Revenue');
  row++;

  addText('═══ PAGE 4: NPV & Valuation ═══', true);
  addStep('Layout', 'Area chart (top) + KPI cards (bottom)');
  addStep('Area Chart', 'Axis = Period, Values = Cumulative Discounted FCF');
  addStep('How', 'Use: CALCULATE(SUM(Value), Metric = "Cumulative Discounted FCF", Country = "Consolidated")');
  addStep('Reference', 'Add a constant line at Y = 0 (Format → Analytics → Constant Line → 0)');
  addStep('Card Row', '6 cards: NPV, rNPV, IRR, rIRR, Money at Risk, WACC');
  addStep('Tip', 'The area chart shows the "valley of death" — where cumulative value dips negative before turning positive');
  row++;

  addText('═══ PAGE 5: Market Dynamics ═══', true);
  addStep('Layout', 'Stacked area chart (top) + line chart (bottom)');
  addStep('Stacked Area', 'Axis = Period, Values = Originator Share, Biosimilar Share, Generic Share');
  addStep('How', 'Filter: Category = "Market", Country = first country. Use % values');
  addStep('Line Chart', 'Axis = Period, Values = Market Volume, Biosimilar Volume');
  addStep('Slicer', 'Add Country slicer to switch between markets');
  addStep('Tip', 'Shows how market share evolves from 100% originator to biosimilar penetration');
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 6: FORMATTING
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 6: Dashboard Formatting Tips');
  addStep('Theme', 'View → Themes → pick a corporate theme or use custom colors');
  addStep('Colors', 'Suggested: Revenue=#2E75B6, COGS=#C00000, EBITDA=#ED7D31, Net Income=#70AD47, FCF=#7030A0');
  addStep('Headers', 'Add text boxes with page titles. Use company font if available');
  addStep('Cards', 'Format cards: category label ON, display units = Thousands or Millions');
  addStep('Axes', 'Set number format on Y-axis: #,##0 for thousands, 0.0% for percentages');
  addStep('Slicers', 'Use dropdown slicers to save space. Sync slicers across pages if needed');
  row++;

  // ════════════════════════════════════════════════════════════════
  // STEP 7: REFRESH & SHARE
  // ════════════════════════════════════════════════════════════════
  addSection('STEP 7: Refresh & Share');
  addStep('Refresh', 'When you update the Excel model: open Power BI → Home → Refresh');
  addStep('Auto', 'If the Excel is on SharePoint/OneDrive: publish to Power BI Service → set scheduled refresh');
  addStep('Share', 'Publish to Power BI Service → share workspace with your team');
  addStep('Export', 'File → Export → PDF to create a static report for email');
  addText('The Excel formulas recalculate when you change inputs. Refresh Power BI to see updated dashboards.', true);
}
