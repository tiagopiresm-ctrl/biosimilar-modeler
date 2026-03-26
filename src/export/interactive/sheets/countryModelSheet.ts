// ──────────────────────────────────────────────────────────────
// Interactive Excel — Per-country MODEL (output) sheet builder (10 slots)
// ──────────────────────────────────────────────────────────────
// Creates 10 model sheets ("C1 Model" ... "C10 Model"). Every
// formula is wrapped in IF(Config!Active="Yes", formula, 0) so
// inactive country slots produce zeros throughout.
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

/** Sheet name for country model slot (0-based). */
export function countryModelSheetName(slotIndex: number): string {
  return `C${slotIndex + 1} Model`;
}

// ── Main builder for a single country slot ──

function buildCountryModelSheet(
  wb: Workbook,
  slotIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const hasData = slotIndex < ctx.countries.length;
  const country: CountryAssumptions | null = hasData ? ctx.countries[slotIndex] : null;
  const co: CountryOutputs | null = hasData ? ctx.countryOutputs[slotIndex] : null;

  const sheetKey = `countryModel_${slotIndex}`;
  const inputKey = `country_${slotIndex}`;
  const sheetName = countryModelSheetName(slotIndex);
  const ws = wb.addWorksheet(sheetName);

  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;
  const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;
  const launchIdx = country?.biosimilarLaunchPeriodIndex ?? 5;

  // Active? reference from Config sheet
  const activeRef = cellMap.getScalar('config', `countryActive_${slotIndex}`).toFormula();

  // Helper: wrap a formula with IF(active="Yes", formula, 0)
  const guard = (formula: string): string => `IF(${activeRef}="Yes",${formula},0)`;

  // Zero arrays for cached values when no data
  const zeroArr = Array(NP).fill(0);

  setupSheet(ws, NP);
  writePeriodHeader(ws, ctx.periodLabels);

  let row = 3;

  // ════════════════════════════════════════════════════════════
  // Section: Market Overview
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Market Overview', colCount);
  row++;

  // 1. Market Volume
  writeFormulaRow(ws, row, 'Market Volume', NP, (p) => {
    if (p < forecastStartIdx) {
      return guard(cellMap.get(inputKey, 'marketVolume', p).toFormula());
    }
    if (p === 0) {
      return guard(cellMap.get(inputKey, 'marketVolume', p).toFormula());
    }
    const prevRef = cellAddr(row, periodCol(p - 1));
    const adjRef = cellMap.get(inputKey, 'volumeAdjustment_active', p).toFormula();
    return guard(`${prevRef}*(1+${adjRef})`);
  }, co?.marketVolume ?? zeroArr, cellMap, sheetKey, 'marketVolume', NUM_FMT.integer, true);
  row++;

  // 2. Volume YoY %
  const marketVolRow = row - 1;
  writeFormulaRow(ws, row, 'Volume YoY %', NP, (p) => {
    if (p === 0) return '0';
    const thisRef = cellAddr(marketVolRow, periodCol(p));
    const prevRef = cellAddr(marketVolRow, periodCol(p - 1));
    return `IFERROR((${thisRef}-${prevRef})/${prevRef},0)`;
  }, co?.marketVolumeYoY ?? zeroArr, cellMap, sheetKey, 'marketVolumeYoY', NUM_FMT.percent);
  row++;

  // 3. Originator Ref Price
  writeFormulaRow(ws, row, 'Originator Ref Price', NP, (p) => {
    if (p < forecastStartIdx) {
      return guard(cellMap.get(inputKey, 'originatorPrice', p).toFormula());
    }
    if (p === 0) {
      return guard(cellMap.get(inputKey, 'originatorPrice', p).toFormula());
    }
    const prevRef = cellAddr(row, periodCol(p - 1));
    const growthRef = cellMap.get(inputKey, 'originatorPriceGrowth_active', p).toFormula();
    return guard(`${prevRef}*(1+${growthRef})`);
  }, co?.originatorRefPrice ?? zeroArr, cellMap, sheetKey, 'originatorRefPrice', NUM_FMT.decimal2);
  row++;

  // 4. FX Rate (display)
  writeFormulaRow(ws, row, 'FX Rate', NP, (p) => {
    return guard(cellMap.get(inputKey, 'fxRate', p).toFormula());
  }, country?.fxRate ?? zeroArr, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Generic Competitors
  // ════════════════════════════════════════════════════════════
  const generics = country?.genericCompetitors ?? [];
  if (generics.length > 0 && co) {
    writeSection(ws, row, 'Generic Competitors', colCount);
    row++;

    for (let g = 0; g < generics.length; g++) {
      const generic = generics[g];
      const gOut = co.genericOutputs[g];
      const gLaunch = generic.launchPeriodIndex;
      // Generic share
      writeFormulaRow(ws, row, `Generic ${g + 1} Share`, NP, (p) => {
        if (p < gLaunch) return '0';
        return guard(cellMap.get(inputKey, `generic_${g}_marketShare_active`, p).toFormula());
      }, gOut.share, cellMap, sheetKey, `generic_${g}_share`, NUM_FMT.percent);
      row++;

      // Generic volume
      const gShareRow = row - 1;
      writeFormulaRow(ws, row, `Generic ${g + 1} Volume`, NP, (p) => {
        const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
        const share = cellAddr(gShareRow, periodCol(p));
        return guard(`${mktVol}*${share}`);
      }, gOut.volume, cellMap, sheetKey, `generic_${g}_volume`, NUM_FMT.integer);
      row++;

      // Generic price
      writeFormulaRow(ws, row, `Generic ${g + 1} Price`, NP, (p) => {
        if (p < gLaunch) return '0';
        const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
        const pricePct = cellMap.get(inputKey, `generic_${g}_pricePct_active`, p).toFormula();
        return guard(`${origPrice}*${pricePct}`);
      }, gOut.price, cellMap, sheetKey, `generic_${g}_price`, NUM_FMT.decimal2);
      row++;

      // Generic sales
      const gVolRow = row - 2;
      const gPriceRow = row - 1;
      writeFormulaRow(ws, row, `Generic ${g + 1} Sales`, NP, (p) => {
        const vol = cellAddr(gVolRow, periodCol(p));
        const price = cellAddr(gPriceRow, periodCol(p));
        return guard(`${vol}*${price}`);
      }, gOut.sales, cellMap, sheetKey, `generic_${g}_sales`, NUM_FMT.integer);
      row++;

      // Blank between generics
      row++;
    }

    // 9. Total Generic Share
    writeFormulaRow(ws, row, 'Total Generic Share', NP, (p) => {
      const refs = generics.map((_, g) =>
        cellMap.get(sheetKey, `generic_${g}_share`, p).toLocal(),
      );
      return refs.join('+');
    }, co.totalGenericShare, cellMap, sheetKey, 'totalGenericShare', NUM_FMT.percent, true);
    row++;

    // 10. Total Generic Volume
    writeFormulaRow(ws, row, 'Total Generic Volume', NP, (p) => {
      const refs = generics.map((_, g) =>
        cellMap.get(sheetKey, `generic_${g}_volume`, p).toLocal(),
      );
      return refs.join('+');
    }, co.totalGenericVolume, cellMap, sheetKey, 'totalGenericVolume', NUM_FMT.integer, true);
    row++;

    // 11. Total Generic Sales
    writeFormulaRow(ws, row, 'Total Generic Sales', NP, (p) => {
      const refs = generics.map((_, g) =>
        cellMap.get(sheetKey, `generic_${g}_sales`, p).toLocal(),
      );
      return refs.join('+');
    }, co.totalGenericSales, cellMap, sheetKey, 'totalGenericSales', NUM_FMT.integer, true);
    row++;
  } else {
    // No generics — register zero rows
    writeFormulaRow(ws, row, 'Total Generic Share', NP, () => '0',
      co?.totalGenericShare ?? zeroArr, cellMap, sheetKey, 'totalGenericShare', NUM_FMT.percent, true);
    row++;
    writeFormulaRow(ws, row, 'Total Generic Volume', NP, () => '0',
      co?.totalGenericVolume ?? zeroArr, cellMap, sheetKey, 'totalGenericVolume', NUM_FMT.integer, true);
    row++;
    writeFormulaRow(ws, row, 'Total Generic Sales', NP, () => '0',
      co?.totalGenericSales ?? zeroArr, cellMap, sheetKey, 'totalGenericSales', NUM_FMT.integer, true);
    row++;
  }

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Biosimilar
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Biosimilar', colCount);
  row++;

  // 12a. Biosimilar Penetration (total biosimilar share of molecule market)
  writeFormulaRow(ws, row, 'Biosimilar Penetration', NP, (p) => {
    if (p < launchIdx) return '0';
    return guard(cellMap.get(inputKey, 'biosimilarPenetration_active', p).toFormula());
  }, co ? co.totalBiosimilarVolume.map((v, i) => co.marketVolume[i] > 0 ? v / co.marketVolume[i] : 0) : zeroArr,
    cellMap, sheetKey, 'biosimilarPenetration', NUM_FMT.percent);
  row++;

  // 12b. Total Biosimilar Volume = Market Volume x Biosimilar Penetration
  writeFormulaRow(ws, row, 'Total Biosimilar Volume', NP, (p) => {
    const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
    const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
    return guard(`${mktVol}*${pen}`);
  }, co?.totalBiosimilarVolume ?? zeroArr, cellMap, sheetKey, 'totalBiosimilarVolume', NUM_FMT.integer);
  row++;

  // 12c. Our Share of Biosimilar
  writeFormulaRow(ws, row, 'Our Share of Biosimilar', NP, (p) => {
    if (p < launchIdx) return '0';
    return guard(cellMap.get(inputKey, 'ourShareOfBiosimilar_active', p).toFormula());
  }, co?.ourShareOfBiosimilarArr ?? zeroArr, cellMap, sheetKey, 'ourShareOfBiosimilar', NUM_FMT.percent);
  row++;

  // 12d. Our Market Share (= penetration x our share)
  writeFormulaRow(ws, row, 'Our Market Share', NP, (p) => {
    const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
    const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
    return guard(`${pen}*${ourShr}`);
  }, co?.biosimilarShare ?? zeroArr, cellMap, sheetKey, 'biosimilarShare', NUM_FMT.percent);
  row++;

  // 13. Our Volume = Total Biosimilar Volume x Our Share
  writeFormulaRow(ws, row, 'Our Volume', NP, (p) => {
    const totalBioVol = cellMap.get(sheetKey, 'totalBiosimilarVolume', p).toLocal();
    const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
    return guard(`${totalBioVol}*${ourShr}`);
  }, co?.biosimilarVolume ?? zeroArr, cellMap, sheetKey, 'biosimilarVolume', NUM_FMT.integer);
  row++;

  // 14. In-Market Price
  writeFormulaRow(ws, row, 'In-Market Price', NP, (p) => {
    if (p < launchIdx) return '0';
    const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
    const pricePct = cellMap.get(inputKey, 'biosimilarPricePct_active', p).toFormula();
    return guard(`${origPrice}*${pricePct}`);
  }, co?.biosimilarInMarketPrice ?? zeroArr, cellMap, sheetKey, 'biosimilarInMarketPrice', NUM_FMT.decimal2);
  row++;

  // 15. In-Market Sales
  writeFormulaRow(ws, row, 'In-Market Sales', NP, (p) => {
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    const price = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
    return guard(`${vol}*${price}`);
  }, co?.biosimilarInMarketSales ?? zeroArr, cellMap, sheetKey, 'biosimilarInMarketSales', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Originator (derived)
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Originator (Derived)', colCount);
  row++;

  // 16. Originator Share = 1 - biosimilarPenetration (total, not just ours)
  writeFormulaRow(ws, row, 'Originator Share', NP, (p) => {
    const biosPen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
    return guard(`MAX(0,1-${biosPen})`);
  }, co?.originatorShare ?? zeroArr, cellMap, sheetKey, 'originatorShare', NUM_FMT.percent);
  row++;

  // 17. Originator Volume
  writeFormulaRow(ws, row, 'Originator Volume', NP, (p) => {
    const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
    const share = cellMap.get(sheetKey, 'originatorShare', p).toLocal();
    return guard(`${mktVol}*${share}`);
  }, co?.originatorVolume ?? zeroArr, cellMap, sheetKey, 'originatorVolume', NUM_FMT.integer);
  row++;

  // 18. Originator Sales
  writeFormulaRow(ws, row, 'Originator Sales', NP, (p) => {
    const vol = cellMap.get(sheetKey, 'originatorVolume', p).toLocal();
    const price = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
    return guard(`${vol}*${price}`);
  }, co?.originatorSales ?? zeroArr, cellMap, sheetKey, 'originatorSales', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Partner Economics
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Partner Economics', colCount);
  row++;

  // 19. Partner Net Selling Price
  writeFormulaRow(ws, row, 'Partner Net Selling Price', NP, (p) => {
    if (p < launchIdx) return '0';
    const inMktPrice = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
    const gtnPct = cellMap.get(inputKey, 'partnerGtnPct_active', p).toFormula();
    return guard(`${inMktPrice}*(1-${gtnPct})`);
  }, co?.partnerNetSellingPrice ?? zeroArr, cellMap, sheetKey, 'partnerNetSellingPrice', NUM_FMT.decimal2);
  row++;

  // 20. Partner Net Sales
  writeFormulaRow(ws, row, 'Partner Net Sales', NP, (p) => {
    const nsp = cellMap.get(sheetKey, 'partnerNetSellingPrice', p).toLocal();
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    return guard(`${nsp}*${vol}`);
  }, co?.partnerNetSales ?? zeroArr, cellMap, sheetKey, 'partnerNetSales', NUM_FMT.integer);
  row++;

  // 21. API Grams Supplied = Volume / UnitsPerGram (no overage — matches web model)
  const unitsPerGramRef = cellMap.getScalar('config', 'unitsPerGram').toFormula();

  writeFormulaRow(ws, row, 'API Grams Supplied', NP, (p) => {
    if (p < launchIdx) return '0';
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    return guard(`${vol}/${unitsPerGramRef}`);
  }, co?.apiGramsSupplied ?? zeroArr, cellMap, sheetKey, 'apiGramsSupplied', NUM_FMT.decimal2);
  row++;

  // 22. API Price/Gram
  if (ctx.config.apiPricingModel === 'percentage') {
    writeFormulaRow(ws, row, 'API Price/Gram', NP, (p) => {
      if (p < launchIdx) return '0';
      const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      const supplyPct = cellMap.get(inputKey, 'supplyPricePct_active', p).toFormula();
      return guard(`IFERROR(${partnerNS}/(${vol}/${unitsPerGramRef})*${supplyPct},0)`);
    }, co?.apiPricePerGram ?? zeroArr, cellMap, sheetKey, 'apiPricePerGram', NUM_FMT.decimal2);
  } else {
    writeFormulaRow(ws, row, 'API Price/Gram', NP, (p) => {
      if (p < launchIdx) return '0';
      return guard(cellMap.get(inputKey, 'fixedSupplyPricePerGram_active', p).toFormula());
    }, co?.apiPricePerGram ?? zeroArr, cellMap, sheetKey, 'apiPricePerGram', NUM_FMT.decimal2);
  }
  row++;

  // 23. Gross Supply Revenue
  writeFormulaRow(ws, row, 'Gross Supply Revenue', NP, (p) => {
    const grams = cellMap.get(sheetKey, 'apiGramsSupplied', p).toLocal();
    const price = cellMap.get(sheetKey, 'apiPricePerGram', p).toLocal();
    return guard(`${grams}*${price}`);
  }, co?.grossSupplyRevenue ?? zeroArr, cellMap, sheetKey, 'grossSupplyRevenue', NUM_FMT.integer);
  row++;

  // 24. Net Supply Revenue
  writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
    return cellMap.get(sheetKey, 'grossSupplyRevenue', p).toLocal();
  }, co?.netSupplyRevenue ?? zeroArr, cellMap, sheetKey, 'netSupplyRevenue', NUM_FMT.integer, true);
  row++;

  // 25. Royalty Income (flat — used when useFixedRoyaltyRate=1)
  writeFormulaRow(ws, row, 'Royalty (Flat)', NP, (p) => {
    const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
    const royaltyPct = cellMap.get(inputKey, 'royaltyRatePct_active', p).toFormula();
    return guard(`${partnerNS}*${royaltyPct}`);
  }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyFlat', NUM_FMT.integer);
  row++;

  // 25a2. Cumulative Partner Net Sales (needed for tiered royalty lookup)
  writeFormulaRow(ws, row, 'Cumulative Partner Net Sales', NP, (p) => {
    const pns = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
    if (p === 0) return guard(pns);
    const prev = cellMap.get(sheetKey, 'cumulativePNS', p - 1).toLocal();
    return guard(`${prev}+${pns}`);
  }, co?.partnerNetSales
    ? co.partnerNetSales.reduce<number[]>((acc, v, i) => { acc.push((acc[i - 1] ?? 0) + v); return acc; }, [])
    : zeroArr,
  cellMap, sheetKey, 'cumulativePNS', NUM_FMT.integer);
  row++;

  // 25b. Royalty Income (tiered — cumulative PNS ratchet: lookup tier rate from cumulative PNS, apply to annual PNS)
  // Matches calculations.ts: accumulate PNS, find highest tier whose threshold <= cumulative PNS, apply that rate to annual PNS
  writeFormulaRow(ws, row, 'Royalty (Tiered)', NP, (p) => {
    const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
    const cumPNS = cellMap.get(sheetKey, 'cumulativePNS', p).toLocal();
    // Build nested IF to find the highest tier rate for which cumPNS >= threshold
    // IF(cumPNS>=T5, R5, IF(cumPNS>=T4, R4, IF(cumPNS>=T3, R3, IF(cumPNS>=T2, R2, IF(cumPNS>=T1, R1, 0)))))
    let formula = '0';
    for (let t = 0; t < 5; t++) {
      const threshRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_threshold`).toFormula();
      const rateRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_rate`).toFormula();
      formula = `IF(${cumPNS}>=${threshRef},${rateRef},${formula})`;
    }
    return guard(`${partnerNS}*(${formula})`);
  }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyTiered', NUM_FMT.integer);
  row++;

  // 25c. Royalty Income (switch: IF useFixedRoyaltyRate=1 then flat, else tiered)
  const useFixedRef = cellMap.getScalar(inputKey, 'useFixedRoyaltyRate').toFormula();
  writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
    const flat = cellMap.get(sheetKey, 'royaltyFlat', p).toLocal();
    const tiered = cellMap.get(sheetKey, 'royaltyTiered', p).toLocal();
    return guard(`IF(${useFixedRef}="Yes",${flat},${tiered})`);
  }, co?.royaltyIncome ?? zeroArr, cellMap, sheetKey, 'royaltyIncome', NUM_FMT.integer);
  row++;

  // 26. Milestone Income
  writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
    return guard(cellMap.get(inputKey, 'milestonePayments', p).toFormula());
  }, co?.milestoneIncome ?? zeroArr, cellMap, sheetKey, 'milestoneIncome', NUM_FMT.integer);
  row++;
}

// ── Exported entry point ──

export function addInteractiveCountryModelSheets(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  for (let s = 0; s < MAX_COUNTRY_SLOTS; s++) {
    buildCountryModelSheet(wb, s, ctx, cellMap);
  }
}
