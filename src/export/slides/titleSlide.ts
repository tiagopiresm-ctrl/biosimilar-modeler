// Title slide — molecule name, date, scenario

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';

export function addTitleSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();

  // Dark blue background bar at top
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 1.8,
    fill: { color: '1F3864' },
  });

  // Title
  slide.addText(ctx.config.moleculeName || 'Biosimilar Business Case', {
    x: 0.8, y: 0.4, w: 8.4, h: 0.8,
    fontSize: 28,
    fontFace: 'Calibri',
    bold: true,
    color: 'FFFFFF',
  });

  // Subtitle
  slide.addText('Business Case Model', {
    x: 0.8, y: 1.1, w: 8.4, h: 0.5,
    fontSize: 16,
    fontFace: 'Calibri',
    color: 'B4C7E7',
  });

  // Date and scenario
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  slide.addText(`Scenario: ${ctx.scenarioLabel}  |  ${today}`, {
    x: 0.8, y: 2.5, w: 8.4, h: 0.5,
    fontSize: 12,
    fontFace: 'Calibri',
    color: '404040',
  });

  // Currency & countries info
  slide.addText(
    `Currency: ${ctx.config.currency}  |  ${ctx.countries.length} countries  |  ${ctx.periodConfig.startYear}–${ctx.periodConfig.endYear}`,
    {
      x: 0.8, y: 3.2, w: 8.4, h: 0.4,
      fontSize: 11,
      fontFace: 'Calibri',
      color: '808080',
    },
  );
}
