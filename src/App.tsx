import { useStore } from './store';
import { Layout } from './components/Layout';
import { SetupPage } from './components/SetupPage';
import { AssumptionsPage } from './components/AssumptionsPage';
import { CountryModelPage } from './components/CountryModelPage';
import { PLPage } from './components/PLPage';
import { WACCPage } from './components/WACCPage';
import { NPVPage } from './components/NPVPage';
import { KPIsPage } from './components/KPIsPage';
import { DecisionTreePage } from './components/DecisionTreePage';

import { ChartsPage } from './components/ChartsPage';
import { ProjectLibraryPage } from './components/ProjectLibraryPage';
import { PartnerViewPage } from './components/PartnerViewPage';

function AppContent() {
  const currentPage = useStore((s) => s.currentPage);

  // Handle country pages: country-0, country-1, etc.
  if (currentPage.startsWith('country-')) {
    const index = parseInt(currentPage.split('-')[1], 10);
    return <CountryModelPage countryIndex={index} />;
  }

  switch (currentPage) {
    case 'setup':
      return <SetupPage />;
    case 'assumptions':
      return <AssumptionsPage />;
    case 'pnl':
      return <PLPage />;
    case 'wacc':
      return <WACCPage />;
    case 'npv':
      return <NPVPage />;
    case 'kpis':
      return <KPIsPage />;
    case 'decision-tree':
      return <DecisionTreePage />;
case 'charts':
      return <ChartsPage />;
    case 'partner-view':
      return <PartnerViewPage />;
    case 'library':
      return <ProjectLibraryPage />;
    default:
      return <SetupPage />;
  }
}

export default function App() {
  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}
