import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle, ScenarioSelector } from './Layout';
import { FormulaCell } from './EditableCell';
import { computePeriodConfig, generatePeriodLabels } from '../types';
import { computeCountryOutputs, computePLOutputs } from '../calculations';

export function SummaryPage() {
  const { countries, config, plAssumptions, fcfBridge, setScenario } = useStore();

  const countryOutputs = useMemo(
    () => countries.map(c => computeCountryOutputs(c, config)),
    [countries, config],
  );

  const plOutputs = useMemo(
    () => computePLOutputs(countryOutputs, countries, plAssumptions, fcfBridge, config),
    [countryOutputs, countries, plAssumptions, fcfBridge, config],
  );

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const years = periodLabels.map((_, i) => pc.startYear + i);

  // ---------- helpers for sum rows ----------
  const sumPeriodArrays = (arrays: number[][]): number[] => {
    const result = new Array(pc.numPeriods).fill(0);
    for (const arr of arrays) {
      for (let i = 0; i < pc.numPeriods; i++) {
        result[i] += arr[i] ?? 0;
      }
    }
    return result;
  };

  // ---------- table data ----------
  const totalMarketVolume = sumPeriodArrays(countryOutputs.map(co => co.marketVolume));

  // ---------- reusable table renderer ----------
  type RowDef = {
    label: string;
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
                  {unit}
                </td>
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

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Summary"
          subtitle="Aggregated view across all countries"
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      {/* ---- 1. Total Market Volume ---- */}
      {renderTable(
        'Total Market Volume',
        "'000 units",
        [
          ...countries.map((c, i) => ({
            label: c.name,
            data: countryOutputs[i].marketVolume,
            decimals: 0,
          })),
          {
            label: 'Total',
            data: totalMarketVolume,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
        ],
      )}

      {/* ---- 2. Net Supply Revenue ---- */}
      {renderTable(
        'Net Supply Revenue',
        `${config.currency}'000`,
        [
          ...countries.map((c, i) => ({
            label: c.name,
            data: plOutputs.netSupplyRevenueByCountry[i] || new Array(pc.numPeriods).fill(0),
            decimals: 0,
          })),
          {
            label: 'Total',
            data: plOutputs.totalNetSupplyRevenue,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
        ],
      )}

      {/* ---- 3. Biosimilar Market Share ---- */}
      {renderTable(
        'Biosimilar Market Share',
        '%',
        countries.map((c, i) => ({
          label: c.name,
          data: countryOutputs[i].biosimilarShare,
          format: 'percent' as const,
          decimals: 1,
        })),
      )}

      {/* ---- 4. P&L Summary ---- */}
      {renderTable(
        'P&L Summary',
        `${config.currency}'000`,
        [
          {
            label: 'Total Revenue',
            data: plOutputs.totalRevenue,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'COGS',
            data: plOutputs.cogs,
            decimals: 0,
            highlight: true,
          },
          {
            label: 'Gross Profit',
            data: plOutputs.grossProfit,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Total OpEx',
            data: plOutputs.totalOpEx,
            decimals: 0,
          },
          {
            label: 'EBITDA',
            data: plOutputs.ebitda,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'EBIT',
            data: plOutputs.ebit,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Net Income',
            data: plOutputs.netIncome,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Free Cash Flow',
            data: plOutputs.freeCashFlow,
            decimals: 0,
            isBold: true,
            highlight: true,
          },
          {
            label: 'Cumulative FCF',
            data: plOutputs.cumulativeFCF,
            decimals: 0,
            highlight: true,
          },
        ],
      )}
    </div>
  );
}
