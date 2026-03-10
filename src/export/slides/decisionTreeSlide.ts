// Decision Tree Summary slide

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

export function addDecisionTreeSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { decisionTree, dtOutputs, npvOutputs, config } = ctx;

  // Title bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('Decision Tree Analysis', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  if (decisionTree.length === 0) {
    slide.addText('No decision gates defined', {
      x: 1, y: 2, w: 8, h: 1,
      fontSize: 14, fontFace: 'Calibri', color: '808080', align: 'center',
    });
    return;
  }

  // Gates table
  const hdrOpts = { bold: true, fontSize: 9, fill: { color: '1F3864' }, color: 'FFFFFF', fontFace: 'Calibri' };
  const cellOpts = { fontSize: 9, fontFace: 'Calibri' };

  const header = [
    { text: 'Gate', options: hdrOpts },
    { text: 'Probability', options: { ...hdrOpts, align: 'center' as const } },
    { text: 'Description', options: hdrOpts },
  ];

  const tableRows: object[][] = [header];
  for (const gate of decisionTree) {
    tableRows.push([
      { text: gate.name, options: { ...cellOpts, bold: true } },
      { text: formatPercent(gate.probability), options: { ...cellOpts, align: 'center' } },
      { text: gate.description, options: cellOpts },
    ]);
  }

  slide.addTable(tableRows, {
    x: 0.5, y: 1.0, w: 9.0,
    border: { type: 'solid', pt: 0.5, color: 'D9D9D9' },
    colW: [2.0, 1.2, 5.8],
    rowH: tableRows.map(() => 0.32),
    autoPage: false,
  });

  // Summary KPIs below the table
  const kpiY = 1.2 + tableRows.length * 0.32 + 0.5;

  const kpis = [
    { label: 'Cumulative PoS', value: formatPercent(dtOutputs.cumulativePoS) },
    { label: 'NPV', value: formatCurrency(npvOutputs.npv, config.currency) },
    { label: 'rNPV', value: formatCurrency(npvOutputs.rnpv, config.currency) },
    { label: 'ENPV', value: formatCurrency(dtOutputs.enpv, config.currency) },
  ];

  kpis.forEach((kpi, i) => {
    const x = 0.8 + i * 2.3;

    slide.addShape('roundRect', {
      x, y: kpiY, w: 2.0, h: 0.9,
      fill: { color: 'F2F2F2' },
      rectRadius: 0.05,
      line: { color: 'D9D9D9', width: 0.5 },
    });

    slide.addText(kpi.label, {
      x, y: kpiY + 0.1, w: 2.0, h: 0.25,
      fontSize: 8, fontFace: 'Calibri', color: '808080', align: 'center',
    });

    slide.addText(kpi.value, {
      x, y: kpiY + 0.35, w: 2.0, h: 0.4,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: '1F3864', align: 'center',
    });
  });
}
