// NPV & Valuation slide — area chart + KPI cards

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

export function addNPVSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, periodLabels, config } = ctx;
  const ccy = config.currency;

  // ── Title bar ──
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('NPV & Valuation', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Top section: Cumulative Discounted FCF area chart (65% of body) ──
  const chartData = [
    {
      name: 'Cumulative DCF',
      labels: periodLabels,
      values: npvOutputs.cumulativeDiscountedFCF,
    },
    {
      name: '',
      labels: periodLabels,
      values: periodLabels.map(() => 0),
    },
  ];

  slide.addChart('area', chartData, {
    x: 0.4,
    y: 0.85,
    w: 9.2,
    h: 3.0,
    chartColors: ['2E75B6', 'BFBFBF'],
    lineSize: 2,
    showLegend: false,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelColor: '808080',
    catAxisLabelFontFace: 'Calibri',
    valAxisLabelFontSize: 7,
    valAxisLabelColor: '808080',
    valAxisLabelFontFace: 'Calibri',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    plotArea: { fill: { color: 'FFFFFF' } },
  });

  // Subtitle under chart
  slide.addText(`Cumulative Discounted Free Cash Flow (${ccy} '000)`, {
    x: 0.5, y: 3.85, w: 9, h: 0.25,
    fontSize: 8, fontFace: 'Calibri', italic: true, color: '808080',
  });

  // ── Bottom section: 6 KPI cards (35% of body) ──
  const dividerY = 4.2;
  slide.addShape('rect', { x: 0.4, y: dividerY, w: 9.2, h: 0.01, fill: { color: 'D9D9D9' } });

  const fmtCcy = (v: number) => `${ccy} ${formatNumber(v)}`;

  const kpis: { label: string; value: string }[] = [
    { label: 'NPV', value: fmtCcy(npvOutputs.npv) },
    { label: 'rNPV', value: fmtCcy(npvOutputs.rnpv) },
    { label: 'IRR', value: npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A' },
    { label: 'rIRR', value: npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A' },
    { label: 'Payback Year', value: npvOutputs.paybackDiscounted != null ? String(npvOutputs.paybackDiscounted) : 'N/A' },
    { label: 'Money at Risk', value: fmtCcy(npvOutputs.moneyAtRisk) },
  ];

  const cardCount = kpis.length;
  const cardW = 1.45;
  const gap = (9.2 - cardCount * cardW) / (cardCount - 1);
  const cardStartX = 0.4;
  const cardY = dividerY + 0.15;
  const cardH = 0.85;

  kpis.forEach((kpi, i) => {
    const x = cardStartX + i * (cardW + gap);

    // Card background
    slide.addShape('roundRect', {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: 'F2F6FA' },
      rectRadius: 0.05,
    });

    // Label
    slide.addText(kpi.label, {
      x, y: cardY + 0.08, w: cardW, h: 0.22,
      fontSize: 8, fontFace: 'Calibri', color: '808080',
      align: 'center',
    });

    // Value
    slide.addText(kpi.value, {
      x, y: cardY + 0.32, w: cardW, h: 0.4,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: '1F3864',
      align: 'center',
      shrinkText: true,
    });
  });
}
