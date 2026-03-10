// P&L Summary slide — condensed table of key financials

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber } from '../../calculations';

export function addPLSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { plOutputs, periodLabels, config } = ctx;
  const NP = periodLabels.length;

  // Title bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText(`P&L Summary (${config.currency} '000)`, {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // Select key periods: first, every 3rd, and last
  const indices: number[] = [];
  for (let i = 0; i < NP; i += 3) indices.push(i);
  if (indices[indices.length - 1] !== NP - 1) indices.push(NP - 1);

  // Also compute totals
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  type RowDef = { label: string; data: number[]; bold?: boolean };
  const rows: RowDef[] = [
    { label: 'Total Revenue', data: plOutputs.totalRevenue, bold: true },
    { label: 'COGS', data: plOutputs.cogs },
    { label: 'Gross Profit', data: plOutputs.grossProfit, bold: true },
    { label: 'Total OpEx', data: plOutputs.totalOpEx },
    { label: 'EBITDA', data: plOutputs.ebitda, bold: true },
    { label: 'EBIT', data: plOutputs.ebit, bold: true },
    { label: 'Net Income', data: plOutputs.netIncome, bold: true },
    { label: 'Free Cash Flow', data: plOutputs.freeCashFlow, bold: true },
  ];

  // Build table data
  const headerCells = [
    { text: '', options: { bold: true, fontSize: 8, fill: { color: '1F3864' }, color: 'FFFFFF', fontFace: 'Calibri' } },
    ...indices.map(i => ({
      text: periodLabels[i],
      options: { bold: true, fontSize: 8, fill: { color: '1F3864' }, color: 'FFFFFF', align: 'right' as const, fontFace: 'Calibri' },
    })),
    { text: 'Total', options: { bold: true, fontSize: 8, fill: { color: '1F3864' }, color: 'FFFFFF', align: 'right' as const, fontFace: 'Calibri' } },
  ];

  const tableRows: object[][] = [headerCells];

  for (const row of rows) {
    const total = sum(row.data);
    const cells = [
      { text: row.label, options: { bold: row.bold ?? false, fontSize: 8, fontFace: 'Calibri' } },
      ...indices.map(i => ({
        text: formatNumber(row.data[i]),
        options: { fontSize: 8, align: 'right' as const, bold: row.bold ?? false, fontFace: 'Calibri' },
      })),
      { text: formatNumber(total), options: { fontSize: 8, align: 'right' as const, bold: true, fontFace: 'Calibri' } },
    ];
    tableRows.push(cells);
  }

  slide.addTable(tableRows, {
    x: 0.3, y: 1.0, w: 9.4,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [1.8, ...indices.map(() => (9.4 - 1.8 - 1.0) / indices.length), 1.0],
    rowH: [0.3, ...rows.map(() => 0.28)],
    autoPage: false,
  });
}
