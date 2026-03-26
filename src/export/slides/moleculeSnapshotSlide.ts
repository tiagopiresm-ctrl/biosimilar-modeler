// ──────────────────────────────────────────────────────────────
// Slide 1: Molecule Snapshot (maps to template slide 3)
//
// Layout matches template exactly:
//   Left column (x=0.60..6.35):
//     - Section: Main Characteristics (with vertical accent bar + KV pairs)
//     - Section: Market Outlook (KV pairs + sales/volume mini-bar charts)
//   Right column (x=6.70..12.70):
//     - Section: High Level Timeline (year blocks + Gantt-style bars)
//     - Section: Financials (program cost stacked bar)
//     - Section: Program Attractiveness (NPV, Payback, IRR)
//
// All positions in inches, matching template EMU / 914400.
// ──────────────────────────────────────────────────────────────

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, formatCurrency } from '../../calculations';
import {
  applyLayout, addSectionBox, addVerticalAccent, addFootnote,
  MARGIN_X, CONTENT_TOP,
  LEFT_COL_W, RIGHT_COL_X, RIGHT_COL_W,
  LABEL_X, LABEL_W, VALUE_X, VALUE_W,
  ROW_H, ROW_SPACING,
  NAVY, TEAL_BLUE, TEAL,
  LABEL_NAVY, VALUE_GRAY, GRAY,
  FONT, FS_LABEL, FS_SMALL, FS_MINI, FS_KPI_VAL, FS_MICRO,
} from './slideLayout';

