// Slide 8: Decision Tree — horizontal bar chart + KPI cards

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

const DARK_BLUE = '1F4E79';
const BLUE = '2E75B6';
const GREEN = '70AD47';
const CARD_BG = 'F2F2F2';
const CARD_BORDER = 'D9D9D9';
const GRAY = '808080';

export function addDecisionTreeSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const { decisionTree, dtOutputs, npvOutputs, config } = ctx;
  if (decisionTree.length === 0) return; // skip slide entirely if no gates

  const slide = pptx.addSlide();
  const ccy = config.currency;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText('Decision Tree Analysis', {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Horizontal bar chart: gate probabilities ───────────────
  const gateNames = decisionTree.map((g) => g.name);
  const gateProbabilities = decisionTree.map((g) => g.probability * 100);
  const cumulativePoS = dtOutputs.cumulativePoS * 100;

  const gateColors = decisionTree.map(() => BLUE);

  const chartData = [
    {
      name: 'Probability',
      labels: [...gateNames, 'Cumulative PoS'],
      values: [...gateProbabilities, cumulativePoS],
    },
  ];

  slide.addChart('bar', chartData, {
    x: 0.4, y: 0.8, w: 9.2, h: 2.8,
    barDir: 'bar', // horizontal bars
    showValue: true,
    valAxisMaxVal: 100,
    valAxisMinVal: 0,
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 8,
    dataLabelColor: '333333',
    chartColors: [...gateColors, GREEN],
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
    valAxisTitle: 'Probability (%)',
    valAxisTitleFontSize: 7,
    showLegend: false,
  });

  // ── Bottom KPI cards ───────────────────────────────────────
  const kpiY = 3.9;
  const kpis = [
    { label: 'Cumulative PoS', value: formatPercent(dtOutputs.cumulativePoS) },
    { label: 'NPV', value: formatCurrency(npvOutputs.npv, ccy) },
    { label: 'rNPV', value: formatCurrency(npvOutputs.rnpv, ccy) },
    { label: 'ENPV', value: formatCurrency(dtOutputs.enpv, ccy) },
  ];

  const cardW = 2.1;
  const cardH = 0.85;
  const gap = 0.2;
  const totalW = kpis.length * cardW + (kpis.length - 1) * gap;
  const startX = (10 - totalW) / 2;

  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardW + gap);

    slide.addShape('roundRect', {
      x, y: kpiY, w: cardW, h: cardH,
      fill: { color: CARD_BG },
      rectRadius: 0.04,
      line: { color: CARD_BORDER, width: 0.5 },
    });

    slide.addText(kpi.label, {
      x, y: kpiY + 0.08, w: cardW, h: 0.22,
      fontSize: 7.5, fontFace: 'Calibri', color: GRAY, align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: kpiY + 0.32, w: cardW, h: 0.4,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
      align: 'center', shrinkText: true,
    });
  });
}
