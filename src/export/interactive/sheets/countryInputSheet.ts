// ──────────────────────────────────────────────────────────────
// Interactive Excel — CONSOLIDATED country INPUT sheet builder
// ──────────────────────────────────────────────────────────────
// Creates ONE "Inputs" sheet with all 10 country slots stacked
// vertically. Each slot occupies a fixed block of rows so that
// formulas can reliably reference any field by slot + offset.
//
// KEY CHANGES from old per-sheet approach:
//   - Market Volume forecast periods are FORMULAS: =prev*(1+growth)
//   - Originator Price forecast periods are FORMULAS: =prev*(1+priceGrowth)
//   - Royalty mode dropdown lives here per country
//   - All mode switches use Excel IF(), never TypeScript if/else
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

/** The consolidated sheet is always called "Inputs". */
export const INPUTS_SHEET_NAME = 'Inputs';

/**
 * Fixed number of rows allocated per country slot.
 * Must be large enough to hold all fields including partner view costs + padding.
 */
export const ROWS_PER_INPUT_SLOT = 65;

/** First data row for slot 0 (after header rows). */
export const INPUT_SLOT_START = 4;

/** Get the first row for a given slot index (0-based). */
export function inputSlotFirstRow(slotIndex: number): number {
  return INPUT_SLOT_START + slotIndex * ROWS_PER_INPUT_SLOT;
}

// ── Field offset table ──
// These are RELATIVE offsets from the slot's first row.
// The actual row = inputSlotFirstRow(slot) + offset.

const FIELD_OFFSETS = {
  title: 0,
  // Country Settings section
  settingsSection: 2,
  biosimLaunchIdx: 3,
  // FX section
  fxSection: 5,
  fxRate: 6,
  // Market Volume section
  mvSection: 8,
  marketVolume: 9,
  volumeGrowth: 10,       // scenario block starts here (up to 4 rows)
  // Originator Pricing section (offset after volume growth block)
  opSection: 16,
  originatorPrice: 17,
  priceGrowth: 18,         // scenario block (up to 4 rows)
  // Biosimilar Assumptions section
  bioSection: 24,
  biosimilarPenetration: 25,  // scenario block
  ourShareOfBiosimilar: 31,   // scenario block
  biosimilarPricePct: 37,     // scenario block
  // Partner Economics section
  partnerSection: 43,
  partnerGtnPct: 44,          // scenario block
  supplyPricePct: 50,
  fixedSupplyPricePerGram: 51,
  royaltyRatePct: 52,
  milestonePayments: 53,
  // Royalty Structure section
  royaltySection: 55,
  royaltyMode: 56,
  royaltyTiersStart: 57,     // 5 tiers x 2 rows = 10 rows
} as const;

// ── Helpers ──

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

// ── Slot builder ──

