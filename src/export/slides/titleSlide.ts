// Slide 1: Title — molecule name, date, scenario, company

import type PptxGenJS from 'pptxgenjs';
import type { ExportContext } from '../exportTypes';

export function addTitleSlide(pptx: PptxGenJS, ctx: ExportContext): void {
  const slide = pptx.addSlide();
  const { config, scenarioLabel, periodConfig, countries } = ctx;
  const name = config.moleculeName || 'Biosimilar Business Case';

  // Full-slide dark blue background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: '1F4E79' },
  });

  // Thin accent bar at top
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: '2E75B6' },
  });

  // Molecule name
  slide.addText(name, {
    x: 0.8, y: 1.2, w: 8.4, h: 0.9,
    fontSize: 32, fontFace: 'Calibri', bold: true, color: 'FFFFFF',
  });

  // Subtitle
  slide.addText('Business Case Analysis', {
    x: 0.8, y: 2.0, w: 8.4, h: 0.5,
    fontSize: 18, fontFace: 'Calibri', color: 'B4C7E7',
  });

  // Divider line
  slide.addShape('rect', {
    x: 0.8, y: 2.7, w: 3.5, h: 0.03,
    fill: { color: '2E75B6' },
  });

  // Date
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  slide.addText(today, {
    x: 0.8, y: 3.0, w: 8.4, h: 0.4,
    fontSize: 14, fontFace: 'Calibri', color: 'FFFFFF',
  });

  // Scenario + metadata
  slide.addText(
    `Scenario: ${scenarioLabel}  |  ${config.currency}  |  ${countries.length} countries  |  ${periodConfig.startYear}\u2013${periodConfig.endYear}`,
    {
      x: 0.8, y: 3.5, w: 8.4, h: 0.4,
      fontSize: 11, fontFace: 'Calibri', color: '9DB2D6',
    },
  );

  // Footer — company / confidential
  slide.addText('Confidential \u2014 For Internal Use Only', {
    x: 0.8, y: 5.0, w: 8.4, h: 0.3,
    fontSize: 8, fontFace: 'Calibri', italic: true, color: '6B8AB8',
  });
}
