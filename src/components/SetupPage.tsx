import { useState, useRef } from 'react';
import { useStore } from '../store';
import { PageHeader, SectionTitle } from './Layout';
import { computePeriodConfig } from '../types';
import {
  PREDEFINED_COUNTRIES,
  VOLUME_MULTIPLIER_LABELS,
  API_PRICING_MODEL_LABELS,
  VOLUME_FORECAST_METHOD_LABELS,
  SCENARIO_MODE_LABELS,
  type VolumeMultiplier,
  type ApiPricingModel,
  type VolumeForecastMethod,
  type ScenarioMode,
} from '../types';
import { Download, Upload, Plus, Trash2, Beaker } from 'lucide-react';

export function SetupPage() {
  const {
    config,
    countries,
    updateConfig,
    addCountryByName,
    removeCountry,
    exportJSON,
    importJSON,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [customCountryName, setCustomCountryName] = useState('');

  // Countries already added — used to disable in dropdown
  const addedCountryNames = new Set(countries.map((c) => c.name));

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        importJSON(json);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.moleculeName || 'biosimilar-model'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCountry = () => {
    if (selectedCountry === '__custom__') {
      const name = customCountryName.trim();
      if (name && !addedCountryNames.has(name)) {
        addCountryByName(name);
        setCustomCountryName('');
        setSelectedCountry('');
      }
    } else if (selectedCountry && !addedCountryNames.has(selectedCountry)) {
      addCountryByName(selectedCountry);
      setSelectedCountry('');
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div>
      <PageHeader
        title="Model Setup"
        subtitle="Configure the molecule, currency, volume settings, and model parameters"
      />

      {/* ──── Model Configuration ──── */}
      <SectionTitle>Model Configuration</SectionTitle>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Molecule Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Molecule Name
            </label>
            <input
              type="text"
              value={config.moleculeName}
              onChange={(e) => updateConfig('moleculeName', e.target.value)}
              placeholder="e.g. Adalimumab"
              className={inputClass}
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Currency
            </label>
            <select
              value={config.currency}
              onChange={(e) => updateConfig('currency', e.target.value)}
              className={inputClass}
            >
              <option value="€">€ EUR</option>
              <option value="$">$ USD</option>
              <option value="£">£ GBP</option>
              <option value="¥">¥ JPY</option>
              <option value="CHF">CHF</option>
            </select>
          </div>

          {/* Model Start Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Model Start Year
            </label>
            <input
              type="number"
              value={config.modelStartYear}
              onChange={(e) =>
                updateConfig('modelStartYear', parseInt(e.target.value) || new Date().getFullYear() - 4)
              }
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Model spans {computePeriodConfig(config).startYear}–{computePeriodConfig(config).endYear} ({computePeriodConfig(config).numPeriods} periods)
            </p>
          </div>

          {/* Forecast Start Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Forecast Start Year
            </label>
            <input
              type="number"
              value={config.forecastStartYear}
              onChange={(e) =>
                updateConfig('forecastStartYear', parseInt(e.target.value) || new Date().getFullYear())
              }
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Historical: {config.modelStartYear}–{config.forecastStartYear - 1}, Forecast: {config.forecastStartYear}–{computePeriodConfig(config).endYear}
            </p>
          </div>

          {/* Forecast End Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Forecast End Year
            </label>
            <input
              type="number"
              value={config.forecastEndYear}
              onChange={(e) =>
                updateConfig('forecastEndYear', parseInt(e.target.value) || config.modelStartYear + 15)
              }
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              {computePeriodConfig(config).numPeriods} periods total ({config.forecastEndYear - config.forecastStartYear + 1} forecast years)
            </p>
          </div>

          {/* Volume Multiplier */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Volume Multiplier
            </label>
            <select
              value={config.volumeMultiplier}
              onChange={(e) =>
                updateConfig('volumeMultiplier', e.target.value as VolumeMultiplier)
              }
              className={inputClass}
            >
              {(Object.entries(VOLUME_MULTIPLIER_LABELS) as [VolumeMultiplier, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Unit Type (fixed: standard units only) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit Type
            </label>
            <div className={`${inputClass} bg-gray-50 text-gray-700`}>
              Standard Units (tablets/vials)
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Packs not supported due to varying pack sizes
            </p>
          </div>

          {/* Molecule Forecast Method */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Molecule Forecast Method
            </label>
            <select
              value={config.volumeForecastMethod}
              onChange={(e) =>
                updateConfig('volumeForecastMethod', e.target.value as VolumeForecastMethod)
              }
              className={inputClass}
            >
              {(Object.entries(VOLUME_FORECAST_METHOD_LABELS) as [VolumeForecastMethod, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Scenario Mode */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Scenario Mode
            </label>
            <select
              value={config.scenarioMode}
              onChange={(e) =>
                updateConfig('scenarioMode', e.target.value as ScenarioMode)
              }
              className={inputClass}
            >
              {(Object.entries(SCENARIO_MODE_LABELS) as [ScenarioMode, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              {config.scenarioMode === 'base_only'
                ? 'Only Base case; Worst/Best removed'
                : 'Full Worst / Base / Best analysis'}
            </p>
          </div>
          {/* Partner View Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Partner View
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={config.partnerViewEnabled ?? false}
                onChange={(e) => updateConfig('partnerViewEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Partner NPV Modeling</span>
            </label>
            <p className="text-[10px] text-gray-400 mt-1">
              {config.partnerViewEnabled
                ? 'Partner P&L and NPV will be computed alongside company NPV'
                : 'Off — only company NPV is modeled'}
            </p>
          </div>
        </div>

      </div>

      {/* ──── API Economics (Global) ──── */}
      <SectionTitle>API Economics (Global)</SectionTitle>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
            <Beaker size={16} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-500">
            API (Active Pharmaceutical Ingredient) economics are configured globally and apply to all countries.
            These values determine the implied API pricing metrics in the country model outputs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-2xl">
          {/* Units per Gram of API */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Standard Units per Gram of API
            </label>
            <input
              type="number"
              value={config.unitsPerGramOfAPI}
              onChange={(e) =>
                updateConfig('unitsPerGramOfAPI', parseInt(e.target.value) || 1)
              }
              min={1}
              step={1}
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              How many finished standard units (tablets/vials) 1 gram of API produces
            </p>
          </div>

          {/* Manufacturing Overage */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Manufacturing Overage (%)
            </label>
            <input
              type="number"
              value={(config.manufacturingOverage * 100).toFixed(1)}
              onChange={(e) =>
                updateConfig(
                  'manufacturingOverage',
                  (parseFloat(e.target.value) || 0) / 100,
                )
              }
              min={0}
              step={0.5}
              className={inputClass}
            />
          </div>

          {/* API Cost per Gram */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              API Cost per Gram ({config.currency})
            </label>
            <input
              type="number"
              value={config.apiCostPerGram}
              onChange={(e) =>
                updateConfig('apiCostPerGram', parseFloat(e.target.value) || 0)
              }
              min={0}
              step={1}
              className={inputClass}
            />
          </div>

          {/* COGS Inflation Rate */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              COGS Inflation Rate (%)
            </label>
            <input
              type="number"
              value={(config.cogsInflationRate * 100).toFixed(1)}
              onChange={(e) =>
                updateConfig(
                  'cogsInflationRate',
                  (parseFloat(e.target.value) || 0) / 100,
                )
              }
              min={0}
              step={0.1}
              className={inputClass}
            />
          </div>

          {/* API Pricing Model */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              API Pricing Model
            </label>
            <select
              value={config.apiPricingModel}
              onChange={(e) =>
                updateConfig('apiPricingModel', e.target.value as ApiPricingModel)
              }
              className={inputClass}
            >
              {(Object.entries(API_PRICING_MODEL_LABELS) as [ApiPricingModel, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              {config.apiPricingModel === 'percentage'
                ? 'Supply price derived as % of partner net selling price'
                : 'Fixed price per gram of API (set per country)'}
            </p>
          </div>
        </div>
      </div>

      {/* ──── Countries ──── */}
      <SectionTitle>Countries</SectionTitle>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        {countries.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">
            No countries added yet. Select a country below to get started.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {countries.map((country, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-4 py-2.5"
              >
                <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-600 shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1">
                  {country.name}
                </span>
                <span className="text-xs text-gray-400">
                  {country.localCurrency} | FX: {(country.fxRate[0] ?? 1).toFixed(2)} | LOE: {country.loeYear} | Generics at LOE:{' '}
                  {country.numGenericsAtLOE}
                </span>
                <button
                  onClick={() => removeCountry(i)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                  title="Remove country"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Country selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Select Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            >
              <option value="">— Choose —</option>
              {PREDEFINED_COUNTRIES.map((name) => (
                <option key={name} value={name} disabled={addedCountryNames.has(name)}>
                  {name} {addedCountryNames.has(name) ? '(added)' : ''}
                </option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
          </div>

          {selectedCountry === '__custom__' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Custom Country Name
              </label>
              <input
                type="text"
                value={customCountryName}
                onChange={(e) => setCustomCountryName(e.target.value)}
                placeholder="e.g. India"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCountry();
                }}
              />
            </div>
          )}

          <button
            onClick={handleAddCountry}
            disabled={
              !selectedCountry ||
              (selectedCountry === '__custom__' && !customCountryName.trim()) ||
              (selectedCountry !== '__custom__' && addedCountryNames.has(selectedCountry))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add Country
          </button>
        </div>
      </div>

      {/* ──── JSON Export / Import ──── */}
      <SectionTitle>Data Management</SectionTitle>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
          >
            <Download size={14} />
            Export Model
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <Upload size={14} />
            Import Model
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <span className="text-xs text-gray-400">
            Import/export full model state as JSON
          </span>
        </div>
      </div>
    </div>
  );
}
