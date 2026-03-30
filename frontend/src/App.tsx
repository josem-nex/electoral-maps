import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ElectoralMap } from './components/ElectoralMap';
import { LandingEntryScreen } from './components/LandingEntryScreen';
import { MapLayout } from './components/MapLayout';

export type ActiveView = 'puestos' | 'resultados' | 'jurados-testigos';

function PuestosPage() {
  return <ElectoralMap activeView="puestos" />;
}

function JuradosPage() {
  return <ElectoralMap activeView="jurados-testigos" />;
}

function ResultadosPage() {
  const { year } = useParams<{ year: string }>();
  return <ElectoralMap activeView="resultados" selectedYear={Number(year) || 2026} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingEntryScreen />} />

      <Route element={<MapLayout />}>
        {/* Single wildcard per view prevents ElectoralMap from remounting on depth change */}
        <Route path="/puestos/*" element={<PuestosPage />} />
        <Route path="/resultados/:year/*" element={<ResultadosPage />} />
        <Route path="/jurados-testigos/*" element={<JuradosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
