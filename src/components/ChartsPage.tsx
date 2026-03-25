import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, ScenarioSelector } from './Layout';
import { computePeriodConfig, generatePeriodLabels } from '../types';
import { computeCountryOutputs, computePLOutputs } from '../calculations';
import {
  BarChart, Bar, LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine,
} from 'recharts';

// Colour palette for per-country lines
const COUNTRY_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export function ChartsPage() {
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

  // ---------- helpers ----------
  const currencyUnit = `${config.currency}'000`;

  const fmtCurrency = (v: number | null | undefined) => {
    if (v == null || !isFinite(v)) return '-';
    return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fmtPercent = (v: number | null | undefined) => {
    if (v == null || !isFinite(v)) return '-';
    return v.toFixed(1) + '%';
  };

  // ---------- Chart 0 data: Market & Biosimilar Volumes ----------
  const volumeData = periodLabels.map((p, i) => {
    // Total market volume: sum across countries
    const totalMarketVol = countryOutputs.reduce((sum, co) => sum + co.marketVolume[i], 0);
    // Total biosimilar volume: sum of totalBiosimilarVolume across countries
    const totalBiosimilarVol = countryOutputs.reduce((sum, co) => sum + co.totalBiosimilarVolume[i], 0);
    // Our product volume: sum of biosimilarVolume across countries
    const ourProductVol = countryOutputs.reduce((sum, co) => sum + co.biosimilarVolume[i], 0);
    // Originator volume: sum of originatorVolume across countries
    const originatorVol = countryOutputs.reduce((sum, co) => sum + co.originatorVolume[i], 0);
    return {
      period: p,
      year: years[i],
      totalMarket: totalMarketVol / 1000,
      totalBiosimilar: totalBiosimilarVol / 1000,
      ourProduct: ourProductVol / 1000,
      originator: originatorVol / 1000,
    };
  });

  // ---------- Chart 1 data: Revenue Waterfall (Stacked Bar) ----------
  const revenueData = periodLabels.map((p, i) => ({
    period: p,
    year: years[i],
    netSupply: plOutputs.totalNetSupplyRevenue[i],
    royalty: plOutputs.totalRoyaltyIncome[i],
    milestone: plOutputs.totalMilestoneIncome[i],
  }));

  // ---------- Chart 2 data: P&L Cascade (Combo) ----------
  const plCascadeData = periodLabels.map((p, i) => ({
    period: p,
    year: years[i],
    ebitda: plOutputs.ebitda[i],
    ebit: plOutputs.ebit[i],
    ebitMargin: plOutputs.ebitMargin[i] * 100,
  }));

  // ---------- Chart 3 data: Free Cash Flow (Area) ----------
  const fcfData = periodLabels.map((p, i) => ({
    period: p,
    year: years[i],
    fcf: plOutputs.freeCashFlow[i],
    cumulativeFCF: plOutputs.cumulativeFCF[i],
  }));

  // ---------- Chart 4 data: Biosimilar Market Share by Country ----------
  const shareData = periodLabels.map((p, i) => {
    const entry: Record<string, string | number> = {
      period: p,
      year: years[i],
    };
    countries.forEach((c, ci) => {
      entry[c.name] = countryOutputs[ci].biosimilarShare[i] * 100;
    });
    return entry;
  });

  // ---------- Chart 5 data: Total Revenue by Country (supply + royalties + milestones, FX-converted) ----------
  const salesByCountryData = periodLabels.map((p, i) => {
    const entry: Record<string, string | number> = {
      period: p,
      year: years[i],
    };
    countries.forEach((c, ci) => {
      const co = countryOutputs[ci];
      const fxRate = c.fxRate[i] || 1;
      const fx = fxRate !== 0 ? fxRate : 1;
      // Supply revenue (FX-converted)
      const supplyRev = config.apiPricingModel === 'percentage'
        ? co.netSupplyRevenue[i] / fx
        : co.netSupplyRevenue[i];
      // Royalty (FX-converted)
      const royalty = co.royaltyIncome[i] / fx;
      // Milestones (already in model currency)
      const milestones = co.milestoneIncome[i];
      entry[c.name] = supplyRev + royalty + milestones;
    });
    return entry;
  });

  // ---------- card wrapper ----------
  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Charts"
          subtitle="Visual analysis of model outputs"
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Chart 0: Market & Biosimilar Volumes ---- */}
        <ChartCard title="Market & Biosimilar Volumes ('000 units)">
          <LineChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const labels: Record<string, string> = {
                  totalMarket: 'Total Market Volume',
                  totalBiosimilar: 'Total Biosimilar Volume',
                  ourProduct: 'Our Product Volume',
                  originator: 'Originator Volume',
                };
                return [fmtCurrency(value as number), labels[name as string] ?? name];
              }}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  totalMarket: 'Total Market Volume',
                  totalBiosimilar: 'Total Biosimilar Volume',
                  ourProduct: 'Our Product Volume',
                  originator: 'Originator Volume',
                };
                return labels[value] ?? value;
              }}
            />
            <Line type="monotone" dataKey="totalMarket" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="originator" stroke="#EF4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totalBiosimilar" stroke="#F59E0B" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ourProduct" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        {/* ---- Chart 1: Revenue Waterfall ---- */}
        <ChartCard title={`Revenue Breakdown (${currencyUnit})`}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [
                fmtCurrency(value as number),
                name === 'netSupply' ? 'Net Supply Revenue'
                  : name === 'royalty' ? 'Royalty Income'
                  : 'Milestone Income',
              ]}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'netSupply' ? 'Net Supply Revenue'
                  : value === 'royalty' ? 'Royalty Income'
                  : 'Milestone Income'
              }
            />
            <Bar dataKey="netSupply" stackId="revenue" fill="#3B82F6" />
            <Bar dataKey="royalty" stackId="revenue" fill="#10B981" />
            <Bar dataKey="milestone" stackId="revenue" fill="#F59E0B" />
          </BarChart>
        </ChartCard>

        {/* ---- Chart 2: P&L Cascade (Combo) ---- */}
        <ChartCard title={`P&L Cascade (${currencyUnit})`}>
          <ComposedChart data={plCascadeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                if (name === 'ebitMargin') return [fmtPercent(value as number), 'EBIT Margin'];
                return [
                  fmtCurrency(value as number),
                  name === 'ebitda' ? 'EBITDA' : 'EBIT',
                ];
              }}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'ebitda' ? 'EBITDA'
                  : value === 'ebit' ? 'EBIT'
                  : 'EBIT Margin'
              }
            />
            <Bar yAxisId="left" dataKey="ebitda" fill="#6366F1" />
            <Bar yAxisId="left" dataKey="ebit" fill="#8B5CF6" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ebitMargin"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartCard>

        {/* ---- Chart 3: Free Cash Flow (Area) ---- */}
        <ChartCard title={`Free Cash Flow (${currencyUnit})`}>
          <ComposedChart data={fcfData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [
                fmtCurrency(value as number),
                name === 'fcf' ? 'FCF' : 'Cumulative FCF',
              ]}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'fcf' ? 'Free Cash Flow' : 'Cumulative FCF'
              }
            />
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
            <defs>
              <linearGradient id="fcfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#10B981" stopOpacity={0.05} />
                <stop offset="50%" stopColor="#EF4444" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="fcf"
              stroke="#10B981"
              fill="url(#fcfGradient)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="cumulativeFCF"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartCard>

        {/* ---- Chart 4: Biosimilar Market Share by Country ---- */}
        <ChartCard title="Biosimilar Market Share by Country (%)">
          <LineChart data={shareData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value: unknown) => [fmtPercent(value as number), undefined]}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend />
            {countries.map((c, ci) => (
              <Line
                key={c.name}
                type="monotone"
                dataKey={c.name}
                stroke={COUNTRY_COLORS[ci % COUNTRY_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartCard>

        {/* ---- Chart 5: Our Sales by Country ---- */}
        <ChartCard title={`Total Revenue by Country (${currencyUnit})`}>
          <LineChart data={salesByCountryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => fmtCurrency(v)}
            />
            <Tooltip
              formatter={(value: unknown) => [fmtCurrency(value as number), undefined]}
              labelFormatter={(label: unknown, payload?: readonly unknown[]) => {
                const yr = (payload as readonly { payload?: { year?: number } }[])?.[0]?.payload?.year;
                return yr ? `${String(label)} (${yr})` : String(label);
              }}
            />
            <Legend />
            {countries.map((c, ci) => (
              <Line
                key={c.name}
                type="monotone"
                dataKey={c.name}
                stroke={COUNTRY_COLORS[ci % COUNTRY_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}
