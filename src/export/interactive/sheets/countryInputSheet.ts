// ──────────────────────────────────────────────────────────────
// Interactive Excel — Per-country INPUT sheet builder
// ──────────────────────────────────────────────────────────────
// Each country gets its own worksheet with editable scenario
// blocks and per-period input rows. The countryModelSheet will
// reference these cells via the CellMap to build formulas.
// ──────────────────────────────────────────────────────────────

import type { Workbook, Worksheet } from 'exceljs';
import type { ExportContext } from '../../exportTypes';
import type { CellMap } from '../cellMap';
import type { CountryAssumptions, GenericCompetitor } from '../../../types';
import { NUM_FMT } from '../../excelStyles';
import {
  INPUT_FILL, INPUT_FONT, OUTPUT_FILL,
  cellAddr, periodCol,

  writeScenarioBlock, writeBaseOnlyBlock, writeInputRow, writeSection,
  setupSheet, writePeriodHeader, writeColorLegend,
} from '../formulaHelpers';
import { LABEL_FONT, BOLD_VALUE_FONT } from '../../excelStyles';

// ── Constants ──

const ACTIVE_SCENARIO_REF = 'Config!B5';

// ── Helpers ──

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

/** Write a static label + text value in column B (no cellMap registration). */
function writeStaticRow(
  ws: Worksheet,
  row: number,
  label: string,
  value: string | number,
): void {
  const labelCell = ws.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = LABEL_FONT;

  const valCell = ws.getCell(row, 2);
  valCell.value = value;
  valCell.font = BOLD_VALUE_FONT;
}

// ── Main builder ──

