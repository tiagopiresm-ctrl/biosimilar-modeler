// Slide 4: Country Revenue Waterfall — stacked bar chart by country over years

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';

const DARK_BLUE = '1F4E79';
const COUNTRY_COLORS = [
  '2E75B6', 'ED7D31', '70AD47', 'C00000', '7030A0',
  'FFC000', '4472C4', 'A5A5A5', '548235', 'BF8F00',
  '2F5597', 'C55A11', '375623', '843C0C', '404040',
];

export function addCountryRevenueSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { countries, countryOutputs, periodLabels, config } = ctx;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText(`Country Revenue Waterfall (${config.currency} '000)`, {
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

  // ── Build chart data: one series per country ───────────────
  // Show every other label if >12 periods
  const showEveryOther = periodLabels.length > 12;
  const displayLabels = periodLabels.map((lbl, i) =>
    showEveryOther && i % 2 !== 0 ? '' : lbl,
  );

  const chartData = countries.map((c, ci) => ({
    name: c.name,
    labels: displayLabels,
    values: countryOutputs[ci].netSupplyRevenue,
  }));

  const colors = countries.map((_, ci) => COUNTRY_COLORS[ci % COUNTRY_COLORS.length]);

  // ── Stacked bar chart ──────────────────────────────────────
  slide.addChart('bar', chartData, {
    x: 0.3,
    y: 0.8,
    w: 9.4,
    h: 4.2,
    barGrouping: 'stacked',
    chartColors: colors,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showValue: false,
    catAxisLabelFontSize: 7,
    catAxisLabelRotate: periodLabels.length > 15 ? 45 : 0,
    catAxisOrientation: 'minMax',
    valAxisLabelFontSize: 7,
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText(
    `Supply revenue per country stacked to show total revenue build-up  |  Values in ${config.currency} '000`,
    {
      x: 0.3, y: 5.15, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
