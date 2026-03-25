// Config Summary sheet — key model parameters

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../exportTypes';
import {
  HEADER_FILL, HEADER_FONT, SECTION_FILL, SECTION_FONT,
  LABEL_FONT, VALUE_FONT, THIN_BORDER, NUM_FMT,
} from '../excelStyles';
import { VOLUME_MULTIPLIER_LABELS, API_PRICING_MODEL_LABELS, VOLUME_FORECAST_METHOD_LABELS, SCENARIO_MODE_LABELS, COGS_INPUT_METHOD_LABELS } from '../../types';
import { formatPercent } from '../../calculations';

export function addConfigSheet(wb: Workbook, ctx: ExportContext): void {
  const ws = wb.addWorksheet('Configuration');
  const { config, countries, periodConfig } = ctx;

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 35;

  // Title
  const titleRow = ws.addRow(['Configuration Summary', '']);
  titleRow.font = HEADER_FONT;
  titleRow.fill = HEADER_FILL;
  titleRow.getCell(1).border = { bottom: THIN_BORDER };
  titleRow.getCell(2).border = { bottom: THIN_BORDER };

  ws.addRow([]);

  // General
  const secRow = ws.addRow(['General', '']);
  secRow.font = SECTION_FONT;
  secRow.fill = SECTION_FILL;

  const rows: [string, string | number][] = [
    ['Molecule Name', config.moleculeName || '(unnamed)'],
    ['Model Currency', config.currency],
    ['Scenario Mode', SCENARIO_MODE_LABELS[config.scenarioMode]],
    ['Active Scenario', ctx.scenarioLabel],
    ['Volume Unit', VOLUME_MULTIPLIER_LABELS[config.volumeMultiplier]],
    ['Forecast Method', VOLUME_FORECAST_METHOD_LABELS[config.volumeForecastMethod]],
    ['Number of Countries', countries.length],
  ];

  for (const [label, value] of rows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = VALUE_FONT;
  }

  ws.addRow([]);

  // Timeline
  const timeRow = ws.addRow(['Timeline', '']);
  timeRow.font = SECTION_FONT;
  timeRow.fill = SECTION_FILL;

  const timeRows: [string, string | number][] = [
    ['Model Start Year', config.modelStartYear],
    ['Forecast Start Year', config.forecastStartYear],
    ['Forecast End Year', config.forecastEndYear],
    ['Number of Periods', periodConfig.numPeriods],
  ];

  for (const [label, value] of timeRows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = VALUE_FONT;
    r.getCell(2).numFmt = NUM_FMT.year;
  }

  ws.addRow([]);

  // API Economics
  const apiRow = ws.addRow(['API Economics', '']);
  apiRow.font = SECTION_FONT;
  apiRow.fill = SECTION_FILL;

  const apiRows: [string, string | number][] = [
    ['API Pricing Model', API_PRICING_MODEL_LABELS[config.apiPricingModel]],
    ['COGS Input Method', COGS_INPUT_METHOD_LABELS[config.cogsInputMethod ?? 'perGram']],
    ['Units per Gram of API', config.unitsPerGramOfAPI],
    ['Manufacturing Overage', formatPercent(config.manufacturingOverage)],
    ['API Cost per Gram', `${config.currency} ${config.apiCostPerGram}`],
    ['API Cost per Unit', `${config.currency} ${config.apiCostPerUnit ?? 48}`],
    ['COGS Inflation Rate', formatPercent(config.cogsInflationRate)],
    ['COGS Overhead', formatPercent(config.cogsOverheadPct ?? 0)],
    ['COGS Markup', formatPercent(config.cogsMarkupPct ?? 0)],
  ];

  for (const [label, value] of apiRows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = VALUE_FONT;
  }

  ws.addRow([]);

  // Countries list
  const cRow = ws.addRow(['Countries', '']);
  cRow.font = SECTION_FONT;
  cRow.fill = SECTION_FILL;

  for (const c of countries) {
    const r = ws.addRow([c.name, `LOE ${c.loeYear} | ${c.localCurrency}`]);
    r.getCell(1).font = LABEL_FONT;
    r.getCell(2).font = VALUE_FONT;
  }
}
