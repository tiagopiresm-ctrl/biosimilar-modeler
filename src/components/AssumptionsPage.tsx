import { useState, useRef } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle } from './Layout';
import { EditableCell, FormulaCell } from './EditableCell';
import {
  computePeriodConfig,
  generatePeriodLabels,
  getCountryLoeIndex,
  type Scenario,
  SCENARIO_LABELS,
  VOLUME_MULTIPLIER_LABELS,
  API_PRICING_MODEL_LABELS,
  UNIT_TYPE_SHORT,
  UNIT_TYPE_LABELS,
} from '../types';
import type { ScenarioRow, CountryAssumptions, ScenarioMode } from '../types';
import { ChevronDown, ChevronRight, Beaker, Globe } from 'lucide-react';
import { getActiveRow } from '../calculations';
import { createScenarioRow } from '../defaultData';
import { ATC_CODES } from '../atcCodes';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const SCENARIO_KEYS: Array<'bear' | 'base' | 'bull'> = ['bear', 'base', 'bull'];
const SCENARIO_MAP: Record<Scenario, 'bear' | 'base' | 'bull'> = { 1: 'bear', 2: 'base', 3: 'bull' };
const SCENARIO_KEY_LABELS: Record<string, string> = { bear: 'Worst', base: 'Base', bull: 'Best' };

/** Zero out all ScenarioRow values before a given period index (display-only masking). */
function maskBeforePeriod(row: ScenarioRow, beforeIndex: number): ScenarioRow {
  const mask = (arr: number[]) => arr.map((v, i) => (i < beforeIndex ? 0 : v));
  return { bear: mask(row.bear), base: mask(row.base), bull: mask(row.bull) };
}

const scenarioRowStyles: Record<string, string> = {
  bear: 'bg-red-50 hover:bg-red-100',
  base: 'bg-blue-50 hover:bg-blue-100',
  bull: 'bg-green-50 hover:bg-green-100',
};

const scenarioLabelStyles: Record<string, string> = {
  bear: 'text-red-700',
  base: 'text-blue-700',
  bull: 'text-green-700',
};

const scenarioDotStyles: Record<string, string> = {
  bear: 'bg-red-500',
  base: 'bg-blue-500',
  bull: 'bg-green-500',
};

function periodYears(config: { modelStartYear: number; forecastEndYear?: number }): string[] {
  const pc = computePeriodConfig(config);
  return generatePeriodLabels(pc);
}

// ────────────────────────────────────────────────────────────
// Fill-all-periods inline input (replaces old "0" button)
// ────────────────────────────────────────────────────────────

function FillInput({
  format,
  onFill,
}: {
  format: 'number' | 'percent' | 'currency';
  onFill: (value: number) => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const raw = value.trim() === '' ? '0' : value.trim();
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return;
    const storeValue = format === 'percent' ? parsed / 100 : parsed;
    onFill(storeValue);
    setValue('');
    inputRef.current?.blur();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={value}
      placeholder="0"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === 'Escape') {
          setValue('');
          inputRef.current?.blur();
        }
      }}
      title="Type a value and press Enter to fill all periods"
      className="ml-auto w-8 text-[9px] text-center text-gray-400 bg-transparent border border-transparent rounded
                 hover:border-gray-300 focus:border-blue-400 focus:text-gray-700 focus:bg-white focus:outline-none
                 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100
                 placeholder:text-gray-300"
    />
  );
}

// ────────────────────────────────────────────────────────────
// Scenario-aware grid table for a single assumption field
// ────────────────────────────────────────────────────────────

interface ScenarioGridProps {
  label: string;
  row: ScenarioRow;
  activeScenario: Scenario;
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  headers: string[];
  onCellChange: (scenarioKey: 'bear' | 'base' | 'bull', periodIndex: number, value: number) => void;
  disabledBefore?: number;  // disable cells at indices < this value
  forecastStartIndex?: number; // visual H/F boundary on headers
  scenarioMode?: ScenarioMode; // when 'base_only', only show Base row
}

