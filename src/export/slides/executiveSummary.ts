// Executive Summary slide — key KPI grid

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

interface KpiCard {
  label: string;
  value: string;
}

export function addExecutiveSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, dtOutputs, waccOutputs, config, plOutputs } = ctx;

  // Title bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Executive Summary', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // Find peak revenue
  let peakRevenue = 0;
  for (const r of plOutputs.totalRevenue) {
    if (r > peakRevenue) peakRevenue = r;
  }

  // Find peak EBIT margin
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

  // Arrange in a 2×4 grid
  const cols = 4;
  const cardW = 2.1;
  const cardH = 1.2;
  const startX = 0.5;
  const startY = 1.1;
  const gapX = 0.2;
  const gapY = 0.3;

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
      x, y: y + 0.15, w: cardW, h: 0.3,
      fontSize: 9, fontFace: 'Calibri', color: '808080',
      align: 'center',
    });

    // Value
    slide.addText(kpi.value, {
      x, y: y + 0.45, w: cardW, h: 0.5,
      fontSize: 16, fontFace: 'Calibri', bold: true, color: '1F3864',
      align: 'center',
    });
  });

  // Footer info
  slide.addText(`WACC: ${formatPercent(waccOutputs.activeWACC)}  |  PoS: ${formatPercent(dtOutputs.cumulativePoS)}`, {
    x: 0.5, y: 4.6, w: 9, h: 0.3,
    fontSize: 9, fontFace: 'Calibri', color: '808080',
  });
}
