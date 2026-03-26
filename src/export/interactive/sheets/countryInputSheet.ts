// ──────────────────────────────────────────────────────────────
// Interactive Excel — Per-country INPUT sheet builder (10 slots)
// ──────────────────────────────────────────────────────────────
// Creates 10 input sheets ("C1 Input" ... "C10 Input") regardless
// of how many countries exist. Slots beyond actual countries are
// filled with zeros but keep the same structure.
// The countryModelSheet wraps every formula in
//   IF(Config!ActiveRef="Yes", formula, 0)
// so inactive country slots produce zeros everywhere.
// ──────────────────────────────────────────────────────────────

import type { Workbook, Worksheet } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { CountryAssumptions, ScenarioRow } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  INPUT_FILL, INPUT_FONT, OUTPUT_FILL,
  cellAddr, periodCol,

  writeScenarioBlock, writeBaseOnlyBlock, writeInputRow, writeSection,
  setupSheet, writePeriodHeader, writeColorLegend,
  formulaValue,
} from '../formulaHelpers';
import { LABEL_FONT, BOLD_VALUE_FONT } from '../../excelStyles';
import { MAX_COUNTRY_SLOTS } from './configSheet';

// ── Constants ──

const ACTIVE_SCENARIO_REF = 'Config!B5';

/** Sheet name for country input slot (0-based). */
export function countryInputSheetName(slotIndex: number): string {
  return `C${slotIndex + 1} Input`;
}

// ── Helpers ──

/** Create an empty ScenarioRow filled with zeros. */
function emptyScenarioRow(NP: number): ScenarioRow {
  const z = Array(NP).fill(0);
  return { bear: [...z], base: [...z], bull: [...z] };
}

/** Write a static label + scalar value in column B, register as scalar in cellMap. */
function writeScalarRow(
  ws: Worksheet,
  row: number,
  label: string,
  value: string | number,
  cellMap: CellMap,
  sheetKey: string,
  fieldName: string,
  numFmt?: string,
): void {
  const labelCell = ws.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = LABEL_FONT;

  const valCell = ws.getCell(row, 2);
  valCell.value = value;
  valCell.fill = INPUT_FILL;
  valCell.font = INPUT_FONT;
  if (numFmt) valCell.numFmt = numFmt;

  cellMap.registerScalar(sheetKey, fieldName, ws.name, cellAddr(row, 2));
}

// ── Main builder for a single country slot ──