function buildCountrySheet(
  wb: Workbook,
  country: CountryAssumptions,
  countryIndex: number,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  const sheetKey = `country_${countryIndex}`;
  const sheetName = country.name.slice(0, 31);
  const ws = wb.addWorksheet(sheetName);

  const NP = ctx.periodLabels.length;
  const colCount = NP + 1;
  const activeIdx = ctx.config.activeScenario - 1; // 0-based
  const isBaseOnly = ctx.config.scenarioMode === 'base_only';

  // Conditional scenario writer — uses single row in base-only mode
  const sb: typeof writeScenarioBlock = (...args) =>
    isBaseOnly
      ? writeBaseOnlyBlock(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[10])
      : writeScenarioBlock(...args);

  setupSheet(ws, NP);

  writePeriodHeader(ws, ctx.periodLabels);
  writeColorLegend(ws, 2);

  let row = 4;

  // ════════════════════════════════════════════════════════════
  // Section: Country Settings
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Country Settings', colCount);
  row++;

  // Country Name (static, not in cellMap)
  writeStaticRow(ws, row, 'Country Name', country.name);
  row++;

  // Local Currency (static)
  writeStaticRow(ws, row, 'Local Currency', country.localCurrency);
  row++;

  // LOE Year (scalar input)
  writeScalarRow(ws, row, 'LOE Year', country.loeYear, cellMap, sheetKey, 'loeYear', NUM_FMT.year);
  row++;

  // Biosimilar Launch Period (scalar input)
  writeScalarRow(ws, row, 'Biosimilar Launch Period', country.biosimilarLaunchPeriodIndex, cellMap, sheetKey, 'biosimLaunchIdx', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: FX Rates
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'FX Rates', colCount);
  row++;

  writeInputRow(ws, row, `FX Rate (local/${ctx.config.currency})`, country.fxRate, NP, cellMap, sheetKey, 'fxRate', NUM_FMT.decimal2);
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
      cell.value = country.marketVolume[p] ?? 0;
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
    ws, row, 'Volume Adjustment %', country.volumeAdjustment,
    NP, cellMap, sheetKey, 'volumeAdjustment',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = volAdj.nextRow;

  // ATC-based volume forecasting (conditional)
  if (ctx.config.volumeForecastMethod === 'atcShare') {
    writeInputRow(ws, row, 'ATC Class Volume', country.atcClassVolume, NP, cellMap, sheetKey, 'atcClassVolume', NUM_FMT.integer);
    row++;

    const atcGrowth = sb(
      ws, row, 'ATC Class Growth %', country.atcClassGrowth,
      NP, cellMap, sheetKey, 'atcClassGrowth',
      NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
    );
    row = atcGrowth.nextRow;

    writeInputRow(ws, row, 'Molecule ATC Share %', country.moleculeAtcShare, NP, cellMap, sheetKey, 'moleculeAtcShare', NUM_FMT.percent);
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
      cell.value = country.originatorPrice[p] ?? 0;
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
    ws, row, 'Originator Price Growth %', country.originatorPriceGrowth,
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
    ws, row, 'Biosimilar Penetration', country.biosimilarPenetration,
    NP, cellMap, sheetKey, 'biosimilarPenetration',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = biosimPen.nextRow;

  // Our Share of Biosimilar
  const ourShare = sb(
    ws, row, 'Our Share of Biosimilar', country.ourShareOfBiosimilar,
    NP, cellMap, sheetKey, 'ourShareOfBiosimilar',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = ourShare.nextRow;

  const biosimPrice = sb(
    ws, row, 'Biosimilar Price % of Originator', country.biosimilarPricePct,
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
    ws, row, 'Partner GTN %', country.partnerGtnPct,
    NP, cellMap, sheetKey, 'partnerGtnPct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = partnerGtn.nextRow;

  const supplyPrice = sb(
    ws, row, 'Supply Price %', country.supplyPricePct,
    NP, cellMap, sheetKey, 'supplyPricePct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = supplyPrice.nextRow;

  const fixedSupply = sb(
    ws, row, 'Fixed Supply Price/Gram', country.fixedSupplyPricePerGram,
    NP, cellMap, sheetKey, 'fixedSupplyPricePerGram',
    NUM_FMT.decimal2, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = fixedSupply.nextRow;

  const royalty = sb(
    ws, row, 'Royalty Rate %', country.royaltyRatePct,
    NP, cellMap, sheetKey, 'royaltyRatePct',
    NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
  );
  row = royalty.nextRow;

  writeInputRow(ws, row, 'Milestone Payments', country.milestonePayments, NP, cellMap, sheetKey, 'milestonePayments', NUM_FMT.integer);
  row++;

  // Blank
  row++;

  // ════════════════════════════════════════════════════════════
  // Section: Royalty Structure
  // ════════════════════════════════════════════════════════════
  writeSection(ws, row, 'Royalty Structure', colCount);
  row++;

  // Use Fixed Royalty Rate (dropdown)
  writeScalarRow(ws, row, 'Use Fixed Royalty Rate', country.useFixedRoyaltyRate ? 'Yes' : 'No', cellMap, sheetKey, 'useFixedRoyaltyRate');
  ws.getCell(row, 2).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Yes,No"'],
    showErrorMessage: true,
    errorTitle: 'Invalid',
    error: 'Please select from the dropdown',
  };
  row++;

  // Tier thresholds and rates (5 tiers)
  const tiers = country.royaltyTiers ?? [];
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

    writeInputRow(ws, row, 'Partner Promotional Costs', country.partnerPromotionalCosts ?? Array(NP).fill(0),
      NP, cellMap, sheetKey, 'partnerPromotionalCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Sales Force Costs', country.partnerSalesForceCosts ?? Array(NP).fill(0),
      NP, cellMap, sheetKey, 'partnerSalesForceCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Distribution Costs', country.partnerDistributionCosts ?? Array(NP).fill(0),
      NP, cellMap, sheetKey, 'partnerDistributionCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner Manufacturing Costs', country.partnerManufacturingCosts ?? Array(NP).fill(0),
      NP, cellMap, sheetKey, 'partnerManufacturingCosts', NUM_FMT.integer);
    row++;

    writeInputRow(ws, row, 'Partner G&A', country.partnerGAndA ?? Array(NP).fill(0),
      NP, cellMap, sheetKey, 'partnerGAndA', NUM_FMT.integer);
    row++;

    writeScalarRow(ws, row, 'Partner Tax Rate', country.partnerTaxRate ?? 0.25, cellMap, sheetKey, 'partnerTaxRate', NUM_FMT.percent);
    row++;

    // Blank
    row++;
  }

  // ════════════════════════════════════════════════════════════
  // Section: Generic Competitors
  // ════════════════════════════════════════════════════════════
  if (country.genericCompetitors.length > 0) {
    writeSection(ws, row, 'Generic Competitors', colCount);
    row++;

    country.genericCompetitors.forEach((generic: GenericCompetitor, i: number) => {
      // Sub-section header
      writeSection(ws, row, `Generic ${i + 1}: ${generic.name}`, colCount);
      row++;

      // Register scalar: launch period index
      writeScalarRow(
        ws, row, `  Launch Period Index`,
        generic.launchPeriodIndex, cellMap, sheetKey,
        `generic_${i}_launchPeriod`, NUM_FMT.integer,
      );
      row++;

      // Generic Market Share (scenario block)
      const genShare = sb(
        ws, row, `Generic ${i + 1} Market Share`, generic.marketShare,
        NP, cellMap, sheetKey, `generic_${i}_marketShare`,
        NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
      );
      row = genShare.nextRow;

      // Generic Price % (scenario block)
      const genPrice = sb(
        ws, row, `Generic ${i + 1} Price %`, generic.pricePct,
        NP, cellMap, sheetKey, `generic_${i}_pricePct`,
        NUM_FMT.percent, ACTIVE_SCENARIO_REF, activeIdx,
      );
      row = genPrice.nextRow;
    });
  }
}

// ── Exported entry point ──

export function addInteractiveCountryInputSheets(
  wb: Workbook,
  ctx: ExportContext,
  cellMap: CellMap,
): void {
  ctx.countries.forEach((country, idx) => {
    buildCountrySheet(wb, country, idx, ctx, cellMap);
  });
}
