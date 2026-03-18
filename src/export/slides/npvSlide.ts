// Slide 7: Cash Flow & NPV — area chart (top) + KPI cards (bottom)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

const DARK_BLUE = '1F4E79';
const BLUE = '2E75B6';
const CARD_BG = 'F2F2F2';
const CARD_BORDER = 'D9D9D9';
const GRAY = '808080';

export function addNPVSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, periodLabels, config } = ctx;
  const ccy = config.currency;
  const tvEnabled = config.terminalValueEnabled;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText('Cash Flow & NPV', {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── TOP — Cumulative Discounted FCF area chart ─────────────
  const chartData = [
    {
      name: 'Cumulative DCF',
      labels: periodLabels,
      values: npvOutputs.cumulativeDiscountedFCF,
    },
    {
      // Zero baseline for area fill reference
      name: '',
      labels: periodLabels,
      values: periodLabels.map(() => 0),
    },
  ];

  slide.addChart('area', chartData, {
    x: 0.3, y: 0.75, w: 9.4, h: 2.8,
    chartColors: [BLUE, 'BFBFBF'],
    lineSize: 2,
    showLegend: false,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelColor: GRAY,
    catAxisLabelFontFace: 'Calibri',
    valAxisLabelFontSize: 7,
    valAxisLabelColor: GRAY,
    valAxisLabelFontFace: 'Calibri',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    plotArea: { fill: { color: 'FFFFFF' } },
  });

  slide.addText(`Cumulative Discounted Free Cash Flow (${ccy} '000)`, {
    x: 0.3, y: 3.55, w: 9.4, h: 0.2,
    fontSize: 7, fontFace: 'Calibri', italic: true, color: GRAY,
  });

  // ── BOTTOM — KPI cards ─────────────────────────────────────
  const dividerY = 3.85;
  slide.addShape('rect', { x: 0.3, y: dividerY, w: 9.4, h: 0.01, fill: { color: 'D9D9D9' } });

  const fmtCcy = (v: number) => `${ccy} ${formatNumber(v)}`;

  const kpis: { label: string; value: string }[] = [
    { label: 'NPV', value: fmtCcy(npvOutputs.npv) },
    { label: 'rNPV', value: fmtCcy(npvOutputs.rnpv) },
    { label: 'IRR', value: npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A' },
    { label: 'rIRR', value: npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A' },
    {
      label: 'Payback Year',
      value: npvOutputs.paybackDiscounted != null ? String(npvOutputs.paybackDiscounted) : 'N/A',
    },
    { label: 'Money at Risk', value: fmtCcy(npvOutputs.moneyAtRisk) },
  ];

  // Add TV KPIs when enabled
  if (tvEnabled) {
    kpis.push(
      { label: 'Terminal Value', value: fmtCcy(npvOutputs.terminalValue) },
      { label: 'NPV incl. TV', value: fmtCcy(npvOutputs.npvWithTV) },
      { label: 'rNPV incl. TV', value: fmtCcy(npvOutputs.rnpvWithTV) },
    );
  }

  const cardCount = kpis.length;
  // Dynamic layout: 2 rows if >6 KPIs
  const maxPerRow = cardCount > 6 ? Math.ceil(cardCount / 2) : cardCount;
  const numRows = Math.ceil(cardCount / maxPerRow);
  const cardW = Math.min(1.5, (9.4 - (maxPerRow - 1) * 0.08) / maxPerRow);
  const cardH = numRows > 1 ? 0.65 : 0.85;
  const gapX = 0.08;
  const gapY = 0.08;
  const cardStartY = dividerY + 0.12;

  kpis.forEach((kpi, i) => {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    const rowItems = row < numRows - 1 ? maxPerRow : cardCount - (numRows - 1) * maxPerRow;
    const rowW = rowItems * cardW + (rowItems - 1) * gapX;
    const rowStartX = (10 - rowW) / 2;
    const x = rowStartX + col * (cardW + gapX);
    const y = cardStartY + row * (cardH + gapY);

    slide.addShape('roundRect', {
      x, y, w: cardW, h: cardH,
      fill: { color: CARD_BG },
      rectRadius: 0.04,
      line: { color: CARD_BORDER, width: 0.5 },
    });

    slide.addText(kpi.label, {
      x, y: y + 0.05, w: cardW, h: 0.2,
      fontSize: 7, fontFace: 'Calibri', color: GRAY, align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: y + 0.25, w: cardW, h: cardH - 0.3,
      fontSize: numRows > 1 ? 11 : 13, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
      align: 'center', shrinkText: true,
    });
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText('Discounting convention: mid-period (cash flows assumed at mid-point of each period)', {
    x: 0.3, y: 5.2, w: 9.4, h: 0.2,
    fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
  });
}
