// ──────────────────────────────────────────────────────────────
// Slide 1: Molecule Snapshot (maps to template slide 3)
//
// Left half  = Main Characteristics + Market Outlook + Financials
//              + Program Attractiveness  (section boxes with KV pairs)
// Right half = Sales Forecast bar chart (total revenue by year)
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout, addSectionBox, addLabelValue,
  MARGIN_X, CONTENT_TOP, CONTENT_W, MID_BLUE,
} from './slideLayout';

export function addMoleculeSnapshotSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Molecule Snapshot');

  const { config, countries, countryOutputs, plOutputs, npvOutputs, periodLabels } = ctx;
  const ccy = config.currency;

  // ════════════════════════════════════════════════════════════
  // LEFT HALF (x: MARGIN_X .. 4.65)
  // ════════════════════════════════════════════════════════════
  const leftW = 4.3;
  const leftX = MARGIN_X;
  let curY = CONTENT_TOP;

  // ── Section: Main Characteristics ──────────────────────────
  const mainH = 1.1;
  addSectionBox(slide, leftX, curY, leftW, mainH, 'Main Characteristics');

  const kvX = leftX + 0.1;
  const kvW = leftW - 0.2;
  let kvY = curY + 0.3;
  addLabelValue(slide, kvX, kvY, kvW, 'Product / Molecule', config.moleculeName || '-');
  kvY += 0.2;
  addLabelValue(slide, kvX, kvY, kvW, 'Model Currency', ccy);
  kvY += 0.2;

  // LOE years
  const loeStr = countries.map(c => `${c.name}: ${c.loeYear}`).join(', ');
  addLabelValue(slide, kvX, kvY, kvW, 'LOE Years', loeStr || '-', { fontSize: 7 });
  kvY += 0.2;

  // Launch years
  const launchStr = countries.map(c => {
    const yr = config.modelStartYear + c.biosimilarLaunchPeriodIndex;
    return `${c.name}: ${yr}`;
  }).join(', ');
  // not displayed in this section (space constraint) — move to Market Outlook

  curY += mainH + 0.08;

  // ── Section: Market Outlook ────────────────────────────────
  const mktH = 0.9;
  addSectionBox(slide, leftX, curY, leftW, mktH, 'Market Outlook');

  kvY = curY + 0.3;

  // Global market volume at peak (sum across countries)
  let globalPeakVol = 0;
  for (const co of countryOutputs) {
    globalPeakVol += Math.max(...co.marketVolume);
  }
  addLabelValue(slide, kvX, kvY, kvW, 'Global Peak Market Vol.', formatNumber(globalPeakVol));
  kvY += 0.2;

  // Weighted average in-market price
  let totalSales = 0;
  let totalVol = 0;
  for (const co of countryOutputs) {
    for (let p = 0; p < co.biosimilarVolume.length; p++) {
      totalSales += co.biosimilarInMarketSales[p];
      totalVol += co.biosimilarVolume[p];
    }
  }
  const avgPrice = totalVol > 0 ? (totalSales / totalVol) * 1000 : 0; // sales in '000
  addLabelValue(slide, kvX, kvY, kvW, 'Avg. In-Market Price', formatCurrency(avgPrice, ccy, 2));
  kvY += 0.2;

  addLabelValue(slide, kvX, kvY, kvW, 'Countries Modeled', String(countries.length));

  curY += mktH + 0.08;

  // ── Section: Financials ────────────────────────────────────
  const finH = 0.7;
  addSectionBox(slide, leftX, curY, leftW, finH, 'Financials');

  kvY = curY + 0.3;

  // Total program costs (sum of all OpEx across periods)
  const totalOpExSum = plOutputs.totalOpEx.reduce((a, b) => a + b, 0);
  addLabelValue(slide, kvX, kvY, kvW, 'Total Program Costs', formatCurrency(totalOpExSum, ccy));
  kvY += 0.2;

  // Launch years summary
  addLabelValue(slide, kvX, kvY, kvW, 'Launch Years', launchStr || '-', { fontSize: 7 });

  curY += finH + 0.08;

  // ── Section: Program Attractiveness ────────────────────────
  const progH = 0.9;
  addSectionBox(slide, leftX, curY, leftW, progH, 'Program Attractiveness');

  kvY = curY + 0.3;
  addLabelValue(slide, kvX, kvY, kvW, 'NPV', formatCurrency(npvOutputs.npv, ccy));
  kvY += 0.2;
  addLabelValue(slide, kvX, kvY, kvW, 'Payback from Launch',
    npvOutputs.paybackFromLaunchUndiscounted != null
      ? `${npvOutputs.paybackFromLaunchUndiscounted} years` : 'N/A');
  kvY += 0.2;
  addLabelValue(slide, kvX, kvY, kvW, 'IRR',
    npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A');

  // ════════════════════════════════════════════════════════════
  // RIGHT HALF — Sales Forecast bar chart
  // ════════════════════════════════════════════════════════════
  const chartX = 5.0;
  const chartY = CONTENT_TOP;
  const chartW = CONTENT_W - (chartX - MARGIN_X);
  const chartH = 4.0;

  // Section label
  addSectionBox(slide, chartX, chartY, chartW, chartH, 'Sales Forecast');

  // Pick key years to avoid crowding
  const keyIdx: number[] = [];
  for (let i = 0; i < periodLabels.length; i++) {
    if (i === 0 || i === periodLabels.length - 1 || i % 2 === 0) keyIdx.push(i);
  }
  const uniq = [...new Set(keyIdx)].sort((a, b) => a - b);
  const labels = uniq.map(i => periodLabels[i]);
  const toK = (arr: number[]) => uniq.map(i => (arr[i] ?? 0));

  const chartData = [
    { name: `Revenue (${ccy} '000)`, labels, values: toK(plOutputs.totalRevenue) },
  ];

  slide.addChart('bar', chartData, {
    x: chartX + 0.1, y: chartY + 0.35, w: chartW - 0.2, h: chartH - 0.5,
    barGrouping: 'clustered',
    chartColors: [MID_BLUE],
    showLegend: false,
    showValue: false,
    catAxisLabelFontSize: 6,
    catAxisLabelRotate: labels.length > 8 ? 45 : 0,
    valAxisLabelFontSize: 6,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
  });
}
