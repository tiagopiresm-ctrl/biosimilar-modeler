import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, ScenarioSelector } from './Layout';
import { SCENARIO_LABELS, computePeriodConfig, generatePeriodLabels, getEarliestLoeIndex } from '../types';
import {
  computeCountryOutputs,
  computePLOutputs,
  computeWACCOutputs,
  computeNPVOutputs,
  computeDecisionTreeOutputs,
  formatNumber,
  formatPercent,
} from '../calculations';

// ---- Helpers ----

function formatYear(year: number | null): string {
  if (year === null) return 'N/A';
  return String(year);
}

/** Return Tailwind text color class based on value sign. */
function valueColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-700';
}

/** Return a subtle background accent for positive/negative KPI cards. */
function cardAccent(value: number | null): string {
  if (value === null) return 'border-l-4 border-l-gray-300';
  if (value > 0) return 'border-l-4 border-l-emerald-400';
  if (value < 0) return 'border-l-4 border-l-red-400';
  return 'border-l-4 border-l-gray-300';
}

// ---- Dashboard Page ----

export function KPIsPage() {
  const { countries, config, plAssumptions, waccInputs, fcfBridge, npvRisk, decisionTree, setScenario } = useStore();

  // ---- Computation chain (mirrors NPV page) ----
  const countryOutputs = useMemo(
    () => countries.map(c => computeCountryOutputs(c, config)),
    [countries, config],
  );
  const plOutputs = useMemo(
    () => computePLOutputs(countryOutputs, countries, plAssumptions, fcfBridge, config),
    [countryOutputs, countries, plAssumptions, fcfBridge, config],
  );
  const waccOutputs = useMemo(
    () => computeWACCOutputs(waccInputs, config.activeScenario),
    [waccInputs, config.activeScenario],
  );
  const npvOutputs = useMemo(
    () => computeNPVOutputs(plOutputs, waccOutputs, npvRisk, config, countries),
    [plOutputs, waccOutputs, npvRisk, config, countries],
  );
  const dtOutputs = useMemo(
    () => computeDecisionTreeOutputs(decisionTree, npvOutputs),
    [decisionTree, npvOutputs],
  );

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const earliestLoeIdx = getEarliestLoeIndex(countries, pc.startYear);
  const loe5Index = Math.min(earliestLoeIdx + 5, pc.numPeriods - 1);
  const lastIndex = pc.numPeriods - 1;

  const ccy = config.currency;
  const scenarioLabel = SCENARIO_LABELS[config.activeScenario];

  // Compute Peak Revenue Year
  let peakRevenueValue = 0;
  let peakRevenueYear: number | null = null;
  for (let i = 0; i < pc.numPeriods; i++) {
    if (plOutputs.totalRevenue[i] > peakRevenueValue) {
      peakRevenueValue = plOutputs.totalRevenue[i];
      peakRevenueYear = pc.startYear + i;
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="KPIs Dashboard"
          subtitle={`Executive summary — ${config.moleculeName} | WACC: ${formatPercent(waccOutputs.activeWACC, 2)}`}
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      {/* ================================================================
          SECTION 1 — Top KPI Cards (Primary Valuation Metrics)
          ================================================================ */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Valuation Metrics
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* NPV */}
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(npvOutputs.npv)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            NPV
          </div>
          <div className={`text-3xl font-bold ${valueColor(npvOutputs.npv)}`}>
            {formatNumber(npvOutputs.npv, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 (discounted)</div>
        </div>

        {/* rNPV */}
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(npvOutputs.rnpv)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            rNPV
          </div>
          <div className={`text-3xl font-bold ${valueColor(npvOutputs.rnpv)}`}>
            {formatNumber(npvOutputs.rnpv, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 (risk-adjusted)</div>
        </div>

        {/* IRR */}
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(npvOutputs.irr)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            IRR
          </div>
          <div className={`text-3xl font-bold ${npvOutputs.irr !== null ? valueColor(npvOutputs.irr) : 'text-gray-400'}`}>
            {npvOutputs.irr !== null ? formatPercent(npvOutputs.irr, 1) : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Internal Rate of Return</div>
        </div>

        {/* rIRR */}
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(npvOutputs.rirr)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            rIRR
          </div>
          <div className={`text-3xl font-bold ${npvOutputs.rirr !== null ? valueColor(npvOutputs.rirr) : 'text-gray-400'}`}>
            {npvOutputs.rirr !== null ? formatPercent(npvOutputs.rirr, 1) : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Risk-adjusted IRR</div>
        </div>

        {/* eNPV */}
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(dtOutputs.enpv)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            eNPV
          </div>
          <div className={`text-3xl font-bold ${valueColor(dtOutputs.enpv)}`}>
            {formatNumber(dtOutputs.enpv, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 (expected, from NPV)</div>
        </div>

        {/* Active WACC */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 border-l-4 border-l-blue-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Active WACC
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatPercent(waccOutputs.activeWACC, 2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Discount rate ({scenarioLabel})</div>
        </div>
      </div>

      {/* ================================================================
          SECTION 2 — Financial Risk & Payback Metrics
          ================================================================ */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Financial Risk & Payback
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {/* Money at Risk */}
        <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.moneyAtRisk)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Money at Risk
          </div>
          <div className={`text-2xl font-bold ${npvOutputs.moneyAtRisk < 0 ? valueColor(npvOutputs.moneyAtRisk) : 'text-gray-400'}`}>
            {npvOutputs.moneyAtRisk < 0 ? formatNumber(npvOutputs.moneyAtRisk, 0) : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 (deepest cumulative FCF trough)</div>
        </div>

        {/* Payback Year (Undiscounted) — calendar year */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-indigo-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payback Year (Undiscounted)
          </div>
          <div className={`text-2xl font-bold ${npvOutputs.paybackUndiscounted !== null ? 'text-indigo-600' : 'text-gray-400'}`}>
            {formatYear(npvOutputs.paybackUndiscounted)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Calendar year — cumulative FCF positive</div>
        </div>

        {/* Payback Year (Discounted) — calendar year */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-violet-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payback Year (Discounted)
          </div>
          <div className={`text-2xl font-bold ${npvOutputs.paybackDiscounted !== null ? 'text-violet-600' : 'text-gray-400'}`}>
            {formatYear(npvOutputs.paybackDiscounted)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Calendar year — discounted cumulative positive</div>
        </div>

        {/* Payback from Launch (Undiscounted, years) */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-cyan-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payback from Launch (yrs)
          </div>
          <div className={`text-2xl font-bold ${npvOutputs.paybackFromLaunchUndiscounted !== null ? 'text-cyan-600' : 'text-gray-400'}`}>
            {npvOutputs.paybackFromLaunchUndiscounted !== null ? `${npvOutputs.paybackFromLaunchUndiscounted} yr${npvOutputs.paybackFromLaunchUndiscounted !== 1 ? 's' : ''}` : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Undiscounted, from launch</div>
        </div>

        {/* Discounted Payback from Launch (years) */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-purple-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Disc. Payback from Launch (yrs)
          </div>
          <div className={`text-2xl font-bold ${npvOutputs.discountedPaybackFromLaunch !== null ? 'text-purple-600' : 'text-gray-400'}`}>
            {npvOutputs.discountedPaybackFromLaunch !== null ? `${npvOutputs.discountedPaybackFromLaunch} yr${npvOutputs.discountedPaybackFromLaunch !== 1 ? 's' : ''}` : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Discounted, from launch</div>
        </div>
      </div>

      {/* ================================================================
          SECTION 3 — P&L Highlights
          ================================================================ */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          P&L Highlights
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Peak EBIT */}
        <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.peakEbitValue)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Peak EBIT
          </div>
          <div className={`text-2xl font-bold ${valueColor(npvOutputs.peakEbitValue)}`}>
            {formatNumber(npvOutputs.peakEbitValue, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {ccy}'000 at {formatYear(npvOutputs.peakEbitYear)}
          </div>
        </div>

        {/* Peak Revenue Year */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-orange-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Peak Revenue Year
          </div>
          <div className={`text-2xl font-bold ${peakRevenueYear !== null ? 'text-orange-600' : 'text-gray-400'}`}>
            {formatYear(peakRevenueYear)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 {formatNumber(peakRevenueValue, 0)}</div>
        </div>

        {/* Cumulative FCF (final period) */}
        <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(plOutputs.cumulativeFCF[lastIndex])}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Cumulative FCF
          </div>
          <div className={`text-2xl font-bold ${valueColor(plOutputs.cumulativeFCF[lastIndex])}`}>
            {formatNumber(plOutputs.cumulativeFCF[lastIndex], 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 at {periodLabels[lastIndex]} (final period)</div>
        </div>

        {/* Total Revenue at LOE+5 */}
        <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(plOutputs.totalRevenue[loe5Index])}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Total Revenue ({periodLabels[loe5Index]})
          </div>
          <div className={`text-2xl font-bold ${valueColor(plOutputs.totalRevenue[loe5Index])}`}>
            {formatNumber(plOutputs.totalRevenue[loe5Index], 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000 at {periodLabels[loe5Index]}</div>
        </div>

        {/* Gross Margin at LOE+5 */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 border-l-4 border-l-teal-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Gross Margin ({periodLabels[loe5Index]})
          </div>
          <div className="text-2xl font-bold text-teal-600">
            {formatPercent(plOutputs.grossMargin[loe5Index], 1)}
          </div>
          <div className="text-xs text-gray-400 mt-1">At {periodLabels[loe5Index]}</div>
        </div>
      </div>

      {/* ================================================================
          SECTION 4 — Decision Tree Summary
          ================================================================ */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Decision Tree Summary
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Cumulative PoS */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-5 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
              Cumulative PoS
            </div>
            <div className="text-xs text-indigo-400">
              {decisionTree.length} gate{decisionTree.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-700">
            {formatPercent(dtOutputs.cumulativePoS, 1)}
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 w-full bg-indigo-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(dtOutputs.cumulativePoS * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-indigo-400 mt-1">Probability of Success</div>
        </div>

        {/* Number of Gates */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-md p-5 border border-gray-200">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Decision Gates
          </div>
          <div className="text-3xl font-bold text-gray-700">
            {decisionTree.length}
          </div>
          <div className="mt-3 space-y-1">
            {decisionTree.slice(0, 4).map((gate, i) => (
              <div key={i} className="flex items-center text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-400 mr-2 flex-shrink-0" />
                <span className="truncate">{gate.name}</span>
                <span className="ml-auto font-mono text-gray-400">
                  {formatPercent(gate.probability, 0)}
                </span>
              </div>
            ))}
            {decisionTree.length > 4 && (
              <div className="text-xs text-gray-400 italic">
                +{decisionTree.length - 4} more gate{decisionTree.length - 4 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* eNPV from rNPV */}
        <div className={`bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-md p-5 border border-emerald-100`}>
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-3">
            eNPV (from rNPV)
          </div>
          <div className={`text-3xl font-bold ${dtOutputs.enpvFromRnpv >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatNumber(dtOutputs.enpvFromRnpv, 0)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">{ccy}'000 (rNPV x PoS)</div>
        </div>
      </div>

      {/* ================================================================
          SECTION 5 — Country Snapshot Table
          ================================================================ */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Country Snapshot at {periodLabels[loe5Index]}
        </h3>
      </div>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Biosimilar Mkt Share
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Net Supply Revenue ({ccy}'000)
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Royalty Income ({ccy}'000)
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  In-Market Sales ({ccy}'000)
                </th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country, ci) => {
                const co = countryOutputs[ci];
                return (
                  <tr
                    key={ci}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 flex-shrink-0" />
                        {country.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {formatPercent(co.biosimilarShare[loe5Index], 1)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${valueColor(co.netSupplyRevenue[loe5Index])}`}>
                      {formatNumber(co.netSupplyRevenue[loe5Index], 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${valueColor(co.royaltyIncome[loe5Index])}`}>
                      {formatNumber(co.royaltyIncome[loe5Index], 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${valueColor(co.biosimilarInMarketSales[loe5Index])}`}>
                      {formatNumber(co.biosimilarInMarketSales[loe5Index], 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">--</td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${valueColor(plOutputs.totalNetSupplyRevenue[loe5Index])}`}>
                  {formatNumber(plOutputs.totalNetSupplyRevenue[loe5Index], 0)}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${valueColor(plOutputs.totalRoyaltyIncome[loe5Index])}`}>
                  {formatNumber(plOutputs.totalRoyaltyIncome[loe5Index], 0)}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${valueColor(
                  countryOutputs.reduce((sum, co) => sum + co.biosimilarInMarketSales[loe5Index], 0)
                )}`}>
                  {formatNumber(
                    countryOutputs.reduce((sum, co) => sum + co.biosimilarInMarketSales[loe5Index], 0),
                    0,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ================================================================
          SECTION 6 — Terminal Value KPIs (conditional)
          ================================================================ */}
      {config.terminalValueEnabled && (
        <>
          <div className="mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Terminal Value
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.terminalValue)}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Terminal Value
              </div>
              <div className={`text-2xl font-bold ${valueColor(npvOutputs.terminalValue)}`}>
                {formatNumber(npvOutputs.terminalValue, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-1">{ccy}'000 (undiscounted)</div>
            </div>

            <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.discountedTerminalValue)}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Discounted TV
              </div>
              <div className={`text-2xl font-bold ${valueColor(npvOutputs.discountedTerminalValue)}`}>
                {formatNumber(npvOutputs.discountedTerminalValue, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-1">{ccy}'000 (PV of TV)</div>
            </div>

            <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.npvWithTV)}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                NPV + TV
              </div>
              <div className={`text-2xl font-bold ${valueColor(npvOutputs.npvWithTV)}`}>
                {formatNumber(npvOutputs.npvWithTV, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-1">{ccy}'000</div>
            </div>

            <div className={`bg-white rounded-xl shadow-md p-5 border border-gray-100 ${cardAccent(npvOutputs.rnpvWithTV)}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                rNPV + TV
              </div>
              <div className={`text-2xl font-bold ${valueColor(npvOutputs.rnpvWithTV)}`}>
                {formatNumber(npvOutputs.rnpvWithTV, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-1">{ccy}'000 (risk-adjusted)</div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          Footer — Scenario / Config Info Bar
          ================================================================ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-800 flex flex-wrap items-center gap-4">
        <div>
          <span className="font-semibold">Molecule:</span> {config.moleculeName}
        </div>
        <div className="h-4 w-px bg-blue-300" />
        <div>
          <span className="font-semibold">LOE:</span> {countries.map(c => `${c.name.slice(0, 3)} ${c.loeYear}`).join(', ')}
        </div>
        <div className="h-4 w-px bg-blue-300" />
        <div>
          <span className="font-semibold">Scenario:</span> {scenarioLabel}
        </div>
        <div className="h-4 w-px bg-blue-300" />
        <div>
          <span className="font-semibold">Countries:</span> {countries.length}
        </div>
        <div className="h-4 w-px bg-blue-300" />
        <div>
          <span className="font-semibold">Currency:</span> {ccy}
        </div>
      </div>
    </div>
  );
}
