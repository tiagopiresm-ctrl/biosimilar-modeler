// ──────────────────────────────────────────────────────────────
// Slide 4: Pricing & Market Access (maps to template slide 9)
//
// Layout (13.333 x 7.5"):
//   Table: Region | In-Market Price | Net Price | GTN% | Supply Price
//   Below: clustered bar chart comparing Supply vs In-Market price
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  NAVY, TEAL_BLUE, FONT, GRAY,
} from './slideLayout';

export function addPricingMarketAccessSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Pricing & Market Access');

  const { config, countries, countryOutputs } = ctx;
  const ccy = config.currency;

  if (countries.length === 0) {
    slide.addText('No countries configured', {
      x: 2, y: 3.5, w: 9, h: 1,
      fontSize: 14, fontFace: FONT, color: GRAY, align: 'center',
    });
    return;
  }

  // ── Find peak biosimilar-revenue period per country ────────
  interface PricingRow {
    name: string;
    inMarketPrice: number;
    netPrice: number;
    gtnPct: number;
    supplyPrice: number;
  }

  const rows: PricingRow[] = [];

  for (let ci = 0; ci < countries.length; ci++) {
    const c = countries[ci];
    const co = countryOutputs[ci];

    let peakP = 0;
    let peakRev = 0;
    for (let p = 0; p < co.netSupplyRevenue.length; p++) {
      if (co.netSupplyRevenue[p] > peakRev) {
        peakRev = co.netSupplyRevenue[p];
        peakP = p;
      }
    }

    const inMktPrice = co.biosimilarInMarketPrice[peakP] ?? 0;
    const netPrice = co.partnerNetSellingPrice[peakP] ?? 0;
    const gtn = inMktPrice > 0 ? 1 - netPrice / inMktPrice : 0;
    const supply = co.supplyPrice[peakP] ?? 0;

    rows.push({
      name: c.name,
      inMarketPrice: inMktPrice,
      netPrice,
      gtnPct: gtn,
      supplyPrice: supply,
    });
  }

  // ── Build table ────────────────────────────────────────────
  const headerRow = [
    { text: 'Region', options: TABLE_HDR },
    { text: `In-Market Price (${ccy})`, options: TABLE_HDR_R },
    { text: `Net Price (${ccy})`, options: TABLE_HDR_R },
    { text: 'GTN %', options: TABLE_HDR_R },
    { text: `Supply Price (${ccy})`, options: TABLE_HDR_R },
  ];

  const tableRows: object[][] = [headerRow];

  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    tableRows.push([
      { text: r.name, options: { ...tableCellOpts(ri, 'left'), bold: true } },
      { text: formatCurrency(r.inMarketPrice, '', 2), options: tableCellOpts(ri, 'right') },
      { text: formatCurrency(r.netPrice, '', 2), options: tableCellOpts(ri, 'right') },
      { text: formatPercent(r.gtnPct), options: tableCellOpts(ri, 'right') },
      { text: formatCurrency(r.supplyPrice, '', 2), options: tableCellOpts(ri, 'right') },
    ]);
  }

  // ── Draw table ─────────────────────────────────────────────
  const colW = [2.4, 2.6, 2.6, 2.0, 2.6];
  const rowH = Math.min(0.35, 3.5 / tableRows.length);

  slide.addTable(tableRows, {
    x: MARGIN_X, y: CONTENT_TOP + 0.05, w: CONTENT_W,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW,
    rowH: Array(tableRows.length).fill(rowH),
    autoPage: false,
  });

  // ── Price waterfall chart ─────────────────────────────────
  const chartY = CONTENT_TOP + 0.05 + tableRows.length * rowH + 0.35;
  const chartH = Math.max(1.8, 6.80 - chartY);

  const chartData = [{
    name: 'Supply Price',
    labels: rows.map(r => r.name),
    values: rows.map(r => r.supplyPrice),
  }, {
    name: 'In-Market Price',
    labels: rows.map(r => r.name),
    values: rows.map(r => r.inMarketPrice),
  }];

  slide.addChart('bar', chartData, {
    x: MARGIN_X,
    y: chartY,
    w: CONTENT_W,
    h: chartH,
    barGrouping: 'clustered',
    chartColors: [TEAL_BLUE, NAVY],
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 7,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
  });
}
