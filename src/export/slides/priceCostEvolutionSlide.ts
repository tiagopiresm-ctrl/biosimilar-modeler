// ──────────────────────────────────────────────────────────────
// Slide 5: Price vs Cost Evolution (maps to template slide 10)
//
// Top    = Line chart: Supply Price per Unit & COGS per Unit over time
// Bottom = Table: Regional ASP by year + Gross margin trend row
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  MID_BLUE,
} from './slideLayout';

export function addPriceCostEvolutionSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Price vs Cost Evolution');

  const { countries, countryOutputs, plOutputs, periodLabels } = ctx;
  const NP = periodLabels.length;

  // ── Compute weighted-average supply price and COGS per unit ─
  const avgSupplyPrice: number[] = [];
  const cogsPerUnit: number[] = [];

  for (let p = 0; p < NP; p++) {
    let totalSupplyRev = 0;
    let totalVol = 0;
    for (const co of countryOutputs) {
      totalSupplyRev += co.grossSupplyRevenue[p] ?? 0;
      totalVol += co.biosimilarVolume[p] ?? 0;
    }
    avgSupplyPrice.push(totalVol > 0 ? (totalSupplyRev / totalVol) * 1000 : 0);
    const cogsVal = Math.abs(plOutputs.cogs[p] ?? 0);
    cogsPerUnit.push(totalVol > 0 ? (cogsVal / totalVol) * 1000 : 0);
  }

  // ── Select display years ──────────────────────────────────
  const step = NP > 12 ? 2 : 1;
  const keyIdx: number[] = [];
  for (let i = 0; i < NP; i += step) keyIdx.push(i);
  if (keyIdx[keyIdx.length - 1] !== NP - 1) keyIdx.push(NP - 1);

  const displayLabels = keyIdx.map(i => periodLabels[i]);
  const pick = (arr: number[]) => keyIdx.map(i => arr[i] ?? 0);

  // ── Line chart: Supply Price vs COGS per unit ─────────────
  const chartY = CONTENT_TOP;
  const chartH = 2.2;

  const chartData = [
    { name: 'Avg. Supply Price/Unit', labels: displayLabels, values: pick(avgSupplyPrice) },
    { name: 'COGS/Unit', labels: displayLabels, values: pick(cogsPerUnit) },
  ];

  slide.addChart('line', chartData, {
    x: MARGIN_X, y: chartY, w: CONTENT_W, h: chartH,
    chartColors: [MID_BLUE, 'C00000'],
    lineSize: 2,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 6,
    catAxisLabelRotate: displayLabels.length > 10 ? 45 : 0,
    valAxisLabelFontSize: 6,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
    lineDataSymbol: 'circle',
    lineDataSymbolSize: 4,
  });

  // ── Table: Regional ASP by year + Gross Margin ────────────
  const tableY = chartY + chartH + 0.2;

  const headerRow: object[] = [
    { text: '', options: TABLE_HDR },
    ...keyIdx.map(i => ({ text: periodLabels[i], options: TABLE_HDR_R })),
  ];

  const tableRows: object[][] = [headerRow];
  let rowNum = 0;

  // One row per country — average selling price per period
  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];
    tableRows.push([
      { text: `${c.name} ASP`, options: { ...tableCellOpts(rowNum, 'left'), bold: true } },
      ...keyIdx.map(i => ({
        text: co.biosimilarInMarketPrice[i] > 0
          ? formatCurrency(co.biosimilarInMarketPrice[i], '', 2)
          : '-',
        options: tableCellOpts(rowNum, 'right'),
      })),
    ]);
    rowNum++;
  }

  // Gross margin row
  tableRows.push([
    { text: 'Gross Margin %', options: { ...tableCellOpts(rowNum, 'left'), bold: true } },
    ...keyIdx.map(i => ({
      text: plOutputs.grossMargin[i] != null ? formatPercent(plOutputs.grossMargin[i]) : '-',
      options: tableCellOpts(rowNum, 'right'),
    })),
  ]);

  const labelW = 1.4;
  const remainW = CONTENT_W - labelW;
  const yrW = remainW / keyIdx.length;
  const colWidths = [labelW, ...keyIdx.map(() => yrW)];
  const rowH = Math.min(0.25, 2.0 / tableRows.length);

  slide.addTable(tableRows, {
    x: MARGIN_X, y: tableY, w: CONTENT_W,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: colWidths,
    rowH: Array(tableRows.length).fill(rowH),
    autoPage: false,
  });
}
