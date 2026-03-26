// ──────────────────────────────────────────────────────────────
// PowerPoint export orchestrator — Molecule Assessment Report
//
// Generates 6 slides matching the Mabxience BI template:
//   1. Molecule Snapshot       (template slide 3)
//   2. Market Overview          (template slide 4)
//   3. Sales by Geography       (template slide 5)
//   4. Pricing & Market Access  (template slide 9)
//   5. Price vs Cost Evolution  (template slide 10)
//   6. Financial Framework      (template slide 13)
//
// Layout precisely matches Molecule_Assessment_Report.pptx
// (12 191 675 x 6 858 000 EMU = 13.333 x 7.5 inches, 16:9)
// ──────────────────────────────────────────────────────────────

import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import type { ExportContext } from './exportTypes';

import { addMoleculeSnapshotSlide } from './slides/moleculeSnapshotSlide';
import { addMarketOverviewSlide } from './slides/marketOverviewSlide';
import { addSalesByGeographySlide } from './slides/salesByGeographySlide';
import { addPricingMarketAccessSlide } from './slides/pricingMarketAccessSlide';
import { addPriceCostEvolutionSlide } from './slides/priceCostEvolutionSlide';
import { addFinancialFrameworkSlide } from './slides/financialFrameworkSlide';

export async function exportToPowerPoint(ctx: ExportContext): Promise<void> {
  const pptx = new PptxGenJS();

  pptx.author = 'Mabxience Business Intelligence';
  pptx.company = 'Mabxience';
  pptx.subject = 'Molecule Assessment Report';
  pptx.title = `${ctx.config.moleculeName || 'Biosimilar'} — Molecule Assessment Report`;

  // Match template: 12 191 675 x 6 858 000 EMU → 13.333 x 7.5 inches
  pptx.defineLayout({ name: 'TEMPLATE', width: 13.333, height: 7.5 });
  pptx.layout = 'TEMPLATE';

  // Build slides in presentation order
  addMoleculeSnapshotSlide(pptx, ctx);     // Slide 1: Molecule Snapshot
  addMarketOverviewSlide(pptx, ctx);       // Slide 2: Market Overview
  addSalesByGeographySlide(pptx, ctx);     // Slide 3: Sales by Geography
  addPricingMarketAccessSlide(pptx, ctx);  // Slide 4: Pricing & Market Access
  addPriceCostEvolutionSlide(pptx, ctx);   // Slide 5: Price vs Cost Evolution
  addFinancialFrameworkSlide(pptx, ctx);   // Slide 6: Financial Framework

  // Generate and save
  const data = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const name = ctx.config.moleculeName || 'Biosimilar';
  saveAs(blob, `${name} - Molecule Assessment Report.pptx`);
}
