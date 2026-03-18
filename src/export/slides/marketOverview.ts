// Slide 3: Market Assumptions by Country — table + grouped bar chart

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

const DARK_BLUE = '1F4E79';
const BLUE = '2E75B6';

export function addMarketOverviewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { countries, countryOutputs, config, periodLabels } = ctx;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText('In-Market Sales Assumptions by Country', {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  if (countries.length === 0) {
    slide.addText('No countries configured', {
      x: 1, y: 2, w: 8, h: 1,
      fontSize: 14, fontFace: 'Calibri', color: '808080', align: 'center',
    });
    return;
  }

  // ── Find peak period per country ───────────────────────────
  const numPeriods = periodLabels.length;

  // ── Table: Country | Currency | FX | LOE | Launch | Peak Mkt Vol | Peak BS% | Peak In-Mkt Price % ──
  const hdrOpts = {
    bold: true, fontSize: 7, fill: { color: DARK_BLUE }, color: 'FFFFFF', fontFace: 'Calibri',
  };
  const hdrR = { ...hdrOpts, align: 'right' as const };
  const hdrC = { ...hdrOpts, align: 'center' as const };

  const headerRow = [
    { text: 'Country', options: hdrOpts },
    { text: 'Ccy', options: hdrC },
    { text: 'FX Rate', options: hdrR },
    { text: 'LOE', options: hdrC },
    { text: 'Launch', options: hdrC },
    { text: 'Peak Mkt Vol', options: hdrR },
    { text: 'Peak BS %', options: hdrR },
    { text: 'BS Price % Orig', options: hdrR },
  ];

  const tableRows: object[][] = [headerRow];
  const altFill = { color: 'F2F2F2' };
  const peakVolumes: { name: string; vol: number }[] = [];

  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];
    const isAlt = ci % 2 === 1;
    const cellOpts = {
      fontSize: 7, fontFace: 'Calibri',
      ...(isAlt ? { fill: altFill } : {}),
    };

    // Peak market volume
    const peakVol = Math.max(...co.marketVolume);
    peakVolumes.push({ name: c.name, vol: peakVol });

    // Peak biosimilar share
    const peakBsShare = Math.max(...co.biosimilarShare);

    // Peak biosimilar in-market price as % of originator
    let peakPricePct = 0;
    for (let p = 0; p < numPeriods; p++) {
      if (co.biosimilarInMarketPrice[p] > 0 && co.originatorRefPrice[p] > 0) {
        const pct = co.biosimilarInMarketPrice[p] / co.originatorRefPrice[p];
        if (pct > peakPricePct) peakPricePct = pct;
      }
    }

    // Average FX rate across non-zero periods
    const nonZeroFx = c.fxRate.filter((f) => f > 0);
    const avgFx = nonZeroFx.length > 0 ? nonZeroFx.reduce((a, b) => a + b, 0) / nonZeroFx.length : 0;

    // Launch year
    const launchYear = config.modelStartYear + c.biosimilarLaunchPeriodIndex;

    tableRows.push([
      { text: c.name, options: { ...cellOpts, bold: true } },
      { text: c.localCurrency, options: { ...cellOpts, align: 'center' } },
      { text: avgFx.toFixed(2), options: { ...cellOpts, align: 'right' } },
      { text: String(c.loeYear), options: { ...cellOpts, align: 'center' } },
      { text: String(launchYear), options: { ...cellOpts, align: 'center' } },
      { text: formatNumber(peakVol), options: { ...cellOpts, align: 'right' } },
      { text: formatPercent(peakBsShare), options: { ...cellOpts, align: 'right' } },
      { text: peakPricePct > 0 ? formatPercent(peakPricePct) : '-', options: { ...cellOpts, align: 'right' } },
    ]);
  }

  // Dynamic row height — keep compact
  const rowH = Math.min(0.28, 2.5 / (countries.length + 1));
  const tableH = rowH * (countries.length + 1);

  slide.addTable(tableRows, {
    x: 0.3, y: 0.8, w: 9.4,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [1.3, 0.5, 0.7, 0.6, 0.7, 1.3, 1.0, 1.1],
    rowH: Array(tableRows.length).fill(rowH),
    autoPage: false,
  });

  // ── Grouped bar chart: Peak market volume by country ───────
  const chartY = 0.8 + tableH + 0.35;
  const chartH = Math.max(1.5, 5.3 - chartY - 0.3);

  const chartData = [
    {
      name: 'Peak Market Volume',
      labels: peakVolumes.map((p) => p.name),
      values: peakVolumes.map((p) => p.vol),
    },
  ];

  slide.addText('Peak Market Volume by Country', {
    x: 0.3, y: chartY - 0.25, w: 9.4, h: 0.22,
    fontSize: 8, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
  });

  slide.addChart('bar', chartData, {
    x: 0.3, y: chartY, w: 9.4, h: chartH,
    barGrouping: 'clustered',
    chartColors: [BLUE],
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 7,
    dataLabelColor: '333333',
    dataLabelPosition: 'outEnd',
    catAxisLabelFontSize: 7,
    valAxisLabelFontSize: 7,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showTitle: false,
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText(
    `Volume unit: ${config.volumeMultiplier === 'none' ? 'units' : config.volumeMultiplier === 'thousand' ? "'000 units" : "'000,000 units"}  |  FX rates are period averages`,
    {
      x: 0.3, y: 5.15, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
