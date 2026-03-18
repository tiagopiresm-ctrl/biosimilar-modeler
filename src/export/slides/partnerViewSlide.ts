// Slide 9: Partner View — NPV comparison bar chart + KPI cards

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

const DARK_BLUE = '1F4E79';
const BLUE = '2E75B6';
const ORANGE = 'ED7D31';
const CARD_BG = 'F2F2F2';
const CARD_BORDER = 'D9D9D9';
const GRAY = '808080';

export function addPartnerViewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const { partnerViewOutputs, npvOutputs, config } = ctx;
  if (!config.partnerViewEnabled || !partnerViewOutputs) return;

  const slide = pptx.addSlide();
  const ccy = config.currency;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText('Partner View \u2014 NPV Comparison', {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── LEFT — KPI cards (2x2 grid) ────────────────────────────
  const kpis = [
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
  const gapX = 0.15;
  const gapY = 0.15;

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
      x, y: y + 0.08, w: cardW, h: 0.22,
      fontSize: 7.5, fontFace: 'Calibri', color: GRAY, align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: y + 0.32, w: cardW, h: 0.4,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
      align: 'center', shrinkText: true,
    });
  });

  // ── RIGHT — NPV comparison bar chart ───────────────────────
  const chartX = 5.1;
  const chartY = 1.0;
  const chartW = 4.6;
  const chartH = 3.0;

  slide.addText(`NPV Split (${ccy} '000)`, {
    x: chartX, y: chartY - 0.25, w: chartW, h: 0.22,
    fontSize: 8, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
  });

  const chartData = [
    {
      name: 'NPV',
      labels: ['Company', 'Partner'],
      values: [npvOutputs.npv / 1_000, partnerViewOutputs.partnerNPV / 1_000],
    },
  ];

  slide.addChart('bar', chartData, {
    x: chartX, y: chartY, w: chartW, h: chartH,
    barGrouping: 'clustered',
    chartColors: [BLUE, ORANGE],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 8,
    dataLabelColor: DARK_BLUE,
    catAxisLabelFontSize: 9,
    catAxisLabelFontFace: 'Calibri',
    valAxisLabelFontSize: 7,
    valAxisLabelFontFace: 'Calibri',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    plotArea: { fill: { color: 'FFFFFF' } },
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText(
    'Partner economics based on supply price, milestones, royalties, and local market assumptions.',
    {
      x: 0.3, y: 5.15, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
