// WACC Summary slide

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatPercent } from '../../calculations';
import { SCENARIO_LABELS } from '../../types';

export function addWACCSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { waccInputs, waccOutputs } = ctx;

  // Title bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('WACC Summary', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // Table
  const hdrOpts = { bold: true, fontSize: 9, fill: { color: '1F3864' }, color: 'FFFFFF', fontFace: 'Calibri' };

  const header = [
    { text: '', options: hdrOpts },
    { text: SCENARIO_LABELS[1], options: { ...hdrOpts, align: 'center' as const } },
    { text: SCENARIO_LABELS[2], options: { ...hdrOpts, align: 'center' as const } },
    { text: SCENARIO_LABELS[3], options: { ...hdrOpts, align: 'center' as const } },
  ];

  const cellOpts = { fontSize: 9, fontFace: 'Calibri', align: 'center' as const };
  const labelOpts = { fontSize: 9, fontFace: 'Calibri' };
  const boldOpts = { ...cellOpts, bold: true };

  const pctRow = (label: string, vals: [number, number, number], bold = false) => [
    { text: label, options: bold ? { ...labelOpts, bold: true } : labelOpts },
    { text: formatPercent(vals[0]), options: bold ? boldOpts : cellOpts },
    { text: formatPercent(vals[1]), options: bold ? boldOpts : cellOpts },
    { text: formatPercent(vals[2]), options: bold ? boldOpts : cellOpts },
  ];

  const numRow = (label: string, vals: [number, number, number]) => [
    { text: label, options: labelOpts },
    { text: vals[0].toFixed(2), options: cellOpts },
    { text: vals[1].toFixed(2), options: cellOpts },
    { text: vals[2].toFixed(2), options: cellOpts },
  ];

  const debtWeight: [number, number, number] = [
    1 - waccInputs.equityPct[0],
    1 - waccInputs.equityPct[1],
    1 - waccInputs.equityPct[2],
  ];

  const tableRows = [
    header,
    pctRow('Risk-Free Rate', waccInputs.riskFreeRate),
    pctRow('Equity Risk Premium', waccInputs.equityRiskPremium),
    numRow('Beta', waccInputs.beta),
    pctRow('Cost of Equity (Ke)', waccOutputs.costOfEquity, true),
    [{ text: '', options: labelOpts }, { text: '', options: cellOpts }, { text: '', options: cellOpts }, { text: '', options: cellOpts }],
    pctRow('Pre-Tax Cost of Debt', waccInputs.preTaxCostOfDebt),
    pctRow('Tax Rate', waccInputs.taxRate),
    pctRow('After-Tax Cost of Debt (Kd)', waccOutputs.afterTaxCostOfDebt, true),
    [{ text: '', options: labelOpts }, { text: '', options: cellOpts }, { text: '', options: cellOpts }, { text: '', options: cellOpts }],
    pctRow('Equity Weight', waccInputs.equityPct),
    pctRow('Debt Weight', debtWeight),
    pctRow('WACC', waccOutputs.wacc, true),
  ];

  slide.addTable(tableRows, {
    x: 1.0, y: 1.0, w: 8.0,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [2.8, 1.6, 1.6, 1.6],
    rowH: tableRows.map(() => 0.3),
    autoPage: false,
  });

  // Active WACC highlight
  slide.addText(`Active WACC (${ctx.scenarioLabel}): ${formatPercent(waccOutputs.activeWACC)}`, {
    x: 1.0, y: 4.5, w: 8.0, h: 0.4,
    fontSize: 14, fontFace: 'Calibri', bold: true, color: '1F3864',
    align: 'center',
  });
}