function buildCountryInputSheet(
  wb: Workbook,
  slotIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const sheetKey = `country_${slotIndex}`;
  const sheetName = countryInputSheetName(slotIndex);
  const ws = wb.addWorksheet(sheetName);

  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;
  const activeIdx = ctx.config.activeScenario - 1; // 0-based
  const isBaseOnly = ctx.config.scenarioMode === 'base_only';

  // Actual country data (null if this is an empty slot)
  const country: CountryAssumptions | null =
    slotIndex < ctx.countries.length ? ctx.countries[slotIndex] : null;

  // Zero arrays for empty slots
  const zeroArr = Array(NP).fill(0);
  const zeroScenario = emptyScenarioRow(NP);

  // Conditional scenario writer — uses single row in base-only mode
  const sb: typeof writeScenarioBlock = (...args) =>
    isBaseOnly
      ? writeBaseOnlyBlock(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[10])
      : writeScenarioBlock(...args);

  setupSheet(ws, NP);

  writePeriodHeader(ws, ctx.periodLabels);
  writeColorLegend(ws, 2);

  let row = 4;

  // ═══════════════════════════════════════════════════════════
  // Row 4: Title — shows country name or "INACTIVE"
  // ═══════════════════════════════════════════════════════════
  {
    const activeRef = cellMap.getScalar('config', `countryActive_${slotIndex}`).toFormula();
    const nameRef = cellMap.getScalar('config', `countryName_${slotIndex}`).toFormula();
    const titleCell = ws.getCell(row, 1);
    titleCell.value = formulaValue(
      `IF(${activeRef}="Yes",${nameRef},"INACTIVE")`,
      country?.name ?? 'INACTIVE',
    );
    titleCell.font = { ...BOLD_VALUE_FONT, size: 12 };
  }
  row++;

  // blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Country Settings
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Country Settings', colCount);
  row++;

  // Biosimilar Launch Period (scalar input — computed from Config launch year)
  {
    const launchRef = cellMap.getScalar('config', `countryLaunch_${slotIndex}`).toFormula();
    const startRef = cellMap.getScalar('config', 'modelStartYear').toFormula();
    const labelCell = ws.getCell(row, 1);
    labelCell.value = 'Biosimilar Launch Period Index';
    labelCell.font = LABEL_FONT;
    const valCell = ws.getCell(row, 2);
    valCell.value = formulaValue(
      `${launchRef}-${startRef}`,
      country?.biosimilarLaunchPeriodIndex ?? 5,
    );
    valCell.font = BOLD_VALUE_FONT;
    cellMap.registerScalar(sheetKey, 'biosimLaunchIdx', ws.name, cellAddr(row, 2));
  }
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: FX Rates
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'FX Rates', colCount);
  row++;

  writeInputRow(ws, row, `FX Rate (local/${ctx.config.currency})`,
    country?.fxRate ?? zeroArr.map(() => 1), NP, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Market Volume
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Market Volume', colCount);
  row++;

  // Market Volume: historical periods are editable inputs; forecast periods
  // show cached values with output styling (computed in Model sheet from growth rates).
  {
    const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;
    const mvLabel = ws.getCell(row, 1);
    mvLabel.value = 'Market Volume';
    mvLabel.font = LABEL_FONT;
    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);
      cell.value = country?.marketVolume[p] ?? 0;
      cell.numFmt = NUM_FMT.integer;
      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        // Historical: editable input
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        // Forecast: display value only (Model sheet is authoritative)
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'marketVolume', p, ws.name, cellAddr(row, col));
    }
  }
  row++;

  // Volume Adjustment % (scenario block)
  const volAdj = sb(
    ws, row, 'Volume Adjustment %', country?.volumeAdjustment ?? zeroScenario,
    NP, cellMap, sheetKey, 'volumeAdjustment',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = volAdj.nextRow;

  // ATC-based volume forecasting (conditional)
  if (ctx.config.volumeForecastMethod === 'atcShare') {
    writeInputRow(ws, row, 'ATC Class Volume', country?.atcClassVolume ?? zeroArr, NP, cellMap, sheetKey, 'atcClassVolume', NUM_FMT.integer);
    row++;

    const atcGrowth = sb(
      ws, row, 'ATC Class Growth %', country?.atcClassGrowth ?? zeroScenario,
      NP, cellMap, sheetKey, 'atcClassGrowth',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
    row = atcGrowth.nextRow;

    writeInputRow(ws, row, 'Molecule ATC Share %', country?.moleculeAtcShare ?? zeroArr, NP, cellMap, sheetKey, 'moleculeAtcShare', NUM_FMT.percent);
    row++;

    // Blank
    row++;
  }

  // ════════════════════════════════════════════════════════════
  // Section: Originator Pricing
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Originator Pricing', colCount);
  row++;

  // Originator Price: historical periods are editable inputs; forecast periods
  // show cached values with output styling (computed in Model sheet from growth rates).
  {
    const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;
    const opLabel = ws.getCell(row, 1);
    opLabel.value = 'Originator Price';
    opLabel.font = LABEL_FONT;
    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);
      cell.value = country?.originatorPrice[p] ?? 0;
      cell.numFmt = NUM_FMT.decimal2;
      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        // Historical: editable input
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        // Forecast: display value only (Model sheet is authoritative)
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'originatorPrice', p, ws.name, cellAddr(row, col));
    }
  }
  row++;

  const origGrowth = sb(
    ws, row, 'Originator Price Growth %', country?.originatorPriceGrowth ?? zeroScenario,
    NP, cellMap, sheetKey, 'originatorPriceGrowth',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = origGrowth.nextRow;

  // ════════════════════════════════════════════════════════════
  // Section: Biosimilar Assumptions
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Biosimilar Assumptions', colCount);
  row++;

  // Biosimilar Penetration (total biosimilar share of molecule market)
  const biosimPen = sb(
    ws, row, 'Biosimilar Penetration', country?.biosimilarPenetration ?? zeroScenario,
    NP, cellMap, sheetKey, 'biosimilarPenetration',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = biosimPen.nextRow;

  // Our Share of Biosimilar
  const ourShare = sb(
    ws, row, 'Our Share of Biosimilar', country?.ourShareOfBiosimilar ?? zeroScenario,
    NP, cellMap, sheetKey, 'ourShareOfBiosimilar',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = ourShare.nextRow;

  const biosimPrice = sb(
    ws, row, 'Biosimilar Price % of Originator', country?.biosimilarPricePct ?? zeroScenario,
    NP, cellMap, sheetKey, 'biosimilarPricePct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = biosimPrice.nextRow;

  // ════════════════════════════════════════════════════════════
  // Section: Partner Economics
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Partner Economics', colCount);
  row++;

  const partnerGtn = sb(
    ws, row, 'Partner GTN %', country?.partnerGtnPct ?? zeroScenario,
    NP, cellMap, sheetKey, 'partnerGtnPct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = partnerGtn.nextRow;

  const supplyPrice = sb(
    ws, row, 'Supply Price %', country?.supplyPricePct ?? zeroScenario,
    NP, cellMap, sheetKey, 'supplyPricePct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = supplyPrice.nextRow;

  const fixedSupply = sb(
    ws, row, 'Fixed Supply Price/Gram', country?.fixedSupplyPricePerGram ?? zeroScenario,
    NP, cellMap, sheetKey, 'fixedSupplyPricePerGram',
    NUM_FMT.decimal2, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = fixedSupply.nextRow;

  const royalty = sb(
    ws, row, 'Royalty Rate %', country?.royaltyRatePct ?? zeroScenario,
    NP, cellMap, sheetKey, 'royaltyRatePct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = royalty.nextRow;

  writeInputRow(ws, row, 'Milestone Payments', country?.milestonePayments ?? zeroArr, NP, cellMap, sheetKey, 'milestonePayments', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Royalty Structure
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Royalty Structure', colCount);
  row++;

  // Royalty Mode (dropdown)
  writeScalarRow(ws, row, 'Royalty Mode',
    country?.useFixedRoyaltyRate ? 'Flat' : 'Tiered',
    cellMap, sheetKey, 'useFixedRoyaltyRate');
  ws.getCell(row, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Flat,Tiered"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };
  row++;

  // Tier thresholds and rates (5 tiers)
  const tiers = country?.royaltyTiers ?? [];
  for (let t = 0; t < 5; t++) {
    const tier = tiers[t] ?? { threshold: 0, rate: 0 };

    writeScalarRow(ws, row, `Tier ${t + 1} Threshold`, tier.threshold, cellMap, sheetKey, `royaltyTier_${t}_threshold`, NUM_FMT.integer);
    row++;

    writeScalarRow(ws, row, `Tier ${t + 1} Rate`, tier.rate, cellMap, sheetKey, `royaltyTier_${t}_rate`, NUM_FMT.percent);
    row++;
  }

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Partner View Costs (conditional)
  // ════════════════════════════════════════════════════════════
  if (ctx.config.partnerViewEnabled) {
    writeSection(ws, row, 'Partner View Costs', colCount);
    row++;

    writeInputRow(ws, row, 'Partner Promotional Costs', country?.partnerPromotionalCosts ?? zeroArr,
      NP, cellMap, sheetKey, 'partnerPromotionalCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Sales Force Costs', country?.partnerSalesForceCosts ?? zeroArr,
      NP, cellMap, sheetKey, 'partnerSalesForceCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Distribution Costs', country?.partnerDistributionCosts ?? zeroArr,
      NP, cellMap, sheetKey, 'partnerDistributionCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Manufacturing Costs', country?.partnerManufacturingCosts ?? zeroArr,
      NP, cellMap, sheetKey, 'partnerManufacturingCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner G&A', country?.partnerGAndA ?? zeroArr,
      NP, cellMap, sheetKey, 'partnerGAndA', NUM_FMT.integer);
    row++;

    writeScalarRow(ws, row, 'Partner Tax Rate', country?.partnerTaxRate ?? 0.25, cellMap, sheetKey, 'partnerTaxRate', NUM_FMT.percent);
    row++;

    // Blank
    row++;
  }

}

// ── Exported entry point ──

export function addInteractiveCountryInputSheets(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  for (let s = 0; s < MAX_COUNTRY_SLOTS; s++) {
    buildCountryInputSheet(wb, s, ctx, cellMap);
  }
}
