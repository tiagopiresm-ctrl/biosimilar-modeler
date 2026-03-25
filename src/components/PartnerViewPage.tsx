import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle, ScenarioSelector } from './Layout';
import { FormulaCell } from './EditableCell';
import { computePeriodConfig, generatePeriodLabels } from '../types';
import {
  computeCountryOutputs,
  computePLOutputs,
  computeWACCOutputs,
  computeNPVOutputs,
  computePartnerViewOutputs,
  formatNumber,
  formatPercent,
} from '../calculations';

// ---- Helpers ----

function valueColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-700';
}

function cardAccent(value: number | null): string {
  if (value === null) return 'border-l-4 border-l-gray-300';
  if (value > 0) return 'border-l-4 border-l-emerald-400';
  if (value < 0) return 'border-l-4 border-l-red-400';
  return 'border-l-4 border-l-gray-300';
}

// ---- Page Component ----

export function PartnerViewPage() {
  const { countries, config, plAssumptions, waccInputs, fcfBridge, npvRisk, setScenario } = useStore();

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
  const partnerOutputs = useMemo(
    () => computePartnerViewOutputs(countryOutputs, countries, config, npvOutputs),
    [countryOutputs, countries, config, npvOutputs],
  );

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const years = periodLabels.map((_, i) => pc.startYear + i);
  const ccy = config.currency;

  if (!config.partnerViewEnabled || !partnerOutputs) {
    return (
      <div>
        <PageHeader title="Partner View" subtitle="Partner NPV modeling is disabled" />
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Enable Partner View on the <strong>Setup</strong> page to see the partner's P&L and NPV analysis.
          </p>
        </div>
      </div>
    );
  }

  // ---- Row definitions ----
  type RowDef = {
    label: string;
    unit?: string;
    data: number[];
    format?: 'number' | 'percent';
    decimals?: number;
    highlight?: boolean;
    isBold?: boolean;
  };

  const renderTable = (title: string, unit: string, rows: RowDef[]) => (
    <div className="mb-8">
      <SectionTitle>{title}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="header-cell text-left sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                {title}
              </th>
              <th className="header-cell text-left w-16">Units</th>
              {periodLabels.map((p, i) => (
                <th key={i} className="header-cell text-right min-w-[85px]">
                  <div className="text-[10px] text-gray-400">{years[i]}</div>
                  <div>{p}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-gray-50 ${row.isBold ? 'bg-gray-50' : ''}`}>
                <td className={`row-label sticky left-0 z-10 ${row.isBold ? 'font-bold bg-gray-50' : 'bg-white'}`}>
                  {row.label}
                </td>
                <td className="px-2 py-1 text-xs text-gray-500 whitespace-nowrap">{unit}</td>
                {row.data.map((val, pi) => (
                  <td key={pi} className="p-0">
                    <FormulaCell
                      value={val}
                      format={row.format || 'number'}
                      decimals={row.decimals ?? 0}
                      highlight={row.highlight}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // NPV bar chart data
  const companyNPV = npvOutputs.npv;
  const partnerNPV = partnerOutputs.partnerNPV;
  const maxNPV = Math.max(Math.abs(companyNPV), Math.abs(partnerNPV), 1);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Partner View"
          subtitle={`Partner profitability analysis alongside company NPV | WACC: ${formatPercent(waccOutputs.activeWACC, 2)}`}
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          NPV Comparison
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(companyNPV)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company NPV</div>
          <div className={`text-3xl font-bold ${valueColor(companyNPV)}`}>
            {formatNumber(companyNPV, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000</div>
        </div>

        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${cardAccent(partnerNPV)}`}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Partner NPV</div>
          <div className={`text-3xl font-bold ${valueColor(partnerNPV)}`}>
            {formatNumber(partnerNPV, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ccy}'000</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 border-l-4 border-l-blue-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Share</div>
          <div className="text-3xl font-bold text-blue-600">
            {formatPercent(partnerOutputs.companyNPVShare, 1)}
          </div>
          <div className="text-xs text-gray-400 mt-1">of total NPV</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 border-l-4 border-l-purple-400">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Partner Share</div>
          <div className="text-3xl font-bold text-purple-600">
            {formatPercent(partnerOutputs.partnerNPVShare, 1)}
          </div>
          <div className="text-xs text-gray-400 mt-1">of total NPV</div>
        </div>
      </div>

      {/* ---- Bar Chart: Company vs Partner NPV ---- */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          NPV Split
        </h3>
      </div>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
        <div className="flex items-end gap-8 h-48 justify-center">
          {/* Company bar */}
          <div className="flex flex-col items-center gap-2 w-32">
            <div className="text-xs font-medium text-gray-600">{formatNumber(companyNPV, 0)}</div>
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${companyNPV >= 0 ? 'bg-blue-500' : 'bg-red-400'}`}
              style={{ height: `${Math.max(Math.abs(companyNPV) / maxNPV * 140, 4)}px` }}
            />
            <div className="text-sm font-semibold text-gray-700">Company</div>
          </div>
          {/* Partner bar */}
          <div className="flex flex-col items-center gap-2 w-32">
            <div className="text-xs font-medium text-gray-600">{formatNumber(partnerNPV, 0)}</div>
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${partnerNPV >= 0 ? 'bg-purple-500' : 'bg-red-400'}`}
              style={{ height: `${Math.max(Math.abs(partnerNPV) / maxNPV * 140, 4)}px` }}
            />
            <div className="text-sm font-semibold text-gray-700">Partner</div>
          </div>
        </div>
      </div>

      {/* ---- Pie Chart: NPV Share ---- */}
      <div className="mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          NPV Share Split
        </h3>
      </div>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8 flex items-center justify-center">
        <div className="flex items-center gap-8">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {(() => {
              const companyPct = Math.max(0, partnerOutputs.companyNPVShare);
              const companyDeg = companyPct * 360;
              const r = 70;
              const cx = 80;
              const cy = 80;
              // Company arc
              const companyEnd = (companyDeg * Math.PI) / 180;
              const x1 = cx + r * Math.sin(companyEnd);
              const y1 = cy - r * Math.cos(companyEnd);
              const largeArc = companyDeg > 180 ? 1 : 0;
              return (
                <>
                  {/* Full circle background (partner) */}
                  <circle cx={cx} cy={cy} r={r} fill="#a855f7" />
                  {/* Company slice */}
                  {companyDeg > 0 && companyDeg < 360 && (
                    <path
                      d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`}
                      fill="#3b82f6"
                    />
                  )}
                  {companyDeg >= 360 && (
                    <circle cx={cx} cy={cy} r={r} fill="#3b82f6" />
                  )}
                </>
              );
            })()}
          </svg>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm text-gray-700">Company: {formatPercent(partnerOutputs.companyNPVShare, 1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500" />
              <span className="text-sm text-gray-700">Partner: {formatPercent(partnerOutputs.partnerNPVShare, 1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Partner P&L Summary ---- */}
      {renderTable(
        'Partner P&L (Aggregated, in Model Currency)',
        `${ccy}'000`,
        [
          {
            label: 'Partner Net Sales (Revenue Net of GTN)',
            data: partnerOutputs.totalPartnerRevenue,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Partner Net Income',
            data: partnerOutputs.totalPartnerNetIncome,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Partner FCF',
            data: partnerOutputs.totalPartnerFCF,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
        ],
      )}

      {/* ---- Per-Country Partner P&L ---- */}
      {countries.map((country, ci) => {
        const pco = partnerOutputs.perCountry[ci];
        if (!pco) return null;
        const lc = country.localCurrency ?? ccy;
        return renderTable(
          `Partner P&L: ${country.name} (${lc}'000)`,
          `${lc}'000`,
          [
            { label: 'Partner Net Sales (Revenue Net of GTN)', data: pco.partnerRevenue, decimals: 0 },
            { label: 'COGS (Supply Price to Us)', data: pco.partnerCOGS, decimals: 0 },
            { label: 'Gross Profit', data: pco.partnerGrossProfit, decimals: 0, isBold: true, highlight: true },
            { label: 'Total Costs', data: pco.partnerTotalCosts, decimals: 0 },
            { label: 'EBITDA', data: pco.partnerEBITDA, decimals: 0, isBold: true, highlight: true },
            { label: 'Net Income', data: pco.partnerNetIncome, decimals: 0, isBold: true, highlight: true },
          ],
        );
      })}

      {/* Footer */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mt-4">
        <strong>Notes:</strong> Partner NPV uses the same WACC and discount factors as the company NPV.
        Partner FCF is simplified (= Net Income, no separate WC/capex adjustments).
        Partner COGS represents the supply price they pay to us.
      </div>
    </div>
  );
}
