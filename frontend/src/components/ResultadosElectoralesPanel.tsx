import { useState, useEffect } from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import type { PuestoElectoral, ResultadosElectorales } from '../api/client';
import { api } from '../api/client';
import type { Jurisdiccion } from '../stores/navigationStore';
import { useNavigationStore } from '../stores/navigationStore';

interface ResultadosElectoralesPanelProps {
  currentJurisdiccion: Jurisdiccion | null;
  selectedPuesto: PuestoElectoral | null;
  selectedYear: number;
}

type EleccionTab = 'senado' | 'camara' | 'presidencial' | 'territoriales';

const TABS_BY_YEAR: Record<number, EleccionTab[]> = {
  2026: ['senado', 'camara'],
  2022: ['senado', 'camara', 'presidencial'],
  2018: ['presidencial'],
  2019: ['territoriales'],
  2023: ['territoriales'],
};

const TAB_LABELS: Record<EleccionTab, string> = {
  senado: 'SENADO',
  camara: 'CÁMARA',
  presidencial: 'PRESIDENCIAL',
  territoriales: 'TERRITORIALES',
};

const VUELTA_OPTIONS = [
  { value: '1', label: '1ª Vuelta', corp: 'P01' },
  { value: '2', label: '2ª Vuelta', corp: 'P02' },
] as const;

const TERRITORIAL_OPTIONS = [
  { value: '001', label: 'GOBERNADOR' },
  { value: '002', label: 'ASAMBLEA' },
  { value: '003', label: 'ALCALDE' },
  { value: '004', label: 'CONCEJO' },
  { value: '005', label: 'JAL' },
] as const;

function deriveCorporacion(
  tab: EleccionTab,
  vuelta: string,
  territorialCorp: string,
): string {
  switch (tab) {
    case 'senado': return '001';
    case 'camara': return '002';
    case 'presidencial': return vuelta === '2' ? 'P02' : 'P01';
    case 'territoriales': return territorialCorp;
  }
}

function formatNum(n: number): string {
  return n.toLocaleString('es-CO');
}

function pct(part: number, total: number): string {
  if (total === 0) return '0.0%';
  return (part / total * 100).toFixed(1) + '%';
}

/** Derive (nivel, nivelCodigo, displayName) from current nav state. */
function resolveNivel(
  currentJurisdiccion: Jurisdiccion | null,
  selectedMunicipioCode: string | null,
  selectedPuesto: PuestoElectoral | null,
): { nivel: 'pais' | 'zona' | 'departamento' | 'municipio' | 'puesto'; nivelCodigo: string; displayName: string } | null {
  // 1. Puesto takes highest priority
  if (selectedPuesto) {
    return {
      nivel: 'puesto',
      nivelCodigo: selectedPuesto.codigo_puesto,
      displayName: selectedPuesto.puesto,
    };
  }

  if (!currentJurisdiccion) return null;

  // 2. Municipio selected within departamento view (or consulados view)
  if (
    selectedMunicipioCode &&
    currentJurisdiccion.layer === 'departamentos'
  ) {
    return {
      nivel: 'municipio',
      nivelCodigo: selectedMunicipioCode,
      displayName: selectedMunicipioCode, // overwritten by API nivel_nombre
    };
  }

  // 3. Zone
  if (currentJurisdiccion.layer === 'zonas') {
    // zone.id (numeric) → zona_codigo (zero-padded 2 chars)
    const zonaCodigo = String(Number(currentJurisdiccion.code)).toString().padStart(2, '0');
    return {
      nivel: 'zona',
      nivelCodigo: zonaCodigo,
      displayName: currentJurisdiccion.name,
    };
  }

  // 4. Departamento
  if (currentJurisdiccion.layer === 'departamentos') {
    return {
      nivel: 'departamento',
      nivelCodigo: currentJurisdiccion.code,
      displayName: currentJurisdiccion.name,
    };
  }

  // 5. Municipio layer (Bogotá localidades context — treat as municipio)
  if (currentJurisdiccion.layer === 'municipio' || currentJurisdiccion.layer === 'localidad') {
    // For localidad: use the municipio code from the jurisdiccion id (e.g. "loc:11001:xx" → "11001")
    const munCode =
      currentJurisdiccion.layer === 'localidad'
        ? currentJurisdiccion.id.split(':')[1] ?? currentJurisdiccion.code
        : currentJurisdiccion.code;
    return {
      nivel: 'municipio',
      nivelCodigo: munCode,
      displayName: currentJurisdiccion.name,
    };
  }

  // 6. País (includes zonas fallback → handled above)
  return {
    nivel: 'pais',
    nivelCodigo: 'CO',
    displayName: 'Colombia',
  };
}

