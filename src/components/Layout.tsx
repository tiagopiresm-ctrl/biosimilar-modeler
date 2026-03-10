import { Sidebar } from './Sidebar';
import type { Scenario, ScenarioMode } from '../types';
import { SCENARIO_LABELS } from '../types';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-auto">
        <div className="p-6 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, noMargin }: { title: string; subtitle?: string; noMargin?: boolean }) {
  return (
    <div className={noMargin ? '' : 'mb-6'}>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-bold text-gray-800 mb-3 mt-6 uppercase tracking-wide ${className}`}>
      {children}
    </h3>
  );
}

const SCENARIO_BUTTON_STYLES: Record<string, { active: string; inactive: string }> = {
  '1': {
    active: 'bg-red-600 text-white shadow-sm',
    inactive: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
  },
  '2': {
    active: 'bg-blue-600 text-white shadow-sm',
    inactive: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50',
  },
  '3': {
    active: 'bg-green-600 text-white shadow-sm',
    inactive: 'bg-white text-green-600 border-green-200 hover:bg-green-50',
  },
};

export function ScenarioSelector({
  activeScenario,
  onSelect,
  scenarioMode,
}: {
  activeScenario: Scenario;
  onSelect: (s: Scenario) => void;
  scenarioMode?: ScenarioMode;
}) {
  if (scenarioMode === 'base_only') return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 mr-1">Scenario:</span>
      {([1, 2, 3] as Scenario[]).map((s) => {
        const isActive = s === activeScenario;
        const styles = SCENARIO_BUTTON_STYLES[String(s)];
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              isActive ? styles.active : styles.inactive
            }`}
          >
            {SCENARIO_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
