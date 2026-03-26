// ──────────────────────────────────────────────────────────────
// Slide 6: Financial Framework (maps to template slide 13)
//
// Left   = Investment Parameters (section box with KV pairs)
// Center = Sales Forecast bar chart
// Right  = Program Attractiveness KPIs
// Bottom = Program costs breakdown + milestones per partner table
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, formatCurrency, getActiveRow } from '../../calculations';
import {
  applyLayout, addSectionBox, addLabelValue, addKpiCard,
  MARGIN_X, CONTENT_TOP, CONTENT_W,
  DARK_BLUE, MID_BLUE,
  TABLE_HDR, TABLE_HDR_R, tableCellOpts,
  FONT, BLACK, WHITE,
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
  const colW = (CONTENT_W - 0.2) / 3;

  // ── LEFT: Investment Parameters ────────────────────────────
  const leftX = MARGIN_X;
  const topY = CONTENT_TOP;
  const topH = 2.2;

  addSectionBox(slide, leftX, topY, colW, topH, 'Investment Parameters');

  const kvX = leftX + 0.08;
  const kvW = colW - 0.16;
  let kvY = topY + 0.3;

  // Total program costs
  const totalOpEx = plOutputs.totalOpEx.reduce((a, b) => a + b, 0);
  addLabelValue(slide, kvX, kvY, kvW, 'Total Program Costs', formatCurrency(totalOpEx, ccy));
  kvY += 0.2;

  // Timeline
  addLabelValue(slide, kvX, kvY, kvW, 'Timeline',
    `${periodLabels[0]} - ${periodLabels[periodLabels.length - 1]}`);
  kvY += 0.2;

  // Geographies
  addLabelValue(slide, kvX, kvY, kvW, 'Geographies', String(countries.length));
  kvY += 0.2;

  // Launch sequence
  const launches = countries
    .map(c => ({ name: c.name, yr: config.modelStartYear + c.biosimilarLaunchPeriodIndex }))
    .sort((a, b) => a.yr - b.yr);
  const launchSeqStr = launches.map(l => `${l.name} (${l.yr})`).join(', ');
  addLabelValue(slide, kvX, kvY, kvW, 'Launch Sequence', '', { fontSize: 7 });
  // Multi-line below label
  slide.addText(launchSeqStr, {
    x: kvX, y: kvY + 0.15, w: kvW, h: 0.35,
    fontSize: 6.5, fontFace: FONT, color: BLACK, wrap: true,
  });
  kvY += 0.55;

  // COGS
  if (config.cogsInputMethod === 'perGram') {
    addLabelValue(slide, kvX, kvY, kvW, 'API Cost/Gram', formatCurrency(config.apiCostPerGram, ccy, 2));
  } else {
    addLabelValue(slide, kvX, kvY, kvW, 'Cost/Unit', formatCurrency(config.apiCostPerUnit, ccy, 2));
  }

  // ── CENTER: Sales Forecast bar chart ──────────────────────
  const centerX = leftX + colW + 0.1;

  addSectionBox(slide, centerX, topY, colW, topH, 'Sales Forecast');

  // Key years
  const step = periodLabels.length > 12 ? 2 : 1;
  const keyIdx: number[] = [];
  for (let i = 0; i < periodLabels.length; i += step) keyIdx.push(i);
  if (keyIdx[keyIdx.length - 1] !== periodLabels.length - 1) keyIdx.push(periodLabels.length - 1);

  const labels = keyIdx.map(i => periodLabels[i]);
  const values = keyIdx.map(i => plOutputs.totalRevenue[i] ?? 0);

  slide.addChart('bar', [{ name: 'Revenue', labels, values }], {
    x: centerX + 0.08, y: topY + 0.35, w: colW - 0.16, h: topH - 0.45,
    barGrouping: 'clustered',
    chartColors: [MID_BLUE],
    showLegend: false,
    showValue: false,
    catAxisLabelFontSize: 5.5,
    catAxisLabelRotate: labels.length > 6 ? 45 : 0,
    valAxisLabelFontSize: 5.5,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    valGridLine: { color: 'E8E8E8', size: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
  });

  // ── RIGHT: Program Attractiveness KPIs ─────────────────────
  const rightX = centerX + colW + 0.1;

  addSectionBox(slide, rightX, topY, colW, topH, 'Program Attractiveness');

  const kpiX = rightX + 0.08;
  const kpiW = colW - 0.16;
  const kpiH = 0.55;
  const kpiGap = 0.08;
  let kpiY = topY + 0.3;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'NPV', formatCurrency(npvOutputs.npv, ccy));
  kpiY += kpiH + kpiGap;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'IRR',
    npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A');
  kpiY += kpiH + kpiGap;

  addKpiCard(slide, kpiX, kpiY, kpiW, kpiH, 'Payback',
    npvOutputs.paybackFromLaunchUndiscounted != null
      ? `${npvOutputs.paybackFromLaunchUndiscounted} yrs` : 'N/A');

  // ════════════════════════════════════════════════════════════
  // BOTTOM ROW — Program costs breakdown + Milestones per partner
  // ════════════════════════════════════════════════════════════
  const bottomY = topY + topH + 0.15;
  const bottomH = 2.0;
  const halfW = (CONTENT_W - 0.1) / 2;

  // ── Left: Program Costs Breakdown ─────────────────────────
  addSectionBox(slide, MARGIN_X, bottomY, halfW, bottomH, 'Program Costs Breakdown');

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

  const costRowH = Math.min(0.22, (bottomH - 0.35) / costRows.length);

  slide.addTable(costRows, {
    x: MARGIN_X + 0.08, y: bottomY + 0.3, w: halfW - 0.16,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: [(halfW - 0.16) * 0.6, (halfW - 0.16) * 0.4],
    rowH: Array(costRows.length).fill(costRowH),
    autoPage: false,
  });

  // ── Right: Milestones per Partner ──────────────────────────
  const rightBottomX = MARGIN_X + halfW + 0.1;
  addSectionBox(slide, rightBottomX, bottomY, halfW, bottomH, 'Milestones per Partner');

  // Build milestone summary per country
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
    { text: 'Total', options: { ...tableCellOpts(0, 'left'), bold: true, fill: { color: DARK_BLUE }, color: WHITE } },
    { text: formatNumber(totalMilestones), options: { ...tableCellOpts(0, 'right'), bold: true, fill: { color: DARK_BLUE }, color: WHITE } },
  ]);

  const msRowH = Math.min(0.22, (bottomH - 0.35) / msRows.length);

  slide.addTable(msRows, {
    x: rightBottomX + 0.08, y: bottomY + 0.3, w: halfW - 0.16,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: [(halfW - 0.16) * 0.55, (halfW - 0.16) * 0.45],
    rowH: Array(msRows.length).fill(msRowH),
    autoPage: false,
  });
}
