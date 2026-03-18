// Slide 5: P&L Summary — combo chart (top) + condensed P&L table (bottom)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber } from '../../calculations';

const DARK_BLUE = '1F4E79';
const BLUE = '2E75B6';
const RED = 'C00000';
const ORANGE = 'ED7D31';
const GREEN = '70AD47';

export function addPLSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { plOutputs, periodLabels, config } = ctx;
  const NP = periodLabels.length;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText(`P&L Summary (${config.currency} '000)`, {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Thin label display ─────────────────────────────────────
  const showEveryOther = NP > 10;
  const displayLabels = periodLabels.map((lbl, i) =>
    showEveryOther && i % 2 !== 0 ? '' : lbl,
  );

  // ── TOP — Combo chart: bars for Revenue & COGS, lines for EBITDA & Net Income ──
  // pptxgenjs doesn't support true combo charts, so we use clustered bar for all 4 series
  const chartData = [
    { name: 'Revenue', labels: displayLabels, values: plOutputs.totalRevenue },
    { name: 'COGS', labels: displayLabels, values: plOutputs.cogs.map((v) => Math.abs(v)) },
    { name: 'EBITDA', labels: displayLabels, values: plOutputs.ebitda },
    { name: 'Net Income', labels: displayLabels, values: plOutputs.netIncome },
  ];

  slide.addChart('bar', chartData, {
    x: 0.3, y: 0.7, w: 9.4, h: 2.2,
    barGrouping: 'clustered',
    chartColors: [BLUE, RED, ORANGE, GREEN],
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 6,
    catAxisLabelRotate: NP > 15 ? 45 : 0,
    catAxisOrientation: 'minMax',
    valAxisLabelFontSize: 6,
    valAxisOrientation: 'minMax',
    showTitle: false,
  });

  // ── BOTTOM — Condensed P&L table ───────────────────────────
  // Select key years: show every other year if >10, always include first & last
  const yearIndices: number[] = [];
  const step = NP > 10 ? 2 : 1;
  for (let i = 0; i < NP; i += step) yearIndices.push(i);
  if (yearIndices[yearIndices.length - 1] !== NP - 1) yearIndices.push(NP - 1);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const hdrOpts = {
    bold: true, fontSize: 6.5, fill: { color: DARK_BLUE }, color: 'FFFFFF', fontFace: 'Calibri',
  };
  const hdrR = { ...hdrOpts, align: 'right' as const };

  const headerRow = [
    { text: '', options: hdrOpts },
    ...yearIndices.map((i) => ({ text: periodLabels[i], options: hdrR })),
    { text: 'Total', options: { ...hdrR, fill: { color: '2F5597' } } },
  ];

  const altFill = { color: 'F2F2F2' };

  const makeRow = (label: string, arr: number[], rowIdx: number, bold = false) => {
    const isAlt = rowIdx % 2 === 1;
    const cellOpts = {
      fontSize: 6.5, fontFace: 'Calibri', align: 'right' as const,
      ...(bold ? { bold: true } : {}),
      ...(isAlt ? { fill: altFill } : {}),
    };
    const labelOpts = {
      fontSize: 6.5, fontFace: 'Calibri',
      ...(bold ? { bold: true } : {}),
      ...(isAlt ? { fill: altFill } : {}),
    };
    return [
      { text: label, options: labelOpts },
      ...yearIndices.map((i) => ({ text: formatNumber(arr[i] ?? 0), options: cellOpts })),
      { text: formatNumber(sum(arr)), options: { ...cellOpts, bold: true } },
    ];
  };

  const rows: object[][] = [
    headerRow,
    makeRow('Revenue', plOutputs.totalRevenue, 0, true),
    makeRow('COGS', plOutputs.cogs, 1),
    makeRow('Gross Profit', plOutputs.grossProfit, 2, true),
    makeRow('OpEx', plOutputs.totalOpEx, 3),
    makeRow('EBITDA', plOutputs.ebitda, 4, true),
    makeRow('EBT', plOutputs.ebt, 5),
    makeRow('Tax', plOutputs.incomeTax, 6),
    makeRow('Net Income', plOutputs.netIncome, 7, true),
    makeRow('FCF', plOutputs.freeCashFlow, 8, true),
  ];

  // Column widths: label + year columns + total
  // const numCols = yearIndices.length + 2;
  const labelW = 1.0;
  const totalW = 0.7;
  const remainingW = 9.4 - labelW - totalW;
  const yearColW = remainingW / yearIndices.length;
  const colWidths = [labelW, ...yearIndices.map(() => yearColW), totalW];

  const tableY = 3.2;

  slide.addTable(rows, {
    x: 0.3, y: tableY, w: 9.4,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: colWidths,
    rowH: Array(rows.length).fill(0.2),
    autoPage: false,
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText(
    `Values in ${config.currency} '000  |  ${NP} periods (${periodLabels[0]}\u2013${periodLabels[NP - 1]})`,
    {
      x: 0.3, y: 5.15, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