export function ScenarioGrid({
  label,
  row,
  activeScenario,
  format = 'percent',
  decimals = 1,
  headers,
  onCellChange,
  disabledBefore,
  forecastStartIndex,
  scenarioMode,
}: ScenarioGridProps) {
  const activeKey = SCENARIO_MAP[activeScenario];
  const showHF = forecastStartIndex !== undefined;
  const fsi = forecastStartIndex ?? 0;
  const isBaseOnly = scenarioMode === 'base_only';
  const visibleKeys = isBaseOnly ? (['base'] as const) : SCENARIO_KEYS;

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{label}</h4>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="text-[11px] w-full min-w-[1200px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 text-left px-2 py-1.5 w-28 min-w-[112px] border-r border-gray-200 font-semibold text-gray-600">
                Scenario
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-1 py-1.5 text-center font-medium whitespace-pre-line leading-tight ${
                    showHF
                      ? i < fsi
                        ? 'text-blue-700 bg-blue-50'
                        : `text-amber-700 bg-amber-50${i === fsi ? ' border-l-2 border-amber-400' : ''}`
                      : 'text-gray-500'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleKeys.map((sk) => (
              <tr
                key={sk}
                className={`group ${scenarioRowStyles[sk]} ${activeKey === sk ? 'ring-1 ring-inset ring-gray-400' : ''}`}
              >
                <td className={`sticky left-0 z-10 px-2 py-1 border-r border-gray-200 font-medium whitespace-nowrap ${scenarioRowStyles[sk]} ${scenarioLabelStyles[sk]}`}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${scenarioDotStyles[sk]}`} />
                    {SCENARIO_KEY_LABELS[sk]}
                    {activeKey === sk && !isBaseOnly && (
                      <span className="ml-1 text-[9px] font-bold opacity-70">
                        ACTIVE
                      </span>
                    )}
                    <FillInput
                      format={format}
                      onFill={(v) => {
                        row[sk].forEach((_, pi) => {
                          if (disabledBefore !== undefined && pi < disabledBefore) return;
                          onCellChange(sk, pi, v);
                        });
                      }}
                    />
                  </span>
                </td>
                {row[sk].map((val, pi) => (
                  <td key={pi} className="px-0.5 py-0.5">
                    <EditableCell
                      value={val}
                      onChange={(v) => onCellChange(sk, pi, v)}
                      onPasteRange={(values) => {
                        values.forEach((v, offset) => {
                          const targetPi = pi + 1 + offset;
                          if (targetPi >= headers.length) return;
                          if (disabledBefore !== undefined && targetPi < disabledBefore) return;
                          onCellChange(sk, targetPi, v);
                        });
                      }}
                      format={format}
                      decimals={decimals}
                      disabled={disabledBefore !== undefined && pi < disabledBefore}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {/* Active row (read-only) — hidden in base_only */}
            {!isBaseOnly && (
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 bg-gray-50 px-2 py-1 border-r border-gray-200 font-bold text-gray-800 whitespace-nowrap">
                  Active
                </td>
                {row[activeKey].map((val, pi) => (
                  <td key={pi} className="px-0.5 py-0.5">
                    <FormulaCell
                      value={val}
                      format={format}
                      decimals={decimals}
                      className="font-semibold"
                    />
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Single-row (non-scenario) grid
// ────────────────────────────────────────────────────────────

interface SingleRowGridProps {
  label: string;
  values: number[];
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  headers: string[];
  onCellChange: (periodIndex: number, value: number) => void;
  rowLabel?: string;
  disabledBefore?: number;  // disable cells at indices < this value
  disabledFrom?: number;    // disable cells at indices >= this value
  forecastStartIndex?: number; // visual H/F boundary on headers
}

export function SingleRowGrid({
  label,
  values,
  format = 'number',
  decimals = 0,
  headers,
  onCellChange,
  rowLabel = 'Value',
  disabledBefore,
  disabledFrom,
  forecastStartIndex,
}: SingleRowGridProps) {
  const showHF = forecastStartIndex !== undefined;
  const fsi = forecastStartIndex ?? 0;

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{label}</h4>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="text-[11px] w-full min-w-[1200px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 text-left px-2 py-1.5 w-28 min-w-[112px] border-r border-gray-200 font-semibold text-gray-600">
                Period
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-1 py-1.5 text-center font-medium whitespace-pre-line leading-tight ${
                    showHF
                      ? i < fsi
                        ? 'text-blue-700 bg-blue-50'
                        : `text-amber-700 bg-amber-50${i === fsi ? ' border-l-2 border-amber-400' : ''}`
                      : 'text-gray-500'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="group bg-white hover:bg-gray-50">
              <td className="sticky left-0 z-10 bg-white px-2 py-1 border-r border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  {rowLabel}
                  <FillInput
                    format={format}
                    onFill={(v) => {
                      values.forEach((_, pi) => {
                        if (disabledBefore !== undefined && pi < disabledBefore) return;
                        if (disabledFrom !== undefined && pi >= disabledFrom) return;
                        onCellChange(pi, v);
                      });
                    }}
                  />
                </span>
              </td>
              {values.map((val, pi) => (
                <td key={pi} className="px-0.5 py-0.5">
                  <EditableCell
                    value={val}
                    onChange={(v) => onCellChange(pi, v)}
                    onPasteRange={(pastedValues) => {
                      pastedValues.forEach((v, offset) => {
                        const targetPi = pi + 1 + offset;
                        if (targetPi >= headers.length) return;
                        if (disabledBefore !== undefined && targetPi < disabledBefore) return;
                        if (disabledFrom !== undefined && targetPi >= disabledFrom) return;
                        onCellChange(targetPi, v);
                      });
                    }}
                    format={format}
                    decimals={decimals}
                    disabled={
                      (disabledBefore !== undefined && pi < disabledBefore) ||
                      (disabledFrom !== undefined && pi >= disabledFrom)
                    }
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Formula Row (read-only, derived values)
// ────────────────────────────────────────────────────────────

function FormulaRow({
  label,
  values,
  format = 'percent',
  decimals = 1,
  headers,
}: {
  label: string;
  values: number[];
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  headers: string[];
}) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{label}</h4>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="text-[11px] w-full min-w-[1200px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 text-left px-2 py-1.5 w-28 min-w-[112px] border-r border-gray-200 font-semibold text-gray-600">
                Period
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-1 py-1.5 text-center font-medium text-gray-500 whitespace-pre-line leading-tight"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-amber-50">
              <td className="sticky left-0 z-10 bg-amber-50 px-2 py-1 border-r border-gray-200 font-medium text-amber-800 whitespace-nowrap text-[10px]">
                Derived
              </td>
              {values.map((val, pi) => (
                <td key={pi} className="px-0.5 py-0.5">
                  <FormulaCell
                    value={val}
                    format={format}
                    decimals={decimals}
                    className="font-semibold text-amber-900"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Individual Generic Competitor Card
// ────────────────────────────────────────────────────────────

function GenericCompetitorCard({
  countryIndex,
  genericIndex,
}: {
  countryIndex: number;
  genericIndex: number;
}) {
  const { countries, config, updateGenericCompetitor } = useStore();
  const country = countries[countryIndex];
  const generic = country?.genericCompetitors[genericIndex];
  const [collapsed, setCollapsed] = useState(false);

  if (!generic) return null;

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const headers = periodYears(config);
  const countryLoeIdx = getCountryLoeIndex(country, pc.startYear);
  const launchLabel = genericIndex < (country.numGenericsAtLOE)
    ? 'LOE'
    : generic.launchPeriodIndex === countryLoeIdx + 1
      ? 'LOE+1'
      : generic.launchPeriodIndex === countryLoeIdx + 2
        ? 'LOE+2'
        : generic.launchPeriodIndex === countryLoeIdx + 3
          ? 'LOE+3'
          : periodLabels[generic.launchPeriodIndex] ?? `Period ${generic.launchPeriodIndex}`;

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
        <span className="text-xs font-semibold text-gray-700">
          {generic.name}
        </span>
        <span className="text-[10px] text-gray-400 ml-auto">
          Launch: {launchLabel}
        </span>
      </button>

      {!collapsed && (
        <div className="p-3 space-y-1">
          <ScenarioGrid
            label="Market Share (%)"
            row={maskBeforePeriod(generic.marketShare, generic.launchPeriodIndex)}
            activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
            format="percent"
            decimals={1}
            headers={headers}
            onCellChange={(sk, pi, v) =>
              updateGenericCompetitor(countryIndex, genericIndex, 'marketShare', sk, pi, v)
            }
            disabledBefore={generic.launchPeriodIndex}
          />
          <ScenarioGrid
            label="Price (% of Originator)"
            row={maskBeforePeriod(generic.pricePct, generic.launchPeriodIndex)}
            activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
            format="percent"
            decimals={1}
            headers={headers}
            onCellChange={(sk, pi, v) =>
              updateGenericCompetitor(countryIndex, genericIndex, 'pricePct', sk, pi, v)
            }
            disabledBefore={generic.launchPeriodIndex}
          />
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// P&L Assumptions Section
// ────────────────────────────────────────────────────────────

interface PLFieldDef {
  key: 'commercialSales' | 'gAndA' | 'rAndD' | 'dAndA' | 'taxRate';
  label: string;
  format: 'percent' | 'number' | 'currency';
  decimals: number;
}

const PL_SCENARIO_FIELDS: PLFieldDef[] = [
  { key: 'commercialSales', label: "Commercial & Sales (currency'000)", format: 'number', decimals: 0 },
  { key: 'gAndA', label: "G&A (currency'000)", format: 'number', decimals: 0 },
  { key: 'rAndD', label: "R&D (currency'000)", format: 'number', decimals: 0 },
  { key: 'dAndA', label: "D&A (currency'000)", format: 'number', decimals: 0 },
  { key: 'taxRate', label: 'Tax Rate (%)', format: 'percent', decimals: 1 },
];

function PLAssumptionsSection() {
  const { plAssumptions, config, fcfBridge, updatePLAssumption, updateFCFBridge } = useStore();
  const headers = periodYears(config);

  return (
    <div>
      <SectionTitle className="mt-0">P&L & Cash Flow Assumptions (Global)</SectionTitle>

      {/* P&L fields */}
      <div className="space-y-1">
        {PL_SCENARIO_FIELDS.map((field) => (
          <ScenarioGrid
            key={field.key}
            label={field.label.replace('currency', config.currency)}
            row={plAssumptions[field.key]}
            activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
            format={field.format}
            decimals={field.decimals}
            headers={headers}
            onCellChange={(sk, pi, v) =>
              updatePLAssumption(field.key, sk, pi, v)
            }
          />
        ))}
      </div>

      {/* FCF Bridge: Working Capital & CapEx */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-2">
        Free Cash Flow Bridge
      </h4>
      <div className="space-y-1">
        <SingleRowGrid
          label={`Working Capital Change (${config.currency}'000)`}
          values={fcfBridge.workingCapitalChange}
          format="number"
          decimals={0}
          headers={headers}
          rowLabel="Value"
          onCellChange={(pi, v) => updateFCFBridge('workingCapitalChange', pi, v)}
        />
        <SingleRowGrid
          label={`Capital Expenditure (${config.currency}'000)`}
          values={fcfBridge.capitalExpenditure}
          format="number"
          decimals={0}
          headers={headers}
          rowLabel="Value"
          onCellChange={(pi, v) => updateFCFBridge('capitalExpenditure', pi, v)}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Country Assumptions Tab
// ────────────────────────────────────────────────────────────

const COUNTRY_FIELDS_MARKET: Array<{
  key: keyof CountryAssumptions;
  label: string;
  format: 'percent' | 'number' | 'currency';
  decimals: number;
}> = [
  { key: 'originatorPriceGrowth', label: 'Originator Price Growth (%)', format: 'percent', decimals: 1 },
];

const COUNTRY_FIELDS_BIOSIMILAR: Array<{
  key: keyof CountryAssumptions;
  label: string;
  format: 'percent' | 'number' | 'currency';
  decimals: number;
}> = [
  { key: 'biosimilarPricePct', label: 'Biosimilar In-Market Price (% of Originator)', format: 'percent', decimals: 1 },
  { key: 'biosimilarMarketShare', label: 'Biosimilar Market Share (%)', format: 'percent', decimals: 1 },
];

const COUNTRY_FIELDS_PARTNER: Array<{
  key: keyof CountryAssumptions;
  label: string;
  format: 'percent' | 'number' | 'currency';
  decimals: number;
}> = [
  { key: 'partnerGtnPct', label: 'Partner Gross-to-Net (%)', format: 'percent', decimals: 1 },
];

// These fields are shown after the conditional supply pricing grid
const COUNTRY_SCENARIO_FIELDS_ECONOMICS: Array<{
  key: keyof CountryAssumptions;
  label: string;
  format: 'percent' | 'number' | 'currency';
  decimals: number;
}> = [
  { key: 'royaltyRatePct', label: 'Royalty Rate (% of Partner Net Sales)', format: 'percent', decimals: 1 },
];

function CountryTab({ countryIndex }: { countryIndex: number }) {
  const {
    countries,
    config,
    setScenario,
    updateCountryScalar,
    updateCountryAssumption,
    updateCountryFxRate,
    updateCountryLoeYear,
    syncGenericCounts,
    updateCountryRoyaltyTier,
    updateCountryUseFixedRoyaltyRate,
  } = useStore();
  const country = countries[countryIndex];
  if (!country) return null;

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const headers = periodYears(config);
  const s = config.activeScenario;

  // Compute derived originator share for display (respects launch gating)
  const derivedOriginatorShare = Array.from({ length: pc.numPeriods }, (_, i) => {
    let totalGenericShare = 0;
    for (const gen of country.genericCompetitors) {
      if (i >= gen.launchPeriodIndex) {
        totalGenericShare += getActiveRow(gen.marketShare, s)[i];
      }
    }
    // Biosimilar share is zero before its launch period
    const biosimilarShare = i >= country.biosimilarLaunchPeriodIndex
      ? getActiveRow(country.biosimilarMarketShare, s)[i]
      : 0;
    return Math.max(0, 1 - totalGenericShare - biosimilarShare);
  });

  const inputClass =
    'w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  const handleGenericCountChange = (field: keyof CountryAssumptions, value: number) => {
    updateCountryScalar(countryIndex, field, value);
    // Defer syncGenericCounts to after the scalar update
    setTimeout(() => syncGenericCounts(countryIndex), 0);
  };

  const scenarioColors: Record<Scenario, { active: string; inactive: string }> = {
    1: { active: 'bg-red-600 text-white', inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50' },
    2: { active: 'bg-blue-600 text-white', inactive: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50' },
    3: { active: 'bg-green-600 text-white', inactive: 'bg-white text-green-700 border-green-300 hover:bg-green-50' },
  };

  return (
    <div>
      {/* Scenario Selector — hidden in base_only */}
      {config.scenarioMode !== 'base_only' && (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Active Scenario
          </span>
          <div className="flex gap-1.5">
            {([1, 2, 3] as Scenario[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                  config.activeScenario === sc
                    ? scenarioColors[sc].active
                    : scenarioColors[sc].inactive
                }`}
              >
                {SCENARIO_LABELS[sc]}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400">
            Selects which scenario values are used across WACC, P&L, and NPV calculations
          </span>
        </div>
      </div>
      )}

      {/* Country Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Country Information
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Name
            </label>
            <div className="w-full border border-gray-200 bg-gray-50 rounded px-2.5 py-1.5 text-sm text-gray-700 font-medium">
              {country.name}
              <span className="ml-1.5 text-[10px] text-gray-400 font-normal">({country.localCurrency})</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              LOE Year
            </label>
            <input
              type="number"
              value={country.loeYear}
              onChange={(e) => updateCountryLoeYear(countryIndex, parseInt(e.target.value) || 2030)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Originator price is now per-period — shown as a grid below */}
        </div>
      </div>

      {/* FX Rate per Period */}
      <SingleRowGrid
        label={country.localCurrency === 'EUR'
          ? `FX Rate (EUR — model currency, always 1.00)`
          : `FX Rate (${country.localCurrency} per 1 ${config.currency})`}
        values={country.fxRate}
        format="number"
        decimals={2}
        headers={headers}
        onCellChange={(pi, v) => updateCountryFxRate(countryIndex, pi, v)}
        rowLabel={country.localCurrency || 'FX Rate'}
      />

      {/* ── Volume Assumptions ── */}
      {/* Layout depends on global config.volumeForecastMethod */}
      {(() => {
        const forecastStart = config.forecastStartYear - pc.startYear;
        const volumeAdjustmentArr = getActiveRow(country.volumeAdjustment, config.activeScenario);

        if (config.volumeForecastMethod === 'atcShare') {
          // ── METHOD 1: ATC Market Share ──
          // Compute ATC volume: historical = input, forecast = compound from growth
          const atcGrowthArr = getActiveRow(country.atcClassGrowth, config.activeScenario);
          const computedAtcVolume: number[] = new Array(pc.numPeriods).fill(0);
          for (let i = 0; i < pc.numPeriods; i++) {
            if (i < forecastStart) {
              computedAtcVolume[i] = country.atcClassVolume[i] ?? 0;
            } else {
              const prev = i === 0 ? 0 : computedAtcVolume[i - 1];
              computedAtcVolume[i] = prev * (1 + (atcGrowthArr[i] ?? 0));
            }
          }

          // Compute molecule share display: historical = auto-calc, forecast = user input
          const displayMoleculeShare: number[] = new Array(pc.numPeriods).fill(0);
          for (let i = 0; i < pc.numPeriods; i++) {
            if (i < forecastStart) {
              const atcVol = country.atcClassVolume[i] ?? 0;
              const molVol = country.marketVolume[i] ?? 0;
              displayMoleculeShare[i] = atcVol > 0 ? molVol / atcVol : 0;
            } else {
              displayMoleculeShare[i] = country.moleculeAtcShare[i] ?? 0;
            }
          }

          // Compute molecule volume display: historical = input, forecast = ATC × share
          const displayMoleculeVolume: number[] = new Array(pc.numPeriods).fill(0);
          for (let i = 0; i < pc.numPeriods; i++) {
            if (i < forecastStart) {
              displayMoleculeVolume[i] = country.marketVolume[i] ?? 0;
            } else {
              displayMoleculeVolume[i] = computedAtcVolume[i] * (country.moleculeAtcShare[i] ?? 0);
            }
          }

          return (
            <>
              {/* ATC Class selector */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      ATC Class (3rd Level)
                    </label>
                    <select
                      value={country.atcClass}
                      onChange={(e) =>
                        updateCountryScalar(countryIndex, 'atcClass', e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">— Select ATC Class —</option>
                      {ATC_CODES.map((atc) => (
                        <option key={atc.code} value={atc.code}>
                          {atc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ① ATC Class Volume — historical editable, forecast computed */}
              <SingleRowGrid
                label={`ATC Class Volume (${VOLUME_MULTIPLIER_LABELS[config.volumeMultiplier]})`}
                values={computedAtcVolume}
                format="number"
                decimals={0}
                headers={headers}
                onCellChange={(pi, v) => updateCountryAssumption(countryIndex, 'atcClassVolume', 'base', pi, v)}
                rowLabel="ATC Volume"
                disabledFrom={forecastStart}
                forecastStartIndex={forecastStart}
              />

              {/* ② ATC Class Growth (%) — scenario, forecast-only */}
              <ScenarioGrid
                label="ATC Class Volume Growth (%)"
                row={maskBeforePeriod(country.atcClassGrowth, forecastStart)}
                activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
                format="percent"
                decimals={1}
                headers={headers}
                onCellChange={(sk, pi, v) =>
                  updateCountryAssumption(countryIndex, 'atcClassGrowth', sk, pi, v)
                }
                disabledBefore={forecastStart}
                forecastStartIndex={forecastStart}
              />

              {/* ③ Molecule Volume — historical editable, forecast computed */}
              <SingleRowGrid
                label={`Molecule Volume (${VOLUME_MULTIPLIER_LABELS[config.volumeMultiplier]})`}
                values={displayMoleculeVolume}
                format="number"
                decimals={0}
                headers={headers}
                onCellChange={(pi, v) => updateCountryAssumption(countryIndex, 'marketVolume', 'base', pi, v)}
                rowLabel="Mol. Volume"
                disabledFrom={forecastStart}
                forecastStartIndex={forecastStart}
              />

              {/* ④ Molecule Share of ATC Class (%) — historical auto-computed, forecast editable */}
              <SingleRowGrid
                label="Molecule Share of ATC Class (%)"
                values={displayMoleculeShare}
                format="percent"
                decimals={1}
                headers={headers}
                onCellChange={(pi, v) => updateCountryAssumption(countryIndex, 'moleculeAtcShare', 'base', pi, v)}
                rowLabel="Mol. Share"
                disabledBefore={forecastStart}
                forecastStartIndex={forecastStart}
              />
            </>
          );
        } else {
          // ── METHOD 2: Growth % YoY ──
          // Compute molecule volume: historical = input, forecast = compound from growth
          const computedMoleculeVolume: number[] = new Array(pc.numPeriods).fill(0);
          for (let i = 0; i < pc.numPeriods; i++) {
            if (i < forecastStart) {
              computedMoleculeVolume[i] = country.marketVolume[i] ?? 0;
            } else {
              const prev = i === 0 ? 0 : computedMoleculeVolume[i - 1];
              computedMoleculeVolume[i] = prev * (1 + (volumeAdjustmentArr[i] ?? 0));
            }
          }

          return (
            <>
              {/* ① Molecule Volume — historical editable, forecast computed */}
              <SingleRowGrid
                label={`Molecule Volume (${VOLUME_MULTIPLIER_LABELS[config.volumeMultiplier]})`}
                values={computedMoleculeVolume}
                format="number"
                decimals={0}
                headers={headers}
                onCellChange={(pi, v) => updateCountryAssumption(countryIndex, 'marketVolume', 'base', pi, v)}
                rowLabel="Mol. Volume"
                disabledFrom={forecastStart}
                forecastStartIndex={forecastStart}
              />

              {/* ② Molecule Volume Growth (%) — scenario, forecast-only */}
              <ScenarioGrid
                label="Molecule Volume Growth (%)"
                row={maskBeforePeriod(country.volumeAdjustment, forecastStart)}
                activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
                format="percent"
                decimals={1}
                headers={headers}
                onCellChange={(sk, pi, v) =>
                  updateCountryAssumption(countryIndex, 'volumeAdjustment', sk, pi, v)
                }
                disabledBefore={forecastStart}
                forecastStartIndex={forecastStart}
              />
            </>
          );
        }
      })()}

      {/* Generic Competitor Counts */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Generic Competitor Entry Timing
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Generics at LOE
            </label>
            <input
              type="number"
              min={0}
              value={country.numGenericsAtLOE}
              onChange={(e) =>
                handleGenericCountChange('numGenericsAtLOE', parseInt(e.target.value) || 0)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Total Generics at LOE+1
            </label>
            <input
              type="number"
              min={0}
              value={country.numGenericsAtY1}
              onChange={(e) =>
                handleGenericCountChange('numGenericsAtY1', parseInt(e.target.value) || 0)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Total Generics at LOE+2
            </label>
            <input
              type="number"
              min={0}
              value={country.numGenericsAtY2}
              onChange={(e) =>
                handleGenericCountChange('numGenericsAtY2', parseInt(e.target.value) || 0)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Total Generics at LOE+3
            </label>
            <input
              type="number"
              min={0}
              value={country.numGenericsAtY3}
              onChange={(e) =>
                handleGenericCountChange('numGenericsAtY3', parseInt(e.target.value) || 0)
              }
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Market & Price assumptions */}
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Market & Pricing Assumptions
      </h4>

      {/* Originator Price — historical editable, forecast computed from growth */}
      {(() => {
        const forecastStart = config.forecastStartYear - pc.startYear;
        // Compute full originator ref price: historical = direct input, forecast = compound growth
        const originatorPriceGrowthArr = getActiveRow(country.originatorPriceGrowth, config.activeScenario);
        const computedOriginatorPrice: number[] = new Array(pc.numPeriods).fill(0);
        for (let i = 0; i < pc.numPeriods; i++) {
          if (i < forecastStart) {
            computedOriginatorPrice[i] = country.originatorPrice[i] ?? 0;
          } else {
            const prev = i === 0 ? 0 : computedOriginatorPrice[i - 1];
            computedOriginatorPrice[i] = prev * (1 + (originatorPriceGrowthArr[i] ?? 0));
          }
        }
        return (
          <SingleRowGrid
            label={`Originator Price (${country.localCurrency}/${UNIT_TYPE_SHORT[config.unitType]})`}
            values={computedOriginatorPrice}
            format="number"
            decimals={2}
            headers={headers}
            onCellChange={(pi, v) => updateCountryAssumption(countryIndex, 'originatorPrice', 'base', pi, v)}
            rowLabel="Orig. Price"
            disabledFrom={forecastStart}
            forecastStartIndex={forecastStart}
          />
        );
      })()}

      {COUNTRY_FIELDS_MARKET.map((field) => {
        const forecastStart = config.forecastStartYear - pc.startYear;
        return (
          <ScenarioGrid
            key={field.key}
            label={field.label}
            row={maskBeforePeriod(country[field.key] as ScenarioRow, forecastStart)}
            activeScenario={config.activeScenario}
            scenarioMode={config.scenarioMode}
            format={field.format}
            decimals={field.decimals}
            headers={headers}
            onCellChange={(sk, pi, v) =>
              updateCountryAssumption(countryIndex, field.key, sk, pi, v)
            }
            disabledBefore={forecastStart}
            forecastStartIndex={forecastStart}
          />
        );
      })}

      {/* Individual Generic Competitors */}
      {country.genericCompetitors.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Individual Generic Competitors
          </h4>
          {country.genericCompetitors.map((_, gi) => (
            <GenericCompetitorCard
              key={gi}
              countryIndex={countryIndex}
              genericIndex={gi}
            />
          ))}
        </div>
      )}

      {/* Derived Originator Share */}
      <FormulaRow
        label="Originator Market Share (%) — Derived: 100% - Generics - Biosimilar"
        values={derivedOriginatorShare}
        format="percent"
        decimals={1}
        headers={headers}
      />

      {/* Biosimilar Launch Period */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Biosimilar Launch Timing
        </h4>
        <div className="max-w-xs">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Biosimilar Launch Period
          </label>
          <select
            value={country.biosimilarLaunchPeriodIndex}
            onChange={(e) =>
              updateCountryScalar(countryIndex, 'biosimilarLaunchPeriodIndex', parseInt(e.target.value))
            }
            className={inputClass}
          >
            {periodLabels.map((p, i) => (
              <option key={i} value={i}>
                {p} ({pc.startYear + i})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">
            All biosimilar outputs will be zero before this period.
          </p>
        </div>
      </div>

      {/* Biosimilar Assumptions */}
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Biosimilar Assumptions
      </h4>
      {COUNTRY_FIELDS_BIOSIMILAR.map((field) => (
        <ScenarioGrid
          key={field.key}
          label={field.label}
          row={maskBeforePeriod(country[field.key] as ScenarioRow, country.biosimilarLaunchPeriodIndex)}
          activeScenario={config.activeScenario}
          scenarioMode={config.scenarioMode}
          format={field.format}
          decimals={field.decimals}
          headers={headers}
          onCellChange={(sk, pi, v) =>
            updateCountryAssumption(countryIndex, field.key, sk, pi, v)
          }
          disabledBefore={country.biosimilarLaunchPeriodIndex}
        />
      ))}

      {/* Partner & Economics */}
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Partner & Supply Economics
      </h4>
      {COUNTRY_FIELDS_PARTNER.map((field) => (
        <ScenarioGrid
          key={field.key}
          label={field.label}
          row={maskBeforePeriod(country[field.key] as ScenarioRow, country.biosimilarLaunchPeriodIndex)}
          activeScenario={config.activeScenario}
          scenarioMode={config.scenarioMode}
          format={field.format}
          decimals={field.decimals}
          headers={headers}
          onCellChange={(sk, pi, v) =>
            updateCountryAssumption(countryIndex, field.key, sk, pi, v)
          }
          disabledBefore={country.biosimilarLaunchPeriodIndex}
        />
      ))}

      {/* Supply pricing: Mode 1 (percentage) or Mode 2 (fixed EUR/gram per country) */}
      {config.apiPricingModel === 'percentage' ? (
        <ScenarioGrid
          key="supplyPricePct"
          label="Supply Price (% of Partner Net Selling Price)"
          row={maskBeforePeriod(country.supplyPricePct, country.biosimilarLaunchPeriodIndex)}
          activeScenario={config.activeScenario}
          scenarioMode={config.scenarioMode}
          format="percent"
          decimals={1}
          headers={headers}
          onCellChange={(sk, pi, v) =>
            updateCountryAssumption(countryIndex, 'supplyPricePct', sk, pi, v)
          }
          disabledBefore={country.biosimilarLaunchPeriodIndex}
        />
      ) : (
        <ScenarioGrid
          key="fixedSupplyPricePerGram"
          label={`Fixed Supply Price per Gram (${config.currency}/g)`}
          row={maskBeforePeriod(country.fixedSupplyPricePerGram ?? createScenarioRow(0, headers.length), country.biosimilarLaunchPeriodIndex)}
          activeScenario={config.activeScenario}
          scenarioMode={config.scenarioMode}
          format="number"
          decimals={1}
          headers={headers}
          onCellChange={(sk, pi, v) =>
            updateCountryAssumption(countryIndex, 'fixedSupplyPricePerGram', sk, pi, v)
          }
          disabledBefore={country.biosimilarLaunchPeriodIndex}
        />
      )}

      {/* Economics fields (Royalty) — shown in both modes */}
      {COUNTRY_SCENARIO_FIELDS_ECONOMICS.map((field) => (
        <ScenarioGrid
          key={field.key}
          label={field.label}
          row={maskBeforePeriod(country[field.key] as ScenarioRow, country.biosimilarLaunchPeriodIndex)}
          activeScenario={config.activeScenario}
          scenarioMode={config.scenarioMode}
          format={field.format}
          decimals={field.decimals}
          headers={headers}
          onCellChange={(sk, pi, v) =>
            updateCountryAssumption(countryIndex, field.key, sk, pi, v)
          }
          disabledBefore={country.biosimilarLaunchPeriodIndex}
        />
      ))}

      {/* Milestone Payments (non-scenario) */}
      <SingleRowGrid
        label={`Milestone Payments (${config.currency}'000)`}
        values={country.milestonePayments}
        format="number"
        decimals={0}
        headers={headers}
        onCellChange={(pi, v) =>
          updateCountryAssumption(countryIndex, 'milestonePayments', 'base', pi, v)
        }
        rowLabel="Amount"
      />

      {/* ──── Royalty Structure (per-country) ──── */}
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5 mt-6">Royalty Structure</h4>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <p className="text-xs text-gray-500 mb-3">
          Choose how royalties are calculated for this country: a fixed rate (Royalty Rate % above) or
          a tiered structure based on cumulative partner net sales in this country.
        </p>

        {/* Toggle: Fixed vs Tiered */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`royaltyMode-${countryIndex}`}
              checked={country.useFixedRoyaltyRate}
              onChange={() => updateCountryUseFixedRoyaltyRate(countryIndex, true)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">Fixed Rate (flat %)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`royaltyMode-${countryIndex}`}
              checked={!country.useFixedRoyaltyRate}
              onChange={() => updateCountryUseFixedRoyaltyRate(countryIndex, false)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">Tiered (cumulative ratchet)</span>
          </label>
        </div>

        {country.useFixedRoyaltyRate ? (
          <p className="text-xs text-gray-400">
            Using flat royalty rate from the <em>Royalty Rate %</em> field above.
          </p>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Royalty rate ratchets up as this country's cumulative partner net sales cross each threshold
              ({country.localCurrency}'000).
            </p>
            <table className="w-full max-w-lg text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Tier</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">
                    Cumulative Sales Threshold ({country.localCurrency}'000)
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2">Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {country.royaltyTiers.map((tier, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-xs text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        value={tier.threshold}
                        onChange={(e) =>
                          updateCountryRoyaltyTier(countryIndex, i, 'threshold', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-[180px]"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={(tier.rate * 100).toFixed(1)}
                        onChange={(e) =>
                          updateCountryRoyaltyTier(countryIndex, i, 'rate', (parseFloat(e.target.value) || 0) / 100)
                        }
                        min={0}
                        max={100}
                        step={0.5}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-[100px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ──── Partner View Costs (only when enabled) ──── */}
      {config.partnerViewEnabled && (
        <PartnerCostsSection countryIndex={countryIndex} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Partner Costs Section (shown per country when partner view is enabled)
// ────────────────────────────────────────────────────────────

function PartnerCostsSection({ countryIndex }: { countryIndex: number }) {
  const { countries, config, updatePartnerCost, updateCountryScalar } = useStore();
  const country = countries[countryIndex];
  if (!country) return null;

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);

  const partnerCostFields = [
    { field: 'partnerPromotionalCosts', label: 'Promotional Costs' },
    { field: 'partnerSalesForceCosts', label: 'Sales Force Costs' },
    { field: 'partnerDistributionCosts', label: 'Distribution Costs' },
    { field: 'partnerManufacturingCosts', label: 'Manufacturing Costs' },
    { field: 'partnerGAndA', label: 'G&A' },
  ];

  const lc = country.localCurrency ?? config.currency;

  return (
    <div className="mt-6">
      <SectionTitle>Partner Costs ({lc}'000)</SectionTitle>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Partner Tax Rate (%)
          </label>
          <input
            type="number"
            value={((country.partnerTaxRate ?? 0.25) * 100).toFixed(1)}
            onChange={(e) =>
              updateCountryScalar(countryIndex, 'partnerTaxRate', (parseFloat(e.target.value) || 0) / 100)
            }
            min={0}
            max={100}
            step={0.5}
            className="w-24 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="header-cell text-left sticky left-0 bg-gray-100 z-10 min-w-[180px]">Cost Line</th>
                <th className="header-cell text-left w-16">Units</th>
                {periodLabels.map((p, i) => (
                  <th key={i} className="header-cell text-right min-w-[85px]">
                    <div className="text-[10px] text-gray-400">{pc.startYear + i}</div>
                    <div>{p}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partnerCostFields.map(({ field, label }) => {
                const data = ((country as unknown) as Record<string, unknown>)[field] as number[] ?? [];
                return (
                  <tr key={field} className="border-b border-gray-50">
                    <td className="row-label sticky left-0 z-10 bg-white">{label}</td>
                    <td className="px-2 py-1 text-xs text-gray-500 whitespace-nowrap">{lc}'000</td>
                    {periodLabels.map((_, pi) => (
                      <td key={pi} className="p-0">
                        <EditableCell
                          value={data[pi] ?? 0}
                          format="currency"
                          decimals={0}
                          onChange={(v) => updatePartnerCost(countryIndex, field, pi, v)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Assumptions Page
// ────────────────────────────────────────────────────────────

export function AssumptionsPage() {
  const { countries, config } = useStore();
  const [activeCountryTab, setActiveCountryTab] = useState<number | 'global'>('global');

  return (
    <div>
      <PageHeader
        title="Assumptions"
        subtitle={`${countries.length} ${countries.length === 1 ? 'country' : 'countries'}`}
      />

      {/* 1. API Economics (Global) — read-only display */}
      <SectionTitle>API Economics (Global)</SectionTitle>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Beaker size={14} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">
              API economics are configured globally on the <strong>Setup</strong> page.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <div>
            <span className="text-[10px] text-gray-400 block">{UNIT_TYPE_LABELS[config.unitType]} per Gram of API</span>
            <span className="text-sm font-medium text-gray-800">{config.unitsPerGramOfAPI}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block">Manufacturing Overage</span>
            <span className="text-sm font-medium text-gray-800">{(config.manufacturingOverage * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block">Pricing Model</span>
            <span className="text-sm font-medium text-gray-800">{API_PRICING_MODEL_LABELS[config.apiPricingModel]}</span>
          </div>
        </div>
      </div>

      {/* 2. Tabs: Global + Per-Country */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-0 overflow-x-auto">
          {/* Global tab */}
          <button
            onClick={() => setActiveCountryTab('global')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeCountryTab === 'global'
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Globe size={14} />
              Global
            </span>
          </button>

          {/* Country tabs */}
          {countries.map((c, i) => {
            const isActive = activeCountryTab === i;
            return (
              <button
                key={i}
                onClick={() => setActiveCountryTab(i)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {c.name}
                  <span className="text-[10px] text-gray-400 font-normal">({c.localCurrency})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeCountryTab === 'global' ? (
        <PLAssumptionsSection />
      ) : typeof activeCountryTab === 'number' && countries[activeCountryTab] ? (
        <CountryTab countryIndex={activeCountryTab} />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            No countries have been added yet. Go to the{' '}
            <strong>Setup</strong> page to add countries before editing
            assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
