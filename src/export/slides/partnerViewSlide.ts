// Partner View slide — NPV comparison: Company vs Partner

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

export function addPartnerViewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const { partnerViewOutputs, npvOutputs, config } = ctx;
  if (!config.partnerViewEnabled || !partnerViewOutputs) return;

  const slide = pptx.addSlide();
  const ccy = config.currency;

  // ── Title bar ──
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Partner View \u2014 NPV Comparison', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── LEFT SIDE — 4 KPI cards (2×2 grid) ──
  const kpis: { label: string; value: string }[] = [
    { label: 'Company NPV', value: formatCurrency(npvOutputs.npv, ccy) },
    { label: 'Partner NPV', value: formatCurrency(partnerViewOutputs.partnerNPV, ccy) },
    { label: 'Company Share', value: formatPercent(partnerViewOutputs.companyNPVShare) },
    { label: 'Partner Share', value: formatPercent(partnerViewOutputs.partnerNPVShare) },
  ];

  const cols = 2;
  const cardW = 2.1;
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
      shrinkText: true,
    });
  });

  // ── RIGHT SIDE — Bar chart: Company vs Partner NPV ──
  const chartX = 5.2;
  const chartY = 1.0;
  const chartW = 4.4;
  const chartH = 3.0;

  // Section title
  slide.addText(`NPV Split (${ccy} '000)`, {
    x: chartX, y: chartY - 0.3, w: chartW, h: 0.25,
    fontSize: 9, fontFace: 'Calibri', bold: true, color: '1F3864',
  });

  const chartData = [
    {
      name: 'NPV',
      labels: ['Company', 'Partner'],
      values: [npvOutputs.npv / 1_000, partnerViewOutputs.partnerNPV / 1_000],
    },
  ];

  slide.addChart('bar', chartData, {
    x: chartX,
    y: chartY,
    w: chartW,
    h: chartH,
    barGrouping: 'clustered',
    chartColors: ['2E75B6', 'ED7D31'],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 8,
    dataLabelColor: '1F3864',
    catAxisLabelFontSize: 9,
    catAxisLabelFontFace: 'Calibri',
    valAxisLabelFontSize: 7,
    valAxisLabelFontFace: 'Calibri',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    plotArea: { fill: { color: 'FFFFFF' } },
  });

  // ── Bottom note ──
  slide.addText(
    'Partner view estimates partner economics based on supply price, milestones, royalties, and local market assumptions. ' +
    'NPV shares represent relative proportion of combined Company + Partner NPV.',
    {
      x: 0.5, y: 4.5, w: 9, h: 0.5,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: 'A0A0A0',
    },
  );
}
