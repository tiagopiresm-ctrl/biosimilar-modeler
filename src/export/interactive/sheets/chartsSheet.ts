// ──────────────────────────────────────────────────────────────
// Interactive Excel — Charts Data sheet builder
// ──────────────────────────────────────────────────────────────
// Since ExcelJS does not support programmatic chart creation,
// this sheet provides clean data tables for each chart so users
// can easily insert Excel charts from the data.
//
// Chart datasets:
//   1. Market & Biosimilar Volumes (Line)
//   2. Revenue Breakdown (Stacked Bar)
//   3. P&L Summary (Bar)
//   4. Free Cash Flow (Area/Line)
//   5. Total Revenue by Country (Line)
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import {
  HEADER_FONT, HEADER_FILL, SECTION_FONT, SECTION_FILL,
  LABEL_FONT, BOLD_VALUE_FONT, NUM_FMT,
} from '../../excelStyles';

export function addChartsDataSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('Charts Data');
  const { countries, countryOutputs, plOutputs, periodLabels, config } = ctx;
  const NP = periodLabels.length;

  // Column widths
  ws.getColumn(1).width = 35;
  for (let c = 2; c <= NP + 1; c++) ws.getColumn(c).width = 14;

  // Freeze first column
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 0 }];

  let row = 1;

  // ── Helper: write a section title ──
  const writeTitle = (label: string) => {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { ...SECTION_FONT, size: 11 };
    for (let c = 1; c <= NP + 1; c++) {
      r.getCell(c).fill = SECTION_FILL;
    }
    row++;
  };

  // ── Helper: write period header ──
  const writePeriodRow = () => {
    const r = ws.getRow(row);
    r.getCell(1).value = '';
    r.getCell(1).font = HEADER_FONT;
    r.getCell(1).fill = HEADER_FILL;
    for (let p = 0; p < NP; p++) {
      const cell = r.getCell(p + 2);
      cell.value = periodLabels[p];
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: 'center' };
    }
    row++;
  };

  // ── Helper: write a formula data row referencing the P&L or country model ──
  const writeFormulaDataRow = (
    label: string,
    sheetKey: string,
    fieldName: string,
    cachedValues: number[],
    numFmt: string,
    bold: boolean = false,
  ) => {
    const c1 = ws.getCell(row, 1);
    c1.value = label;
    c1.font = bold ? BOLD_VALUE_FONT : LABEL_FONT;

    for (let p = 0; p < NP; p++) {
      const cell = ws.getCell(row, p + 2);
      try {
        const ref = cellMap.get(sheetKey, fieldName, p).toFormula();
        cell.value = { formula: ref, result: cachedValues[p] ?? 0 };
      } catch {
        // If cell not registered, use cached value directly
        cell.value = cachedValues[p] ?? 0;
      }
      cell.numFmt = numFmt;
      if (bold) cell.font = BOLD_VALUE_FONT;
    }
    row++;
  };

  // ── Helper: write a static data row (no formula) ──
  const writeStaticDataRow = (
    label: string,
    values: number[],
    numFmt: string,
    bold: boolean = false,
  ) => {
    const c1 = ws.getCell(row, 1);
    c1.value = label;
    c1.font = bold ? BOLD_VALUE_FONT : LABEL_FONT;

    for (let p = 0; p < NP; p++) {
      const cell = ws.getCell(row, p + 2);
      cell.value = values[p] ?? 0;
      cell.numFmt = numFmt;
      if (bold) cell.font = BOLD_VALUE_FONT;
    }
    row++;
  };

  // ── Instruction row ──
  const instrCell = ws.getCell(row, 1);
  instrCell.value = 'Charts Data — Select a data table below and use Insert > Chart in Excel to create charts.';
  instrCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '404040' } };
  ws.mergeCells(row, 1, row, Math.min(NP + 1, 8));
  row++;
  row++;

  // ════════════════════════════════════════════════════════════
  // Chart 1: Market & Biosimilar Volumes (Line)
  // ════════════════════════════════════════════════════════════
  writeTitle('Chart 1: Market & Biosimilar Volumes (Line Chart)');
  writePeriodRow();

  // Aggregate across countries
  const totalMarketVolume = new Array(NP).fill(0);
  const totalOriginatorVolume = new Array(NP).fill(0);
  const totalBiosimilarVolume = new Array(NP).fill(0);
  const ourProductVolume = new Array(NP).fill(0);

  for (let ci = 0; ci < countries.length; ci++) {
    const co = countryOutputs[ci];
    for (let p = 0; p < NP; p++) {
      totalMarketVolume[p] += co.marketVolume[p] ?? 0;
      totalOriginatorVolume[p] += co.originatorVolume[p] ?? 0;
      totalBiosimilarVolume[p] += co.totalBiosimilarVolume[p] ?? 0;
      ourProductVolume[p] += co.biosimilarVolume[p] ?? 0;
    }
  }

  writeStaticDataRow('Total Market Volume', totalMarketVolume, NUM_FMT.integer, true);
  writeStaticDataRow('Originator Volume', totalOriginatorVolume, NUM_FMT.integer);
  writeStaticDataRow('Total Biosimilar Volume', totalBiosimilarVolume, NUM_FMT.integer);
  writeStaticDataRow('Our Product Volume', ourProductVolume, NUM_FMT.integer);
  row++;

  // ════════════════════════════════════════════════════════════
  // Chart 2: Revenue Breakdown (Stacked Bar)
  // ════════════════════════════════════════════════════════════
  writeTitle('Chart 2: Revenue Breakdown (Stacked Bar Chart)');
  writePeriodRow();

  writeFormulaDataRow('Net Supply Revenue', 'pl', 'totalNetSupplyRevenue', plOutputs.totalNetSupplyRevenue, NUM_FMT.integer);
  writeFormulaDataRow('Royalty Income', 'pl', 'totalRoyaltyIncome', plOutputs.totalRoyaltyIncome, NUM_FMT.integer);
  writeFormulaDataRow('Milestone Income', 'pl', 'totalMilestoneIncome', plOutputs.totalMilestoneIncome, NUM_FMT.integer);
  writeFormulaDataRow('Total Revenue', 'pl', 'totalRevenue', plOutputs.totalRevenue, NUM_FMT.integer, true);
  row++;

  // ════════════════════════════════════════════════════════════
  // Chart 3: P&L Summary (Bar)
  // ════════════════════════════════════════════════════════════
  writeTitle('Chart 3: P&L Summary (Grouped Bar Chart)');
  writePeriodRow();

  writeFormulaDataRow('Total Revenue', 'pl', 'totalRevenue', plOutputs.totalRevenue, NUM_FMT.integer, true);
  writeFormulaDataRow('COGS', 'pl', 'cogs', plOutputs.cogs, NUM_FMT.integer);
  writeFormulaDataRow('EBITDA', 'pl', 'ebitda', plOutputs.ebitda, NUM_FMT.integer, true);
  writeFormulaDataRow('Net Income', 'pl', 'netIncome', plOutputs.netIncome, NUM_FMT.integer, true);
  row++;

  // ════════════════════════════════════════════════════════════
  // Chart 4: Free Cash Flow (Area / Line)
  // ════════════════════════════════════════════════════════════
  writeTitle('Chart 4: Free Cash Flow (Area / Line Chart)');
  writePeriodRow();

  writeFormulaDataRow('Annual FCF', 'pl', 'fcf', plOutputs.freeCashFlow, NUM_FMT.integer, true);
  writeFormulaDataRow('Cumulative FCF', 'pl', 'cumulativeFCF', plOutputs.cumulativeFCF, NUM_FMT.integer, true);
  row++;

  // ════════════════════════════════════════════════════════════
  // Chart 5: Total Revenue by Country (Line)
  // ════════════════════════════════════════════════════════════
  writeTitle('Chart 5: Total Revenue by Country (Line Chart)');
  writePeriodRow();

  for (let ci = 0; ci < countries.length; ci++) {
    const countryName = countries[ci].name;
    const co = countryOutputs[ci];
    const fxRates = countries[ci].fxRate;

    // Total country revenue = supply + royalty + milestones, FX-converted
    const countryRevenue = new Array(NP).fill(0);
    for (let p = 0; p < NP; p++) {
      const fx = fxRates[p] ?? 1;
      const supply = co.netSupplyRevenue[p] ?? 0;
      const royalty = co.royaltyIncome[p] ?? 0;
      const milestones = co.milestoneIncome[p] ?? 0;

      if (config.apiPricingModel === 'percentage') {
        // FX-convert supply and royalty (milestones already in model currency)
        countryRevenue[p] = (fx !== 0 ? supply / fx : 0) + (fx !== 0 ? royalty / fx : 0) + milestones;
      } else {
        countryRevenue[p] = supply + (fx !== 0 ? royalty / fx : 0) + milestones;
      }
    }

    writeStaticDataRow(`Revenue — ${countryName}`, countryRevenue, NUM_FMT.integer);
  }

  // Total across countries
  writeFormulaDataRow('Total Revenue (All Countries)', 'pl', 'totalRevenue', plOutputs.totalRevenue, NUM_FMT.integer, true);
}
