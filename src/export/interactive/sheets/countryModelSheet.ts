// ──────────────────────────────────────────────────────────────
// Interactive Excel — Clean country CALCULATIONS sheet
// ──────────────────────────────────────────────────────────────
// Creates ONE "Calculations" sheet with only ACTIVE countries.
// All cells are clean formulas — no IF(Active="Yes") guards,
// no scenario switching, no mode switches.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { CountryAssumptions, CountryOutputs } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  writeFormulaRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';

/** The consolidated sheet is always called "Calculations". */
export const CALCULATIONS_SHEET_NAME = 'Calculations';

/**
 * Fixed number of rows allocated per country slot.
 */
export const ROWS_PER_CALC_SLOT = 25;

/** First data row for slot 0 (after header row). */
export const CALC_SLOT_START = 3;

/** Get the first row for a given slot index (0-based). */
export function calcSlotFirstRow(slotIndex: number): number {
  return CALC_SLOT_START + slotIndex * ROWS_PER_CALC_SLOT;
}

// ── Field offset table for calculations ──
const CALC_OFFSETS = {
  sectionMarket: 0,
  marketVolume: 1,
  originatorRefPrice: 2,
  fxRate: 3,
  // biosimilar section
  sectionBio: 5,
  biosimilarPenetration: 6,
  totalBiosimilarVolume: 7,
  ourShareOfBiosimilar: 8,
  ourVolume: 9,
  inMarketPrice: 10,
  // partner section
  sectionPartner: 12,
  partnerNSP: 13,
  partnerNetSales: 14,
  supplyPricePerUnit: 15,
  grossSupplyRevenue: 16,
  royaltyIncome: 17,
  milestoneIncome: 18,
  // originator derived
  sectionOrig: 20,
  originatorShare: 21,
} as const;

// ── Slot builder ──

