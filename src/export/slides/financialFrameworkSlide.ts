// ──────────────────────────────────────────────────────────────
// Slide 6: Financial Framework (maps to template slide 13)
//
// Layout (13.333 x 7.5"):
//   Top row — 3 columns:
//     Left   = Investment Parameters (section + KV pairs)
//     Center = Sales Forecast (bar chart)
//     Right  = Program Attractiveness (KPI cards)
//   Bottom row — 2 columns:
//     Left   = Program Costs Breakdown (table)
//     Right  = Milestones per Partner (table)
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, formatCurrency, getActiveRow } from '../../calculations';
import {
  applyLayout, addSectionBox, addLabelValue, addKpiCard,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  NAVY, TEAL_BLUE,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  FONT, VALUE_GRAY, WHITE,
} from './slideLayout';

export function addFinancialFrameworkSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  applyLayout(slide, 'Financial Framework');

  const { config, countries, plOutputs, npvOutputs,
          periodLabels, plAssumptions } = ctx;
  const ccy = config.currency;
  const s = config.activeScenario;

  // ════════════════════════════════════════════════════════════
  // TOP ROW — 3 columns
  // ════════════════════════════════════════════════════════════
  const colGap = 0.15;
  const colW = (CONTENT_W - 2 * colGap) / 3;

  // ── LEFT: Investment Parameters ────────────────────────────
  const leftX = MARGIN_X;
  const topY = CONTENT_TOP;
  const topH = 2.6;

  addSectionBox(slide, leftX, topY, colW, 0.35, 'Investment Parameters');

  const kvX = leftX + 0.12;
  const kvW = colW - 0.24;
  let kvY = topY + 0.45;

  const totalOpEx = plOutputs.totalOpEx.reduce((a, b) => a + b, 0);
  addLabelValue(slide, kvX, kvY, kvW, 'Total Program Costs', formatCurrency(totalOpEx, ccy));
  kvY += 0.28;

  addLabelValue(slide, kvX, kvY, kvW, 'Timeline',
    `${periodLabels[0]} \u2013 ${periodLabels[periodLabels.length - 1]}`);
  kvY += 0.28;

  addLabelValue(slide, kvX, kvY, kvW, 'Geographies', String(countries.length));
  kvY += 0.28;

  // Launch sequence
  const launches = countries
    .map(c => ({ name: c.name, yr: config.modelStartYear + c.biosimilarLaunchPeriodIndex }))
    .sort((a, b) => a.yr - b.yr);
  const launchSeqStr = launches.map(l => `${l.name} (${l.yr})`).join(', ');
  addLabelValue(slide, kvX, kvY, kvW, 'Launch Sequence', '');
  slide.addText(launchSeqStr, {
    x: kvX, y: kvY + 0.20, w: kvW, h: 0.40,
    fontSize: 7, fontFace: FONT, color: VALUE_GRAY, wrap: true,
  });
  kvY += 0.65;

  if (config.cogsInputMethod === 'perGram') {
    addLabelValue(slide, kvX, kvY, kvW, 'API Cost/Gram', formatCurrency(config.apiCostPerGram, ccy, 2));
  } else {
    addLabelValue(slide, kvX, kvY, kvW, 'Cost/Unit', formatCurrency(config.apiCostPerUnit, ccy, 2));
  }

  // ── CENTER: Sales Forecast bar chart ──────────────────────
  const centerX = leftX + colW + colGap;

  addSectionBox(slide, centerX, topY, colW, 0.35, 'Sales Forecast');

  const step = periodLabels.length > 12 ? 2 : 1;
  const keyIdx: number[] = [];
  for (let i = 0; i < periodLabels.length; i += step) keyIdx.push(i);
  if (keyIdx[keyIdx.length - 1] !== periodLabels.length - 1) keyIdx.push(periodLabels.length - 1);

  const labels = keyIdx.map(i => periodLabels[i]);
  const values = keyIdx.map(i => plOutputs.totalRevenue[i] ?? 0);

  slide.addChart('bar', [{ name: 'Revenue', labels, values }], {
    x: centerX + 0.10, y: topY + 0.45, w: colW - 0.20, h: topH - 0.55,
    barGrouping: 'clustered',
    chartColors: [TEAL_BLUE],
    showLegend: false,
    showValue: false,
    catAxisLabelFontSize: 6,
    catAxisLabelRotate: labels.length > 6 ? 45 : 0,
    valAxisLabelFontSize: 6,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
  });

  // ── RIGHT: Program Attractiveness KPIs ─────────────────────
  const rightX = centerX + colW + colGap;

  addSectionBox(slide, rightX, topY, colW, 0.35, 'Program Attractiveness');

  const kpiX = rightX + 0.12;
  const kpiW = colW - 0.24;
  const kpiH = 0.65;
  const kpiGap = 0.10;
  let kpiY = topY + 0.45;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'NPV', formatCurrency(npvOutputs.npv, ccy));
  kpiY += kpiH + kpiGap;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'IRR',
    npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A');
  kpiY += kpiH + kpiGap;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'Payback',
    npvOutputs.paybackFromLaunchUndiscounted != null
      ? `${npvOutputs.paybackFromLaunchUndiscounted} yrs` : 'N/A');

  // ════════════════════════════════════════════════════════════
  // BOTTOM ROW
  // ════════════════════════════════════════════════════════════
  const bottomY = topY + topH + 0.20;
  const bottomH = 6.80 - bottomY;  // fill to just above footer
  const halfW = (CONTENT_W - colGap) / 2;

  // ── Left: Program Costs Breakdown ─────────────────────────
  addSectionBox(slide, MARGIN_X, bottomY, halfW, 0.35, 'Program Costs Breakdown');

  const rAndD = getActiveRow(plAssumptions.rAndD, s);
  const commercial = getActiveRow(plAssumptions.commercialSales, s);
  const gAndA = getActiveRow(plAssumptions.gAndA, s);
  const ops = getActiveRow(plAssumptions.operations, s);
  const quality = getActiveRow(plAssumptions.quality, s);
  const clinical = getActiveRow(plAssumptions.clinical, s);
  const regulatory = getActiveRow(plAssumptions.regulatory, s);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const costItems = [
    { label: 'R&D', value: sum(rAndD) },
    { label: 'Commercial / Sales', value: sum(commercial) },
    { label: 'G&A', value: sum(gAndA) },
    { label: 'Operations', value: sum(ops) },
    { label: 'Quality', value: sum(quality) },
    { label: 'Clinical', value: sum(clinical) },
    { label: 'Regulatory', value: sum(regulatory) },
  ].filter(c => c.value !== 0);

  const costHdr = [
    { text: 'Category', options: TABLE_HDR },
    { text: `Total (${ccy} '000)`, options: TABLE_HDR_R },
  ];
  const costRows: object[][] = [costHdr];
  costItems.forEach((c, i) => {
    costRows.push([
      { text: c.label, options: tableCellOpts(i, 'left') },
      { text: formatNumber(c.value), options: tableCellOpts(i, 'right') },
    ]);
  });

  const costRowH = Math.min(0.28, (bottomH - 0.45) / costRows.length);

  slide.addTable(costRows, {
    x: MARGIN_X + 0.10, y: bottomY + 0.40, w: halfW - 0.20,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: [(halfW - 0.20) * 0.6, (halfW - 0.20) * 0.4],
    rowH: Array(costRows.length).fill(costRowH),
    autoPage: false,
  });

  // ── Right: Milestones per Partner ──────────────────────────
  const rightBottomX = MARGIN_X + halfW + colGap;
  addSectionBox(slide, rightBottomX, bottomY, halfW, 0.35, 'Milestones per Partner');

  const msHdr = [
    { text: 'Partner / Country', options: TABLE_HDR },
    { text: `Total Milestones (${ccy} '000)`, options: TABLE_HDR_R },
  ];
  const msRows: object[][] = [msHdr];
  let totalMilestones = 0;

  countries.forEach((c, ci) => {
    const msSum = c.milestonePayments.reduce((a, b) => a + b, 0);
    totalMilestones += msSum;
    msRows.push([
      { text: c.name, options: tableCellOpts(ci, 'left') },
      { text: formatNumber(msSum), options: tableCellOpts(ci, 'right') },
    ]);
  });

  // Total row
  msRows.push([
    { text: 'Total', options: { ...tableCellOpts(0, 'left'), bold: true, fill: { color: NAVY }, color: WHITE } },
    { text: formatNumber(totalMilestones), options: { ...tableCellOpts(0, 'right'), bold: true, fill: { color: NAVY }, color: WHITE } },
  ]);

  const msRowH = Math.min(0.28, (bottomH - 0.45) / msRows.length);

  slide.addTable(msRows, {
    x: rightBottomX + 0.10, y: bottomY + 0.40, w: halfW - 0.20,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: [(halfW - 0.20) * 0.55, (halfW - 0.20) * 0.45],
    rowH: Array(msRows.length).fill(msRowH),
    autoPage: false,
  });
}
