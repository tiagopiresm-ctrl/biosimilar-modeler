// PBI Data sheet — flat/unpivoted table for Power BI consumption
// Each row: Country | Period | Metric | Value
// Power BI can pivot this into any visualization

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import { styleHeaderRow, LABEL_FONT, BOLD_VALUE_FONT, NUM_FMT } from '../../excelStyles';

interface DataRow {
  country: string;
  period: string;
  category: string;
  metric: string;
  value: number;
}

export function addPBIDataSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('PBI Data');
  const { periodLabels, countries, countryOutputs, plOutputs, npvOutputs, waccOutputs, dtOutputs } = ctx;
  const NP = periodLabels.length;

  // Column widths
  ws.getColumn(1).width = 20; // Country
  ws.getColumn(2).width = 10; // Period
  ws.getColumn(3).width = 22; // Category
  ws.getColumn(4).width = 30; // Metric
  ws.getColumn(5).width = 18; // Value

  // Header
  const header = ws.addRow(['Country', 'Period', 'Category', 'Metric', 'Value']);
  styleHeaderRow(header, 5);

  const rows: DataRow[] = [];

  // ── Per-country metrics ──
  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];

    for (let p = 0; p < NP; p++) {
      const period = periodLabels[p];
      const push = (category: string, metric: string, value: number) =>
        rows.push({ country: c.name, period, category, metric, value });

      push('Market', 'Market Volume', co.marketVolume[p]);
      push('Market', 'Originator Ref Price', co.originatorRefPrice[p]);
      push('Market', 'Originator Share %', co.originatorShare[p]);
      push('Market', 'Total Generic Share %', co.totalGenericShare[p]);

      push('Biosimilar', 'Biosimilar Share %', co.biosimilarShare[p]);
      push('Biosimilar', 'Biosimilar Volume', co.biosimilarVolume[p]);
      push('Biosimilar', 'In-Market Price', co.biosimilarInMarketPrice[p]);
      push('Biosimilar', 'In-Market Sales', co.biosimilarInMarketSales[p]);

      push('Partner', 'Partner Net Sales', co.partnerNetSales[p]);
      push('Partner', 'Net Supply Revenue', co.netSupplyRevenue[p]);
      push('Partner', 'Royalty Income', co.royaltyIncome[p]);
      push('Partner', 'Milestone Income', co.milestoneIncome[p]);

      push('API', 'API Grams Supplied', co.apiGramsSupplied[p]);
      push('API', 'API Price per Gram', co.apiPricePerGram[p]);
    }
  }

  // ── Consolidated P&L metrics ──
  for (let p = 0; p < NP; p++) {
    const period = periodLabels[p];
    const push = (category: string, metric: string, value: number) =>
      rows.push({ country: 'Consolidated', period, category, metric, value });

    push('Revenue', 'Net Supply Revenue', plOutputs.totalNetSupplyRevenue[p]);
    push('Revenue', 'Royalty Income', plOutputs.totalRoyaltyIncome[p]);
    push('Revenue', 'Milestone Income', plOutputs.totalMilestoneIncome[p]);
    push('Revenue', 'Total Revenue', plOutputs.totalRevenue[p]);

    push('Costs', 'COGS', plOutputs.cogs[p]);
    push('Costs', 'Gross Profit', plOutputs.grossProfit[p]);
    push('Costs', 'Gross Margin %', plOutputs.grossMargin[p]);

    push('OpEx', 'Commercial & Sales', plOutputs.commercialSales[p]);
    push('OpEx', 'G&A', plOutputs.gAndA[p]);
    push('OpEx', 'R&D', plOutputs.rAndD[p]);
    push('OpEx', 'Total OpEx', plOutputs.totalOpEx[p]);

    push('Earnings', 'EBITDA', plOutputs.ebitda[p]);
    push('Earnings', 'EBIT', plOutputs.ebit[p]);
    push('Earnings', 'Income Tax', plOutputs.incomeTax[p]);
    push('Earnings', 'Net Income', plOutputs.netIncome[p]);

    push('Cash Flow', 'Free Cash Flow', plOutputs.freeCashFlow[p]);
    push('Cash Flow', 'Cumulative FCF', plOutputs.cumulativeFCF[p]);

    push('NPV', 'Discount Factor', npvOutputs.discountFactor[p]);
    push('NPV', 'Discounted FCF', npvOutputs.discountedFCF[p]);
    push('NPV', 'Cumulative Disc FCF', npvOutputs.cumulativeDiscountedFCF[p]);
    push('NPV', 'Risk-Adj Disc FCF', npvOutputs.riskAdjustedDiscountedFCF[p]);
  }

  // Write all data rows
  for (const r of rows) {
    const row = ws.addRow([r.country, r.period, r.category, r.metric, r.value]);
    row.getCell(1).font = LABEL_FONT;
    row.getCell(2).font = LABEL_FONT;
    row.getCell(3).font = LABEL_FONT;
    row.getCell(4).font = LABEL_FONT;
    row.getCell(5).numFmt = NUM_FMT.decimal2;
  }

  // ── Create Excel Table for Power BI auto-detection ──
  const lastRow = rows.length + 1; // +1 for header
  if (rows.length > 0) {
    ws.addTable({
      name: 'tbl_PBI_Data',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: [
        { name: 'Country', filterButton: true },
        { name: 'Period', filterButton: true },
        { name: 'Category', filterButton: true },
        { name: 'Metric', filterButton: true },
        { name: 'Value', filterButton: true },
      ],
      rows: rows.map(r => [r.country, r.period, r.category, r.metric, r.value]),
    });
  }

  // Add KPI summary rows at the bottom (for scalar metrics)
  const kpiStartRow = lastRow + 3;
  const addKpi = (row: number, label: string, value: number | string | null) => {
    ws.getCell(row, 1).value = 'KPI';
    ws.getCell(row, 1).font = LABEL_FONT;
    ws.getCell(row, 2).value = '';
    ws.getCell(row, 3).value = 'KPI';
    ws.getCell(row, 3).font = LABEL_FONT;
    ws.getCell(row, 4).value = label;
    ws.getCell(row, 4).font = BOLD_VALUE_FONT;
    ws.getCell(row, 5).value = typeof value === 'number' ? value : (value ?? 0);
    ws.getCell(row, 5).numFmt = NUM_FMT.decimal2;
  };

  let kr = kpiStartRow;
  addKpi(kr++, 'NPV', npvOutputs.npv);
  addKpi(kr++, 'rNPV', npvOutputs.rnpv);
  addKpi(kr++, 'IRR', npvOutputs.irr);
  addKpi(kr++, 'rIRR', npvOutputs.rirr);
  addKpi(kr++, 'WACC', waccOutputs.activeWACC);
  addKpi(kr++, 'Money at Risk', npvOutputs.moneyAtRisk);
  addKpi(kr++, 'Funding Need', npvOutputs.fundingNeed);
  addKpi(kr++, 'Cumulative PoS', dtOutputs.cumulativePoS);
  addKpi(kr++, 'eNPV', dtOutputs.enpv);
  addKpi(kr++, 'eNPV from rNPV', dtOutputs.enpvFromRnpv);
  addKpi(kr++, 'Peak EBIT', npvOutputs.peakEbitValue);
  addKpi(kr++, 'Peak EBIT Year', npvOutputs.peakEbitYear);
  addKpi(kr++, 'Break-Even Year', npvOutputs.breakEvenYear);
  addKpi(kr++, 'Payback Undiscounted', npvOutputs.paybackUndiscounted);
  addKpi(kr++, 'Payback Discounted', npvOutputs.paybackDiscounted);

  // Freeze header
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}
