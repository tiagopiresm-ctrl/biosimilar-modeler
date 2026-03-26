// ──────────────────────────────────────────────────────────────
// Interactive Excel — Simplified country INPUT sheet
// ──────────────────────────────────────────────────────────────
// Creates ONE "Inputs" sheet with only ACTIVE countries stacked
// vertically. No scenario blocks — exports the active scenario's
// values directly as editable yellow cells.
//
// Molecule Volume: historical = manual, forecast = FORMULA: prev*(1+growth)
// Originator Price: historical = manual, forecast = FORMULA: prev*(1+priceGrowth)
// Supply Price: export EFFECTIVE supply price values (already computed)
// Royalty Rate: export EFFECTIVE royalty rate (flat or tiered result)
// ──────────────────────────────────────────────────────────────

import type { Workbook, Worksheet } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { CountryAssumptions } from '../../../types';
import { getActiveRow } from '../../../calculations';
import { NUM_FMT } from '../../excelStyles';
import {
  INPUT_FILL, INPUT_FONT, OUTPUT_FILL,
  cellAddr, periodCol,
  writeInputRow, writeSection,
  setupSheet, writePeriodHeader, writeColorLegend,
  formulaValue,
} from '../formulaHelpers';
import { BOLD_VALUE_FONT } from '../../excelStyles';

// ── Constants ──

/** The consolidated sheet is always called "Inputs". */
export const INPUTS_SHEET_NAME = 'Inputs';

/**
 * Fixed number of rows allocated per country slot.
 * 16 content rows + section headers + padding = 22.
 */
export const ROWS_PER_INPUT_SLOT = 22;

/** First data row for slot 0 (after header rows). */
export const INPUT_SLOT_START = 4;

/** Get the first row for a given slot index (0-based). */
export function inputSlotFirstRow(slotIndex: number): number {
  return INPUT_SLOT_START + slotIndex * ROWS_PER_INPUT_SLOT;
}

