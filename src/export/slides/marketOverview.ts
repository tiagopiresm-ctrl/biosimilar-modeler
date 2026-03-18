// Market Overview slide — country summary table (left) + doughnut chart (right)

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

export function addMarketOverviewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { countries, countryOutputs, periodLabels } = ctx;

  // ── Title bar ──
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Market Overview by Country', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  if (countries.length === 0) {
    slide.addText('No countries configured', {
      x: 1, y: 2, w: 8, h: 1,
      fontSize: 14, fontFace: 'Calibri', color: '808080', align: 'center',
    });
    return;
  }

  // ── Find global peak year (period with highest total biosimilar volume) ──
  const numPeriods = periodLabels.length;
  let peakPeriodIdx = 0;
  let peakTotalBsVol = 0;
  for (let p = 0; p < numPeriods; p++) {
    let totalBsVol = 0;
    for (const co of countryOutputs) {
      totalBsVol += co.biosimilarVolume[p] ?? 0;
    }
    if (totalBsVol > peakTotalBsVol) {
      peakTotalBsVol = totalBsVol;
      peakPeriodIdx = p;
    }
  }
  const peakYearLabel = periodLabels[peakPeriodIdx] ?? '';

  // ══════════════════════════════════════════════════════════
  // LEFT SIDE — Compact country summary table (60% width)
  // ══════════════════════════════════════════════════════════

  const hdrOpts = {
    bold: true, fontSize: 7, fill: { color: '1F3864' }, color: 'FFFFFF', fontFace: 'Calibri',
  };
  const headerRow = [
    { text: 'Country', options: hdrOpts },
    { text: 'LOE', options: { ...hdrOpts, align: 'center' as const } },
    { text: 'Peak Mkt Vol.', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak BS %', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak BS Sales', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak Supply', options: { ...hdrOpts, align: 'right' as const } },
  ];

  const tableRows: object[][] = [headerRow];
  const altFill = { color: 'F2F2F2' };

  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];

    const peakVolume = Math.max(...co.marketVolume);
    const peakBsShare = Math.max(...co.biosimilarShare);
    const peakBsSales = Math.max(...co.biosimilarInMarketSales);
    const peakSupplyRev = Math.max(...co.netSupplyRevenue);

    const isAlt = ci % 2 === 1;
    const cellOpts = {
      fontSize: 7,
      fontFace: 'Calibri',
      ...(isAlt ? { fill: altFill } : {}),
    };

    tableRows.push([
      { text: c.name, options: { ...cellOpts, bold: true } },
      { text: String(c.loeYear), options: { ...cellOpts, align: 'center' } },
      { text: formatNumber(peakVolume), options: { ...cellOpts, align: 'right' } },
      { text: formatPercent(peakBsShare), options: { ...cellOpts, align: 'right' } },
      { text: formatNumber(peakBsSales), options: { ...cellOpts, align: 'right' } },
      { text: formatNumber(peakSupplyRev), options: { ...cellOpts, align: 'right' } },
    ]);
  }

  slide.addTable(tableRows, {
    x: 0.3, y: 1.0, w: 5.6,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [1.1, 0.6, 1.0, 0.8, 1.0, 1.1],
    rowH: [0.28, ...countries.map(() => 0.25)],
    autoPage: false,
  });

  // ══════════════════════════════════════════════════════════
  // RIGHT SIDE — Doughnut chart: market share at peak year
  // (first country only)
  // ══════════════════════════════════════════════════════════

  const co0 = countryOutputs[0];
  const origShare = co0.originatorShare[peakPeriodIdx] ?? 0;
  const bsShare = co0.biosimilarShare[peakPeriodIdx] ?? 0;
  const genShare = co0.totalGenericShare[peakPeriodIdx] ?? 0;

  // Normalise so they sum to 1 (guards against rounding gaps)
  const total = origShare + bsShare + genShare;
  const norm = total > 0 ? total : 1;

  const chartData = [{
    name: 'Market Share',
    labels: ['Originator', 'Biosimilar', 'Generics'],
    values: [origShare / norm, bsShare / norm, genShare / norm],
  }];

  slide.addChart('doughnut', chartData, {
    x: 6.2, y: 1.0, w: 3.4, h: 3.2,
    showPercent: true,
    showTitle: true,
    title: `${countries[0].name} — Share at ${peakYearLabel}`,
    titleFontSize: 9,
    titleColor: '1F3864',
    chartColors: ['A5A5A5', '2E75B6', 'ED7D31'],
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    dataLabelFontSize: 8,
    dataLabelColor: 'FFFFFF',
  });

  // ── Footer note ──
  slide.addText(
    `Peak year determined by highest aggregate biosimilar volume across all countries (${peakYearLabel})`,
    {
      x: 0.3, y: 5.0, w: 9.4, h: 0.35,
      fontSize: 7, fontFace: 'Calibri', color: 'A5A5A5', italic: true,
    },
  );
}
