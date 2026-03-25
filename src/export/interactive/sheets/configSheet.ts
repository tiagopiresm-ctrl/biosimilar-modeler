// ──────────────────────────────────────────────────────────────
// Interactive Config Sheet — General settings, timeline, API economics
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { INPUT_FILL } from '../formulaHelpers';
import { formulaValue } from '../formulaHelpers';
import {
  HEADER_FONT, HEADER_FILL, LABEL_FONT, BOLD_VALUE_FONT,
  NUM_FMT,
  styleSectionRow,
} from '../../excelStyles';

export function addInteractiveConfigSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet('Config');
  const { config, countries } = ctx;

  // Column widths
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 20;

  // ── Row 1: Title ──
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'Biosimilar Business Case Model — Configuration';
  titleCell.font = { ...HEADER_FONT, size: 12 };
  titleCell.fill = HEADER_FILL;
  ws.getCell(1, 2).fill = HEADER_FILL;
  ws.getCell(1, 3).fill = HEADER_FILL;

  // Helper: write a label + value input row
  const writeKV = (row: number, label: string, value: string | number, numFmt?: string) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = LABEL_FONT;
    const val = ws.getCell(row, 2);
    val.value = value;
    val.fill = INPUT_FILL;
    if (numFmt) val.numFmt = numFmt;
  };

  // Helper: write a label + formula row
  const writeKF = (row: number, label: string, formula: string, result: number, numFmt?: string) => {
    const lbl = ws.getCell(row, 1);
    lbl.value = label;
    lbl.font = LABEL_FONT;
    const val = ws.getCell(row, 2);
    val.value = formulaValue(formula, result);
    if (numFmt) val.numFmt = numFmt;
    val.font = BOLD_VALUE_FONT;
  };

  // Helper: section header spanning 3 columns
  const section = (row: number, label: string) => {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    styleSectionRow(r, 3);
  };

  // ── Row 3: General Settings ──
  section(3, 'General Settings');

  // Row 4: Molecule Name
  writeKV(4, 'Molecule Name', config.moleculeName);

  // Row 5: Active Scenario
  writeKV(5, 'Active Scenario', config.activeScenario, NUM_FMT.year);
  const scenarioCell = ws.getCell(5, 2);
  scenarioCell.dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"1,2,3"'],
  };
  cellMap.registerScalar('config', 'activeScenario', 'Config', 'B5');

  // C5: label for active scenario
  const scenarioLabelCell = ws.getCell(5, 3);
  scenarioLabelCell.value = formulaValue('CHOOSE(B5,"Worst","Base","Best")', ctx.scenarioLabel);
  scenarioLabelCell.font = BOLD_VALUE_FONT;

  // Row 6: Currency
  writeKV(6, 'Currency', config.currency);

  // Row 7: Scenario Mode
  writeKV(7, 'Scenario Mode', config.scenarioMode);

  // Row 8: blank

  // ── Row 9: Timeline ──
  section(9, 'Timeline');

  // Row 10: Model Start Year
  writeKV(10, 'Model Start Year', config.modelStartYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'modelStartYear', 'Config', 'B10');

  // Row 11: Forecast Start Year
  writeKV(11, 'Forecast Start Year', config.forecastStartYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'forecastStartYear', 'Config', 'B11');

  // Row 12: Forecast End Year
  writeKV(12, 'Forecast End Year', config.forecastEndYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'forecastEndYear', 'Config', 'B12');

  // Row 13: Number of Periods (formula)
  const numPeriods = config.forecastEndYear - config.modelStartYear + 1;
  writeKF(13, 'Number of Periods', 'B12-B10+1', numPeriods, NUM_FMT.integer);

  // Row 14: blank

  // ── Row 15: API Economics ──
  section(15, 'API Economics');

  // Row 16: API Pricing Model
  writeKV(16, 'API Pricing Model', config.apiPricingModel);
  cellMap.registerScalar('config', 'apiPricingModel', 'Config', 'B16');

  // Row 17: COGS Input Method
  writeKV(17, 'COGS Input Method', config.cogsInputMethod ?? 'perGram');
  cellMap.registerScalar('config', 'cogsInputMethod', 'Config', 'B17');

  // Row 18: Units per Gram of API
  writeKV(18, 'Units per Gram of API', config.unitsPerGramOfAPI, NUM_FMT.decimal2);
  cellMap.registerScalar('config', 'unitsPerGram', 'Config', 'B18');

  // Row 19: Manufacturing Overage %
  writeKV(19, 'Manufacturing Overage %', config.manufacturingOverage, NUM_FMT.percent);
  cellMap.registerScalar('config', 'manufacturingOverage', 'Config', 'B19');

  // Row 20: API Cost per Gram
  writeKV(20, 'API Cost per Gram', config.apiCostPerGram, NUM_FMT.decimal2);
  cellMap.registerScalar('config', 'apiCostPerGram', 'Config', 'B20');

  // Row 21: API Cost per Unit
  writeKV(21, 'API Cost per Unit', config.apiCostPerUnit ?? 48, NUM_FMT.decimal2);
  cellMap.registerScalar('config', 'apiCostPerUnit', 'Config', 'B21');

  // Row 22: COGS Inflation Rate %
  writeKV(22, 'COGS Inflation Rate %', config.cogsInflationRate, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsInflation', 'Config', 'B22');

  // Row 23: COGS Overhead %
  writeKV(23, 'COGS Overhead %', config.cogsOverheadPct ?? 0.15, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsOverhead', 'Config', 'B23');

  // Row 24: COGS Markup %
  writeKV(24, 'COGS Markup %', config.cogsMarkupPct ?? 0, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsMarkup', 'Config', 'B24');

  // Row 25: blank

  // ── Row 26: Volume Forecast ──
  section(26, 'Volume Forecast');

  // Row 27: Forecast Method
  writeKV(27, 'Forecast Method', config.volumeForecastMethod);

  // Row 28: Volume Multiplier
  writeKV(28, 'Volume Multiplier', config.volumeMultiplier);

  // Row 29: blank

  // ── Row 30: Countries ──
  section(30, 'Countries');

  // Rows 31+: Country list
  for (let i = 0; i < countries.length; i++) {
    const row = 31 + i;
    const lbl = ws.getCell(row, 1);
    lbl.value = countries[i].name;
    lbl.font = LABEL_FONT;
    const val = ws.getCell(row, 2);
    val.value = countries[i].loeYear;
    val.numFmt = NUM_FMT.year;
    val.fill = INPUT_FILL;
  }

  // Freeze panes: freeze row 1
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}
