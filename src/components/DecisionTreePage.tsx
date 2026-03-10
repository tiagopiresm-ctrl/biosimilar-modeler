import { useMemo } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle, ScenarioSelector } from './Layout';
import {
  computeCountryOutputs,
  computePLOutputs,
  computeWACCOutputs,
  computeNPVOutputs,
  computeDecisionTreeOutputs,
  formatNumber,
  formatPercent,
} from '../calculations';

export function DecisionTreePage() {
  const {
    countries,
    config,
    plAssumptions,
    waccInputs,
    fcfBridge,
    npvRisk,
    decisionTree,
    updateDecisionTreeGate,
    setScenario,
  } = useStore();

  // Full computation chain: Countries -> P&L -> WACC -> NPV -> Decision Tree
  const npvOutputs = useMemo(() => {
    const countryOutputs = countries.map((c) => computeCountryOutputs(c, config));
    const plOutputs = computePLOutputs(countryOutputs, countries, plAssumptions, fcfBridge, config);
    const waccOutputs = computeWACCOutputs(waccInputs, config.activeScenario);
    return computeNPVOutputs(plOutputs, waccOutputs, npvRisk, config, countries);
  }, [countries, config, plAssumptions, waccInputs, fcfBridge, npvRisk]);

  const dtOutputs = useMemo(
    () => computeDecisionTreeOutputs(decisionTree, npvOutputs),
    [decisionTree, npvOutputs],
  );

  // Compute cumulative probabilities at each gate for display
  const cumulativeProbabilities = useMemo(() => {
    const cumulative: number[] = [];
    let running = 1;
    for (const gate of decisionTree) {
      running *= gate.probability;
      cumulative.push(running);
    }
    return cumulative;
  }, [decisionTree]);

  const handleProbabilityChange = (index: number, displayValue: string) => {
    const parsed = parseFloat(displayValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      updateDecisionTreeGate(index, 'probability', clamped / 100);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="Decision Tree -- Expected NPV"
          subtitle="Phase-gated probability tree for risk-adjusted valuation. Edit gate names, probabilities, and descriptions."
          noMargin
        />
        <ScenarioSelector activeScenario={config.activeScenario} onSelect={setScenario} scenarioMode={config.scenarioMode} />
      </div>

      {/* ================================================================
          1. VISUAL DECISION TREE
          ================================================================ */}
      <SectionTitle>Phase Gate Flow</SectionTitle>
      <div className="flex items-start gap-2 overflow-x-auto pb-4 mb-8">
        {decisionTree.map((gate, index) => (
          <div key={index} className="flex items-start gap-2 flex-shrink-0">
            {/* Gate Card */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-blue-200 p-4 min-w-[220px] max-w-[260px]">
              {/* Gate number badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Gate {index + 1}
                </span>
              </div>

              {/* Gate Name */}
              <div className="mb-2">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={gate.name}
                  onChange={(e) => updateDecisionTreeGate(index, 'name', e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                />
              </div>

              {/* Probability */}
              <div className="mb-2">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Probability of Success
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(gate.probability * 100 * 100) / 100}
                    onChange={(e) => handleProbabilityChange(index, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={gate.description}
                  onChange={(e) =>
                    updateDecisionTreeGate(index, 'description', e.target.value)
                  }
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                />
              </div>

              {/* Cumulative probability */}
              <div className="border-t border-gray-100 pt-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                  Cumulative PoS
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {formatPercent(cumulativeProbabilities[index], 1)}
                </div>
              </div>
            </div>

            {/* Arrow between gates (not after the last gate) */}
            {index < decisionTree.length - 1 && (
              <div className="flex items-center self-center pt-8">
                <svg
                  width="40"
                  height="24"
                  viewBox="0 0 40 24"
                  fill="none"
                  className="text-blue-300 flex-shrink-0"
                >
                  <line
                    x1="0"
                    y1="12"
                    x2="30"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <polygon points="30,6 40,12 30,18" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Final result indicator */}
        {decisionTree.length > 0 && (
          <div className="flex items-center self-center pt-8">
            <svg
              width="40"
              height="24"
              viewBox="0 0 40 24"
              fill="none"
              className="text-green-400 flex-shrink-0"
            >
              <line
                x1="0"
                y1="12"
                x2="30"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polygon points="30,6 40,12 30,18" fill="currentColor" />
            </svg>
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 min-w-[160px] flex-shrink-0">
              <div className="text-[10px] text-green-600 uppercase tracking-wide font-medium mb-1">
                Overall PoS
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatPercent(dtOutputs.cumulativePoS, 1)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          2. eNPV BREAKDOWN CARDS
          ================================================================ */}
      <SectionTitle>eNPV Calculation</SectionTitle>
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
        {/* NPV Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">
            NPV
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {config.currency}
            {formatNumber(npvOutputs.npv, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{config.currency}&apos;000</div>
        </div>

        {/* Multiplication operator */}
        <div className="text-3xl font-light text-gray-300 flex-shrink-0 px-1">
          &times;
        </div>

        {/* Cumulative PoS Card */}
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-blue-500 uppercase tracking-wide font-medium mb-1">
            Cumulative PoS
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatPercent(dtOutputs.cumulativePoS, 1)}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            {decisionTree.length} gate{decisionTree.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Equals operator */}
        <div className="text-3xl font-light text-gray-300 flex-shrink-0 px-1">=</div>

        {/* eNPV Card */}
        <div className="bg-green-50 rounded-xl shadow-sm border border-green-300 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-green-600 uppercase tracking-wide font-medium mb-1">
            eNPV
          </div>
          <div className="text-2xl font-bold text-green-700">
            {config.currency}
            {formatNumber(dtOutputs.enpv, 0)}
          </div>
          <div className="text-xs text-green-500 mt-1">{config.currency}&apos;000</div>
        </div>
      </div>

      {/* rNPV-based eNPV flow */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
        {/* rNPV Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">
            rNPV
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {config.currency}
            {formatNumber(npvOutputs.rnpv, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{config.currency}&apos;000</div>
        </div>

        {/* Multiplication operator */}
        <div className="text-3xl font-light text-gray-300 flex-shrink-0 px-1">
          &times;
        </div>

        {/* Cumulative PoS Card */}
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-blue-500 uppercase tracking-wide font-medium mb-1">
            Cumulative PoS
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatPercent(dtOutputs.cumulativePoS, 1)}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            {decisionTree.length} gate{decisionTree.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Equals operator */}
        <div className="text-3xl font-light text-gray-300 flex-shrink-0 px-1">=</div>

        {/* eNPV from rNPV Card */}
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-300 p-5 min-w-[180px] text-center flex-shrink-0">
          <div className="text-[10px] text-amber-600 uppercase tracking-wide font-medium mb-1">
            eNPV (from rNPV)
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {config.currency}
            {formatNumber(dtOutputs.enpvFromRnpv, 0)}
          </div>
          <div className="text-xs text-amber-500 mt-1">{config.currency}&apos;000</div>
        </div>
      </div>

      {/* ================================================================
          3. SUMMARY TABLE
          ================================================================ */}
      <SectionTitle>Decision Tree Summary</SectionTitle>
      <div className="max-w-2xl mb-8">
        <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Parameter
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Number of Gates */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-700">Number of Gates</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {decisionTree.length}
                </td>
              </tr>

              {/* Individual Gate Probabilities */}
              {decisionTree.map((gate, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-gray-700">
                    Gate {index + 1}: {gate.name}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatPercent(gate.probability, 1)}
                  </td>
                </tr>
              ))}

              {/* Cumulative PoS */}
              <tr className="border-b border-gray-200 bg-blue-50">
                <td className="px-4 py-2.5 font-bold text-blue-800">
                  Cumulative PoS
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-blue-800">
                  {formatPercent(dtOutputs.cumulativePoS, 1)}
                </td>
              </tr>

              {/* Spacer */}
              <tr className="border-b border-gray-100">
                <td colSpan={2} className="px-4 py-1 bg-gray-50" />
              </tr>

              {/* NPV */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-700">NPV</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {config.currency}
                  {formatNumber(npvOutputs.npv, 0)}&apos;000
                </td>
              </tr>

              {/* rNPV */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-700">rNPV</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {config.currency}
                  {formatNumber(npvOutputs.rnpv, 0)}&apos;000
                </td>
              </tr>

              {/* eNPV */}
              <tr className="border-b border-gray-100 bg-green-50">
                <td className="px-4 py-2.5 font-bold text-green-800">
                  eNPV (= NPV x Cum. PoS)
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-green-800">
                  {config.currency}
                  {formatNumber(dtOutputs.enpv, 0)}&apos;000
                </td>
              </tr>

              {/* eNPV from rNPV */}
              <tr className="bg-amber-50">
                <td className="px-4 py-2.5 font-bold text-amber-800">
                  eNPV from rNPV (= rNPV x Cum. PoS)
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-amber-800">
                  {config.currency}
                  {formatNumber(dtOutputs.enpvFromRnpv, 0)}&apos;000
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info note */}
      <div className="max-w-2xl bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong> Each gate represents a development milestone
        with an estimated probability of success. The cumulative Probability of
        Success (PoS) is the product of all individual gate probabilities. The
        expected NPV (eNPV) adjusts the model&apos;s NPV by multiplying it with the
        cumulative PoS, reflecting the risk-weighted value of the program.
      </div>
    </div>
  );
}
