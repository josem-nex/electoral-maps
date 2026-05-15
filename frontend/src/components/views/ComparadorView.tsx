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
    <div className="w-full">
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
      <div
        className="flex items-center justify-between gap-3"
        style={{ padding: '12px 18px', borderBottom: '1px solid var(--civ-border)' }}
      >
        <div className="civ-eyebrow">Lado {label}</div>
        <select
          value={eleccion.id}
          onChange={(e) => {
            const opt = RESULTADOS_OPTS.find((o) => o.id === e.target.value);
            if (opt) onChange(opt);
          }}
          style={{
            height: 34,
            padding: '0 10px',
            border: '1px solid var(--civ-border)',
            borderRadius: 8,
            background: '#fff',
            fontSize: 13,
            color: 'var(--civ-text)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {RESULTADOS_OPTS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ padding: 16 }}>
        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              fontSize: 13,
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}
        {loading && !data && (
          <div className="py-8 text-center" style={{ color: 'var(--civ-text-muted)', fontSize: 13 }}>
            Cargando…
          </div>
        )}

        {top && data && (
          <div className="flex flex-col" style={{ gap: 16 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--civ-border)',
                background: 'var(--civ-primary-soft)',
              }}
            >
              <div className="civ-eyebrow">Partido más votado</div>
              <div
                className="truncate"
                style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: 'var(--civ-text)' }}
              >
                {top.ganador.partido_nombre}
              </div>
              <div className="flex items-baseline gap-2" style={{ marginTop: 4 }}>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--civ-primary)' }}
                >
                  {top.total > 0 ? fmtPct((top.ganador.partido_votos / top.total) * 100, 2) : '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--civ-text-muted)' }}>
                  · {fmt(top.ganador.partido_votos)} votos
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ gap: 8 }}>
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
              <div className="civ-eyebrow" style={{ marginBottom: 8 }}>Top 5 partidos</div>
              <div className="flex flex-col" style={{ gap: 6 }}>
                {top.top5.map((p) => {
                  const pct = top.total > 0 ? (p.partido_votos / top.total) * 100 : 0;
                  return (
                    <div key={p.partido_codigo} className="flex items-center gap-2">
                      <div
                        className="flex-1 truncate"
                        style={{ fontSize: 12, color: 'var(--civ-text)', fontWeight: 600 }}
                      >
                        {p.partido_nombre}
                      </div>
                      <div
                        className="relative w-24 overflow-hidden"
                        style={{ height: 6, borderRadius: 99, background: 'var(--civ-bg)' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--civ-primary)',
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <div
                        className="w-12 text-right tabular-nums"
                        style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}
                      >
                        {fmtPct(pct, 1)}
                      </div>
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
