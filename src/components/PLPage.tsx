import { Fragment, useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, ScenarioSelector } from './Layout';
import { FormulaCell } from './EditableCell';
import { computePeriodConfig, generatePeriodLabels } from '../types';
import { computeCountryOutputs, computePLOutputs } from '../calculations';

export function PLPage() {
  const { countries, config, plAssumptions, fcfBridge, setScenario } = useStore();

  const plOutputs = useMemo(() => {
    const countryOutputs = countries.map(c => computeCountryOutputs(c, config));
    return computePLOutputs(countryOutputs, countries, plAssumptions, fcfBridge, config);
  }, [countries, config, plAssumptions, fcfBridge]);

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const years = periodLabels.map((_, i) => pc.startYear + i);

  type RowDef = {
    label: string;
    unit: string;
    data: number[];
    format?: 'number' | 'percent';
    decimals?: number;
    highlight?: boolean;
    isBold?: boolean;
    isSection?: boolean;
    indent?: boolean;
  };

  const sections: { title: string; rows: RowDef[] }[] = [
    {
      title: 'REVENUE',
      rows: [
        ...countries.map((c, i) => ({
          label: `  ${c.name} — Net Supply Revenue`,
          unit: `${config.currency}'000`,
          data: plOutputs.netSupplyRevenueByCountry[i] || new Array(pc.numPeriods).fill(0),
          decimals: 0,
          indent: true,
        })),
        { label: '  Total Net Supply Revenue', unit: `${config.currency}'000`, data: plOutputs.totalNetSupplyRevenue, decimals: 0 },
        { label: '  Total Royalty Income', unit: `${config.currency}'000`, data: plOutputs.totalRoyaltyIncome, decimals: 0 },
        { label: '  Total Milestone Income', unit: `${config.currency}'000`, data: plOutputs.totalMilestoneIncome, decimals: 0 },
        { label: 'Total Revenue', unit: `${config.currency}'000`, data: plOutputs.totalRevenue, decimals: 0, isBold: true, highlight: true },
      ],
    },
    {
      title: 'COST OF GOODS SOLD',
      rows: [
        { label: 'COGS', unit: `${config.currency}'000`, data: plOutputs.cogs, decimals: 0, highlight: true },
        { label: 'Other Income', unit: `${config.currency}'000`, data: plOutputs.otherIncome, decimals: 0 },
        { label: 'Gross Profit', unit: `${config.currency}'000`, data: plOutputs.grossProfit, decimals: 0, isBold: true, highlight: true },
        { label: 'Gross Margin', unit: '%', data: plOutputs.grossMargin, format: 'percent', decimals: 1 },
      ],
    },
    {
      title: 'OPERATING EXPENSES',
      rows: [
        { label: 'Commercial & Sales', unit: `${config.currency}'000`, data: plOutputs.commercialSales, decimals: 0 },
        { label: 'General & Administrative', unit: `${config.currency}'000`, data: plOutputs.gAndA, decimals: 0 },
        { label: 'R&D', unit: `${config.currency}'000`, data: plOutputs.rAndD, decimals: 0 },
        { label: 'Operations', unit: `${config.currency}'000`, data: plOutputs.operations, decimals: 0 },
        { label: 'Quality', unit: `${config.currency}'000`, data: plOutputs.quality, decimals: 0 },
        { label: 'Clinical', unit: `${config.currency}'000`, data: plOutputs.clinical, decimals: 0 },
        { label: 'Regulatory', unit: `${config.currency}'000`, data: plOutputs.regulatory, decimals: 0 },
        { label: 'Pharmacovigilance', unit: `${config.currency}'000`, data: plOutputs.pharmacovigilance, decimals: 0 },
        { label: 'Patents', unit: `${config.currency}'000`, data: plOutputs.patents, decimals: 0 },
        { label: 'Total Operating Expenses', unit: `${config.currency}'000`, data: plOutputs.totalOpEx, decimals: 0, isBold: true },
      ],
    },
    {
      title: 'EBITDA',
      rows: [
        { label: 'EBITDA', unit: `${config.currency}'000`, data: plOutputs.ebitda, decimals: 0, isBold: true, highlight: true },
        { label: 'EBITDA Margin', unit: '%', data: plOutputs.ebitdaMargin, format: 'percent', decimals: 1 },
      ],
    },
    {
      title: 'EBIT (after D&A)',
      rows: [
        { label: 'Depreciation & Amortisation', unit: `${config.currency}'000`, data: plOutputs.dAndA, decimals: 0 },
        { label: 'EBIT', unit: `${config.currency}'000`, data: plOutputs.ebit, decimals: 0, isBold: true, highlight: true },
        { label: 'EBIT Margin', unit: '%', data: plOutputs.ebitMargin, format: 'percent', decimals: 1 },
      ],
    },
    {
      title: 'NET INCOME',
      rows: [
        { label: 'Financial Costs', unit: `${config.currency}'000`, data: plOutputs.financialCosts, decimals: 0 },
        { label: 'EBT', unit: `${config.currency}'000`, data: plOutputs.ebt, decimals: 0, isBold: true, highlight: true },
        { label: 'Income Tax', unit: `${config.currency}'000`, data: plOutputs.incomeTax, decimals: 0 },
        { label: 'Net Income', unit: `${config.currency}'000`, data: plOutputs.netIncome, decimals: 0, isBold: true, highlight: true },
        { label: 'Net Income Margin', unit: '%', data: plOutputs.netIncomeMargin, format: 'percent', decimals: 1 },
        { label: 'Cumulative Net Income', unit: `${config.currency}'000`, data: plOutputs.cumulativeNetIncome, decimals: 0, highlight: true },
      ],
    },
    {
      title: 'FREE CASH FLOW BRIDGE (NI → FCF)',
      rows: [
        { label: 'Working Capital Change', unit: `${config.currency}'000`, data: plOutputs.workingCapitalChange, decimals: 0 },
        { label: 'Capital Expenditure', unit: `${config.currency}'000`, data: plOutputs.capitalExpenditure, decimals: 0 },
        { label: '★ Free Cash Flow', unit: `${config.currency}'000`, data: plOutputs.freeCashFlow, decimals: 0, isBold: true, highlight: true },
        { label: 'Cumulative Free Cash Flow', unit: `${config.currency}'000`, data: plOutputs.cumulativeFCF, decimals: 0, highlight: true },
      ],
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="P&L — Profit & Loss Statement"
          subtitle="Revenue · EBITDA · EBIT · Net Income · Free Cash Flow"
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      <div className="overflow-x-scroll max-h-[calc(100vh-160px)] overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="header-cell text-left sticky left-0 bg-gray-100 z-30 min-w-[250px]">Line Item</th>
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
            {sections.map((section, si) => (
              <Fragment key={si}>
                <tr key={`section-${si}`}>
                  <td colSpan={pc.numPeriods + 2} className="section-header">{section.title}</td>
                </tr>
                {section.rows.map((row, ri) => (
                  <tr key={`${si}-${ri}`} className={`border-b border-gray-50 ${row.isBold ? 'bg-gray-50' : ''}`}>
                    <td className={`row-label sticky left-0 z-10 ${row.isBold ? 'font-bold bg-gray-50' : 'bg-white'}`}>
                      {row.label}
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-500 whitespace-nowrap">{row.unit}</td>
                    {row.data.map((val, pi) => (
                      <td key={pi} className="p-0">
                        <FormulaCell
                          value={val}
                          format={row.format || 'number'}
                          decimals={row.decimals ?? 1}
                          highlight={row.highlight}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
