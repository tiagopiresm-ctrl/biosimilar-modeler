import { useMemo, useState, useCallback } from 'react';
import { useStore } from '../store';
import { PageHeader } from './Layout';
import { FormulaCell } from './EditableCell';
import { computePeriodConfig, generatePeriodLabels, UNIT_TYPE_SHORT } from '../types';
import { computeCountryOutputs } from '../calculations';

interface Props {
  countryIndex: number;
}

type RowDef = {
  label: string;
  unit: string;
  data: number[];
  format?: 'number' | 'percent' | 'currency';
  decimals?: number;
  highlight?: boolean;
  isBold?: boolean;
  indent?: boolean;
};

export function CountryModelPage({ countryIndex }: Props) {
  const { countries, config } = useStore();
  const country = countries[countryIndex];
  // Currency labels: local currency for most country fields; model currency for Mode 2 supply & milestones
  const lc = country?.localCurrency ?? config.currency;
  const supplyCcy = config.apiPricingModel === 'fixed' ? config.currency : lc;

  const outputs = useMemo(() => {
    if (!country) return null;
    return computeCountryOutputs(country, config);
  }, [country, config]);

  // Collapsible section state — all expanded by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!country || !outputs) {
    return <div className="p-6 text-gray-500">Country not found.</div>;
  }

  const pc = computePeriodConfig(config);
  const periodLabels = generatePeriodLabels(pc);
  const years = periodLabels.map((_, i) => pc.startYear + i);
  const uShort = UNIT_TYPE_SHORT[config.unitType];

  const renderTable = (sectionKey: string, title: string, rows: RowDef[]) => {
    const isCollapsed = collapsed[sectionKey] ?? false;
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => toggle(sectionKey)}
          className="section-header w-full text-left flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors select-none"
        >
          <span>{title}</span>
          <span className="text-xs text-gray-400 ml-2 font-normal">
            {isCollapsed ? '+ expand' : '− collapse'}
          </span>
        </button>
        {!isCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="header-cell text-left sticky left-0 bg-gray-100 z-10 min-w-[200px]">Line Item</th>
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
                    <td className={`row-label sticky left-0 z-10 ${row.isBold ? 'font-bold bg-gray-50' : 'bg-white'} ${row.indent ? 'pl-6 text-gray-500 text-xs' : ''}`}>
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={`${country.name}`}
        subtitle="Computed market model based on assumptions. All values are read-only formulas."
      />

      {renderTable('A', 'A. TOTAL MARKET', [
        { label: 'Market Volume', unit: "'000 units", data: outputs.marketVolume, decimals: 0 },
        { label: 'Market Volume YoY Growth', unit: '%', data: outputs.marketVolumeYoY, format: 'percent', decimals: 1 },
        { label: 'Originator Reference Price', unit: `${lc}/${uShort}`, data: outputs.originatorRefPrice, decimals: 2 },
      ])}

      {renderTable('B', 'B. ORIGINATOR (Derived: 100% - Biosimilar Penetration)', [
        { label: 'Originator Market Share', unit: '%', data: outputs.originatorShare, format: 'percent', decimals: 1, highlight: true },
        { label: 'Originator Volume', unit: "'000 units", data: outputs.originatorVolume, decimals: 0 },
        { label: 'Originator Sales Value', unit: `${lc}'000`, data: outputs.originatorSales, decimals: 0 },
      ])}

      {renderTable('C', 'C. BIOSIMILAR MARKET', [
        { label: 'Total Biosimilar Volume', unit: "'000 units", data: outputs.totalBiosimilarVolume, decimals: 0, isBold: true },
        { label: 'Our Share of Biosimilar', unit: '%', data: outputs.ourShareOfBiosimilarArr, format: 'percent', decimals: 1, highlight: true },
      ])}

      {renderTable('D', 'D. OUR BIOSIMILAR — In-Market Performance', [
        { label: 'Our Market Share (of total)', unit: '%', data: outputs.biosimilarShare, format: 'percent', decimals: 1 },
        { label: 'Our Volume', unit: "'000 units", data: outputs.biosimilarVolume, decimals: 0 },
        { label: 'Biosimilar In-Market Price', unit: `${lc}/${uShort}`, data: outputs.biosimilarInMarketPrice, decimals: 2 },
        { label: 'Biosimilar In-Market Sales', unit: `${lc}'000`, data: outputs.biosimilarInMarketSales, decimals: 0 },
      ])}

      {renderTable('D1a', 'D1a. PARTNER REVENUES', [
        { label: 'Partner Net Selling Price', unit: `${lc}/${uShort}`, data: outputs.partnerNetSellingPrice, decimals: 2 },
        { label: 'Partner Net Sales', unit: `${lc}'000`, data: outputs.partnerNetSales, decimals: 0, isBold: true, highlight: true },
      ])}

      {renderTable('D1b', 'D1b. COMPANY (OUR) REVENUES', [
        { label: 'API Volume Supplied to Partner', unit: "'000 g", data: outputs.apiGramsSupplied, decimals: 1 },
        { label: 'Supply Price to Partner', unit: `${supplyCcy}/${uShort}`, data: outputs.supplyPrice, decimals: 2 },
        { label: 'Net Supply Revenue', unit: `${supplyCcy}'000`, data: outputs.netSupplyRevenue, decimals: 0, isBold: true, highlight: true },
        { label: 'Royalty Income', unit: `${lc}'000`, data: outputs.royaltyIncome, decimals: 0 },
        { label: 'Milestone Income', unit: `${config.currency}'000`, data: outputs.milestoneIncome, decimals: 0 },
      ])}

      {renderTable('D2',
        config.apiPricingModel === 'percentage'
          ? 'D2. API ECONOMICS — Price per gram derived from % of partner net price'
          : 'D2. API ECONOMICS — Fixed supply price per gram (EUR)',
        [
          { label: 'API Grams Supplied', unit: "'000 g", data: outputs.apiGramsSupplied, decimals: 1 },
          {
            label: config.apiPricingModel === 'percentage'
              ? 'API Price per Gram (derived)'
              : 'API Price per Gram (fixed)',
            unit: `${supplyCcy}/g`,
            data: outputs.apiPricePerGram,
            decimals: 2,
          },
          { label: 'API Price per kg', unit: `${supplyCcy}/kg`, data: outputs.apiPricePerKg, decimals: 0 },
          { label: 'Net Supply Revenue', unit: `${supplyCcy}'000`, data: outputs.netSupplyRevenue, decimals: 0, isBold: true, highlight: true },
        ],
      )}

      {renderTable('E', 'E. SUMMARY & CHECKS', [
        { label: 'Total Market Value', unit: `${lc}'000`, data: outputs.totalMarketValue, decimals: 0, isBold: true },
        {
          label: 'Market Share Check (should = 100%)',
          unit: '%',
          data: outputs.marketShareCheck,
          format: 'percent',
          decimals: 1,
          highlight: true,
        },
      ])}
    </div>
  );
}
