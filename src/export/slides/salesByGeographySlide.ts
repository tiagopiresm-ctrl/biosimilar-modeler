// ──────────────────────────────────────────────────────────────
// Slide 3: Sales by Geography (maps to template slide 5)
//
// Table: Geography | Market Size | Volume | Price/Unit | Share of Global
// One row per country, total row at bottom.
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  DARK_BLUE, FONT, GRAY, WHITE,
} from './slideLayout';

export function addSalesByGeographySlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Sales by Geography');

  const { config, countries, countryOutputs } = ctx;
  const ccy = config.currency;

  if (countries.length === 0) {
    slide.addText('No countries configured', {
      x: 1, y: 2.5, w: 8, h: 1,
      fontSize: 14, fontFace: FONT, color: GRAY, align: 'center',
    });
    return;
  }

  // ── Compute per-country peak values ────────────────────────
  interface GeoRow {
    name: string;
    peakMarketValue: number;
    peakVolume: number;
    avgPrice: number;
  }

  const geoRows: GeoRow[] = [];
  let globalMarketValue = 0;

  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];

    const peakMarketValue = Math.max(...co.totalMarketValue);
    const peakVolume = Math.max(...co.biosimilarVolume);

    // Average price (sales / volume)
    let totalSales = 0;
    let totalVol = 0;
    for (let p = 0; p < co.biosimilarVolume.length; p++) {
      if (co.biosimilarVolume[p] > 0) {
        totalSales += co.biosimilarInMarketSales[p];
        totalVol += co.biosimilarVolume[p];
      }
    }
    const avgPrice = totalVol > 0 ? (totalSales / totalVol) * 1000 : 0;

    geoRows.push({ name: c.name, peakMarketValue, peakVolume, avgPrice });
    globalMarketValue += peakMarketValue;
  }

  // ── Build table ────────────────────────────────────────────
  const headerRow = [
    { text: 'Geography', options: TABLE_HDR },
    { text: `Market Size (${ccy} '000)`, options: TABLE_HDR_R },
    { text: 'BS Volume (peak)', options: TABLE_HDR_R },
    { text: `Price / Unit (${ccy})`, options: TABLE_HDR_R },
    { text: 'Share of Global', options: TABLE_HDR_R },
  ];

  const tableRows: object[][] = [headerRow];

  for (let ri = 0; ri < geoRows.length; ri++) {
    const g = geoRows[ri];
    const share = globalMarketValue > 0 ? g.peakMarketValue / globalMarketValue : 0;

    tableRows.push([
      { text: g.name, options: { ...tableCellOpts(ri, 'left'), bold: true } },
      { text: formatNumber(g.peakMarketValue), options: tableCellOpts(ri, 'right') },
      { text: formatNumber(g.peakVolume), options: tableCellOpts(ri, 'right') },
      { text: formatCurrency(g.avgPrice, '', 2), options: tableCellOpts(ri, 'right') },
      { text: formatPercent(share), options: tableCellOpts(ri, 'right') },
    ]);
  }

  // Total row
  const totalVol = geoRows.reduce((s, g) => s + g.peakVolume, 0);
  const totalStyle = {
    fontSize: 7.5, fontFace: FONT, bold: true as const, color: WHITE,
    fill: { color: DARK_BLUE },
  };
  const totalR = { ...totalStyle, align: 'right' as const };

  tableRows.push([
    { text: 'Total', options: totalStyle },
    { text: formatNumber(globalMarketValue), options: totalR },
    { text: formatNumber(totalVol), options: totalR },
    { text: '', options: totalR },
    { text: '100.0%', options: totalR },
  ]);

  // ── Draw table ─────────────────────────────────────────────
  const colW = [1.8, 2.1, 1.8, 1.8, 1.8];
  const rowH = Math.min(0.3, 3.5 / tableRows.length);

  slide.addTable(tableRows, {
    x: MARGIN_X, y: CONTENT_TOP + 0.05, w: CONTENT_W,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW,
    rowH: Array(tableRows.length).fill(rowH),
    autoPage: false,
  });
}
