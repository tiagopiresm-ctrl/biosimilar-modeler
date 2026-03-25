import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle, ScenarioSelector } from './Layout';
import { EditableCell, FormulaCell } from './EditableCell';
import { computePeriodConfig, generatePeriodLabels } from '../types';
import { computeCountryOutputs, computePLOutputs, computeWACCOutputs, computeNPVOutputs, formatNumber, formatPercent } from '../calculations';

// ---- Helpers ----

function formatYear(year: number | null): string {
  if (year === null) return 'N/A';
  return String(year);
}

function formatKPICurrency(value: number): string {
  if (!isFinite(value)) return 'N/A';
  return formatNumber(value, 0);
}

// ---- Component ----

export function NPVPage() {
  const {
    countries,
    config,
    plAssumptions,
    waccInputs,
    fcfBridge,
    npvRisk,
    updateNPVRisk,
    updateConfig,
    setScenario,
  } = useStore();

  // ---- Computation chain ----
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

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const years = periodLabels.map((_, i) => pc.startYear + i);

  // ---- Row definition types ----
  type RowKind = 'formula' | 'editable';
  interface RowDef {
    label: string;
    unit: string;
    data: number[];
    kind: RowKind;
    format?: 'number' | 'percent' | 'currency';
    decimals?: number;
    highlight?: boolean;
    isBold?: boolean;
    onEdit?: (periodIndex: number, value: number) => void;
  }

  // ---- Section 1: DCF Waterfall ----
  const dcfRows: RowDef[] = [
    {
      label: 'EBIT',
      unit: `${config.currency}'000`,
      data: npvOutputs.ebit,
      kind: 'formula',
      decimals: 0,
    },
    {
      label: 'D&A Add-back',
      unit: `${config.currency}'000`,
      data: npvOutputs.daAddBack,
      kind: 'formula',
      decimals: 0,
    },
    {
      label: 'Income Tax',
      unit: `${config.currency}'000`,
      data: npvOutputs.incomeTax,
      kind: 'formula',
      decimals: 0,
      highlight: true,
    },
    {
      label: 'Working Capital Change',
      unit: `${config.currency}'000`,
      data: npvOutputs.wcChange,
      kind: 'formula',
      decimals: 0,
    },
    {
      label: 'Capital Expenditure',
      unit: `${config.currency}'000`,
      data: fcfBridge.capitalExpenditure,
      kind: 'formula',
      decimals: 0,
    },
    {
      label: 'Free Cash Flow',
      unit: `${config.currency}'000`,
      data: npvOutputs.fcf,
      kind: 'formula',
      decimals: 0,
      highlight: true,
      isBold: true,
    },
    {
      label: 'Cumulative FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.cumulativeFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
      isBold: true,
    },
  ];

  // ---- Section 2: Discounting ----
  const discountingRows: RowDef[] = [
    {
      label: `Discount Rate (WACC)`,
      unit: '%',
      data: npvOutputs.discountRate,
      kind: 'formula',
      format: 'percent',
      decimals: 2,
    },
    {
      label: 'Discount Factor',
      unit: 'x',
      data: npvOutputs.discountFactor,
      kind: 'formula',
      decimals: 4,
    },
    {
      label: 'Discounted FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.discountedFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
    },
    {
      label: 'Cumulative Discounted FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.cumulativeDiscountedFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
      isBold: true,
    },
  ];

  // ---- Section 3: Risk Adjustment ----
  const riskRows: RowDef[] = [
    {
      label: 'Cumulative PoS',
      unit: '%',
      data: npvRisk.cumulativePoS,
      kind: 'editable',
      format: 'percent',
      decimals: 1,
      onEdit: (pi, v) => updateNPVRisk(pi, v),
    },
    {
      label: 'Risk-Adjusted FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.riskAdjustedFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
    },
    {
      label: 'Risk-Adjusted Discounted FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.riskAdjustedDiscountedFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
    },
    {
      label: 'Cumulative Risk-Adj. Discounted FCF',
      unit: `${config.currency}'000`,
      data: npvOutputs.cumulativeRiskAdjDiscountedFCF,
      kind: 'formula',
      decimals: 0,
      highlight: true,
      isBold: true,
    },
  ];

  // ---- Render a table section ----
  const renderSection = (title: string, rows: RowDef[]) => (
    <>
      <SectionTitle>{title}</SectionTitle>
      <div className="overflow-x-scroll overflow-y-auto border border-gray-200 rounded-lg mb-8">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="header-cell text-left sticky left-0 bg-gray-100 z-30 min-w-[200px]">
                Line Item
              </th>
              <th className="header-cell text-left w-16 bg-gray-100">Units</th>
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
              <tr
                key={ri}
                className={`border-b border-gray-50 ${row.isBold ? 'bg-gray-50' : ''}`}
              >
                <td
                  className={`row-label sticky left-0 z-10 ${
                    row.isBold ? 'font-bold bg-gray-50' : 'bg-white'
                  }`}
                >
                  {row.label}
                </td>
                <td className="px-2 py-1 text-xs text-gray-500 whitespace-nowrap">
                  {row.unit}
                </td>
                {row.data.map((val, pi) => (
                  <td key={pi} className="p-0">
                    {row.kind === 'editable' && row.onEdit ? (
                      <EditableCell
                        value={val}
                        format={row.format || 'currency'}
                        decimals={row.decimals ?? 0}
                        onChange={v => row.onEdit!(pi, v)}
                      />
                    ) : (
                      <FormulaCell
                        value={val}
                        format={row.format || 'number'}
                        decimals={row.decimals ?? 0}
                        highlight={row.highlight}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  // ---- KPI cards data ----
  interface KPICard {
    label: string;
    value: string;
    isNegative: boolean;
    isPositive: boolean;
    isNA: boolean;
  }

  const kpis: KPICard[] = [
    {
      label: `NPV (${config.currency}'000)`,
      value: formatKPICurrency(npvOutputs.npv),
      isNegative: npvOutputs.npv < 0,
      isPositive: npvOutputs.npv > 0,
      isNA: false,
    },
    {
      label: `rNPV (${config.currency}'000)`,
      value: formatKPICurrency(npvOutputs.rnpv),
      isNegative: npvOutputs.rnpv < 0,
      isPositive: npvOutputs.rnpv > 0,
      isNA: false,
    },
    ...(config.terminalValueEnabled ? [
      {
        label: `NPV incl. TV (${config.currency}'000)`,
        value: formatKPICurrency(npvOutputs.npvWithTV),
        isNegative: npvOutputs.npvWithTV < 0,
        isPositive: npvOutputs.npvWithTV > 0,
        isNA: false,
      },
      {
        label: `rNPV incl. TV (${config.currency}'000)`,
        value: formatKPICurrency(npvOutputs.rnpvWithTV),
        isNegative: npvOutputs.rnpvWithTV < 0,
        isPositive: npvOutputs.rnpvWithTV > 0,
        isNA: false,
      },
    ] : []),
    {
      label: 'IRR (%)',
      value: npvOutputs.irr !== null ? formatPercent(npvOutputs.irr, 1) : 'N/A',
      isNegative: npvOutputs.irr !== null && npvOutputs.irr < 0,
      isPositive: npvOutputs.irr !== null && npvOutputs.irr > 0,
      isNA: npvOutputs.irr === null,
    },
    {
      label: 'rIRR (%)',
      value: npvOutputs.rirr !== null ? formatPercent(npvOutputs.rirr, 1) : 'N/A',
      isNegative: npvOutputs.rirr !== null && npvOutputs.rirr < 0,
      isPositive: npvOutputs.rirr !== null && npvOutputs.rirr > 0,
      isNA: npvOutputs.rirr === null,
    },
    {
      label: `Money at Risk (${config.currency}'000)`,
      value: formatKPICurrency(npvOutputs.moneyAtRisk),
      isNegative: npvOutputs.moneyAtRisk < 0,
      isPositive: npvOutputs.moneyAtRisk > 0,
      isNA: false,
    },
    {
      label: `Funding Need (${config.currency}'000)`,
      value: formatKPICurrency(npvOutputs.fundingNeed),
      isNegative: npvOutputs.fundingNeed < 0,
      isPositive: npvOutputs.fundingNeed > 0,
      isNA: false,
    },
    {
      label: 'Payback (Undiscounted)',
      value: formatYear(npvOutputs.paybackUndiscounted),
      isNegative: false,
      isPositive: npvOutputs.paybackUndiscounted !== null,
      isNA: npvOutputs.paybackUndiscounted === null,
    },
    {
      label: 'Payback (Discounted)',
      value: formatYear(npvOutputs.paybackDiscounted),
      isNegative: false,
      isPositive: npvOutputs.paybackDiscounted !== null,
      isNA: npvOutputs.paybackDiscounted === null,
    },
    {
      label: 'Break-Even Year',
      value: formatYear(npvOutputs.breakEvenYear),
      isNegative: false,
      isPositive: npvOutputs.breakEvenYear !== null,
      isNA: npvOutputs.breakEvenYear === null,
    },
    {
      label: 'Breakeven from Launch (yrs)',
      value: npvOutputs.breakEvenFromLaunchYears !== null ? `${npvOutputs.breakEvenFromLaunchYears} yrs` : 'N/A',
      isNegative: false,
      isPositive: npvOutputs.breakEvenFromLaunchYears !== null,
      isNA: npvOutputs.breakEvenFromLaunchYears === null,
    },
    {
      label: 'Disc. Payback from Launch (yrs)',
      value: npvOutputs.discountedPaybackYears !== null ? `${npvOutputs.discountedPaybackYears} yrs` : 'N/A',
      isNegative: false,
      isPositive: npvOutputs.discountedPaybackYears !== null,
      isNA: npvOutputs.discountedPaybackYears === null,
    },
    {
      label: `Peak EBIT (${config.currency}'000)`,
      value:
        npvOutputs.peakEbitYear !== null
          ? `${formatKPICurrency(npvOutputs.peakEbitValue)} @ ${formatYear(npvOutputs.peakEbitYear)}`
          : 'N/A',
      isNegative: npvOutputs.peakEbitValue < 0 && npvOutputs.peakEbitYear !== null,
      isPositive: npvOutputs.peakEbitValue > 0 && npvOutputs.peakEbitYear !== null,
      isNA: npvOutputs.peakEbitYear === null,
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="NPV -- Discounted Cash Flow Analysis"
          subtitle={`WACC: ${formatPercent(waccOutputs.activeWACC, 2)}`}
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      {/* Terminal Value Settings */}
      <SectionTitle>Terminal Value (Gordon Growth Model)</SectionTitle>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8 flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.terminalValueEnabled}
            onChange={e => updateConfig('terminalValueEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Enable Terminal Value</span>
        </label>
        {config.terminalValueEnabled && (
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Perpetuity Growth Rate (g):</span>
            <input
              type="number"
              step="0.5"
              value={parseFloat((config.terminalValueGrowthRate * 100).toFixed(4))}
              onChange={e => updateConfig('terminalValueGrowthRate', parseFloat(e.target.value) / 100)}
              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-right"
            />
            <span className="text-sm text-gray-500">%</span>
          </label>
        )}
        {config.terminalValueEnabled && (
          <div className="text-xs text-gray-500 w-full mt-1">
            TV = FCF<sub>last</sub> x (1+g) / (WACC - g), discounted to present.
            {npvOutputs.terminalValue !== 0 && (
              <span className="ml-2 font-medium">
                Undiscounted TV: {formatNumber(npvOutputs.terminalValue, 0)} |
                Discounted TV: {formatNumber(npvOutputs.discountedTerminalValue, 0)} |
                NPV incl. TV: {formatNumber(npvOutputs.npvWithTV, 0)} |
                rNPV incl. TV: {formatNumber(npvOutputs.rnpvWithTV, 0)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <SectionTitle>Key Performance Indicators</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {kpi.label}
            </div>
            <div
              className={`text-xl font-bold ${
                kpi.isNA
                  ? 'text-gray-400'
                  : kpi.isNegative
                    ? 'text-red-600'
                    : kpi.isPositive
                      ? 'text-green-700'
                      : 'text-gray-900'
              }`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* DCF Waterfall */}
      {renderSection('DCF Waterfall (EBIT to FCF)', dcfRows)}

      {/* Discounting */}
      {renderSection('Discounting', discountingRows)}

      {/* Risk Adjustment */}
      {renderSection('Risk Adjustment', riskRows)}

      {/* Footer note */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mt-4">
        <strong>Notes:</strong> Mid-period discounting convention is applied (cash flows assumed at mid-year).
        Discount Factor at LOE = 1/(1+WACC)^0.5.
        Working Capital Change and Capital Expenditure are edited on the Assumptions page.
        Cumulative PoS values are applied per period to derive risk-adjusted cash flows.
      </div>
    </div>
  );
}
