import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, ScenarioSelector } from './Layout';
import { computeWACCOutputs, formatPercent } from '../calculations';

export function WACCPage() {
  const { waccInputs, config, updateWACCInput, setScenario } = useStore();

  const outputs = useMemo(() => computeWACCOutputs(waccInputs, config.activeScenario), [waccInputs, config.activeScenario]);

  const isBaseOnly = config.scenarioMode === 'base_only';
  const visibleIndices = isBaseOnly ? [1] : [0, 1, 2];
  const scenarioLabels = ['Worst', 'Base', 'Best'];
  const scenarioColors = ['border-red-300 bg-red-50', 'border-blue-300 bg-blue-50', 'border-green-300 bg-green-50'];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="WACC — Discount Rate"
          subtitle="Set the discount rate used for NPV calculations"
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      <div className="max-w-2xl">
        {/* Simple WACC input cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {visibleIndices.map(si => (
            <div key={si} className={`rounded-lg border-2 p-6 ${scenarioColors[si]} ${si === config.activeScenario - 1 ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {scenarioLabels[si]} Case
                {si === config.activeScenario - 1 && (
                  <span className="ml-2 text-blue-600 font-bold">ACTIVE</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={parseFloat((outputs.wacc[si] * 100).toFixed(2))}
                  onChange={e => {
                    // Back-calculate: set all WACC components to achieve the target WACC
                    // Simplest approach: adjust risk-free rate to hit target
                    const targetWACC = (parseFloat(e.target.value) || 0) / 100;
                    const beta = waccInputs.beta[si];
                    const erp = waccInputs.equityRiskPremium[si];
                    const preTaxKd = waccInputs.preTaxCostOfDebt[si];
                    const taxRate = waccInputs.taxRate[si];
                    const eqPct = waccInputs.equityPct[si];
                    const debtPct = 1 - eqPct;
                    const kdAT = preTaxKd * (1 - taxRate);
                    // WACC = (Rf + beta*ERP) * eqPct + kdAT * debtPct
                    // targetWACC = (Rf + beta*ERP) * eqPct + kdAT * debtPct
                    // Rf = (targetWACC - kdAT * debtPct) / eqPct - beta*ERP
                    const newRf = eqPct > 0
                      ? (targetWACC - kdAT * debtPct) / eqPct - beta * erp
                      : 0;
                    updateWACCInput('riskFreeRate', si, Math.max(0, newRf));
                  }}
                  step={0.1}
                  className="w-24 text-3xl font-bold bg-transparent border-b-2 border-gray-400 focus:border-blue-500 focus:outline-none text-right"
                />
                <span className="text-xl font-bold text-gray-600">%</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Ke: {formatPercent(outputs.costOfEquity[si], 1)} |
                Kd(AT): {formatPercent(outputs.afterTaxCostOfDebt[si], 1)} |
                E/D: {formatPercent(waccInputs.equityPct[si], 0)}/{formatPercent(1 - waccInputs.equityPct[si], 0)}
              </div>
            </div>
          ))}
        </div>

        {/* Active WACC callout */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mb-8">
          <strong>Active WACC: {formatPercent(outputs.activeWACC, 2)}</strong> — used for discounting in NPV analysis.
        </div>

        {/* Advanced settings (collapsed by default) */}
        <details className="bg-white rounded-lg shadow-sm border border-gray-200">
          <summary className="p-4 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Advanced: CAPM Component Breakdown
          </summary>
          <div className="p-4 pt-0 border-t border-gray-100">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Parameter</th>
                  {visibleIndices.map(si => (
                    <th key={si} className="text-right py-2 text-xs font-medium text-gray-500 w-28">{scenarioLabels[si]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  { label: 'Risk-Free Rate (Rf)', key: 'riskFreeRate' as const, data: waccInputs.riskFreeRate },
                  { label: 'Equity Risk Premium', key: 'equityRiskPremium' as const, data: waccInputs.equityRiskPremium },
                  { label: 'Beta (β)', key: 'beta' as const, data: waccInputs.beta, isBeta: true },
                  { label: 'Pre-Tax Cost of Debt', key: 'preTaxCostOfDebt' as const, data: waccInputs.preTaxCostOfDebt },
                  { label: 'Tax Rate', key: 'taxRate' as const, data: waccInputs.taxRate },
                  { label: 'Equity %', key: 'equityPct' as const, data: waccInputs.equityPct },
                ].map(row => (
                  <tr key={row.key} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-600">{row.label}</td>
                    {visibleIndices.map(si => (
                      <td key={si} className="py-1.5 text-right">
                        <input
                          type="number"
                          value={row.isBeta ? row.data[si].toFixed(2) : (row.data[si] * 100).toFixed(1)}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            updateWACCInput(row.key, si, row.isBeta ? val : val / 100);
                          }}
                          step={row.isBeta ? 0.05 : 0.5}
                          className="w-20 px-1 py-0.5 text-right text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-gray-400 ml-0.5">{row.isBeta ? '' : '%'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
