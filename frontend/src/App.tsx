import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { TabRouter } from './components/views/TabRouter';
import { PuestoModal } from './components/views/PuestoModal';
import { useEleccionUrlSync } from './hooks/useEleccionUrlSync';
import { useRouteSync } from './hooks/useRouteSync';

export type ActiveView = 'puestos' | 'resultados' | 'jurados-testigos';

const DEFAULT_ENTRY = '/resultados/2026?corp=001';

function EntryRedirect() {
  return <Navigate to={DEFAULT_ENTRY} replace />;
}

function ShellLayout() {
  useEleccionUrlSync();
  useRouteSync();
  return (
    <AppShell>
      <TabRouter />
      <PuestoModal />
    </AppShell>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryRedirect />} />
      <Route path="/puestos/*" element={<ShellLayout />} />
      <Route path="/resultados/:year/*" element={<ShellLayout />} />
      <Route path="/jurados-testigos/*" element={<ShellLayout />} />
      <Route path="*" element={<EntryRedirect />} />
    </Routes>
  );
}

export default App;