export function addMoleculeSnapshotSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();

  const { config, countries, countryOutputs, plOutputs, npvOutputs, periodLabels } = ctx;
  const ccy = config.currency;
  const molName = config.moleculeName || 'Biosimilar';

  applyLayout(slide, `${molName} \u2014 Molecule Snapshot`,
    'Requesting endorsement to proceed with biosimilar development');

  // ════════════════════════════════════════════════════════════
  // LEFT COLUMN (x: 0.60 .. ~5.90)    — template positions
  // ════════════════════════════════════════════════════════════
  const leftX = MARGIN_X;   // 0.60"
  const leftW = LEFT_COL_W; // 5.40"
  let curY = CONTENT_TOP;   // 1.17"

  // ── Section: Main Characteristics ──────────────────────────
  addSectionBox(slide, leftX, curY, leftW, 0.35, 'Main Characteristics');
  curY += 0.45;

  // Vertical accent bar (0.04" wide, navy #1F4E79, left edge)
  const barX = 0.75;
  const barStartY = curY;
  const kvX = LABEL_X;      // 0.95"
  const kvValX = VALUE_X;   // 3.15"
  const kvLabelW = LABEL_W; // 2.20"
  const kvValW = VALUE_W;   // 3.00"
  const rowH = ROW_SPACING; // 0.31" vertical spacing between rows

  // LOE years string
  const loeStr = countries.map(c => `${c.name}: ${c.loeYear}`).join('  |  ');
  // Launch years string
  const launchEntries = countries
    .map(c => ({ name: c.name, yr: config.modelStartYear + c.biosimilarLaunchPeriodIndex }))
    .sort((a, b) => a.yr - b.yr);
  const launchStr = launchEntries.map(l => `${l.name}: ${l.yr}`).join('  |  ');

  const mainKVs: [string, string][] = [
    ['Product / Molecule:', molName],
    ['Model Currency:', ccy],
    ['LOE Years:', loeStr || '-'],
    ['Countries Modeled:', String(countries.length)],
    ['Launch Years:', launchStr || '-'],
    ['Model Period:', `${periodLabels[0]} \u2013 ${periodLabels[periodLabels.length - 1]}`],
  ];

  mainKVs.forEach(([label, value], i) => {
    const y = curY + i * rowH;
    slide.addText(label, {
      x: kvX, y, w: kvLabelW, h: ROW_H,
      fontSize: FS_LABEL, fontFace: FONT, bold: true, color: LABEL_NAVY,
    });
    slide.addText(value, {
      x: kvValX, y, w: kvValW, h: ROW_H,
      fontSize: FS_LABEL, fontFace: FONT, color: VALUE_GRAY,
    });
  });

  const barEndY = curY + mainKVs.length * rowH;
  addVerticalAccent(slide, barX, barStartY, barEndY - barStartY);

  curY = barEndY + 0.20;

  // ── Section: Market Outlook ────────────────────────────────
  addSectionBox(slide, leftX, curY, leftW, 0.35, 'Market Outlook');
  curY += 0.40;

  // Compute global metrics
  let globalPeakVol = 0;
  for (const co of countryOutputs) {
    globalPeakVol += Math.max(...co.marketVolume);
  }
  let totalSales = 0;
  let totalVol = 0;
  for (const co of countryOutputs) {
    for (let p = 0; p < co.biosimilarVolume.length; p++) {
      totalSales += co.biosimilarInMarketSales[p];
      totalVol += co.biosimilarVolume[p];
    }
  }
  const avgPrice = totalVol > 0 ? (totalSales / totalVol) * 1000 : 0;

  // Global market size (sum of peak market value per country)
  let globalPeakMarketValue = 0;
  for (const co of countryOutputs) {
    globalPeakMarketValue += Math.max(...co.totalMarketValue);
  }

  const mktKVs: [string, string][] = [
    [`Global market size (${ccy} '000):`, formatNumber(globalPeakMarketValue)],
    [`Global in-market price, ${ccy}:`, formatCurrency(avgPrice, '', 0)],
    ['Countries modeled:', String(countries.length)],
  ];

  mktKVs.forEach(([label, value], i) => {
    const y = curY + i * 0.22;
    slide.addText(label, {
      x: 0.75, y, w: 2.80, h: 0.20,
      fontSize: FS_SMALL, fontFace: FONT, bold: true, color: LABEL_NAVY,
    });
    slide.addText(value, {
      x: 3.60, y, w: 2.30, h: 0.20,
      fontSize: FS_SMALL, fontFace: FONT, color: VALUE_GRAY,
    });
  });

  curY += mktKVs.length * 0.22 + 0.10;

  // ── Mini sales forecast bar chart (template style: teal bars) ──
  slide.addText(`mAbx sales forecast (${ccy} '000)`, {
    x: 0.75, y: curY, w: 3.50, h: 0.16,
    fontSize: FS_MINI, fontFace: FONT, bold: true, color: LABEL_NAVY,
  });
  curY += 0.20;

  // Pick up to 8 key periods for the mini chart
  const maxBars = 8;
  const step = Math.max(1, Math.ceil(periodLabels.length / maxBars));
  const keyIdx: number[] = [];
  for (let i = 0; i < periodLabels.length; i += step) keyIdx.push(i);
  if (keyIdx.length > 0 && keyIdx[keyIdx.length - 1] !== periodLabels.length - 1) {
    keyIdx.push(periodLabels.length - 1);
  }
  const barLabels = keyIdx.map(i => periodLabels[i]);
  const barValues = keyIdx.map(i => plOutputs.totalRevenue[i] ?? 0);

  // Draw simple mini-bar chart with text shapes (matching template style)
  const barChartX = 0.75;
  const barChartW = 4.96;  // ~8 bars
  const barMaxH = 0.35;
  const barW = Math.min(0.55, barChartW / barLabels.length - 0.08);
  const barSpacing = Math.max(0.63, barChartW / barLabels.length);
  const maxVal = Math.max(...barValues, 1);

  const barBaseY = curY + barMaxH + 0.15;

  barLabels.forEach((lbl, i) => {
    const val = barValues[i];
    const bH = Math.max(0.04, (val / maxVal) * barMaxH);
    const bX = barChartX + i * barSpacing;
    const bY = barBaseY - bH;

    // Bar rect
    slide.addShape('rect', {
      x: bX, y: bY, w: barW, h: bH,
      fill: { color: TEAL },
    });
    // Value label above bar (5pt bold #003366)
    slide.addText(formatNumber(val), {
      x: bX, y: bY - 0.14, w: barW, h: 0.12,
      fontSize: FS_MICRO, fontFace: FONT, bold: true, color: LABEL_NAVY, align: 'center',
    });
    // Year label below bar (5pt #666666)
    slide.addText(lbl, {
      x: bX, y: barBaseY + 0.02, w: barW, h: 0.12,
      fontSize: FS_MICRO, fontFace: FONT, color: GRAY, align: 'center',
    });
  });

  // ── Mini volume forecast bar chart (template chart #2) ──────
  // Template positions: title y=6.15", bars y=6.27"–6.63", year labels y=6.73"
  const volTitleY = 6.15;
  slide.addText("mAbx Volume forecast, '000 units", {
    x: 0.75, y: volTitleY, w: 3.50, h: 0.16,
    fontSize: FS_MINI, fontFace: FONT, bold: true, color: LABEL_NAVY,
  });

  // Aggregate biosimilar volume across all countries for each key period
  const volValues = keyIdx.map(i =>
    countryOutputs.reduce((sum, co) => sum + (co.biosimilarVolume[i] ?? 0), 0),
  );
  const volMaxVal = Math.max(...volValues, 1);

  const volBarTopY = 6.27;
  const volBarBotY = 6.63;
  const volBarMaxH = volBarBotY - volBarTopY; // 0.36"
  const volLabelY  = 6.73;

  barLabels.forEach((lbl, i) => {
    const val = volValues[i];
    const bH = Math.max(0.04, (val / volMaxVal) * volBarMaxH);
    const bX = barChartX + i * barSpacing;
    const bY = volBarBotY - bH;

    // Bar rect (teal fill, same as sales chart)
    slide.addShape('rect', {
      x: bX, y: bY, w: barW, h: bH,
      fill: { color: TEAL },
    });
    // Value label above bar (5pt bold #003366)
    slide.addText(formatNumber(val), {
      x: bX, y: bY - 0.14, w: barW, h: 0.12,
      fontSize: FS_MICRO, fontFace: FONT, bold: true, color: LABEL_NAVY, align: 'center',
    });
    // Year label below bar (5pt #666666)
    slide.addText(lbl, {
      x: bX, y: volLabelY, w: barW, h: 0.12,
      fontSize: FS_MICRO, fontFace: FONT, color: GRAY, align: 'center',
    });
  });

  // ════════════════════════════════════════════════════════════
  // RIGHT COLUMN (x: 6.70 .. 12.70)
  // ════════════════════════════════════════════════════════════
  const rightX = RIGHT_COL_X;  // 6.70"
  const rightW = RIGHT_COL_W;  // 5.70"
  let rightY = CONTENT_TOP;

  // ── Section: High Level Timeline ───────────────────────────
  addSectionBox(slide, rightX, rightY, rightW, 0.35, 'High Level Timeline');
  rightY += 0.40;

  // Year blocks across top
  const timelineYears = launchEntries.length > 0
    ? Array.from(
        { length: Math.min(6, periodLabels.length) },
        (_, i) => periodLabels[i],
      )
    : periodLabels.slice(0, 6);

  const yearBlockW = 0.77;
  const yearBlockH = 0.22;
  const yearStartX = 7.80;

  timelineYears.forEach((yr, i) => {
    const bx = yearStartX + i * yearBlockW;
    slide.addShape('rect', {
      x: bx, y: rightY, w: yearBlockW, h: yearBlockH,
      fill: { color: i % 2 === 0 ? TEAL_BLUE : NAVY },
    });
    slide.addText(yr, {
      x: bx, y: rightY + 0.01, w: yearBlockW, h: 0.20,
      fontSize: FS_MINI, fontFace: FONT, bold: true, color: 'FFFFFF',
      align: 'center',
    });
  });

  rightY += yearBlockH + 0.15;

  // Development phase bars (simplified Gantt)
  const phases = [
    'Analytical & Process Dev',
    'Scale-up & GMP',
    'Validation',
    'Clinical',
    'Regulatory',
  ];
  const phaseColors = [TEAL_BLUE, '5B9BD5', '17A2B8', '5B9BD5', TEAL_BLUE];
  const phaseBarW = [1.15, 1.15, 0.92, 1.53, 1.15];

  phases.forEach((phase, i) => {
    // Phase label (6pt = FS_TINY for phase labels)
    slide.addText(phase, {
      x: rightX, y: rightY, w: 1.10, h: 0.35,
      fontSize: 6, fontFace: FONT, color: VALUE_GRAY, wrap: true,
    });
    // Phase bar (staggered offset to show sequence)
    const barOffset = i * 0.77;
    slide.addShape('rect', {
      x: yearStartX + barOffset, y: rightY + 0.06, w: phaseBarW[i], h: 0.22,
      fill: { color: phaseColors[i] },
    });
    rightY += 0.35;
  });

  rightY += 0.20;

  // ── Section: Financials ────────────────────────────────────
  addSectionBox(slide, rightX, rightY, rightW, 0.35, 'Financials');
  rightY += 0.40;

  // Total program costs
  const totalOpExSum = plOutputs.totalOpEx.reduce((a, b) => a + b, 0);
  slide.addText(`Program costs: ${formatCurrency(totalOpExSum, ccy)}`, {
    x: 6.85, y: rightY, w: 3.00, h: 0.20,
    fontSize: FS_KPI_VAL, fontFace: FONT, bold: true, color: LABEL_NAVY,
  });

  rightY += 0.50;

  // ── Section: Program Attractiveness ────────────────────────
  addSectionBox(slide, rightX, rightY, rightW, 0.35, 'Program Attractiveness');
  rightY += 0.40;

  // NPV | Payback | IRR — in a row (matching template)
  const kpiPairs: [string, string][] = [
    ['NPV:', formatCurrency(npvOutputs.npv, ccy)],
    ['Payback:', npvOutputs.paybackFromLaunchUndiscounted != null
      ? `${npvOutputs.paybackFromLaunchUndiscounted} yrs` : 'N/A'],
    ['IRR:', npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A'],
  ];

  const kpiSpacing = 1.75;
  kpiPairs.forEach(([label, value], i) => {
    const kx = 6.85 + i * kpiSpacing;
    slide.addText(label, {
      x: kx, y: rightY, w: 0.80, h: 0.18,
      fontSize: FS_SMALL, fontFace: FONT, bold: true, color: GRAY,
    });
    slide.addText(value, {
      x: kx + 0.75, y: rightY, w: 1.00, h: 0.18,
      fontSize: FS_LABEL, fontFace: FONT, bold: true, color: LABEL_NAVY,
    });
  });

  // Footnote
  addFootnote(slide, `NPV from signature till end of model period  |  Source: Model outputs  |  ${ccy} '000`);
}
