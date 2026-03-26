// ──────────────────────────────────────────────────────────────
// Interactive Excel — CONSOLIDATED country MODEL (output) sheet
// ──────────────────────────────────────────────────────────────
// Creates ONE "Calculations" sheet with all 10 country slots
// stacked vertically. Every formula is wrapped in
//   IF(Config!Active="Yes", formula, 0)
// so inactive country slots produce zeros throughout.
//
// KEY: ALL mode switches use Excel IF() formulas, not TS if/else.
//   - Supply price: IF(apiPricingModel starts with "P", pct, fixed)
//   - Royalty: IF(royaltyMode="Flat", flat, tiered)
//   - Volume forecast: formulas in Inputs sheet (=prev*(1+growth))
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { CountryAssumptions, CountryOutputs } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  cellAddr, periodCol,
  writeFormulaRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';
import { MAX_COUNTRY_SLOTS } from './configSheet';

/** The consolidated sheet is always called "Calculations". */
export const CALCULATIONS_SHEET_NAME = 'Calculations';

/**
 * Fixed number of rows allocated per country slot in the Calculations sheet.
 */
export const ROWS_PER_CALC_SLOT = 35;

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
  volumeYoY: 2,
  originatorRefPrice: 3,
  fxRate: 4,
  // biosimilar section
  sectionBio: 6,
  biosimilarPenetration: 7,
  totalBiosimilarVolume: 8,
  ourShareOfBiosimilar: 9,
  ourMarketShare: 10,
  ourVolume: 11,
  inMarketPrice: 12,
  inMarketSales: 13,
  // originator derived section
  sectionOrig: 15,
  originatorShare: 16,
  originatorVolume: 17,
  originatorSales: 18,
  // partner economics section
  sectionPartner: 20,
  partnerNSP: 21,
  partnerNetSales: 22,
  apiGramsSupplied: 23,
  apiPricePerGram: 24,
  grossSupplyRevenue: 25,
  netSupplyRevenue: 26,
  royaltyFlat: 27,
  cumulativePNS: 28,
  royaltyTiered: 29,
  royaltyIncome: 30,
  milestoneIncome: 31,
} as const;

// ── Slot builder ──

