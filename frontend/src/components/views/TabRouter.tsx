import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { MapaView } from './MapaView';
import { ReportesView } from './ReportesView';
import { DashboardView } from './DashboardView';
import { ComparadorView } from './ComparadorView';

export function TabRouter() {
  const { activeTab } = useUIFiltersStore();

  if (activeTab === 'mapa') return <MapaView />;
  if (activeTab === 'reportes') return <ReportesView />;
  if (activeTab === 'dashboard') return <DashboardView />;
  if (activeTab === 'comparador') return <ComparadorView />;
  return null;
}
