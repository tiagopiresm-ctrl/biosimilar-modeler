// ──────────────────────────────────────────────────────────────
// Slide 2: Market Overview (maps to template slide 4)
//
// Layout (13.333 x 7.5"):
//   Top row   = 3 KPI cards
//   Middle    = Originator profile section
//   Bottom    = Market breakdown by geography (horizontal bar chart)
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout, addSectionBox, addKpiCard, addLabelValue,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  NAVY, TEAL_BLUE, FONT, GRAY,
} from './slideLayout';

export function addMarketOverviewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Market Overview');

  const { config, countries, countryOutputs, plOutputs, periodLabels } = ctx;
  const ccy = config.currency;

  if (countries.length === 0) {
    slide.addText('No countries configured', {
      x: 2, y: 3.5, w: 9, h: 1,
      fontSize: 14, fontFace: FONT, color: GRAY, align: 'center',
    });
    return;
  }

  // ── Compute KPIs ──────────────────────────────────────────
  let globalPeakMarketValue = 0;
  for (const co of countryOutputs) {
    globalPeakMarketValue += Math.max(...co.totalMarketValue);
  }

  let totalBsPen = 0;
  let countBsPen = 0;
  for (const co of countryOutputs) {
    const peakBs = Math.max(...co.biosimilarShare);
    if (peakBs > 0) { totalBsPen += peakBs; countBsPen++; }
  }
  const avgBsPenetration = countBsPen > 0 ? totalBsPen / countBsPen : 0;

  let peakRevenue = 0;
  let peakRevenueYear = '';
  for (let i = 0; i < plOutputs.totalRevenue.length; i++) {
    if (plOutputs.totalRevenue[i] > peakRevenue) {
      peakRevenue = plOutputs.totalRevenue[i];
      peakRevenueYear = periodLabels[i] ?? '';
    }
  }

  // ── KPI cards row ─────────────────────────────────────────
  const kpiY = CONTENT_TOP;
  const kpiW = 3.8;
  const kpiH = 0.85;
  const kpiGap = 0.20;
  const kpiStartX = MARGIN_X;

  addKpiCard(slide, kpiStartX, kpiY, kpiW, kpiH,
    'Global Market Size (Peak)', formatCurrency(globalPeakMarketValue, ccy));
  addKpiCard(slide, kpiStartX + kpiW + kpiGap, kpiY, kpiW, kpiH,
    'Avg. Biosimilar Penetration', formatPercent(avgBsPenetration));
  addKpiCard(slide, kpiStartX + 2 * (kpiW + kpiGap), kpiY, kpiW, kpiH,
    `Peak Revenue (${peakRevenueYear})`, formatCurrency(peakRevenue, ccy));

  // ── Originator profile ────────────────────────────────────
  const profY = kpiY + kpiH + 0.20;
  const profW = CONTENT_W;
  addSectionBox(slide, MARGIN_X, profY, profW, 0.35, 'Originator Profile');

  const pvX = MARGIN_X + 0.15;
  const pvW = profW / 2 - 0.15;
  let pvY = profY + 0.40;

  addLabelValue(slide, pvX, pvY, pvW, 'Molecule', config.moleculeName || '-');
  addLabelValue(slide, pvX + pvW + 0.15, pvY, pvW, 'Countries', String(countries.length));
  pvY += 0.28;

  let totalOrigPrice = 0;
  let origCount = 0;
  for (const co of countryOutputs) {
    const maxP = Math.max(...co.originatorRefPrice.filter(p => p > 0));
    if (maxP > 0) { totalOrigPrice += maxP; origCount++; }
  }
  const avgOrigPrice = origCount > 0 ? totalOrigPrice / origCount : 0;

  addLabelValue(slide, pvX, pvY, pvW, 'Avg. Originator Price', formatCurrency(avgOrigPrice, ccy, 2));
  addLabelValue(slide, pvX + pvW + 0.15, pvY, pvW, 'Model Period',
    `${periodLabels[0]} \u2013 ${periodLabels[periodLabels.length - 1]}`);

  // ── Market breakdown by geography (horizontal bar chart) ──
  const chartY = profY + 1.10;
  const chartH = 6.85 - chartY;  // fill to just above footer

  addSectionBox(slide, MARGIN_X, chartY, CONTENT_W, 0.35, 'Market Breakdown by Geography');

  const geoNames = countries.map(c => c.name);
  const geoPeakValues = countryOutputs.map(co => Math.max(...co.totalMarketValue));

  const chartData = [{
    name: `Market Size (${ccy} '000)`,
    labels: geoNames,
    values: geoPeakValues,
  }];

  slide.addChart('bar', chartData, {
    x: MARGIN_X + 0.15,
    y: chartY + 0.45,
    w: CONTENT_W - 0.30,
    h: chartH - 0.60,
    barDir: 'bar',
    chartColors: [TEAL_BLUE],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 7,
    dataLabelColor: NAVY,
    dataLabelPosition: 'outEnd',
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
    showTitle: false,
  });
}
