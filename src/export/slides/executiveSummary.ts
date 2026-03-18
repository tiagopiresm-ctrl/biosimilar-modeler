// Executive Summary slide — KPI cards (left) + mini P&L bar chart (right)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

interface KpiCard {
  label: string;
  value: string;
}

export function addExecutiveSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, dtOutputs, waccOutputs, config, plOutputs, periodLabels } = ctx;

  // ── Title bar ────────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Executive Summary', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Derived KPI values ───────────────────────────────────────
  let peakRevenue = 0;
  for (const r of plOutputs.totalRevenue) {
    if (r > peakRevenue) peakRevenue = r;
  }

  let peakEbitMargin = 0;
  for (const m of plOutputs.ebitMargin) {
    if (m > peakEbitMargin) peakEbitMargin = m;
  }

  const kpis: KpiCard[] = [
    { label: 'NPV', value: formatCurrency(npvOutputs.npv, config.currency) },
    { label: 'rNPV', value: formatCurrency(npvOutputs.rnpv, config.currency) },
    { label: 'IRR', value: npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A' },
    { label: 'rIRR', value: npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A' },
    { label: 'Payback Year', value: npvOutputs.paybackUndiscounted != null ? String(npvOutputs.paybackUndiscounted) : 'N/A' },
    { label: 'Peak Revenue', value: formatCurrency(peakRevenue, config.currency) },
    { label: 'Peak EBIT Margin', value: formatPercent(peakEbitMargin) },
    { label: 'ENPV', value: formatCurrency(dtOutputs.enpv, config.currency) },
  ];

  // ── LEFT SIDE — 2-column x 4-row KPI grid (≈55% width) ─────
  const cols = 2;
  const cardW = 2.3;
  const cardH = 0.85;
  const startX = 0.3;
  const startY = 1.0;
  const gapX = 0.2;
  const gapY = 0.18;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // Card background
    slide.addShape('roundRect', {
      x, y, w: cardW, h: cardH,
      fill: { color: 'F2F2F2' },
      rectRadius: 0.05,
      line: { color: 'D9D9D9', width: 0.5 },
    });

    // Label
    slide.addText(kpi.label, {
      x, y: y + 0.08, w: cardW, h: 0.25,
      fontSize: 8, fontFace: 'Calibri', color: '808080',
      align: 'center',
    });

    // Value
    slide.addText(kpi.value, {
      x, y: y + 0.35, w: cardW, h: 0.4,
      fontSize: 15, fontFace: 'Calibri', bold: true, color: '1F3864',
      align: 'center',
    });
  });

  // ── RIGHT SIDE — Grouped bar chart (≈45% width) ─────────────
  const chartX = 5.3;
  const chartY = 1.0;
  const chartW = 4.4;
  const chartH = 3.3;

  // Build year labels — show every other label if >10 periods to avoid crowding
  const showEveryOther = periodLabels.length > 10;
  const yearLabels = periodLabels.map((lbl, i) =>
    showEveryOther && i % 2 !== 0 ? '' : lbl,
  );

  const revenueValues = plOutputs.totalRevenue.map((v) => v / 1_000_000);
  const ebitdaValues = plOutputs.ebitda.map((v) => v / 1_000_000);
  const fcfValues = plOutputs.freeCashFlow.map((v) => v / 1_000_000);

  const chartData = [
    { name: 'Revenue', labels: yearLabels, values: revenueValues },
    { name: 'EBITDA', labels: yearLabels, values: ebitdaValues },
    { name: 'FCF', labels: yearLabels, values: fcfValues },
  ];

  // Section title
  slide.addText(`Key P&L Metrics (${config.currency} M)`, {
    x: chartX, y: chartY - 0.3, w: chartW, h: 0.25,
    fontSize: 9, fontFace: 'Calibri', bold: true, color: '1F3864',
  });

  slide.addChart('bar', chartData, {
    x: chartX,
    y: chartY,
    w: chartW,
    h: chartH,
    barGrouping: 'clustered',
    chartColors: ['2E75B6', 'ED7D31', '70AD47'],
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelRotate: periodLabels.length > 15 ? 45 : 0,
    valAxisLabelFontSize: 7,
    valAxisMajorUnit: undefined,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showTitle: false,
  });

  // ── Footer info ──────────────────────────────────────────────
  slide.addText(
    `WACC: ${formatPercent(waccOutputs.activeWACC)}  |  PoS: ${formatPercent(dtOutputs.cumulativePoS)}`,
    {
      x: 0.5, y: 4.6, w: 9, h: 0.3,
      fontSize: 9, fontFace: 'Calibri', color: '808080',
    },
  );
}
