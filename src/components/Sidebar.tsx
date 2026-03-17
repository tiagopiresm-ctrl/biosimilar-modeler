import { useStore } from '../store';
import type { Page } from '../types';
import { SCENARIO_LABELS } from '../types';
import {
  Settings, Table2, Globe, FileText, BarChart3, Calculator,
  TrendingUp, Target, GitBranch, PieChart, ChevronDown, ChevronRight,
  Download, Upload, FolderOpen, HardDrive,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { ExportButtons } from '../export/ExportButtons';
import {
  isFileSystemAccessSupported,
  saveJsonToFileSystem,
  openJsonFromFileSystem,
} from '../fileSystem/fileSystemAccess';

const navSections = [
  {
    label: 'Configuration',
    items: [
      { page: 'setup' as Page, label: 'Setup', icon: Settings },
      { page: 'assumptions' as Page, label: 'Assumptions', icon: Table2 },
    ],
  },
  {
    label: 'Financial Analysis',
    items: [
      { page: 'pnl' as Page, label: 'P&L', icon: FileText },
      { page: 'wacc' as Page, label: 'WACC', icon: Calculator },
      { page: 'npv' as Page, label: 'NPV', icon: TrendingUp },
    ],
  },
  {
    label: 'Output',
    items: [
      { page: 'summary' as Page, label: 'Summary', icon: BarChart3 },
      { page: 'kpis' as Page, label: 'KPIs Dashboard', icon: Target },
      { page: 'decision-tree' as Page, label: 'Decision Tree', icon: GitBranch },
      { page: 'charts' as Page, label: 'Charts', icon: PieChart },
    ],
  },
];

export function Sidebar() {
  const { currentPage, setPage, config, countries, exportJSON, importJSON } = useStore();
  const [countriesOpen, setCountriesOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFSAccess = isFileSystemAccessSupported();

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

  const handleSaveTo = async () => {
    const json = exportJSON();
    const name = config.moleculeName || 'biosimilar-model';
    const result = await saveJsonToFileSystem(json, name);
    if (result.saved && result.fileName) {
      // Brief success feedback (non-blocking)
    }
  };

  const handleOpenFrom = async () => {
    const result = await openJsonFromFileSystem();
    if (result) {
      try {
        importJSON(result.content);
      } catch {
        alert('Invalid JSON file.');
      }
    }
  };

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

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo / Title */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900">Biosimilar BC Model</h1>
        <p className="text-xs text-gray-500 mt-0.5">{config.moleculeName || 'New Model'}</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4">
        {navSections.map(section => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {section.label}
            </p>
            {section.items.map(item => {
              const Icon = item.icon;
              const active = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`nav-item w-full ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
            {section.label === 'Configuration' && (
              <div className="mt-1">
                <button
                  onClick={() => setCountriesOpen(!countriesOpen)}
                  className="nav-item w-full nav-item-inactive"
                >
                  <Globe size={16} />
                  <span className="flex-1 text-left">Countries</span>
                  {countriesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {countriesOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {countries.map((c, i) => {
                      const page = `country-${i}` as Page;
                      const active = currentPage === page;
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(page)}
                          className={`nav-item w-full text-xs ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
                        >
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-[10px] flex items-center justify-center font-bold text-gray-600">
                            {i + 1}
                          </span>
                          {c.name || `Country ${i + 1}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-200 space-y-2">
        <button
          onClick={() => setPage('library')}
          className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
            currentPage === 'library'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
          title="Open project library"
        >
          <FolderOpen size={12} />
          Project Library
        </button>
        <ExportButtons />
        {hasFSAccess && (
          <div className="flex gap-1.5">
            <button
              onClick={handleSaveTo}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Save to OneDrive, Teams, or local folder"
            >
              <HardDrive size={12} />
              Save to...
            </button>
            <button
              onClick={handleOpenFrom}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-white text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
              title="Open from OneDrive, Teams, or local folder"
            >
              <FolderOpen size={12} />
              Open from...
            </button>
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={handleExport}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            title="Download project as JSON file"
          >
            <Download size={12} />
            {hasFSAccess ? 'Download' : 'Save Project'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Import project from JSON file"
          >
            <Upload size={12} />
            {hasFSAccess ? 'Upload' : 'Load Project'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
        <div className="text-[10px] text-gray-400">
          Scenario: <span className="font-medium text-gray-600">
            {SCENARIO_LABELS[config.activeScenario]}
          </span>
        </div>
      </div>
    </aside>
  );
}
