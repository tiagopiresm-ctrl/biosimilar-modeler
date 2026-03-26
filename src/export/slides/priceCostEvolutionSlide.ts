// ──────────────────────────────────────────────────────────────
// Slide 5: Price vs Cost Evolution (maps to template slide 10)
//
// Layout (13.333 x 7.5"):
//   Top    = Line chart: Avg Supply Price/Unit & COGS/Unit
//   Bottom = Table: Regional ASP by year + Gross margin row
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  TEAL_BLUE,
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

  // ── Line chart ────────────────────────────────────────────
  const chartY = CONTENT_TOP;
  const chartH = 2.8;

  const chartData = [
    { name: 'Avg. Supply Price/Unit', labels: displayLabels, values: pick(avgSupplyPrice) },
    { name: 'COGS/Unit', labels: displayLabels, values: pick(cogsPerUnit) },
  ];

  slide.addChart('line', chartData, {
    x: MARGIN_X, y: chartY, w: CONTENT_W, h: chartH,
    chartColors: [TEAL_BLUE, 'C00000'],
    lineSize: 2,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 8,
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelRotate: displayLabels.length > 10 ? 45 : 0,
    valAxisLabelFontSize: 7,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
    lineDataSymbol: 'circle',
    lineDataSymbolSize: 5,
  });

  // ── Table: Regional ASP by year + Gross Margin ────────────
  const tableY = chartY + chartH + 0.25;

  const headerRow: object[] = [
    { text: '', options: TABLE_HDR },
    ...keyIdx.map(i => ({ text: periodLabels[i], options: TABLE_HDR_R })),
  ];

  const tableRows: object[][] = [headerRow];
  let rowNum = 0;

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

  const labelW = 1.8;
  const remainW = CONTENT_W - labelW;
  const yrW = remainW / keyIdx.length;
  const colWidths = [labelW, ...keyIdx.map(() => yrW)];
  const rowH = Math.min(0.30, 3.0 / tableRows.length);

  slide.addTable(tableRows, {
    x: MARGIN_X, y: tableY, w: CONTENT_W,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: colWidths,
    rowH: Array(tableRows.length).fill(rowH),
    autoPage: false,
  });
}
