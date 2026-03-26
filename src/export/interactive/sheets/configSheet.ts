// ──────────────────────────────────────────────────────────────
// Interactive Config Sheet — Clean standalone financial model
// ──────────────────────────────────────────────────────────────
// Simple key-value pairs + active-only country table.
// No scenario switching — exports the active scenario's values.
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

/** We only export active countries — this tracks how many slots we wrote. */
export let ACTIVE_COUNTRY_COUNT = 0;

/**
 * Country table header row.
 * Country data rows start at COUNTRY_TABLE_START_ROW.
 */
export const COUNTRY_TABLE_HEADER_ROW = 30;
export const COUNTRY_TABLE_START_ROW = 31; // first data row

// Column layout for country table (1-based):
// A=Country Name, B=Currency, C=FX Rate, D=LOE Year, E=Launch Year, F=Active
export const CCOL_NAME = 1;
export const CCOL_CURRENCY = 2;
export const CCOL_FX = 3;
export const CCOL_LOE = 4;
export const CCOL_LAUNCH = 5;
export const CCOL_ACTIVE = 6;

/** Get the row for active country index i (0-based). */
export function countrySlotRow(activeIndex: number): number {
  return COUNTRY_TABLE_START_ROW + activeIndex;
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
  ws.getColumn(6).width = 12;

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

  // Row 5: Currency
  writeKV(5, 'Currency', config.currency);
  ws.getCell(5, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"€,$,£,¥,CHF"'],
  };

  // Row 6: Model Start Year
  writeKV(6, 'Model Start Year', config.modelStartYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'modelStartYear', 'Config', 'B6');

  // Row 7: Forecast Start Year
  writeKV(7, 'Forecast Start Year', config.forecastStartYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'forecastStartYear', 'Config', 'B7');

  // Row 8: Forecast End Year
  writeKV(8, 'Forecast End Year', config.forecastEndYear, NUM_FMT.year);
  cellMap.registerScalar('config', 'forecastEndYear', 'Config', 'B8');

  // Row 9: Number of Periods (formula)
  const numPeriods = config.forecastEndYear - config.modelStartYear + 1;
  writeKF(9, 'Number of Periods', 'B8-B6+1', numPeriods, NUM_FMT.integer);

  // Row 10: blank

  // ── Row 11: Financial Parameters ──
  section(11, 'Financial Parameters');

  // Row 12: WACC
  writeKV(12, 'WACC', ctx.waccOutputs.activeWACC, NUM_FMT.percent);
  cellMap.registerScalar('config', 'wacc', 'Config', 'B12');

  // Row 13: Tax Rate (use active scenario tax rate from plAssumptions, first period)
  const activeTaxRate = ctx.plAssumptions.taxRate[
    config.activeScenario === 1 ? 'bear' : config.activeScenario === 3 ? 'bull' : 'base'
  ][0] ?? 0;
  writeKV(13, 'Tax Rate', activeTaxRate, NUM_FMT.percent);
  cellMap.registerScalar('config', 'taxRate', 'Config', 'B13');

  // Row 14: blank

  // ── Row 15: COGS Parameters ──
  section(15, 'COGS Parameters');

  // Row 16: API Cost per Unit (effective, regardless of gram/unit mode)
  const effectiveApiCostPerUnit = (config.cogsInputMethod ?? 'perGram') === 'perGram'
    ? (config.apiCostPerGram / (config.unitsPerGramOfAPI || 1))
    : (config.apiCostPerUnit ?? 48);
  writeKV(16, 'API Cost per Unit (€/unit)', effectiveApiCostPerUnit, NUM_FMT.decimal2);
  cellMap.registerScalar('config', 'apiCostPerUnit', 'Config', 'B16');

  // Row 17: COGS Inflation Rate
  writeKV(17, 'COGS Inflation Rate %', config.cogsInflationRate, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsInflation', 'Config', 'B17');

  // Row 18: COGS Overhead
  writeKV(18, 'COGS Overhead %', config.cogsOverheadPct ?? 0.15, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsOverhead', 'Config', 'B18');

  // Row 19: COGS Markup
  writeKV(19, 'COGS Markup %', config.cogsMarkupPct ?? 0, NUM_FMT.percent);
  cellMap.registerScalar('config', 'cogsMarkup', 'Config', 'B19');

  // Row 20: blank

  // ── Row 21: Working Capital ──
  section(21, 'Working Capital');

  writeKV(22, 'Receivable Days', ctx.fcfBridge.receivableDays, NUM_FMT.integer);
  cellMap.registerScalar('config', 'receivableDays', 'Config', 'B22');

  writeKV(23, 'Payable Days', ctx.fcfBridge.payableDays, NUM_FMT.integer);
  cellMap.registerScalar('config', 'payableDays', 'Config', 'B23');

  writeKV(24, 'Inventory Days', ctx.fcfBridge.inventoryDays, NUM_FMT.integer);
  cellMap.registerScalar('config', 'inventoryDays', 'Config', 'B24');

  // Row 25: blank

  // ── Row 26: Terminal Value ──
  section(26, 'Terminal Value');

  writeKV(27, 'Terminal Value Enabled', config.terminalValueEnabled ? 'Yes' : 'No');
  cellMap.registerScalar('config', 'terminalValueEnabled', 'Config', 'B27');
  ws.getCell(27, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Yes,No"'],
  };

  writeKV(28, 'Terminal Value Growth Rate', config.terminalValueGrowthRate, NUM_FMT.percent);
  cellMap.registerScalar('config', 'terminalValueGrowthRate', 'Config', 'B28');

  // ════════════════════════════════════════════════════════════
  // Countries Table — only active countries
  // ════════════════════════════════════════════════════════════
  section(COUNTRY_TABLE_HEADER_ROW - 1, 'Countries (Active)', 6);

  // Header row
  {
    const hdr = ws.getRow(COUNTRY_TABLE_HEADER_ROW);
    hdr.getCell(CCOL_NAME).value = 'Country Name';
    hdr.getCell(CCOL_CURRENCY).value = 'Currency';
    hdr.getCell(CCOL_FX).value = 'FX Rate';
    hdr.getCell(CCOL_LOE).value = 'LOE Year';
    hdr.getCell(CCOL_LAUNCH).value = 'Launch Year';
    hdr.getCell(CCOL_ACTIVE).value = 'Active?';
    styleHeaderRow(hdr, 6);
  }

  // Write only active countries
  ACTIVE_COUNTRY_COUNT = countries.length;
  for (let s = 0; s < countries.length; s++) {
    const r = countrySlotRow(s);
    const country = countries[s];

    // Country Name
    const nameCell = ws.getCell(r, CCOL_NAME);
    nameCell.value = country.name;
    nameCell.fill = INPUT_FILL;
    nameCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryName_${s}`, 'Config', `A${r}`);

    // Currency
    const currCell = ws.getCell(r, CCOL_CURRENCY);
    currCell.value = country.localCurrency;
    currCell.fill = INPUT_FILL;
    currCell.font = INPUT_FONT;

    // FX Rate (anchor — first period rate)
    const fxCell = ws.getCell(r, CCOL_FX);
    fxCell.value = country.fxRate[0] ?? 1;
    fxCell.numFmt = NUM_FMT.decimal2;
    fxCell.fill = INPUT_FILL;
    fxCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryFX_${s}`, 'Config', `C${r}`);

    // LOE Year
    const loeCell = ws.getCell(r, CCOL_LOE);
    loeCell.value = country.loeYear;
    loeCell.numFmt = NUM_FMT.year;
    loeCell.fill = INPUT_FILL;
    loeCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryLOE_${s}`, 'Config', `D${r}`);

    // Launch Year
    const launchCell = ws.getCell(r, CCOL_LAUNCH);
    launchCell.value = config.modelStartYear + country.biosimilarLaunchPeriodIndex;
    launchCell.numFmt = NUM_FMT.year;
    launchCell.fill = INPUT_FILL;
    launchCell.font = INPUT_FONT;
    cellMap.registerScalar('config', `countryLaunch_${s}`, 'Config', `E${r}`);

    // Active? (always Yes for exported countries)
    const activeCell = ws.getCell(r, CCOL_ACTIVE);
    activeCell.value = 'Yes';
    activeCell.fill = INPUT_FILL;
    activeCell.font = INPUT_FONT;
    activeCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Yes,No"'],
    };
    cellMap.registerScalar('config', `countryActive_${s}`, 'Config', `F${r}`);
  }

  // Freeze panes: freeze row 1
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}
