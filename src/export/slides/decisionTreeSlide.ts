// Decision Tree Summary slide – bar chart + KPI cards

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

export function addDecisionTreeSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { decisionTree, dtOutputs, npvOutputs, config } = ctx;

  // ── Title bar ──────────────────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Decision Tree Analysis', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  if (decisionTree.length === 0) {
    slide.addText('No decision gates defined', {
      x: 1, y: 2, w: 8, h: 1,
      fontSize: 14, fontFace: 'Calibri', color: '808080', align: 'center',
    });
    return;
  }

  // ── Top section: Horizontal bar chart (55 % of usable height) ─────────
  const chartX = 0.5;
  const chartY = 0.85;
  const chartW = 9.0;
  const chartH = 2.9; // ~55 % of the 5.3″ usable area below the title

  const gateNames = decisionTree.map((g) => g.name);
  const gateProbabilities = decisionTree.map((g) => g.probability * 100);
  const cumulativePoS = dtOutputs.cumulativePoS * 100;

  const BLUE = '2E75B6';
  const GREEN = '70AD47';
  const gateColors = decisionTree.map(() => BLUE);

  const chartData = [
    {
      name: 'Probability',
      labels: [...gateNames, 'Cumulative PoS'],
      values: [...gateProbabilities, cumulativePoS],
    },
  ];

  slide.addChart('bar', chartData, {
    x: chartX,
    y: chartY,
    w: chartW,
    h: chartH,
    barDir: 'bar', // horizontal bars
    showValue: true,
    valAxisMaxVal: 100,
    valAxisMinVal: 0,
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 8,
    dataLabelColor: '333333',
    chartColors: [...gateColors, GREEN],
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 8,
    valAxisTitle: 'Probability (%)',
    valAxisTitleFontSize: 8,
    showLegend: false,
  });

  // ── Bottom section: 4 KPI cards (35 % of usable height) ───────────────
  const kpiY = 4.05;
  const cardW = 2.0;
  const cardH = 0.9;
  const gap = 0.3;
  const totalW = 4 * cardW + 3 * gap;
  const startX = (10 - totalW) / 2; // centre across the 10″ slide width

  const kpis = [
    { label: 'Cumulative PoS', value: formatPercent(dtOutputs.cumulativePoS) },
    { label: 'NPV', value: formatCurrency(npvOutputs.npv, config.currency) },
    { label: 'rNPV', value: formatCurrency(npvOutputs.rnpv, config.currency) },
    { label: 'ENPV', value: formatCurrency(dtOutputs.enpv, config.currency) },
  ];

  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardW + gap);

    slide.addShape('roundRect', {
      x,
      y: kpiY,
      w: cardW,
      h: cardH,
      fill: { color: 'F2F2F2' },
      rectRadius: 0.05,
      line: { color: 'D9D9D9', width: 0.5 },
    });

    slide.addText(kpi.label, {
      x, y: kpiY + 0.1, w: cardW, h: 0.25,
      fontSize: 8, fontFace: 'Calibri', color: '808080', align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: kpiY + 0.35, w: cardW, h: 0.4,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: '1F3864', align: 'center',
    });
  });
}