function buildCalcSlot(
  ws: ReturnType<import('exceljs').Workbook['addWorksheet']>,
  slotIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const country: CountryAssumptions = ctx.countries[slotIndex];
  const co: CountryOutputs = ctx.countryOutputs[slotIndex];

  const sheetKey = `countryModel_${slotIndex}`;
  const inputKey = `country_${slotIndex}`;
  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;

  const base = calcSlotFirstRow(slotIndex);

  // ════════════════════════════════════════════════════════════
  // Market Overview
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionMarket, `${country.name} — Calculations`, colCount);

  // 1. Molecule Volume — reference from Inputs sheet
  {
    const row = base + CALC_OFFSETS.marketVolume;
    writeFormulaRow(ws, row, 'Molecule Volume', NP, (p) => {
      return cellMap.get(inputKey, 'marketVolume', p).toFormula();
    }, co.marketVolume, cellMap, sheetKey, 'marketVolume', NUM_FMT.integer, true);
  }

  // 2. Originator Ref Price — reference from Inputs sheet
  {
    const row = base + CALC_OFFSETS.originatorRefPrice;
    writeFormulaRow(ws, row, 'Originator Ref Price', NP, (p) => {
      return cellMap.get(inputKey, 'originatorPrice', p).toFormula();
    }, co.originatorRefPrice, cellMap, sheetKey, 'originatorRefPrice', NUM_FMT.decimal2);
  }

  // 3. FX Rate
  {
    const row = base + CALC_OFFSETS.fxRate;
    writeFormulaRow(ws, row, 'FX Rate', NP, (p) => {
      return cellMap.get(inputKey, 'fxRate', p).toFormula();
    }, country.fxRate, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  }

  // ════════════════════════════════════════════════════════════
  // Biosimilar
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionBio, 'Biosimilar', colCount);

  // Biosimilar Penetration — from Inputs
  {
    const row = base + CALC_OFFSETS.biosimilarPenetration;
    writeFormulaRow(ws, row, 'Biosimilar Penetration', NP, (p) => {
      return cellMap.get(inputKey, 'biosimilarPenetration', p).toFormula();
    }, co.totalBiosimilarVolume.map((v, i) => co.marketVolume[i] > 0 ? v / co.marketVolume[i] : 0),
      cellMap, sheetKey, 'biosimilarPenetration', NUM_FMT.percent);
  }

  // Total Biosimilar Volume = MoleculeVol x Penetration
  {
    const row = base + CALC_OFFSETS.totalBiosimilarVolume;
    writeFormulaRow(ws, row, 'Total Biosimilar Volume', NP, (p) => {
      const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
      const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
      return `${mktVol}*${pen}`;
    }, co.totalBiosimilarVolume, cellMap, sheetKey, 'totalBiosimilarVolume', NUM_FMT.integer);
  }

  // Our Share of Biosimilar — from Inputs
  {
    const row = base + CALC_OFFSETS.ourShareOfBiosimilar;
    writeFormulaRow(ws, row, 'Our Share of Biosimilar', NP, (p) => {
      return cellMap.get(inputKey, 'ourShareOfBiosimilar', p).toFormula();
    }, co.ourShareOfBiosimilarArr, cellMap, sheetKey, 'ourShareOfBiosimilar', NUM_FMT.percent);
  }

  // Our Volume = TotalBioVol x OurShare
  {
    const row = base + CALC_OFFSETS.ourVolume;
    writeFormulaRow(ws, row, 'Our Volume', NP, (p) => {
      const totalBioVol = cellMap.get(sheetKey, 'totalBiosimilarVolume', p).toLocal();
      const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
      return `${totalBioVol}*${ourShr}`;
    }, co.biosimilarVolume, cellMap, sheetKey, 'biosimilarVolume', NUM_FMT.integer);
  }

  // In-Market Price = OrigPrice x BioPricePct
  {
    const row = base + CALC_OFFSETS.inMarketPrice;
    writeFormulaRow(ws, row, 'In-Market Price', NP, (p) => {
      const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
      const pricePct = cellMap.get(inputKey, 'biosimilarPricePct', p).toFormula();
      return `${origPrice}*${pricePct}`;
    }, co.biosimilarInMarketPrice, cellMap, sheetKey, 'biosimilarInMarketPrice', NUM_FMT.decimal2);
  }

  // ════════════════════════════════════════════════════════════
  // Partner Economics
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionPartner, 'Partner Economics', colCount);

  // Partner NSP = InMarketPrice x (1 - GTN)
  {
    const row = base + CALC_OFFSETS.partnerNSP;
    writeFormulaRow(ws, row, 'Partner Net Selling Price', NP, (p) => {
      const inMktPrice = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
      const gtnPct = cellMap.get(inputKey, 'partnerGtnPct', p).toFormula();
      return `${inMktPrice}*(1-${gtnPct})`;
    }, co.partnerNetSellingPrice, cellMap, sheetKey, 'partnerNetSellingPrice', NUM_FMT.decimal2);
  }

  // Partner Net Sales = NSP x OurVol
  {
    const row = base + CALC_OFFSETS.partnerNetSales;
    writeFormulaRow(ws, row, 'Partner Net Sales', NP, (p) => {
      const nsp = cellMap.get(sheetKey, 'partnerNetSellingPrice', p).toLocal();
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      return `${nsp}*${vol}`;
    }, co.partnerNetSales, cellMap, sheetKey, 'partnerNetSales', NUM_FMT.integer);
  }

  // Supply Price/Unit — from Inputs (already effective value)
  {
    const row = base + CALC_OFFSETS.supplyPricePerUnit;
    writeFormulaRow(ws, row, 'Supply Price/Unit', NP, (p) => {
      return cellMap.get(inputKey, 'supplyPrice', p).toFormula();
    }, co.supplyPrice, cellMap, sheetKey, 'supplyPricePerUnit', NUM_FMT.decimal2);
  }

  // Gross Supply Revenue = OurVol x SupplyPrice
  {
    const row = base + CALC_OFFSETS.grossSupplyRevenue;
    writeFormulaRow(ws, row, 'Gross Supply Revenue', NP, (p) => {
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      const price = cellMap.get(sheetKey, 'supplyPricePerUnit', p).toLocal();
      return `${vol}*${price}`;
    }, co.grossSupplyRevenue, cellMap, sheetKey, 'grossSupplyRevenue', NUM_FMT.integer);
  }

  // Royalty Income = PartnerNetSales x RoyaltyRate
  {
    const row = base + CALC_OFFSETS.royaltyIncome;
    writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
      const pns = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const royaltyPct = cellMap.get(inputKey, 'royaltyRate', p).toFormula();
      return `${pns}*${royaltyPct}`;
    }, co.royaltyIncome, cellMap, sheetKey, 'royaltyIncome', NUM_FMT.integer);
  }

  // Milestone Income — from Inputs
  {
    const row = base + CALC_OFFSETS.milestoneIncome;
    writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
      return cellMap.get(inputKey, 'milestonePayments', p).toFormula();
    }, co.milestoneIncome, cellMap, sheetKey, 'milestoneIncome', NUM_FMT.integer);
  }

  // ════════════════════════════════════════════════════════════
  // Originator (Derived)
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionOrig, 'Originator (Derived)', colCount);

  // Originator Share = MAX(0, 1 - Penetration)
  {
    const row = base + CALC_OFFSETS.originatorShare;
    writeFormulaRow(ws, row, 'Originator Share', NP, (p) => {
      const biosPen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
      return `MAX(0,1-${biosPen})`;
    }, co.originatorShare, cellMap, sheetKey, 'originatorShare', NUM_FMT.percent);
  }
}

// ── Exported entry point ──

export function addConsolidatedCalculationsSheet(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const ws = wb.addWorksheet(CALCULATIONS_SHEET_NAME);
  const NP = ctx.periodLabels.length;

  setupSheet(ws, NP);
  writePeriodHeader(ws, ctx.periodLabels);

  // Only write active countries
  for (let s = 0; s < ctx.countries.length; s++) {
    buildCalcSlot(ws, s, ctx, cellMap);
  }
}
