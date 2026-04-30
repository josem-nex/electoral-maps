import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import type { ResultadosElectorales } from '../../api/client';
import { ELECCIONES_FLAT, type EleccionOption } from '../../hooks/useEleccionesCatalog';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

const fmt = (n: number) => n.toLocaleString('es-CO');
const fmtPct = (n: number, d = 2) => `${n.toFixed(d)}%`;

const RESULTADOS_OPTS: EleccionOption[] = ELECCIONES_FLAT.filter((o) => o.modulo === 'resultados');

export function ComparadorView() {
  const { anio, corporacion } = useUIFiltersStore();
  const initialA = ELECCIONES_FLAT.find((o) => o.modulo === 'resultados' && o.anio === anio && o.corporacion === corporacion)
    ?? RESULTADOS_OPTS[0];
  const initialB = RESULTADOS_OPTS.find((o) => o.id !== initialA?.id) ?? RESULTADOS_OPTS[1];

  const [sideA, setSideA] = useState<EleccionOption>(initialA);
  const [sideB, setSideB] = useState<EleccionOption>(initialB);

  return (
    <div className="h-full w-full overflow-auto">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComparatorSide label="A" eleccion={sideA} onChange={setSideA} />
        <ComparatorSide label="B" eleccion={sideB} onChange={setSideB} />
      </div>
    </div>
  );
}

interface ComparatorSideProps {
  label: 'A' | 'B';
  eleccion: EleccionOption;
  onChange: (e: EleccionOption) => void;
}

function ComparatorSide({ label, eleccion, onChange }: ComparatorSideProps) {
  const [data, setData] = useState<ResultadosElectorales | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getResultadosElectorales('pais', 'CO', eleccion.corporacion, eleccion.anio)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e?.message ?? 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [eleccion.anio, eleccion.corporacion]);

  const top = useMemo(() => {
    if (!data) return null;
    const sorted = data.partidos.slice().sort((a, b) => b.partido_votos - a.partido_votos);
    const ganador = sorted[0];
    const top5 = sorted.slice(0, 5);
    const total = sorted.reduce((s, p) => s + p.partido_votos, 0);
    return { ganador, top5, total };
  }, [data]);

  return (
    <div className="civ-card">
      <div className="flex items-center justify-between" style={{ padding: '12px 18px', borderBottom: '1px solid var(--civ-border)' }}>
        <div className="civ-eyebrow">Lado {label}</div>
        <select
          value={eleccion.id}
          onChange={(e) => {
            const opt = RESULTADOS_OPTS.find((o) => o.id === e.target.value);
            if (opt) onChange(opt);
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {RESULTADOS_OPTS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="p-4">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {loading && !data && <div className="py-8 text-center text-slate-500">Cargando…</div>}

        {top && data && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Partido más votado</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{top.ganador.partido_nombre}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-blue-700">
                  {top.total > 0 ? fmtPct((top.ganador.partido_votos / top.total) * 100, 2) : '—'}
                </span>
                <span className="text-sm text-slate-600">· {fmt(top.ganador.partido_votos)} votos</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <MiniStat label="Votos válidos" value={fmt(data.votos_validos)} />
              <MiniStat
                label="Participación"
                value={data.votos_total > 0 ? fmtPct((data.votos_validos / data.votos_total) * 100, 1) : '—'}
              />
              <MiniStat
                label="Blancos"
                value={fmt(data.votos_blancos)}
                pct={data.votos_total > 0 ? (data.votos_blancos / data.votos_total) * 100 : null}
              />
              <MiniStat
                label="Nulos"
                value={fmt(data.votos_nulos)}
                pct={data.votos_total > 0 ? (data.votos_nulos / data.votos_total) * 100 : null}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Top 5 partidos</div>
              <div className="space-y-1.5">
                {top.top5.map((p) => {
                  const pct = top.total > 0 ? (p.partido_votos / top.total) * 100 : 0;
                  return (
                    <div key={p.partido_codigo} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 truncate text-slate-700">{p.partido_nombre}</div>
                      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-12 text-right font-mono text-xs text-slate-600">{fmtPct(pct, 1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, pct }: { label: string; value: string; pct?: number | null }) {
  return (
    <div className="rounded-md border p-2" style={{ borderColor: 'var(--civ-border)' }}>
      <div className="text-[11px] uppercase" style={{ color: 'var(--civ-text-muted)' }}>{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-semibold tabular-nums" style={{ color: 'var(--civ-text)' }}>{value}</span>
        {pct !== undefined && pct !== null && (
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--civ-text-muted)' }}>
            ({pct.toFixed(2)}%)
          </span>
        )}
      </div>
    </div>
  );
}
