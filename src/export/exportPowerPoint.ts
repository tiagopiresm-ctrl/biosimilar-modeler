// PowerPoint export orchestrator

import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import type { ExportContext } from './exportTypes';
import { addTitleSlide } from './slides/titleSlide';
import { addExecutiveSummarySlide } from './slides/executiveSummary';
import { addMarketOverviewSlide } from './slides/marketOverview';
import { addCountryRevenueSlide } from './slides/countryRevenueSlide';
import { addPLSummarySlide } from './slides/plSummary';
import { addPLCostAssumptionsSlide } from './slides/plCostAssumptionsSlide';
import { addNPVSlide } from './slides/npvSlide';
import { addDecisionTreeSlide } from './slides/decisionTreeSlide';
import { addPartnerViewSlide } from './slides/partnerViewSlide';

export async function exportToPowerPoint(ctx: ExportContext): Promise<void> {
  const pptx = new PptxGenJS();

  pptx.author = 'Biosimilar BC Model';
  pptx.company = ctx.config.moleculeName || 'Biosimilar Model';
  pptx.subject = 'Business Case Analysis';
  pptx.title = `${ctx.config.moleculeName || 'Biosimilar'} — Business Case`;

  // Default slide size: 10x5.63 (widescreen 16:9)
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.63 });
  pptx.layout = 'WIDE';

  // Build slides in presentation order
  addTitleSlide(pptx, ctx);              // Slide 1: Title
  addExecutiveSummarySlide(pptx, ctx);   // Slide 2: Executive Summary
  addMarketOverviewSlide(pptx, ctx);     // Slide 3: Market Assumptions by Country
  addCountryRevenueSlide(pptx, ctx);     // Slide 4: Country Revenue Waterfall
  addPLSummarySlide(pptx, ctx);          // Slide 5: P&L Summary
  addPLCostAssumptionsSlide(pptx, ctx);  // Slide 6: P&L Cost Assumptions
  addNPVSlide(pptx, ctx);               // Slide 7: Cash Flow & NPV
  addDecisionTreeSlide(pptx, ctx);       // Slide 8: Decision Tree (conditional)
  addPartnerViewSlide(pptx, ctx);        // Slide 9: Partner View (conditional)

  // Generate and save
  const data = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const name = ctx.config.moleculeName || 'Biosimilar Model';
  saveAs(blob, `${name} - Business Case.pptx`);
}