export function ResultadosElectoralesPanel({
  currentJurisdiccion,
  selectedPuesto,
  selectedYear,
}: ResultadosElectoralesPanelProps) {
  const selectedMunicipioCode = useNavigationStore((s) => s.selectedMunicipioCode);

  const availableTabs = TABS_BY_YEAR[selectedYear] ?? ['senado', 'camara'];
  const [activeTab, setActiveTab] = useState<EleccionTab>(availableTabs[0]);
  const [vuelta, setVuelta] = useState('1');
  const [territorialCorp, setTerritorialCorp] = useState('001');
  const [data, setData] = useState<ResultadosElectorales | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset tab when year changes
  useEffect(() => {
    const tabs = TABS_BY_YEAR[selectedYear] ?? ['senado', 'camara'];
    if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
    setVuelta('1');
    setTerritorialCorp('001');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const corporacion = deriveCorporacion(activeTab, vuelta, territorialCorp);

  const resolved = resolveNivel(currentJurisdiccion, selectedMunicipioCode, selectedPuesto);

  useEffect(() => {
    if (!resolved) return;

    setLoading(true);
    setError(null);
    setData(null);

    api.getResultadosElectorales(resolved.nivel, resolved.nivelCodigo, corporacion, selectedYear)
      .then(setData)
      .catch((err) => {
        const msg = err?.response?.data?.detail ?? 'Error al cargar resultados';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved?.nivel, resolved?.nivelCodigo, corporacion, selectedYear]);

  // Display name: for puestos use the local name (selectedPuesto.puesto) directly,
  // since the API's nivel_nombre returns the code. For other levels prefer API name.
  const displayName = resolved?.nivel === 'puesto'
    ? (resolved.displayName ?? data?.nivel_nombre ?? 'Colombia')
    : (data?.nivel_nombre ?? resolved?.displayName ?? 'Colombia');

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-8 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Resultados Electorales {selectedYear}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 truncate" title={displayName}>
          {displayName}
        </h2>
        {resolved?.nivel === 'puesto' && (
          <p className="mt-0.5 text-xs text-slate-500 font-mono">{resolved.nivelCodigo}</p>
        )}

        {/* Tabs de tipo de elección — segmented control */}
        <div className="mt-3 flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          {availableTabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 transition-all duration-200 ${i > 0 ? 'border-l border-slate-200' : ''} ${
                activeTab === tab
                  ? 'text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === tab ? { backgroundColor: '#1e40af' } : {}}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Sub-selector: vuelta presidencial */}
        {activeTab === 'presidencial' && (
          <div className="mt-2 flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
            {VUELTA_OPTIONS.map((v, i) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVuelta(v.value)}
                className={`flex-1 py-1.5 transition ${i > 0 ? 'border-l border-slate-200' : ''} ${
                  vuelta === v.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-selector: corporación territorial */}
        {activeTab === 'territoriales' && (
          <div className="mt-2">
            <select
              value={territorialCorp}
              onChange={(e) => setTerritorialCorp(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              {TERRITORIAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading && <SkeletonLoader />}

        {error && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Totals as badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-brand-50 px-3 py-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total votos</p>
                <p className="mt-0.5 text-base font-bold text-brand-700">{formatNum(data.votos_total)}</p>
              </div>
              <div className="rounded-xl bg-green-50 px-3 py-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Válidos</p>
                <p className="mt-0.5 text-base font-bold text-green-700">
                  {formatNum(data.votos_validos)}
                  <span className="ml-1 text-xs font-normal text-green-500">
                    ({pct(data.votos_validos, data.votos_total)})
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-red-50 px-3 py-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Nulos</p>
                <p className="mt-0.5 text-base font-bold text-red-600">
                  {formatNum(data.votos_nulos)}
                  <span className="ml-1 text-xs font-normal text-red-400">
                    ({pct(data.votos_nulos, data.votos_total)})
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">En blanco</p>
                <p className="mt-0.5 text-base font-bold text-slate-700">
                  {formatNum(data.votos_blancos)}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({pct(data.votos_blancos, data.votos_total)})
                  </span>
                </p>
              </div>
            </div>

            {/* Partidos */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Distribución por partido
              </p>
              <div className="space-y-3">
                {data.partidos.map((partido, idx) => {
                  // Gradient of blues: cycle through a palette
                  const barColors = [
                    'bg-blue-600', 'bg-brand-700', 'bg-sky-500', 'bg-indigo-500',
                    'bg-blue-400', 'bg-cyan-500', 'bg-violet-500', 'bg-teal-500',
                  ];
                  const barColor = barColors[idx % barColors.length];
                  return (
                    <div key={partido.partido_codigo} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span
                          className="font-medium text-slate-800 leading-tight flex-1 min-w-0 truncate"
                          title={partido.partido_nombre}
                        >
                          {partido.partido_nombre}
                        </span>
                        <span className="shrink-0 font-bold text-brand-700">
                          {partido.pct_partido}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(partido.pct_partido, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatNum(partido.partido_votos)} votos
                      </div>

                      {/* Top 5 candidatos */}
                      {partido.top5_candidatos.length > 0 && (
                        <div className="ml-3 mt-1 space-y-0.5">
                          {partido.top5_candidatos.map((cand) => (
                            <div key={cand.codigo} className="flex items-center justify-between text-xs text-slate-600">
                              <span className="truncate flex-1 min-w-0" title={cand.nombre}>
                                {cand.nombre}
                              </span>
                              <span className="shrink-0 ml-2 font-medium text-slate-700">
                                {formatNum(cand.votos)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!loading && !error && !data && (
          <p className="text-sm text-slate-400 text-center pt-4">
            Selecciona un territorio en el mapa
          </p>
        )}
      </div>
    </div>
  );
}