// ── Field offset table ──
const FIELD_OFFSETS = {
  title: 0,
  mvSection: 1,
  marketVolume: 2,
  volumeGrowth: 3,
  opSection: 4,
  originatorPrice: 5,
  priceGrowth: 6,
  bioSection: 7,
  biosimilarPenetration: 8,
  ourShareOfBiosimilar: 9,
  biosimilarPricePct: 10,
  partnerSection: 11,
  partnerGtnPct: 12,
  supplyPrice: 13,
  royaltyRate: 14,
  milestonePayments: 15,
  fxSection: 16,
  fxRate: 17,
} as const;

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
  const activeScenario = ctx.config.activeScenario;

  const country: CountryAssumptions = ctx.countries[slotIndex];
  const co = ctx.countryOutputs[slotIndex];

  const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;

  const base = inputSlotFirstRow(slotIndex);

  // ═══════════════════════════════════════════════════════════
  // Title row
  // ═══════════════════════════════════════════════════════════
  {
    const row = base + FIELD_OFFSETS.title;
    const titleCell = ws.getCell(row, 1);
    titleCell.value = `=== ${country.name} ===`;
    titleCell.font = { ...BOLD_VALUE_FONT, size: 12 };
  }

  // ═══════════════════════════════════════════════════════════
  // Molecule Volume — historical = editable, forecast = formula
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.mvSection;
    writeSection(ws, sectionRow, 'Molecule Volume', colCount);
  }
  // Molecule Volume row
  {
    const row = base + FIELD_OFFSETS.marketVolume;
    const mvLabel = ws.getCell(row, 1);
    mvLabel.value = "Molecule Volume ('000)";
    mvLabel.font = BOLD_VALUE_FONT;

    const growthRow = base + FIELD_OFFSETS.volumeGrowth;

    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);

      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        // Historical: editable input
        cell.value = country.marketVolume[p] ?? 0;
        cell.numFmt = NUM_FMT.integer;
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        // Forecast: FORMULA = prev * (1 + growth)
        const prevRef = cellAddr(row, periodCol(p - 1));
        const growthRef = cellAddr(growthRow, col);
        cell.value = formulaValue(
          `${prevRef}*(1+${growthRef})`,
          country.marketVolume[p] ?? 0,
        );
        cell.numFmt = NUM_FMT.integer;
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'marketVolume', p, ws.name, cellAddr(row, col));
    }
  }
  // Volume Growth %
  {
    const row = base + FIELD_OFFSETS.volumeGrowth;
    const activeData = getActiveRow(country.volumeAdjustment, activeScenario);
    writeInputRow(ws, row, 'Volume Growth %', activeData,
      NP, cellMap, sheetKey, 'volumeGrowth', NUM_FMT.percent);
  }

  // ═══════════════════════════════════════════════════════════
  // Originator Pricing — historical = editable, forecast = formula
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.opSection;
    writeSection(ws, sectionRow, 'Originator Pricing', colCount);
  }
  // Originator Price row
  {
    const row = base + FIELD_OFFSETS.originatorPrice;
    const opLabel = ws.getCell(row, 1);
    opLabel.value = 'Originator Price (local/unit)';
    opLabel.font = BOLD_VALUE_FONT;

    const growthRow = base + FIELD_OFFSETS.priceGrowth;

    for (let p = 0; p < NP; p++) {
      const col = periodCol(p);
      const cell = ws.getCell(row, col);

      if (p < forecastStartIdx || (forecastStartIdx <= 0 && p === 0)) {
        cell.value = country.originatorPrice[p] ?? 0;
        cell.numFmt = NUM_FMT.decimal2;
        cell.fill = INPUT_FILL;
        cell.font = INPUT_FONT;
      } else {
        const prevRef = cellAddr(row, periodCol(p - 1));
        const growthRef = cellAddr(growthRow, col);
        cell.value = formulaValue(
          `${prevRef}*(1+${growthRef})`,
          country.originatorPrice[p] ?? 0,
        );
        cell.numFmt = NUM_FMT.decimal2;
        cell.fill = OUTPUT_FILL;
      }
      cellMap.register(sheetKey, 'originatorPrice', p, ws.name, cellAddr(row, col));
    }
  }
  // Price Growth %
  {
    const row = base + FIELD_OFFSETS.priceGrowth;
    const activeData = getActiveRow(country.originatorPriceGrowth, activeScenario);
    writeInputRow(ws, row, 'Price Growth %', activeData,
      NP, cellMap, sheetKey, 'priceGrowth', NUM_FMT.percent);
  }

  // ═══════════════════════════════════════════════════════════
  // Biosimilar Assumptions
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.bioSection;
    writeSection(ws, sectionRow, 'Biosimilar Assumptions', colCount);
  }
  // Biosimilar Penetration %
  {
    const row = base + FIELD_OFFSETS.biosimilarPenetration;
    const activeData = getActiveRow(country.biosimilarPenetration, activeScenario);
    writeInputRow(ws, row, 'Biosimilar Penetration %', activeData,
      NP, cellMap, sheetKey, 'biosimilarPenetration', NUM_FMT.percent);
  }
  // Our Share of Biosimilar %
  {
    const row = base + FIELD_OFFSETS.ourShareOfBiosimilar;
    const activeData = getActiveRow(country.ourShareOfBiosimilar, activeScenario);
    writeInputRow(ws, row, 'Our Share of Biosimilar %', activeData,
      NP, cellMap, sheetKey, 'ourShareOfBiosimilar', NUM_FMT.percent);
  }
  // Biosimilar Price (% of originator)
  {
    const row = base + FIELD_OFFSETS.biosimilarPricePct;
    const activeData = getActiveRow(country.biosimilarPricePct, activeScenario);
    writeInputRow(ws, row, 'Biosimilar Price (% of originator)', activeData,
      NP, cellMap, sheetKey, 'biosimilarPricePct', NUM_FMT.percent);
  }

  // ═══════════════════════════════════════════════════════════
  // Partner Economics
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.partnerSection;
    writeSection(ws, sectionRow, 'Partner Economics', colCount);
  }
  // Partner GTN %
  {
    const row = base + FIELD_OFFSETS.partnerGtnPct;
    const activeData = getActiveRow(country.partnerGtnPct, activeScenario);
    writeInputRow(ws, row, 'Partner GTN %', activeData,
      NP, cellMap, sheetKey, 'partnerGtnPct', NUM_FMT.percent);
  }
  // Supply Price (€/unit) — export EFFECTIVE computed supply prices
  {
    const row = base + FIELD_OFFSETS.supplyPrice;
    writeInputRow(ws, row, 'Supply Price (€/unit)', co.supplyPrice,
      NP, cellMap, sheetKey, 'supplyPrice', NUM_FMT.decimal2);
  }
  // Royalty Rate % — export EFFECTIVE royalty rate
  {
    const row = base + FIELD_OFFSETS.royaltyRate;
    // Compute effective royalty rate per period
    const effectiveRoyaltyRate: number[] = [];
    for (let p = 0; p < NP; p++) {
      if (co.partnerNetSales[p] !== 0) {
        effectiveRoyaltyRate.push(co.royaltyIncome[p] / co.partnerNetSales[p]);
      } else {
        effectiveRoyaltyRate.push(
          country.useFixedRoyaltyRate
            ? getActiveRow(country.royaltyRatePct, activeScenario)[p] ?? 0
            : 0,
        );
      }
    }
    writeInputRow(ws, row, 'Royalty Rate %', effectiveRoyaltyRate,
      NP, cellMap, sheetKey, 'royaltyRate', NUM_FMT.percent);
  }
  // Milestone Payments ('000)
  {
    const row = base + FIELD_OFFSETS.milestonePayments;
    writeInputRow(ws, row, "Milestone Payments ('000)", country.milestonePayments,
      NP, cellMap, sheetKey, 'milestonePayments', NUM_FMT.integer);
  }

  // ═══════════════════════════════════════════════════════════
  // FX Rates
  // ═══════════════════════════════════════════════════════════
  {
    const sectionRow = base + FIELD_OFFSETS.fxSection;
    writeSection(ws, sectionRow, 'FX Rates', colCount);
  }
  {
    const row = base + FIELD_OFFSETS.fxRate;
    writeInputRow(ws, row, `FX Rate (local/${ctx.config.currency})`,
      country.fxRate, NP, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
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

  // Only write active countries
  for (let s = 0; s < ctx.countries.length; s++) {
    buildCountrySlot(ws, s, ctx, cellMap);
  }
}
