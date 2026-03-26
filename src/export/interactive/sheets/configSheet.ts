// ──────────────────────────────────────────────────────────────
// Interactive Config Sheet — General settings, timeline, API economics,
// and 10-slot dynamic countries table
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { INPUT_FILL, INPUT_FONT } from '../formulaHelpers';
import { formulaValue } from '../formulaHelpers';
import {
  HEADER_FONT, HEADER_FILL, LABEL_FONT, BOLD_VALUE_FONT,
  NUM_FMT,
  styleSectionRow, styleHeaderRow,
} from '../../excelStyles';

/** Total number of country slots in the interactive Excel. */
export const MAX_COUNTRY_SLOTS = 10;

/**
 * Fixed row layout for the countries table on the Config sheet.
 * Country table header is at row 39, data rows are 40-49.
 */
export const COUNTRY_TABLE_HEADER_ROW = 39;
export const COUNTRY_TABLE_START_ROW = 40; // first data row (slot 0)

// Column layout for country table (1-based):
// A=Slot#, B=Country Name, C=Currency, D=FX Rate, E=LOE Year, F=Launch Year, G=Active?
export const CCOL_SLOT = 1;
export const CCOL_NAME = 2;
export const CCOL_CURRENCY = 3;
export const CCOL_FX = 4;
export const CCOL_LOE = 5;
export const CCOL_LAUNCH = 6;
export const CCOL_ACTIVE = 7;

/** Get the row for country slot i (0-based). */
export function countrySlotRow(slotIndex: number): number {
  return COUNTRY_TABLE_START_ROW + slotIndex;
}

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
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 12;

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
    val.font = INPUT_FONT;
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

  // Helper: section header spanning columns
  const section = (row: number, label: string, cols: number = 3) => {
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    styleSectionRow(r, cols);
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
  ws.getCell(6, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"€,$,£,¥,CHF"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 7: Scenario Mode
  writeKV(7, 'Scenario Mode', config.scenarioMode);
  ws.getCell(7, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Three Scenario,Base Only"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

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
  ws.getCell(16, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Percentage of Partner Net Price,Fixed Price per Gram"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 17: COGS Input Method
  writeKV(17, 'COGS Input Method', config.cogsInputMethod ?? 'perGram');
  cellMap.registerScalar('config', 'cogsInputMethod', 'Config', 'B17');
  ws.getCell(17, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"perGram,perUnit"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

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
  ws.getCell(27, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Growth % YoY,ATC Market Share %"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 28: Volume Multiplier
  writeKV(28, 'Volume Multiplier', config.volumeMultiplier);
  ws.getCell(28, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"none,thousand,million"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 29: blank

  // ── Row 30: Terminal Value ──
  section(30, 'Terminal Value');

  // Row 31: Terminal Value Enabled
  writeKV(31, 'Terminal Value Enabled', config.terminalValueEnabled ? 'Yes' : 'No');
  cellMap.registerScalar('config', 'terminalValueEnabled', 'Config', 'B31');
  ws.getCell(31, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Yes,No"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 32: Terminal Value Growth Rate
  writeKV(32, 'Terminal Value Growth Rate', config.terminalValueGrowthRate, NUM_FMT.percent);
  cellMap.registerScalar('config', 'terminalValueGrowthRate', 'Config', 'B32');

  // Row 33: blank

  // ── Row 34: Partner & Global ──
  section(34, 'Partner & Global');

  // Row 35: Partner View Enabled
  writeKV(35, 'Partner View Enabled', config.partnerViewEnabled ? 'Yes' : 'No');
  cellMap.registerScalar('config', 'partnerViewEnabled', 'Config', 'B35');
  ws.getCell(35, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Yes,No"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 36: Use Global Country
  writeKV(36, 'Use Global Country', config.useGlobalCountry ? 'Yes' : 'No');
  cellMap.registerScalar('config', 'useGlobalCountry', 'Config', 'B36');
  ws.getCell(36, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Yes,No"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };

  // Row 37: blank

  // ════════════════════════════════════════════════════════════
  // Row 38: Countries Section Header
  // ════════════════════════════════════════════════════════════
  section(38, 'Countries (10 Slots — set Active to Yes to enable)', 7);

  // Row 39: Country table column headers
  {
    const hdr = ws.getRow(COUNTRY_TABLE_HEADER_ROW);
    hdr.getCell(CCOL_SLOT).value = 'Slot';
    hdr.getCell(CCOL_NAME).value = 'Country Name';
    hdr.getCell(CCOL_CURRENCY).value = 'Currency';
    hdr.getCell(CCOL_FX).value = 'FX Rate';
    hdr.getCell(CCOL_LOE).value = 'LOE Year';
    hdr.getCell(CCOL_LAUNCH).value = 'Launch Year';
    hdr.getCell(CCOL_ACTIVE).value = 'Active?';
    styleHeaderRow(hdr, 7);
  }

  // Rows 40-49: 10 country slots
  for (let s = 0; s < MAX_COUNTRY_SLOTS; s++) {
    const r = countrySlotRow(s);
    const country = s < countries.length ? countries[s] : null;
    const isActive = country !== null;

    // Slot number (read-only)
    const slotCell = ws.getCell(r, CCOL_SLOT);
    slotCell.value = s + 1;
    slotCell.font = LABEL_FONT;

    // Country Name (editable)
    const nameCell = ws.getCell(r, CCOL_NAME);
    nameCell.value = country?.name ?? '';
    nameCell.fill = INPUT_FILL;
    nameCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryName_${s}`, 'Config', `B${r}`);

    // Currency (editable)
    const currCell = ws.getCell(r, CCOL_CURRENCY);
    currCell.value = country?.localCurrency ?? '';
    currCell.fill = INPUT_FILL;
    currCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryCurrency_${s}`, 'Config', `C${r}`);

    // FX Rate (editable — this is the "anchor" FX rate for this slot)
    const fxCell = ws.getCell(r, CCOL_FX);
    fxCell.value = country ? (country.fxRate[0] ?? 1) : 1;
    fxCell.numFmt = NUM_FMT.decimal2;
    fxCell.fill = INPUT_FILL;
    fxCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryFX_${s}`, 'Config', `D${r}`);

    // LOE Year (editable)
    const loeCell = ws.getCell(r, CCOL_LOE);
    loeCell.value = country?.loeYear ?? (config.modelStartYear + 5);
    loeCell.numFmt = NUM_FMT.year;
    loeCell.fill = INPUT_FILL;
    loeCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryLOE_${s}`, 'Config', `E${r}`);

    // Launch Year (editable)
    const launchCell = ws.getCell(r, CCOL_LAUNCH);
    launchCell.value = country
      ? (config.modelStartYear + country.biosimilarLaunchPeriodIndex)
      : (config.modelStartYear + 5);
    launchCell.numFmt = NUM_FMT.year;
    launchCell.fill = INPUT_FILL;
    launchCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryLaunch_${s}`, 'Config', `F${r}`);

    // Active? (dropdown Yes/No)
    const activeCell = ws.getCell(r, CCOL_ACTIVE);
    activeCell.value = isActive ? 'Yes' : 'No';
    activeCell.fill = INPUT_FILL;
    activeCell.font = INPUT_FONT;
    activeCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Yes,No"'],
      showErrorMessage: true,
      errorTitle: 'Invalid',
      error: 'Please select Yes or No',
    };
    cellMap.registerScalar('config', `countryActive_${s}`, 'Config', `G${r}`);
  }

  // Freeze panes: freeze row 1
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}
