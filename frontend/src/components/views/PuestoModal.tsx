import { useEffect, useState } from 'react';
import { usePuestoModalStore } from '../../stores/puestoModalStore';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { api, type PersonaResumen } from '../../api/client';

const fmt = (n: number) => n.toLocaleString('es-CO');

export function PuestoModal() {
  const { puesto, close } = usePuestoModalStore();
  const { modulo } = useUIFiltersStore();
  const [personal, setPersonal] = useState<{ jurados: PersonaResumen[]; testigos: PersonaResumen[] } | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);

  useEffect(() => {
    if (!puesto || modulo !== 'jurados-testigos') {
      setPersonal(null);
      return;
    }
    let cancelled = false;
    setPersonalLoading(true);
    api.getPersonalPuesto(puesto.codigo_puesto)
      .then((p) => { if (!cancelled) { setPersonal(p); setPersonalLoading(false); } })
      .catch(() => { if (!cancelled) { setPersonal(null); setPersonalLoading(false); } });
    return () => { cancelled = true; };
  }, [puesto, modulo]);

  if (!puesto) return null;

  const participacion = puesto.total && puesto.total > 0 && (puesto.mujeres ?? 0) + (puesto.hombres ?? 0) > 0
    ? (((puesto.mujeres ?? 0) + (puesto.hombres ?? 0)) / puesto.total) * 100
    : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={close}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Puesto Electoral · {puesto.codigo_puesto}
            </div>
            <h3 className="mt-0.5 truncate text-lg font-semibold text-slate-900">{puesto.puesto}</h3>
            {puesto.direccion && (
              <div className="mt-0.5 truncate text-xs text-slate-500">{puesto.direccion}</div>
            )}
          </div>
          <button onClick={close} className="ml-3 shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-5 lg:grid-cols-2">
          {/* Left: stats + personal */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Mesas" value={puesto.mesas ? fmt(puesto.mesas) : '—'} />
              <Stat label="Potencial" value={puesto.total ? fmt(puesto.total) : '—'} />
              <Stat label="Mujeres" value={puesto.mujeres ? fmt(puesto.mujeres) : '—'} />
              <Stat label="Hombres" value={puesto.hombres ? fmt(puesto.hombres) : '—'} />
            </div>

            {participacion !== null && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-500">Composición censal</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-blue-700">{participacion.toFixed(1)}%</div>
              </div>
            )}

            {modulo === 'jurados-testigos' && (
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Personal asignado
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {personalLoading && <div className="p-3 text-sm text-slate-500">Cargando…</div>}
                  {!personalLoading && personal && (
                    <PersonalSection jurados={personal.jurados} testigos={personal.testigos} />
                  )}
                  {!personalLoading && !personal && (
                    <div className="p-3 text-sm text-slate-500">Sin datos disponibles</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: ubicación */}
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ubicación
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                <Row k="Departamento" v={puesto.departamento} />
                <Row k="Municipio" v={puesto.municipio} />
                {puesto.comuna && <Row k="Comuna" v={puesto.comuna} />}
                <Row k="Código" v={puesto.codigo_puesto} />
                <Row k="Coordenadas" v={`${puesto.latitud.toFixed(4)}, ${puesto.longitud.toFixed(4)}`} />
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
      <div className="text-lg font-bold tabular-nums text-slate-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="truncate text-sm font-medium text-slate-900">{v}</dd>
    </div>
  );
}

function PersonalSection({ jurados, testigos }: { jurados: PersonaResumen[]; testigos: PersonaResumen[] }) {
  return (
    <div className="text-sm">
      <div className="border-b border-slate-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
        Jurados ({jurados.length})
      </div>
      {jurados.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">Sin jurados asignados</div>}
      {jurados.map((p) => <PersonaItem key={'j-' + p.cedula} p={p} />)}
      <div className="border-b border-slate-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
        Testigos ({testigos.length})
      </div>
      {testigos.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">Sin testigos asignados</div>}
      {testigos.map((p) => <PersonaItem key={'t-' + p.cedula} p={p} />)}
    </div>
  );
}

function PersonaItem({ p }: { p: PersonaResumen }) {
  const nombre = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');
  return (
    <div className="border-b border-slate-100 px-3 py-2 last:border-0">
      <div className="text-sm font-medium text-slate-900">{nombre}</div>
      <div className="text-xs text-slate-500">CC {p.cedula}</div>
    </div>
  );
}
