// NPV & Valuation slide

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';
import { formatCurrency, formatPercent } from '../../calculations';

export function addNPVSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { npvOutputs, config } = ctx;

  // Title bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '1F3864' } });
  slide.addText('NPV & Valuation', {
    x: 0.5, y: 0.1, w: 9, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // KPI pairs in two columns
  const leftKpis = [
    ['NPV', formatCurrency(npvOutputs.npv, config.currency)],
    ['rNPV', formatCurrency(npvOutputs.rnpv, config.currency)],
    ['IRR', npvOutputs.irr != null ? formatPercent(npvOutputs.irr) : 'N/A'],
    ['rIRR', npvOutputs.rirr != null ? formatPercent(npvOutputs.rirr) : 'N/A'],
  ];

  const rightKpis = [
    ['Payback (Undiscounted)', npvOutputs.paybackUndiscounted != null ? String(npvOutputs.paybackUndiscounted) : 'N/A'],
    ['Payback (Discounted)', npvOutputs.paybackDiscounted != null ? String(npvOutputs.paybackDiscounted) : 'N/A'],
    ['Break-Even Year', npvOutputs.breakEvenYear != null ? String(npvOutputs.breakEvenYear) : 'N/A'],
    ['Money at Risk', formatCurrency(npvOutputs.moneyAtRisk, config.currency)],
  ];

  const renderColumn = (kpis: string[][], startX: number) => {
    kpis.forEach(([label, value], i) => {
      const y = 1.2 + i * 0.7;

      slide.addText(label, {
        x: startX, y, w: 3.5, h: 0.25,
        fontSize: 10, fontFace: 'Calibri', color: '808080',
      });

      slide.addText(value, {
        x: startX, y: y + 0.25, w: 3.5, h: 0.35,
        fontSize: 18, fontFace: 'Calibri', bold: true, color: '1F3864',
      });
    });
  };

  renderColumn(leftKpis, 0.8);
  renderColumn(rightKpis, 5.2);

  // Peak metrics at bottom
  slide.addShape('rect', { x: 0.5, y: 4.1, w: 9, h: 0.02, fill: { color: 'D9D9D9' } });

  slide.addText(
    `Peak EBIT: ${formatCurrency(npvOutputs.peakEbitValue, config.currency)}` +
    (npvOutputs.peakEbitYear ? ` (${npvOutputs.peakEbitYear})` : '') +
    `  |  Funding Need: ${formatCurrency(npvOutputs.fundingNeed, config.currency)}`,
    {
      x: 0.5, y: 4.3, w: 9, h: 0.3,
      fontSize: 9, fontFace: 'Calibri', color: '808080',
    },
  );
}
