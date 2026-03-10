// Market Overview slide — country-level summary table

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent } from '../../calculations';

export function addMarketOverviewSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { countries, countryOutputs } = ctx;

  // Title bar
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

  // Header
  const hdrOpts = { bold: true, fontSize: 8, fill: { color: '1F3864' }, color: 'FFFFFF', fontFace: 'Calibri' };
  const headerRow = [
    { text: 'Country', options: hdrOpts },
    { text: 'LOE Year', options: { ...hdrOpts, align: 'center' as const } },
    { text: 'Currency', options: { ...hdrOpts, align: 'center' as const } },
    { text: 'Peak Market Vol.', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak BS Share', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak BS Sales', options: { ...hdrOpts, align: 'right' as const } },
    { text: 'Peak Supply Rev.', options: { ...hdrOpts, align: 'right' as const } },
  ];

  const tableRows: object[][] = [headerRow];

  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];

    // Peak values
    const peakVolume = Math.max(...co.marketVolume);
    const peakBsShare = Math.max(...co.biosimilarShare);
    const peakBsSales = Math.max(...co.biosimilarInMarketSales);
    const peakSupplyRev = Math.max(...co.netSupplyRevenue);

    const cellOpts = { fontSize: 8, fontFace: 'Calibri' };

    tableRows.push([
      { text: c.name, options: { ...cellOpts, bold: true } },
      { text: String(c.loeYear), options: { ...cellOpts, align: 'center' } },
      { text: c.localCurrency, options: { ...cellOpts, align: 'center' } },
      { text: formatNumber(peakVolume), options: { ...cellOpts, align: 'right' } },
      { text: formatPercent(peakBsShare), options: { ...cellOpts, align: 'right' } },
      { text: formatNumber(peakBsSales), options: { ...cellOpts, align: 'right' } },
      { text: formatNumber(peakSupplyRev), options: { ...cellOpts, align: 'right' } },
    ]);
  }

  slide.addTable(tableRows, {
    x: 0.3, y: 1.0, w: 9.4,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [1.6, 0.9, 0.9, 1.4, 1.2, 1.4, 1.4],
    rowH: [0.3, ...countries.map(() => 0.28)],
    autoPage: false,
  });
}