function buildCountrySlot(
  ws: Worksheet,
  slotIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const sheetKey = `country_${slotIndex}`;
  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;
  const activeIdx = ctx.config.activeScenario - 1;
  const isBaseOnly = ctx.config.scenarioMode === 'base_only';

  const country: CountryAssumptions | null =
    slotIndex < ctx.countries.length ? ctx.countries[slotIndex] : null;

  const zeroArr = Array(NP).fill(0);
  const zeroScenario = emptyScenarioRow(NP);

  const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;

  // Conditional scenario writer
  const sb: typeof writeScenarioBlock = (...args) =>
    isBaseOnly
      ? writeBaseOnlyBlock(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[10])
      : writeScenarioBlock(...args);

  const base = inputSlotFirstRow(slotIndex);

  // ═══════════════════════════════════════════════════════════
  // Title row
  // ═══════════════════════════════════════════════════════════
  {
    const row = base + FIELD_OFFSETS.title;
    const activeRef = cellMap.getScalar('config', `countryActive_${slotIndex}`).toFormula();
    const nameRef = cellMap.getScalar('config', `countryName_${slotIndex}`).toFormula();
    const titleCell = ws.getCell(row, 1);
    titleCell.value = formulaValue(
      `IF(${activeRef}="Yes","=== COUNTRY ${slotIndex + 1}: "&${nameRef}&" ===","=== COUNTRY ${slotIndex + 1}: INACTIVE ===")`,
      country ? `=== COUNTRY ${slotIndex + 1}: ${country.name} ===` : `=== COUNTRY ${slotIndex + 1}: INACTIVE ===`,
    );
    titleCell.font = { ...BOLD_VALUE_FONT, size: 12 };
  }

  // ═══════════════════════════════════════════════════════════
  // Country Settings
  // ═══════════════════════════════════════════════════════════
  {
    const row = base + FIELD_OFFSETS.settingsSection;
    writeSection(ws, row, 'Country Settings', colCount);
  }
  {
    const row = base + FIELD_OFFSETS.biosimLaunchIdx;
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

  // ═══════════════════════════════════════════════════════════
  // FX Rates
  // ═══════════════════════════════════════════════════════════
  {
    const row = base + FIELD_OFFSETS.fxSection;
    writeSection(ws, row, 'FX Rates', colCount);
  }
  {
    const row = base + FIELD_OFFSETS.fxRate;
    writeInputRow(ws, row, `FX Rate (local/${ctx.config.currency})`,
      country?.fxRate ?? zeroArr.map(() => 1), NP, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  }

  // ═══════════════════════════════════════════════════════════
  // Market Volume — with FORMULA-based forecast
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.mvSection;
    writeSection(ws, sectionRow, 'Market Volume', colCount);
  }
  // Market Volume row: historical = editable, forecast = formula =prev*(1+growth)
  {
    const row = base + FIELD_OFFSETS.marketVolume;
    const mvLabel = ws.getCell(row, 1);
    mvLabel.value = 'Market Volume';
    mvLabel.font = BOLD_VALUE_FONT;

    // We need to write volume growth FIRST conceptually, but we know its row position
    const growthRow = base + FIELD_OFFSETS.volumeGrowth;
    // In base-only mode, the active row is the same as the start row
    // In 3-scenario mode, the active row is startRow + 3
    const growthActiveRow = isBaseOnly ? growthRow : growthRow + 3;

    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);

      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        // Historical: editable input
        cell.value = country?.marketVolume[p] ?? 0;
        cell.numFmt = NUM_FMT.integer;
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        // Forecast: FORMULA = prev * (1 + growth)
        const prevRef = cellAddr(row, periodCol(p - 1));
        const growthRef = cellAddr(growthActiveRow, col);
        cell.value = formulaValue(
          `${prevRef}*(1+${growthRef})`,
          country?.marketVolume[p] ?? 0,
        );
        cell.numFmt = NUM_FMT.integer;
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'marketVolume', p, ws.name, cellAddr(row, col));
    }
  }
  // Volume Growth % (scenario block)
  {
    const row = base + FIELD_OFFSETS.volumeGrowth;
    sb(
      ws, row, 'Volume Growth %', country?.volumeAdjustment ?? zeroScenario,
      NP, cellMap, sheetKey, 'volumeAdjustment',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Originator Pricing — with FORMULA-based forecast
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.opSection;
    writeSection(ws, sectionRow, 'Originator Pricing', colCount);
  }
  // Originator Price row: historical = editable, forecast = formula =prev*(1+priceGrowth)
  {
    const row = base + FIELD_OFFSETS.originatorPrice;
    const opLabel = ws.getCell(row, 1);
    opLabel.value = 'Originator Price';
    opLabel.font = BOLD_VALUE_FONT;

    const growthRow = base + FIELD_OFFSETS.priceGrowth;
    const growthActiveRow = isBaseOnly ? growthRow : growthRow + 3;

    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);

      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        // Historical: editable input
        cell.value = country?.originatorPrice[p] ?? 0;
        cell.numFmt = NUM_FMT.decimal2;
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        // Forecast: FORMULA = prev * (1 + priceGrowth)
        const prevRef = cellAddr(row, periodCol(p - 1));
        const growthRef = cellAddr(growthActiveRow, col);
        cell.value = formulaValue(
          `${prevRef}*(1+${growthRef})`,
          country?.originatorPrice[p] ?? 0,
        );
        cell.numFmt = NUM_FMT.decimal2;
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'originatorPrice', p, ws.name, cellAddr(row, col));
    }
  }
  // Price Growth % (scenario block)
  {
    const row = base + FIELD_OFFSETS.priceGrowth;
    sb(
      ws, row, 'Originator Price Growth %', country?.originatorPriceGrowth ?? zeroScenario,
      NP, cellMap, sheetKey, 'originatorPriceGrowth',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Biosimilar Assumptions
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.bioSection;
    writeSection(ws, sectionRow, 'Biosimilar Assumptions', colCount);
  }
  {
    const row = base + FIELD_OFFSETS.biosimilarPenetration;
    sb(
      ws, row, 'Biosimilar Penetration', country?.biosimilarPenetration ?? zeroScenario,
      NP, cellMap, sheetKey, 'biosimilarPenetration',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }
  {
    const row = base + FIELD_OFFSETS.ourShareOfBiosimilar;
    sb(
      ws, row, 'Our Share of Biosimilar', country?.ourShareOfBiosimilar ?? zeroScenario,
      NP, cellMap, sheetKey, 'ourShareOfBiosimilar',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }
  {
    const row = base + FIELD_OFFSETS.biosimilarPricePct;
    sb(
      ws, row, 'Biosimilar Price % of Originator', country?.biosimilarPricePct ?? zeroScenario,
      NP, cellMap, sheetKey, 'biosimilarPricePct',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Partner Economics
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.partnerSection;
    writeSection(ws, sectionRow, 'Partner Economics', colCount);
  }
  {
    const row = base + FIELD_OFFSETS.partnerGtnPct;
    sb(
      ws, row, 'Partner GTN %', country?.partnerGtnPct ?? zeroScenario,
      NP, cellMap, sheetKey, 'partnerGtnPct',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
  }
  // Supply Price % (single row — used when mode=percentage)
  {
    const row = base + FIELD_OFFSETS.supplyPricePct;
    const data = country?.supplyPricePct ?? zeroScenario;
    const activeData = [data.bear, data.base, data.bull][activeIdx];
    writeInputRow(ws, row, 'Supply Price %',
      activeData, NP, cellMap, sheetKey, 'supplyPricePct_active', NUM_FMT.percent);
  }
  // Fixed Supply Price/Gram (single row — used when mode=fixed)
  {
    const row = base + FIELD_OFFSETS.fixedSupplyPricePerGram;
    const data = country?.fixedSupplyPricePerGram ?? zeroScenario;
    const activeData = [data.bear, data.base, data.bull][activeIdx];
    writeInputRow(ws, row, 'Fixed Supply Price/Gram',
      activeData, NP, cellMap, sheetKey, 'fixedSupplyPricePerGram_active', NUM_FMT.decimal2);
  }
  // Royalty Rate % (single row — used when mode=flat)
  {
    const row = base + FIELD_OFFSETS.royaltyRatePct;
    const data = country?.royaltyRatePct ?? zeroScenario;
    const activeData = [data.bear, data.base, data.bull][activeIdx];
    writeInputRow(ws, row, 'Royalty Rate %',
      activeData, NP, cellMap, sheetKey, 'royaltyRatePct_active', NUM_FMT.percent);
  }
  // Milestone Payments
  {
    const row = base + FIELD_OFFSETS.milestonePayments;
    writeInputRow(ws, row, 'Milestone Payments', country?.milestonePayments ?? zeroArr,
      NP, cellMap, sheetKey, 'milestonePayments', NUM_FMT.integer);
  }

  // ═══════════════════════════════════════════════════════════
  // Royalty Structure
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.royaltySection;
    writeSection(ws, sectionRow, 'Royalty Structure', colCount);
  }
  // Royalty Mode dropdown
  {
    const row = base + FIELD_OFFSETS.royaltyMode;
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
  }
  // Tier thresholds and rates (5 tiers)
  {
    const tiers = country?.royaltyTiers ?? [];
    const tiersStart = base + FIELD_OFFSETS.royaltyTiersStart;
    for (let t = 0; t < 5; t++) {
      const tier = tiers[t] ?? { threshold: 0, rate: 0 };
      const threshRow = tiersStart + t * 2;
      const rateRow = tiersStart + t * 2 + 1;

      writeScalarRow(ws, threshRow, `Tier ${t + 1} Threshold`, tier.threshold,
        cellMap, sheetKey, `royaltyTier_${t}_threshold`, NUM_FMT.integer);
      writeScalarRow(ws, rateRow, `Tier ${t + 1} Rate`, tier.rate,
        cellMap, sheetKey, `royaltyTier_${t}_rate`, NUM_FMT.percent);
    }
  }
}

// ── Exported entry point ──

export function addConsolidatedInputSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet(INPUTS_SHEET_NAME);
  const NP = ctx.periodLabels.length;

  setupSheet(ws, NP);
  writePeriodHeader(ws, ctx.periodLabels);
  writeColorLegend(ws, 2);

  for (let s = 0; s < MAX_COUNTRY_SLOTS; s++) {
    buildCountrySlot(ws, s, ctx, cellMap);
  }
}
