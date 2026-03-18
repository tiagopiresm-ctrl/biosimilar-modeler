// Slide 6: P&L Cost Assumptions — expense categories + COGS assumptions

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatNumber, formatPercent, getActiveRow } from '../../calculations';

const DARK_BLUE = '1F4E79';

export function addPLCostAssumptionsSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { plAssumptions, config, periodLabels } = ctx;
  const NP = periodLabels.length;
  const s = config.activeScenario;

  // ── Title bar ──────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: DARK_BLUE } });
  slide.addText(`P&L Cost Assumptions \u2014 ${ctx.scenarioLabel} Case (${config.currency} '000)`, {
    x: 0.4, y: 0.08, w: 9, h: 0.44,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // ── Select key years ───────────────────────────────────────
  const yearIndices: number[] = [];
  const step = NP > 10 ? 2 : 1;
  for (let i = 0; i < NP; i += step) yearIndices.push(i);
  if (yearIndices[yearIndices.length - 1] !== NP - 1) yearIndices.push(NP - 1);

  // ── Program expenses table ─────────────────────────────────
  const hdrOpts = {
    bold: true, fontSize: 6.5, fill: { color: DARK_BLUE }, color: 'FFFFFF', fontFace: 'Calibri',
  };
  const hdrR = { ...hdrOpts, align: 'right' as const };
  const altFill = { color: 'F2F2F2' };

  const headerRow = [
    { text: 'Expense Category', options: hdrOpts },
    ...yearIndices.map((i) => ({ text: periodLabels[i], options: hdrR })),
  ];

  const makeRow = (label: string, arr: number[], rowIdx: number) => {
    const isAlt = rowIdx % 2 === 1;
    const cellOpts = {
      fontSize: 6.5, fontFace: 'Calibri', align: 'right' as const,
      ...(isAlt ? { fill: altFill } : {}),
    };
    const labelOpts = {
      fontSize: 6.5, fontFace: 'Calibri',
      ...(isAlt ? { fill: altFill } : {}),
    };
    return [
      { text: label, options: labelOpts },
      ...yearIndices.map((i) => ({ text: formatNumber(arr[i] ?? 0), options: cellOpts })),
    ];
  };

  const rAndD = getActiveRow(plAssumptions.rAndD, s);
  const commercialSales = getActiveRow(plAssumptions.commercialSales, s);
  const gAndA = getActiveRow(plAssumptions.gAndA, s);
  const dAndA = getActiveRow(plAssumptions.dAndA, s);
  const financialCosts = getActiveRow(plAssumptions.financialCosts, s);
  const otherIncome = getActiveRow(plAssumptions.otherIncome, s);

  const expenseRows: object[][] = [
    headerRow,
    makeRow('R&D', rAndD, 0),
    makeRow('Commercial / Sales', commercialSales, 1),
    makeRow('G&A', gAndA, 2),
    makeRow('D&A', dAndA, 3),
    makeRow('Financial Costs', financialCosts, 4),
    makeRow('Other Income', otherIncome, 5),
  ];

  // Column widths
  const labelW = 1.2;
  const remainingW = 9.4 - labelW;
  const yearColW = remainingW / yearIndices.length;
  const colWidths = [labelW, ...yearIndices.map(() => yearColW)];

  slide.addText('Program Expenses by Category', {
    x: 0.3, y: 0.72, w: 9.4, h: 0.2,
    fontSize: 8, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
  });

  slide.addTable(expenseRows, {
    x: 0.3, y: 0.95, w: 9.4,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: colWidths,
    rowH: Array(expenseRows.length).fill(0.2),
    autoPage: false,
  });

  // ── COGS Assumptions section ───────────────────────────────
  const cogsY = 0.95 + expenseRows.length * 0.2 + 0.35;

  slide.addText('COGS Assumptions', {
    x: 0.3, y: cogsY, w: 9.4, h: 0.2,
    fontSize: 8, fontFace: 'Calibri', bold: true, color: DARK_BLUE,
  });

  const cogsHdr = {
    bold: true, fontSize: 7, fill: { color: DARK_BLUE }, color: 'FFFFFF', fontFace: 'Calibri',
  };
  const cogsCell = { fontSize: 7, fontFace: 'Calibri' };
  const cogsCellR = { ...cogsCell, align: 'right' as const };
  const cogsAlt = { ...cogsCell, fill: { color: 'F2F2F2' } };
  const cogsAltR = { ...cogsCellR, fill: { color: 'F2F2F2' } };

  const cogsRows: object[][] = [
    [
      { text: 'Parameter', options: cogsHdr },
      { text: 'Value', options: { ...cogsHdr, align: 'right' as const } },
    ],
    [
      { text: 'API Cost per Gram', options: cogsCell },
      { text: `${config.currency} ${formatNumber(config.apiCostPerGram, 2)}`, options: cogsCellR },
    ],
    [
      { text: 'COGS Inflation Rate', options: cogsAlt },
      { text: formatPercent(config.cogsInflationRate), options: cogsAltR },
    ],
    [
      { text: 'Manufacturing Overage', options: cogsCell },
      { text: formatPercent(config.manufacturingOverage), options: cogsCellR },
    ],
    [
      { text: 'Overhead %', options: cogsAlt },
      { text: formatPercent(config.cogsOverheadPct), options: cogsAltR },
    ],
    [
      { text: 'Internal Markup %', options: cogsCell },
      { text: formatPercent(config.cogsMarkupPct), options: cogsCellR },
    ],
    [
      { text: 'Units per Gram of API', options: cogsAlt },
      { text: formatNumber(config.unitsPerGramOfAPI, 1), options: cogsAltR },
    ],
  ];

  slide.addTable(cogsRows, {
    x: 0.3, y: cogsY + 0.25, w: 3.5,
    border: { type: 'solid', pt: 0.3, color: 'D9D9D9' },
    colW: [2.0, 1.5],
    rowH: Array(cogsRows.length).fill(0.22),
    autoPage: false,
  });

  // ── Footer ─────────────────────────────────────────────────
  slide.addText(
    `Scenario: ${ctx.scenarioLabel}  |  Values in ${config.currency} '000 unless otherwise noted`,
    {
      x: 0.3, y: 5.15, w: 9.4, h: 0.25,
      fontSize: 7, fontFace: 'Calibri', italic: true, color: '999999',
    },
  );
}
