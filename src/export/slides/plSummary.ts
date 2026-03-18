// P&L Summary slide — combo chart (top) + KPI boxes (bottom)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

export function addPLSummarySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { plOutputs, periodLabels, config } = ctx;
  const NP = periodLabels.length;

  // ── Title bar ───────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText(`P&L Summary (${config.currency} '000)`, {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Helpers ─────────────────────────────────────────────────
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);

  // Thin out labels if >10 periods: show every other year
  const showEveryOther = NP > 10;
  const displayLabels = periodLabels.map((lbl, i) =>
    showEveryOther && i % 2 !== 0 ? '' : lbl,
  );

  // ── Chart data ──────────────────────────────────────────────
  const barData = [
    {
      name: 'Revenue',
      labels: displayLabels,
      values: plOutputs.totalRevenue,
    },
    {
      name: 'COGS',
      labels: displayLabels,
      values: plOutputs.cogs,
    },
  ];

  const lineData = [
    {
      name: 'EBITDA',
      labels: displayLabels,
      values: plOutputs.ebitda,
    },
    {
      name: 'Net Income',
      labels: displayLabels,
      values: plOutputs.netIncome,
    },
  ];

  // ── Combo chart (top half) ──────────────────────────────────
  const chartTypes = [
    {
      type: 'bar' as const,
      data: barData,
      options: { barGrouping: 'clustered' },
    },
    {
      type: 'line' as const,
      data: lineData,
      options: { secondaryValAxis: true },
    },
  ];

  // Combo chart: pptxgenjs takes (IChartMulti[], options) for multi-type charts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (slide as any).addChart(chartTypes, {
    x: 0.4,
    y: 0.85,
    w: 9.2,
    h: 3.1,

    showLegend: true,
    legendPos: 'b',
    legendFontSize: 8,
    legendFontFace: 'Calibri',

    chartColors: ['2E75B6', 'C00000', 'ED7D31', '70AD47'],

    catAxisLabelFontSize: 7,
    catAxisLabelFontFace: 'Calibri',
    catAxisLabelColor: '333333',
    catAxisOrientation: 'minMax',

    valAxisLabelFontSize: 7,
    valAxisLabelFontFace: 'Calibri',
    valAxisLabelColor: '333333',
    valAxisNumFmt: '#,##0',
    valAxisTitle: `${config.currency} '000`,
    valAxisTitleFontSize: 7,
    valAxisTitleColor: '666666',

    secondaryValAxis: true,
    secondaryValAxisNumFmt: '#,##0',
    secondaryValAxisLabelFontSize: 7,
    secondaryValAxisLabelColor: '666666',

    showValue: false,

    lineDataSymbol: 'circle',
    lineDataSymbolSize: 5,
    lineSize: 2,
  } as any);

  // ── KPI boxes (bottom half) ─────────────────────────────────
  const kpis: { label: string; value: string; color: string }[] = [
    {
      label: 'Total Revenue',
      value: formatNumber(sum(plOutputs.totalRevenue)),
      color: '2E75B6',
    },
    {
      label: 'Total COGS',
      value: formatNumber(sum(plOutputs.cogs)),
      color: 'C00000',
    },
    {
      label: 'Gross Margin (avg)',
      value: formatPercent(avg(plOutputs.grossMargin)),
      color: '1F3864',
    },
    {
      label: 'EBITDA',
      value: formatNumber(sum(plOutputs.ebitda)),
      color: 'ED7D31',
    },
    {
      label: 'Net Income',
      value: formatNumber(sum(plOutputs.netIncome)),
      color: '70AD47',
    },
    {
      label: 'Free Cash Flow',
      value: formatNumber(sum(plOutputs.freeCashFlow)),
      color: '7030A0',
    },
  ];

  const boxW = 1.45;
  const boxH = 0.7;
  const gap = 0.1;
  const totalW = kpis.length * boxW + (kpis.length - 1) * gap;
  const startX = (10 - totalW) / 2;
  const boxY = 4.25;

  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    const x = startX + i * (boxW + gap);

    // Box background
    slide.addShape('rect', {
      x,
      y: boxY,
      w: boxW,
      h: boxH,
      fill: { color: 'F2F2F2' },
      line: { color: kpi.color, width: 1.5 },
      rectRadius: 0.05,
    });

    // Colored top accent bar
    slide.addShape('rect', {
      x,
      y: boxY,
      w: boxW,
      h: 0.06,
      fill: { color: kpi.color },
    });

    // Value
    slide.addText(kpi.value, {
      x,
      y: boxY + 0.1,
      w: boxW,
      h: 0.32,
      fontSize: 13,
      fontFace: 'Calibri',
      bold: true,
      color: '1F3864',
      align: 'center',
      valign: 'middle',
    });

    // Label
    slide.addText(kpi.label, {
      x,
      y: boxY + 0.4,
      w: boxW,
      h: 0.25,
      fontSize: 7,
      fontFace: 'Calibri',
      color: '666666',
      align: 'center',
      valign: 'top',
    });
  }

  // Currency note
  slide.addText(`Values in ${config.currency} '000 — cumulative totals across ${NP} periods`, {
    x: 0.4,
    y: 5.05,
    w: 9.2,
    h: 0.25,
    fontSize: 7,
    fontFace: 'Calibri',
    color: '999999',
    align: 'center',
  });
}
