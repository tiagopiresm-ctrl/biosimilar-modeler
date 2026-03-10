// PowerPoint export orchestrator

import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import type { ExportContext } from './exportTypes';
import { addTitleSlide } from './slides/titleSlide';
import { addExecutiveSummarySlide } from './slides/executiveSummary';
import { addPLSummarySlide } from './slides/plSummary';
import { addMarketOverviewSlide } from './slides/marketOverview';
import { addNPVSlide } from './slides/npvSlide';
import { addWACCSlide } from './slides/waccSlide';
import { addDecisionTreeSlide } from './slides/decisionTreeSlide';

export async function exportToPowerPoint(ctx: ExportContext): Promise<void> {
  const pptx = new PptxGenJS();

  pptx.author = 'Biosimilar BC Model';
  pptx.company = ctx.config.moleculeName || 'Biosimilar Model';
  pptx.subject = 'Business Case Analysis';
  pptx.title = `${ctx.config.moleculeName || 'Biosimilar'} — Business Case`;

  // Default slide size: 10×5.63 (widescreen 16:9)
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.63 });
  pptx.layout = 'WIDE';

  // Build slides
  addTitleSlide(pptx, ctx);
  addExecutiveSummarySlide(pptx, ctx);
  addPLSummarySlide(pptx, ctx);
  addMarketOverviewSlide(pptx, ctx);
  addNPVSlide(pptx, ctx);
  addWACCSlide(pptx, ctx);
  addDecisionTreeSlide(pptx, ctx);

  // Generate and save
  const data = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const name = ctx.config.moleculeName || 'Biosimilar Model';
  saveAs(blob, `${name} - Business Case.pptx`);
}
