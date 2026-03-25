// ──────────────────────────────────────────────────────────────
// Interactive Excel — Per-country MODEL (output) sheet builder
// ──────────────────────────────────────────────────────────────
// Each country gets a formula-only sheet that references the
// country INPUT sheet via the CellMap. All cells use formulaValue.
// ──────────────────────────────────────────────────────────────

import type { Workbook } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import { NUM_FMT } from '../../excelStyles';
import {
  cellAddr, periodCol,
  writeFormulaRow, writeSection,
  setupSheet, writePeriodHeader,
} from '../formulaHelpers';

// ── Main builder for a single country ──

function buildCountryModelSheet(
  wb: Workbook,
  ci: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const country = ctx.countries[ci];
  const co = ctx.countryOutputs[ci];
  const sheetKey = `countryModel_${ci}`;
  const inputKey = `country_${ci}`;
  const sheetName = `${country.name} Model`.slice(0, 31);
  const ws = wb.addWorksheet(sheetName);

  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;
  const forecastStartIdx = ctx.config.forecastStartYear - ctx.periodConfig.startYear;
  const launchIdx = country.biosimilarLaunchPeriodIndex;

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
      return cellMap.get(inputKey, 'marketVolume', p).toFormula();
    }
    if (p === 0) {
      return cellMap.get(inputKey, 'marketVolume', p).toFormula();
    }
    const prevRef = cellAddr(row, periodCol(p - 1));
    const adjRef = cellMap.get(inputKey, 'volumeAdjustment_active', p).toFormula();
    return `${prevRef}*(1+${adjRef})`;
  }, co.marketVolume, cellMap, sheetKey, 'marketVolume', NUM_FMT.integer, true);
  row++;

  // 2. Volume YoY %
  const marketVolRow = row - 1;
  writeFormulaRow(ws, row, 'Volume YoY %', NP, (p) => {
    if (p === 0) return '0';
    const thisRef = cellAddr(marketVolRow, periodCol(p));
    const prevRef = cellAddr(marketVolRow, periodCol(p - 1));
    return `IFERROR((${thisRef}-${prevRef})/${prevRef},0)`;
  }, co.marketVolumeYoY, cellMap, sheetKey, 'marketVolumeYoY', NUM_FMT.percent);
  row++;

  // 3. Originator Ref Price
  writeFormulaRow(ws, row, 'Originator Ref Price', NP, (p) => {
    if (p < forecastStartIdx) {
      return cellMap.get(inputKey, 'originatorPrice', p).toFormula();
    }
    if (p === 0) {
      return cellMap.get(inputKey, 'originatorPrice', p).toFormula();
    }
    const prevRef = cellAddr(row, periodCol(p - 1));
    const growthRef = cellMap.get(inputKey, 'originatorPriceGrowth_active', p).toFormula();
    return `${prevRef}*(1+${growthRef})`;
  }, co.originatorRefPrice, cellMap, sheetKey, 'originatorRefPrice', NUM_FMT.decimal2);
  row++;

  // 4. FX Rate (display)
  writeFormulaRow(ws, row, 'FX Rate', NP, (p) => {
    return cellMap.get(inputKey, 'fxRate', p).toFormula();
  }, country.fxRate, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Generic Competitors
  // ════════════════════════════════════════════════════════════
  const generics = country.genericCompetitors;
  if (generics.length > 0) {
    writeSection(ws, row, 'Generic Competitors', colCount);
    row++;

    for (let g = 0; g < generics.length; g++) {
      const generic = generics[g];
      const gOut = co.genericOutputs[g];
      const gLaunch = generic.launchPeriodIndex;
      // Generic share
      writeFormulaRow(ws, row, `Generic ${g + 1} Share`, NP, (p) => {
        if (p < gLaunch) return '0';
        return cellMap.get(inputKey, `generic_${g}_marketShare_active`, p).toFormula();
      }, gOut.share, cellMap, sheetKey, `generic_${g}_share`, NUM_FMT.percent);
      row++;

      // Generic volume
      const gShareRow = row - 1;
      writeFormulaRow(ws, row, `Generic ${g + 1} Volume`, NP, (p) => {
        const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
        const share = cellAddr(gShareRow, periodCol(p));
        return `${mktVol}*${share}`;
      }, gOut.volume, cellMap, sheetKey, `generic_${g}_volume`, NUM_FMT.integer);
      row++;

      // Generic price
      writeFormulaRow(ws, row, `Generic ${g + 1} Price`, NP, (p) => {
        if (p < gLaunch) return '0';
        const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
        const pricePct = cellMap.get(inputKey, `generic_${g}_pricePct_active`, p).toFormula();
        return `${origPrice}*${pricePct}`;
      }, gOut.price, cellMap, sheetKey, `generic_${g}_price`, NUM_FMT.decimal2);
      row++;

      // Generic sales
      const gVolRow = row - 2;
      const gPriceRow = row - 1;
      writeFormulaRow(ws, row, `Generic ${g + 1} Sales`, NP, (p) => {
        const vol = cellAddr(gVolRow, periodCol(p));
        const price = cellAddr(gPriceRow, periodCol(p));
        return `${vol}*${price}`;
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
      co.totalGenericShare, cellMap, sheetKey, 'totalGenericShare', NUM_FMT.percent, true);
    row++;
    writeFormulaRow(ws, row, 'Total Generic Volume', NP, () => '0',
      co.totalGenericVolume, cellMap, sheetKey, 'totalGenericVolume', NUM_FMT.integer, true);
    row++;
    writeFormulaRow(ws, row, 'Total Generic Sales', NP, () => '0',
      co.totalGenericSales, cellMap, sheetKey, 'totalGenericSales', NUM_FMT.integer, true);
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
    return cellMap.get(inputKey, 'biosimilarPenetration_active', p).toFormula();
  }, co.totalBiosimilarVolume.map((v, i) => co.marketVolume[i] > 0 ? v / co.marketVolume[i] : 0),
    cellMap, sheetKey, 'biosimilarPenetration', NUM_FMT.percent);
  row++;

  // 12b. Total Biosimilar Volume = Market Volume × Biosimilar Penetration
  writeFormulaRow(ws, row, 'Total Biosimilar Volume', NP, (p) => {
    const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
    const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
    return `${mktVol}*${pen}`;
  }, co.totalBiosimilarVolume, cellMap, sheetKey, 'totalBiosimilarVolume', NUM_FMT.integer);
  row++;

  // 12c. Our Share of Biosimilar
  writeFormulaRow(ws, row, 'Our Share of Biosimilar', NP, (p) => {
    if (p < launchIdx) return '0';
    return cellMap.get(inputKey, 'ourShareOfBiosimilar_active', p).toFormula();
  }, co.ourShareOfBiosimilarArr, cellMap, sheetKey, 'ourShareOfBiosimilar', NUM_FMT.percent);
  row++;

  // 12d. Our Market Share (= penetration × our share)
  writeFormulaRow(ws, row, 'Our Market Share', NP, (p) => {
    const pen = cellMap.get(sheetKey, 'biosimilarPenetration', p).toLocal();
    const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
    return `${pen}*${ourShr}`;
  }, co.biosimilarShare, cellMap, sheetKey, 'biosimilarShare', NUM_FMT.percent);
  row++;

  // 13. Our Volume = Total Biosimilar Volume × Our Share
  writeFormulaRow(ws, row, 'Our Volume', NP, (p) => {
    const totalBioVol = cellMap.get(sheetKey, 'totalBiosimilarVolume', p).toLocal();
    const ourShr = cellMap.get(sheetKey, 'ourShareOfBiosimilar', p).toLocal();
    return `${totalBioVol}*${ourShr}`;
  }, co.biosimilarVolume, cellMap, sheetKey, 'biosimilarVolume', NUM_FMT.integer);
  row++;

  // 14. In-Market Price
  writeFormulaRow(ws, row, 'In-Market Price', NP, (p) => {
    if (p < launchIdx) return '0';
    const origPrice = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
    const pricePct = cellMap.get(inputKey, 'biosimilarPricePct_active', p).toFormula();
    return `${origPrice}*${pricePct}`;
  }, co.biosimilarInMarketPrice, cellMap, sheetKey, 'biosimilarInMarketPrice', NUM_FMT.decimal2);
  row++;

  // 15. In-Market Sales
  writeFormulaRow(ws, row, 'In-Market Sales', NP, (p) => {
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    const price = cellMap.get(sheetKey, 'biosimilarInMarketPrice', p).toLocal();
    return `${vol}*${price}`;
  }, co.biosimilarInMarketSales, cellMap, sheetKey, 'biosimilarInMarketSales', NUM_FMT.integer);
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
    return `MAX(0,1-${biosPen})`;
  }, co.originatorShare, cellMap, sheetKey, 'originatorShare', NUM_FMT.percent);
  row++;

  // 17. Originator Volume
  writeFormulaRow(ws, row, 'Originator Volume', NP, (p) => {
    const mktVol = cellMap.get(sheetKey, 'marketVolume', p).toLocal();
    const share = cellMap.get(sheetKey, 'originatorShare', p).toLocal();
    return `${mktVol}*${share}`;
  }, co.originatorVolume, cellMap, sheetKey, 'originatorVolume', NUM_FMT.integer);
  row++;

  // 18. Originator Sales
  writeFormulaRow(ws, row, 'Originator Sales', NP, (p) => {
    const vol = cellMap.get(sheetKey, 'originatorVolume', p).toLocal();
    const price = cellMap.get(sheetKey, 'originatorRefPrice', p).toLocal();
    return `${vol}*${price}`;
  }, co.originatorSales, cellMap, sheetKey, 'originatorSales', NUM_FMT.integer);
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
    return `${inMktPrice}*(1-${gtnPct})`;
  }, co.partnerNetSellingPrice, cellMap, sheetKey, 'partnerNetSellingPrice', NUM_FMT.decimal2);
  row++;

  // 20. Partner Net Sales
  writeFormulaRow(ws, row, 'Partner Net Sales', NP, (p) => {
    const nsp = cellMap.get(sheetKey, 'partnerNetSellingPrice', p).toLocal();
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    return `${nsp}*${vol}`;
  }, co.partnerNetSales, cellMap, sheetKey, 'partnerNetSales', NUM_FMT.integer);
  row++;

  // 21. API Grams Supplied
  const unitsPerGramRef = cellMap.getScalar('config', 'unitsPerGram').toFormula();
  const mfgOverageRef = cellMap.getScalar('config', 'manufacturingOverage').toFormula();

  writeFormulaRow(ws, row, 'API Grams Supplied', NP, (p) => {
    if (p < launchIdx) return '0';
    const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
    return `(${vol}/${unitsPerGramRef})*(1+${mfgOverageRef})`;
  }, co.apiGramsSupplied, cellMap, sheetKey, 'apiGramsSupplied', NUM_FMT.decimal2);
  row++;

  // 22. API Price/Gram
  if (ctx.config.apiPricingModel === 'percentage') {
    writeFormulaRow(ws, row, 'API Price/Gram', NP, (p) => {
      if (p < launchIdx) return '0';
      const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
      const vol = cellMap.get(sheetKey, 'biosimilarVolume', p).toLocal();
      const supplyPct = cellMap.get(inputKey, 'supplyPricePct_active', p).toFormula();
      return `IFERROR(${partnerNS}/(${vol}/${unitsPerGramRef})*${supplyPct},0)`;
    }, co.apiPricePerGram, cellMap, sheetKey, 'apiPricePerGram', NUM_FMT.decimal2);
  } else {
    writeFormulaRow(ws, row, 'API Price/Gram', NP, (p) => {
      if (p < launchIdx) return '0';
      return cellMap.get(inputKey, 'fixedSupplyPricePerGram_active', p).toFormula();
    }, co.apiPricePerGram, cellMap, sheetKey, 'apiPricePerGram', NUM_FMT.decimal2);
  }
  row++;

  // 23. Gross Supply Revenue
  writeFormulaRow(ws, row, 'Gross Supply Revenue', NP, (p) => {
    const grams = cellMap.get(sheetKey, 'apiGramsSupplied', p).toLocal();
    const price = cellMap.get(sheetKey, 'apiPricePerGram', p).toLocal();
    return `${grams}*${price}`;
  }, co.grossSupplyRevenue, cellMap, sheetKey, 'grossSupplyRevenue', NUM_FMT.integer);
  row++;

  // 24. Net Supply Revenue
  writeFormulaRow(ws, row, 'Net Supply Revenue', NP, (p) => {
    return cellMap.get(sheetKey, 'grossSupplyRevenue', p).toLocal();
  }, co.netSupplyRevenue, cellMap, sheetKey, 'netSupplyRevenue', NUM_FMT.integer, true);
  row++;

  // 25. Royalty Income (flat — used when useFixedRoyaltyRate=1)
  writeFormulaRow(ws, row, 'Royalty (Flat)', NP, (p) => {
    const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
    const royaltyPct = cellMap.get(inputKey, 'royaltyRatePct_active', p).toFormula();
    return `${partnerNS}*${royaltyPct}`;
  }, co.royaltyIncome, cellMap, sheetKey, 'royaltyFlat', NUM_FMT.integer);
  row++;

  // 25b. Royalty Income (tiered — cumulative per-country PNS, ratchet logic via marginal tiers)
  writeFormulaRow(ws, row, 'Royalty (Tiered)', NP, (p) => {
    const partnerNS = cellMap.get(sheetKey, 'partnerNetSales', p).toLocal();
    // Build marginal tier formula using per-country tier thresholds and rates
    const tierFormulas: string[] = [];
    for (let t = 0; t < 5; t++) {
      const threshRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_threshold`).toFormula();
      const rateRef = cellMap.getScalar(inputKey, `royaltyTier_${t}_rate`).toFormula();
      if (t === 0) {
        tierFormulas.push(`MIN(${partnerNS},${threshRef})*${rateRef}`);
      } else {
        const prevThreshRef = cellMap.getScalar(inputKey, `royaltyTier_${t - 1}_threshold`).toFormula();
        tierFormulas.push(`MAX(0,MIN(${partnerNS},${threshRef})-${prevThreshRef})*${rateRef}`);
      }
    }
    return tierFormulas.join('+');
  }, co.royaltyIncome, cellMap, sheetKey, 'royaltyTiered', NUM_FMT.integer);
  row++;

  // 25c. Royalty Income (switch: IF useFixedRoyaltyRate=1 then flat, else tiered)
  const useFixedRef = cellMap.getScalar(inputKey, 'useFixedRoyaltyRate').toFormula();
  writeFormulaRow(ws, row, 'Royalty Income', NP, (p) => {
    const flat = cellMap.get(sheetKey, 'royaltyFlat', p).toLocal();
    const tiered = cellMap.get(sheetKey, 'royaltyTiered', p).toLocal();
    return `IF(${useFixedRef}=1,${flat},${tiered})`;
  }, co.royaltyIncome, cellMap, sheetKey, 'royaltyIncome', NUM_FMT.integer);
  row++;

  // 26. Milestone Income
  writeFormulaRow(ws, row, 'Milestone Income', NP, (p) => {
    return cellMap.get(inputKey, 'milestonePayments', p).toFormula();
  }, co.milestoneIncome, cellMap, sheetKey, 'milestoneIncome', NUM_FMT.integer);
  row++;
}

// ── Exported entry point ──

export function addInteractiveCountryModelSheets(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  ctx.countries.forEach((_, ci) => {
    buildCountryModelSheet(wb, ci, ctx, cellMap);
  });
}
