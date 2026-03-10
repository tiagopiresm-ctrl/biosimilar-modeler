import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle, ScenarioSelector } from './Layout';
import { EditableCell, FormulaCell } from './EditableCell';
import { computeWACCOutputs } from '../calculations';

export function WACCPage() {
  const { waccInputs, config, updateWACCInput, setScenario } = useStore();

  const outputs = useMemo(() => computeWACCOutputs(waccInputs, config.activeScenario), [waccInputs, config.activeScenario]);

  const isBaseOnly = config.scenarioMode === 'base_only';
  const visibleIndices = isBaseOnly ? [1] : [0, 1, 2];
  const allScenarioLabels = ['WORST', 'BASE', 'BEST'];
  const allScenarioColors = ['bg-red-50', 'bg-blue-50', 'bg-green-50'];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="WACC — Weighted Average Cost of Capital"
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      <div className="max-w-3xl">
        {/* Cost of Equity */}
        <SectionTitle>Cost of Equity (CAPM)</SectionTitle>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
            <thead>
              <tr>
                <th className="header-cell text-left min-w-[250px]">Parameter</th>
                {visibleIndices.map((i) => (
                  <th key={i} className={`header-cell text-right min-w-[100px] ${allScenarioColors[i]}`}>{allScenarioLabels[i]}</th>
                ))}
                {!isBaseOnly && <th className="header-cell text-right min-w-[100px] bg-yellow-50">ACTIVE</th>}
                <th className="header-cell text-right w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="row-label">Risk-Free Rate (Rf)</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.riskFreeRate[si]} format="percent" decimals={2} onChange={v => updateWACCInput('riskFreeRate', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.riskFreeRate[config.activeScenario - 1]} format="percent" decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="row-label">Equity Risk Premium (ERP)</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.equityRiskPremium[si]} format="percent" decimals={2} onChange={v => updateWACCInput('equityRiskPremium', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.equityRiskPremium[config.activeScenario - 1]} format="percent" decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="row-label">Beta (β) — pharma/biotech</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.beta[si]} format="number" decimals={2} onChange={v => updateWACCInput('beta', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.beta[config.activeScenario - 1]} decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">—</td>
              </tr>
              <tr className="border-b border-gray-100 bg-gray-50">
                <td className="row-label font-bold bg-gray-50">Cost of Equity (Ke = Rf + β × ERP)</td>
                {visibleIndices.map(si => (
                  <td key={si} className="p-0"><FormulaCell value={outputs.costOfEquity[si]} format="percent" decimals={2} className="font-semibold" /></td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={outputs.costOfEquity[config.activeScenario - 1]} format="percent" decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost of Debt */}
        <SectionTitle>Cost of Debt</SectionTitle>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
            <thead>
              <tr>
                <th className="header-cell text-left min-w-[250px]">Parameter</th>
                {visibleIndices.map((i) => (
                  <th key={i} className={`header-cell text-right min-w-[100px] ${allScenarioColors[i]}`}>{allScenarioLabels[i]}</th>
                ))}
                {!isBaseOnly && <th className="header-cell text-right min-w-[100px] bg-yellow-50">ACTIVE</th>}
                <th className="header-cell text-right w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="row-label">Pre-Tax Cost of Debt (Kd)</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.preTaxCostOfDebt[si]} format="percent" decimals={2} onChange={v => updateWACCInput('preTaxCostOfDebt', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.preTaxCostOfDebt[config.activeScenario - 1]} format="percent" decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="row-label">Tax Rate (reference)</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.taxRate[si]} format="percent" decimals={1} onChange={v => updateWACCInput('taxRate', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.taxRate[config.activeScenario - 1]} format="percent" decimals={1} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
              <tr className="border-b border-gray-100 bg-gray-50">
                <td className="row-label font-bold bg-gray-50">After-Tax Cost of Debt (Kd × (1−T))</td>
                {visibleIndices.map(si => (
                  <td key={si} className="p-0"><FormulaCell value={outputs.afterTaxCostOfDebt[si]} format="percent" decimals={2} className="font-semibold" /></td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={outputs.afterTaxCostOfDebt[config.activeScenario - 1]} format="percent" decimals={2} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Capital Structure */}
        <SectionTitle>Capital Structure</SectionTitle>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
            <thead>
              <tr>
                <th className="header-cell text-left min-w-[250px]">Parameter</th>
                {visibleIndices.map((i) => (
                  <th key={i} className={`header-cell text-right min-w-[100px] ${allScenarioColors[i]}`}>{allScenarioLabels[i]}</th>
                ))}
                {!isBaseOnly && <th className="header-cell text-right min-w-[100px] bg-yellow-50">ACTIVE</th>}
                <th className="header-cell text-right w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="row-label">Equity as % of Capital</td>
                {visibleIndices.map(si => (
                  <td key={si} className={`p-0 ${allScenarioColors[si]}`}>
                    <EditableCell value={waccInputs.equityPct[si]} format="percent" decimals={1} onChange={v => updateWACCInput('equityPct', si, v)} />
                  </td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={waccInputs.equityPct[config.activeScenario - 1]} format="percent" decimals={1} className="font-bold bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="row-label">Debt as % of Capital</td>
                {visibleIndices.map(si => (
                  <td key={si} className="p-0"><FormulaCell value={1 - waccInputs.equityPct[si]} format="percent" decimals={1} /></td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={1 - waccInputs.equityPct[config.activeScenario - 1]} format="percent" decimals={1} className="bg-yellow-50" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* WACC Result */}
        <SectionTitle>WACC = Ke × E/(D+E) + Kd_AT × D/(D+E)</SectionTitle>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
            <thead>
              <tr>
                <th className="header-cell text-left min-w-[250px]">Result</th>
                {visibleIndices.map((i) => (
                  <th key={i} className={`header-cell text-right min-w-[100px] ${allScenarioColors[i]}`}>{allScenarioLabels[i]}</th>
                ))}
                {!isBaseOnly && <th className="header-cell text-right min-w-[100px] bg-yellow-50">ACTIVE</th>}
                <th className="header-cell text-right w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td className="row-label font-bold bg-gray-50">WACC</td>
                {visibleIndices.map(si => (
                  <td key={si} className="p-0"><FormulaCell value={outputs.wacc[si]} format="percent" decimals={2} className="font-bold text-lg" /></td>
                ))}
                {!isBaseOnly && <td className="p-0"><FormulaCell value={outputs.activeWACC} format="percent" decimals={2} className="font-bold text-lg bg-yellow-50 text-blue-700" /></td>}
                <td className="px-2 py-1 text-xs text-gray-500">%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <strong>★ Active WACC:</strong> {(outputs.activeWACC * 100).toFixed(2)}% — This rate is used for discounting in the NPV sheet.
        </div>
      </div>
    </div>
  );
}