function buildCalcSlot(
  ws: ReturnType<import('exceljs').Workbook['addWorksheet']>,
  slotIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const hasData = slotIndex < ctx.countries.length;
  const country: CountryAssumptions | null = hasData ? ctx.countries[slotIndex] : null;
  const co: CountryOutputs | null = hasData ? ctx.countryOutputs[slotIndex] : null;

  const sheetKey = `countryModel_${slotIndex}`;
  const inputKey = `country_${slotIndex}`;
  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;

  // Active? reference from Config sheet
  const activeRef = cellMap.getScalar('config', `countryActive_${slotIndex}`).toFormula();

  // Helper: wrap a formula with IF(active="Yes", formula, 0)
  const guard = (formula: string): string => `IF(${activeRef}="Yes",${formula},0)`;

  // Launch index reference (from Inputs sheet, dynamically computed)
  const launchIdxRef = cellMap.getScalar(inputKey, 'biosimLaunchIdx').toFormula();

  // Zero arrays for cached values when no data
  const zeroArr = Array(NP).fill(0);

  const base = calcSlotFirstRow(slotIndex);

  // ════════════════════════════════════════════════════════════
  // Market Overview
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionMarket, `Country ${slotIndex + 1} Calculations`, colCount);

  // 1. Molecule Volume — reference from consolidated Inputs sheet (already has formulas)
  {
    const row = base + CALC_OFFSETS.marketVolume;
    writeFormulaRow(ws, row, 'Molecule Volume', NP, (p) => {
      return guard(cellMap.get(inputKey, 'marketVolume', p).toFormula());
    }, co?.marketVolume ?? zeroArr, cellMap, sheetKey, 'marketVolume', NUM_FMT.integer, true);
  }

  // 2. Volume YoY %
  {
    const row = base + CALC_OFFSETS.volumeYoY;
    const mvRow = base + CALC_OFFSETS.marketVolume;
    writeFormulaRow(ws, row, 'Volume YoY %', NP, (p) => {
      if (p === 0) return '0';
      const thisRef = cellAddr(mvRow, periodCol(p));
      const prevRef = cellAddr(mvRow, periodCol(p - 1));
      return `IFERROR((${thisRef}-${prevRef})/${prevRef},0)`;
    }, co?.marketVolumeYoY ?? zeroArr, cellMap, sheetKey, 'marketVolumeYoY', NUM_FMT.percent);
  }

  // 3. Originator Ref Price — reference from consolidated Inputs sheet (already has formulas)
  {
    const row = base + CALC_OFFSETS.originatorRefPrice;
    writeFormulaRow(ws, row, 'Originator Ref Price', NP, (p) => {
      return guard(cellMap.get(inputKey, 'originatorPrice', p).toFormula());
    }, co?.originatorRefPrice ?? zeroArr, cellMap, sheetKey, 'originatorRefPrice', NUM_FMT.decimal2);
  }

  // 4. FX Rate
  {
    const row = base + CALC_OFFSETS.fxRate;
    writeFormulaRow(ws, row, 'FX Rate', NP, (p) => {
      return guard(cellMap.get(inputKey, 'fxRate', p).toFormula());
    }, country?.fxRate ?? zeroArr, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  }

  // ════════════════════════════════════════════════════════════
  // Biosimilar
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionBio, 'Biosimilar', colCount);

  // Biosimilar Penetration — use IF(period < launch, 0, input)
  {
    const row = base + CALC_OFFSETS.biosimilarPenetration;
    writeFormulaRow(ws, row, 'Biosimilar Penetration', NP, (p) => {
      const inputRef = cellMap.get(inputKey, 'biosimilarPenetration_active', p).toFormula();
      return guard(`IF(${p}<${launchIdxRef},0,${inputRef})`);
    }, co ? co.totalBiosimilarVolume.map((v, i) => co.marketVolume[i] > 0 ? v / co.marketVolume[i] : 0) : zeroArr,
      cellMap, sheetKey, 'biosimilarPenetration', NUM_FMT.percent);
  }

  // Total Biosimilar Volume
  {
    const row = base + CALC_OFFSETS.totalBiosimilarVolume;
    writeFormulaRow(ws, row, 'Total Biosimilar Volume', NP, (p) => {
      const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
      const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
      return guard(`${mktVol}*${pen}`);
    }, co?.totalBiosimilarVolume ?? zeroArr, cellMap, sheetKey, 'totalBiosimilarVolume', NUM_FMT.integer);
  }

  // Our Share of Biosimilar
  {
    const row = base + CALC_OFFSETS.ourShareOfBiosimilar;
    writeFormulaRow(ws, row, 'Our Share of Biosimilar', NP, (p) => {
      const inputRef = cellMap.get(inputKey, 'ourShareOfBiosimilar_active', p).toFormula();
      return guard(`IF(${p}<${launchIdxRef},0,${inputRef})`);
    }, co?.ourShareOfBiosimilarArr ?? zeroArr, cellMap, sheetKey, 'ourShareOfBiosimilar', NUM_FMT.percent);
  }

  // Our Market Share
  {
    const row = base + CALC_OFFSETS.ourMarketShare;
    writeFormulaRow(ws, row, 'Our Market Share', NP, (p) => {
      const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
      const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
      return guard(`${pen}*${ourShr}`);
    }, co?.biosimilarShare ?? zeroArr, cellMap, sheetKey, 'biosimilarShare', NUM_FMT.percent);
  }

  // Our Volume
  {
    const row = base + CALC_OFFSETS.ourVolume;
    writeFormulaRow(ws, row, 'Our Volume', NP, (p) => {
      const totalBioVol = cellMap.get(sheetKey, 'totalBiosimilarVolume', p).toLocal();
      const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
      return guard(`${totalBioVol}*${ourShr}`);
    }, co?.biosimilarVolume ?? zeroArr, cellMap, sheetKey, 'biosimilarVolume', NUM_FMT.integer);
  }

  // In-Market Price — uses IF for launch guard
  {
    const row = base + CALC_OFFSETS.inMarketPrice;
    writeFormulaRow(ws, row, 'In-Market Price', NP, (p) => {
      const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
      const pricePct = cellMap.get(inputKey, 'biosimilarPricePct_active', p).toFormula();
      return guard(`IF(${p}<${launchIdxRef},0,${origPrice}*${pricePct})`);
    }, co?.biosimilarInMarketPrice ?? zeroArr, cellMap, sheetKey, 'biosimilarInMarketPrice', NUM_FMT.decimal2);
  }

  // In-Market Sales
  {
    const row = base + CALC_OFFSETS.inMarketSales;
    writeFormulaRow(ws, row, 'In-Market Sales', NP, (p) => {
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      const price = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
      return guard(`${vol}*${price}`);
    }, co?.biosimilarInMarketSales ?? zeroArr, cellMap, sheetKey, 'biosimilarInMarketSales', NUM_FMT.integer);
  }

  // ════════════════════════════════════════════════════════════
  // Originator (Derived)
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionOrig, 'Originator (Derived)', colCount);

  // Originator Share
  {
    const row = base + CALC_OFFSETS.originatorShare;
    writeFormulaRow(ws, row, 'Originator Share', NP, (p) => {
      const biosPen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
      return guard(`MAX(0,1-${biosPen})`);
    }, co?.originatorShare ?? zeroArr, cellMap, sheetKey, 'originatorShare', NUM_FMT.percent);
  }

  // Originator Volume
  {
    const row = base + CALC_OFFSETS.originatorVolume;
    writeFormulaRow(ws, row, 'Originator Volume', NP, (p) => {
      const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
      const share = cellMap.get(sheetKey, 'originatorShare', p).toLocal();
      return guard(`${mktVol}*${share}`);
    }, co?.originatorVolume ?? zeroArr, cellMap, sheetKey, 'originatorVolume', NUM_FMT.integer);
  }

  // Originator Sales
  {
    const row = base + CALC_OFFSETS.originatorSales;
    writeFormulaRow(ws, row, 'Originator Sales', NP, (p) => {
      const vol = cellMap.get(sheetKey, 'originatorVolume', p).toLocal();
      const price = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
      return guard(`${vol}*${price}`);
    }, co?.originatorSales ?? zeroArr, cellMap, sheetKey, 'originatorSales', NUM_FMT.integer);
  }

  // ════════════════════════════════════════════════════════════
  // Partner Economics
  // ════════════════════════════════════════════════════════════
  writeSection(ws, base + CALC_OFFSETS.sectionPartner, 'Partner Economics', colCount);

  // Partner Net Selling Price
  {
    const row = base + CALC_OFFSETS.partnerNSP;
    writeFormulaRow(ws, row, 'Partner Net Selling Price', NP, (p) => {
      const inMktPrice = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
      const gtnPct = cellMap.get(inputKey, 'partnerGtnPct_active', p).toFormula();
      return guard(`IF(${p}<${launchIdxRef},0,${inMktPrice}*(1-${gtnPct}))`);
    }, co?.partnerNetSellingPrice ?? zeroArr, cellMap, sheetKey, 'partnerNetSellingPrice', NUM_FMT.decimal2);
  }

  // Partner Net Sales
  {
    const row = base + CALC_OFFSETS.partnerNetSales;
    writeFormulaRow(ws, row, 'Partner Net Sales', NP, (p) => {
      const nsp = cellMap.get(sheetKey, 'partnerNetSellingPrice', p).toLocal();
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      return guard(`${nsp}*${vol}`);
    }, co?.partnerNetSales ?? zeroArr, cellMap, sheetKey, 'partnerNetSales', NUM_FMT.integer);
  }

  // API Grams Supplied
  const unitsPerGramRef = cellMap.getScalar('config', 'unitsPerGram').toFormula();
  {
    const row = base + CALC_OFFSETS.apiGramsSupplied;
    writeFormulaRow(ws, row, 'API Grams Supplied', NP, (p) => {
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      return guard(`IF(${p}<${launchIdxRef},0,${vol}/${unitsPerGramRef})`);
    }, co?.apiGramsSupplied ?? zeroArr, cellMap, sheetKey, 'apiGramsSupplied', NUM_FMT.decimal2);
  }

  // API Price/Gram — Excel IF() switches on Config!apiPricingModel
  const apiPricingModelRef = cellMap.getScalar('config', 'apiPricingModel').toFormula();
  {
    const row = base + CALC_OFFSETS.apiPricePerGram;
    writeFormulaRow(ws, row, 'API Price/Gram', NP, (p) => {
      const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      const supplyPct = cellMap.get(inputKey, 'supplyPricePct_active', p).toFormula();
      const fixedPrice = cellMap.get(inputKey, 'fixedSupplyPricePerGram_active', p).toFormula();
      const pctFormula = `IFERROR(${partnerNS}/(${vol}/${unitsPerGramRef})*${supplyPct},0)`;
      return guard(`IF(${p}<${launchIdxRef},0,IF(LEFT(${apiPricingModelRef},1)="P",${pctFormula},${fixedPrice}))`);
    }, co?.apiPricePerGram ?? zeroArr, cellMap, sheetKey, 'apiPricePerGram', NUM_FMT.decimal2);
  }

  // Gross Supply Revenue
  {
    const row = base + CALC_OFFSETS.grossSupplyRevenue;
    writeFormulaRow(ws, row, 'Gross Supply Revenue', NP, (p) => {
      const grams = cellMap.get(sheetKey, 'apiGramsSupplied', p).toLocal();
      const price = cellMap.get(sheetKey, 'apiPricePerGram', p).toLocal();
      return guard(`${grams}*${price}`);
    }, co?.grossSupplyRevenue ?? zeroArr, cellMap, sheetKey, 'grossSupplyRevenue', NUM_FMT.integer);
  }

  // Net Supply Revenue
  {
    const row = base + CALC_OFFSETS.netSupplyRevenue;
    writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
      return cellMap.get(sheetKey, 'grossSupplyRevenue', p).toLocal();
    }, co?.netSupplyRevenue ?? zeroArr, cellMap, sheetKey, 'netSupplyRevenue', NUM_FMT.integer, true);
  }

  // Royalty (Flat)
  {
    const row = base + CALC_OFFSETS.royaltyFlat;
    writeFormulaRow(ws, row, 'Royalty (Flat)', NP, (p) => {
      const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const royaltyPct = cellMap.get(inputKey, 'royaltyRatePct_active', p).toFormula();
      return guard(`${partnerNS}*${royaltyPct}`);
    }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyFlat', NUM_FMT.integer);
  }

  // Cumulative Partner Net Sales
  {
    const row = base + CALC_OFFSETS.cumulativePNS;
    writeFormulaRow(ws, row, 'Cumulative Partner Net Sales', NP, (p) => {
      const pns = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      if (p === 0) return guard(pns);
      const prev = cellMap.get(sheetKey, 'cumulativePNS', p - 1).toLocal();
      return guard(`${prev}+${pns}`);
    }, co?.partnerNetSales
      ? co.partnerNetSales.reduce<number[]>((acc, v, i) => { acc.push((acc[i - 1] ?? 0) + v); return acc; }, [])
      : zeroArr,
    cellMap, sheetKey, 'cumulativePNS', NUM_FMT.integer);
  }

  // Royalty (Tiered)
  {
    const row = base + CALC_OFFSETS.royaltyTiered;
    writeFormulaRow(ws, row, 'Royalty (Tiered)', NP, (p) => {
      const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const cumPNS = cellMap.get(sheetKey, 'cumulativePNS', p).toLocal();
      let formula = '0';
      for (let t = 0; t < 5; t++) {
        const threshRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_threshold`).toFormula();
        const rateRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_rate`).toFormula();
        formula = `IF(${cumPNS}>=${threshRef},${rateRef},${formula})`;
      }
      return guard(`${partnerNS}*(${formula})`);
    }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyTiered', NUM_FMT.integer);
  }

  // Royalty Income — Excel IF() switches on royalty mode
  const useFixedRef = cellMap.getScalar(inputKey, 'useFixedRoyaltyRate').toFormula();
  {
    const row = base + CALC_OFFSETS.royaltyIncome;
    writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
      const flat = cellMap.get(sheetKey, 'royaltyFlat', p).toLocal();
      const tiered = cellMap.get(sheetKey, 'royaltyTiered', p).toLocal();
      return guard(`IF(${useFixedRef}="Flat",${flat},${tiered})`);
    }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyIncome', NUM_FMT.integer);
  }

  // Milestone Income
  {
    const row = base + CALC_OFFSETS.milestoneIncome;
    writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
      return guard(cellMap.get(inputKey, 'milestonePayments', p).toFormula());
    }, co?.milestoneIncome ?? zeroArr, cellMap, sheetKey, 'milestoneIncome', NUM_FMT.integer);
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

  for (let s = 0; s < MAX_COUNTRY_SLOTS; s++) {
    buildCalcSlot(ws, s, ctx, cellMap);
  }
}
