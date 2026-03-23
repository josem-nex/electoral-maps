import { useState, useEffect } from 'react';
import type { PuestoElectoral, ResultadosElectorales } from '../api/client';
import { api } from '../api/client';
import type { Jurisdiccion } from '../stores/navigationStore';
import { useNavigationStore } from '../stores/navigationStore';

interface ResultadosElectoralesPanelProps {
  currentJurisdiccion: Jurisdiccion | null;
  selectedPuesto: PuestoElectoral | null;
  selectedYear: number;
}

type Corporacion = '001' | '002';

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

  const [corporacion, setCorporacion] = useState<Corporacion>('001');
  const [data, setData] = useState<ResultadosElectorales | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Display name: prefer API's nivel_nombre, fall back to resolved
  const displayName = data?.nivel_nombre ?? resolved?.displayName ?? 'Colombia';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Resultados Electorales {selectedYear}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 truncate" title={displayName}>
          {displayName}
        </h2>

        {/* Corporación toggle */}
        <div className="mt-3 flex rounded-lg border border-slate-200 overflow-hidden text-sm font-semibold">
          <button
            type="button"
            onClick={() => setCorporacion('001')}
            className={`flex-1 py-2 transition ${
              corporacion === '001'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            SENADO
          </button>
          <button
            type="button"
            onClick={() => setCorporacion('002')}
            className={`flex-1 py-2 transition border-l border-slate-200 ${
              corporacion === '002'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            CÁMARA
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 rounded bg-slate-200 w-3/4" />
            <div className="h-4 rounded bg-slate-200 w-1/2" />
            <div className="h-4 rounded bg-slate-200 w-2/3" />
            <div className="h-4 rounded bg-slate-200 w-3/5" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Totals */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total votos</span>
                <span className="font-semibold text-slate-900">{formatNum(data.votos_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Votos válidos</span>
                <span className="font-semibold text-slate-900">
                  {formatNum(data.votos_validos)}
                  <span className="ml-1 text-slate-400 font-normal">
                    ({pct(data.votos_validos, data.votos_total)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Votos nulos</span>
                <span className="font-semibold text-slate-900">
                  {formatNum(data.votos_nulos)}
                  <span className="ml-1 text-slate-400 font-normal">
                    ({pct(data.votos_nulos, data.votos_total)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Votos en blanco</span>
                <span className="font-semibold text-slate-900">
                  {formatNum(data.votos_blancos)}
                  <span className="ml-1 text-slate-400 font-normal">
                    ({pct(data.votos_blancos, data.votos_total)})
                  </span>
                </span>
              </div>
            </div>

            {/* Partidos */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Distribución por partido
              </p>
              <div className="space-y-3">
                {data.partidos.map((partido) => (
                  <div key={partido.partido_codigo} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span
                        className="font-medium text-slate-800 leading-tight flex-1 min-w-0 truncate"
                        title={partido.partido_nombre}
                      >
                        {partido.partido_nombre}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-900">
                        {partido.pct_partido}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
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
                ))}
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
