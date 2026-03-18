// Slide 2: Executive Summary — KPI cards (left) + bar chart (right)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

// ── Style constants ──────────────────────────────────────────
const DARK_BLUE = '1F4E79';
const CARD_BG = 'F2F2F2';
const CARD_BORDER = 'D9D9D9';
const GRAY = '808080';
const BLUE = '2E75B6';
const ORANGE = 'ED7D31';
const GREEN = '70AD47';

interface KpiCard {
  label: string;
  value: string;
}

export function addExecutiveSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, dtOutputs, waccOutputs, config, plOutputs, periodLabels } = ctx;
  const ccy = config.currency;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText('Executive Summary', {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Derived KPI values ─────────────────────────────────────
  let peakRevenue = 0;
  let peakRevenueYear = '';
  for (let i = 0; i < plOutputs.totalRevenue.length; i++) {
    if (plOutputs.totalRevenue[i] > peakRevenue) {
      peakRevenue = plOutputs.totalRevenue[i];
      peakRevenueYear = periodLabels[i] ?? '';
    }
  }

  let peakEbit = 0;
  for (const v of plOutputs.ebit) {
    if (v > peakEbit) peakEbit = v;
  }

  const tvEnabled = config.terminalValueEnabled;
  const kpis: KpiCard[] = [
    {
      label: tvEnabled ? 'NPV (incl. TV)' : 'NPV',
      value: formatCurrency(tvEnabled ? npvOutputs.npvWithTV : npvOutputs.npv, ccy),
    },
    { label: 'rNPV', value: formatCurrency(npvOutputs.rnpv, ccy) },
    { label: 'IRR', value: npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A' },
    { label: 'rIRR', value: npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A' },
    {
      label: 'Payback Year',
      value: npvOutputs.paybackUndiscounted != null ? String(npvOutputs.paybackUndiscounted) : 'N/A',
    },
    { label: `Peak Revenue Year`, value: peakRevenueYear || 'N/A' },
    { label: 'Peak EBIT', value: formatCurrency(peakEbit, ccy) },
    { label: 'ENPV', value: formatCurrency(dtOutputs.enpv, ccy) },
  ];

  // ── LEFT — 2x4 KPI grid ───────────────────────────────────
  const cols = 2;
  const cardW = 2.2;
  const cardH = 0.8;
  const startX = 0.3;
  const startY = 0.9;
  const gapX = 0.15;
  const gapY = 0.12;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    slide.addShape('roundRect', {
      x, y, w: cardW, h: cardH,
      fill: { color: CARD_BG },
      rectRadius: 0.04,
      line: { color: CARD_BORDER, width: 0.5 },
    });

    slide.addText(kpi.label, {
      x, y: y + 0.06, w: cardW, h: 0.22,
      fontSize: 7.5, fontFace: 'Calibri', color: GRAY, align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: y + 0.3, w: cardW, h: 0.38,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
      align: 'center', shrinkText: true,
    });
  });

  // ── RIGHT — Bar chart: Revenue vs EBITDA vs FCF ────────────
  const chartX = 5.1;
  const chartY = 0.9;
  const chartW = 4.6;
  const chartH = 3.8;

  // Pick key years: first, every 3rd, last
  const keyIndices: number[] = [];
  for (let i = 0; i < periodLabels.length; i++) {
    if (i === 0 || i === periodLabels.length - 1 || i % 3 === 0) {
      keyIndices.push(i);
    }
  }
  // Ensure unique and sorted
  const uniqueIndices = [...new Set(keyIndices)].sort((a, b) => a - b);
  const keyLabels = uniqueIndices.map((i) => periodLabels[i]);

  const toM = (arr: number[]) => uniqueIndices.map((i) => (arr[i] ?? 0) / 1_000_000);

  const chartData = [
    { name: 'Revenue', labels: keyLabels, values: toM(plOutputs.totalRevenue) },
    { name: 'EBITDA', labels: keyLabels, values: toM(plOutputs.ebitda) },
    { name: 'FCF', labels: keyLabels, values: toM(plOutputs.freeCashFlow) },
  ];

  slide.addText(`Key Metrics (${ccy} M)`, {
    x: chartX, y: chartY - 0.25, w: chartW, h: 0.22,
    fontSize: 8, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
  });

  slide.addChart('bar', chartData, {
    x: chartX, y: chartY, w: chartW, h: chartH,
    barGrouping: 'clustered',
    chartColors: [BLUE, ORANGE, GREEN],
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelRotate: keyLabels.length > 8 ? 45 : 0,
    valAxisLabelFontSize: 7,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showTitle: false,
  });

  // ── Footer ─────────────────────────────────────────────────
  const midPeriod = config.terminalValueEnabled ? 'Mid-period discounting' : 'Mid-period discounting';
  slide.addText(
    `WACC: ${formatPercent(waccOutputs.activeWACC)}  |  Scenario: ${ctx.scenarioLabel}  |  ${midPeriod}  |  PoS: ${formatPercent(dtOutputs.cumulativePoS)}`,
    {
      x: 0.3, y: 5.1, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
