// Country detail sheet — one sheet per country with market data + economics

import type { Workbook, Row } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  styleHeaderRow, styleSectionRow,
  LABEL_FONT, BOLD_VALUE_FONT, NUM_FMT,
} from '../excelStyles';

export function addCountrySheets(wb: Workbook, ctx: ExportContext): void {
  const { countries, countryOutputs, periodLabels, config } = ctx;
  const NP = periodLabels.length;

  for (let ci = 0; ci < countries.length; ci++) {
    const country = countries[ci];
    const co = countryOutputs[ci];

    // Sheet name max 31 chars
    const sheetName = (country.name || `Country ${ci + 1}`).slice(0, 31);
    const ws = wb.addWorksheet(sheetName);

    const colCount = NP + 1;
    ws.getColumn(1).width = 28;
    for (let c = 2; c <= colCount; c++) ws.getColumn(c).width = 14;

    const cur = NUM_FMT.integer;
    const dec2 = NUM_FMT.decimal2;
    const pct = NUM_FMT.percent;

    // Header
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

    // ---- Market Overview ----
    addSection(`${country.name} — Market Overview`);
    addDataRow('Total Market Volume', co.marketVolume, cur);
    addDataRow('Volume YoY Growth', co.marketVolumeYoY, pct);
    addDataRow('Originator Reference Price', co.originatorRefPrice, dec2);
    addDataRow('FX Rate (local/' + config.currency + ')', country.fxRate, dec2);

    ws.addRow([]);

    // ---- Originator ----
    addSection('Originator');
    addDataRow('Market Share', co.originatorShare, pct);
    addDataRow('Volume', co.originatorVolume, cur);
    addDataRow('Sales', co.originatorSales, cur);

    ws.addRow([]);

    // ---- Generics (total) ----
    addSection('Generic Competitors (Total)');
    addDataRow('Total Generic Share', co.totalGenericShare, pct);
    addDataRow('Total Generic Volume', co.totalGenericVolume, cur);
    addDataRow('Total Generic Sales', co.totalGenericSales, cur);

    ws.addRow([]);

    // ---- Biosimilar ----
    addSection('Biosimilar');
    addDataRow('Market Share', co.biosimilarShare, pct);
    addDataRow('Volume', co.biosimilarVolume, cur);
    addDataRow('In-Market Price', co.biosimilarInMarketPrice, dec2);
    addDataRow('In-Market Sales', co.biosimilarInMarketSales, cur);

    ws.addRow([]);

    // ---- Partner Economics ----
    addSection('Partner Economics');
    addDataRow('Partner Net Selling Price', co.partnerNetSellingPrice, dec2);
    addDataRow('Partner Net Sales', co.partnerNetSales, cur);
    addDataRow('Supply Price (per unit)', co.supplyPrice, dec2);
    addDataRow('Gross Supply Revenue', co.grossSupplyRevenue, cur);
    addDataRow('Net Supply Revenue', co.netSupplyRevenue, cur, true);
    addDataRow('Royalty Income', co.royaltyIncome, cur);
    addDataRow('Milestone Income', co.milestoneIncome, cur);

    ws.addRow([]);

    // ---- API Economics ----
    addSection('API Economics');
    addDataRow('API Grams Supplied', co.apiGramsSupplied, cur);
    addDataRow('API Price per Gram', co.apiPricePerGram, dec2);
    addDataRow('API Price per Kg', co.apiPricePerKg, cur);

    ws.addRow([]);

    // ---- Market Check ----
    addSection('Market Check');
    addDataRow('Total Market Value', co.totalMarketValue, cur);
    addDataRow('Market Share Check', co.marketShareCheck, pct);

    // Freeze
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  }
}
