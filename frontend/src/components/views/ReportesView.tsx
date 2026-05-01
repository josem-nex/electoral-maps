import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import type { Jurisdiccion } from '../../stores/navigationStore';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

interface RowData {
  code: string;
  name: string;
  primary: number;        // votos / puestos / jurados (depende del módulo)
  secondary?: number;     // mesas / testigos
  tertiary?: number;      // potencial / total
}

const fmt = (n: number) => n.toLocaleString('es-CO');

export function ReportesView() {
  const { modulo, anio, corporacion, candidatoFiltro } = useUIFiltersStore();
  const [departamentos, setDepartamentos] = useState<Jurisdiccion[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load departamentos catalog once
  useEffect(() => {
    api.getDepartamentosCatalog()
      .then(setDepartamentos)
      .catch((e) => setError(e.message ?? 'Error cargando departamentos'));
  }, []);

  // Load rows depending on modulo
  useEffect(() => {
    if (departamentos.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const tasks = departamentos.map(async (d): Promise<RowData> => {
      try {
        if (modulo === 'resultados') {
          const r = await api.getResultadosElectorales('departamento', d.code, corporacion, anio);
          // primary: votos del candidato filtrado o votos_validos totales
          let votos = r.votos_validos;
          if (candidatoFiltro) {
            for (const p of r.partidos) {
              const c = p.top5_candidatos.find((c) => c.codigo === candidatoFiltro);
              if (c) { votos = c.votos; break; }
            }
          }
          return { code: d.code, name: d.name, primary: votos, secondary: r.votos_total, tertiary: r.votos_validos };
        }
        if (modulo === 'puestos') {
          const s = await api.getAnalyticsTerritorio('departamento', d.code);
          return { code: d.code, name: d.name, primary: s.puestos_count, secondary: s.mesas_sum, tertiary: s.total_sum };
        }
        // jurados-testigos
        const c = await api.getPersonalConteos('departamento', d.code);
        return { code: d.code, name: d.name, primary: c.jurados, secondary: c.testigos };
      } catch {
        return { code: d.code, name: d.name, primary: 0 };
      }
    });

    Promise.all(tasks).then((res) => {
      if (cancelled) return;
      const sorted = res.slice().sort((a, b) => b.primary - a.primary);
      setRows(sorted);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [departamentos, modulo, anio, corporacion, candidatoFiltro]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.primary, 0), [rows]);

  const headers = useMemo(() => {
    if (modulo === 'resultados') {
      return { primary: 'Votos', secondary: 'Total emitidos', tertiary: '% del total' };
    }
    if (modulo === 'puestos') {
      return { primary: 'Puestos', secondary: 'Mesas', tertiary: 'Potencial' };
    }
    return { primary: 'Jurados', secondary: 'Testigos', tertiary: '% del total' };
  }, [modulo]);

  return (
    <div className="w-full">
      <div className="civ-card" style={{ padding: 16 }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="civ-eyebrow">
              Reporte detallado
            </div>
            <h3 className="civ-card-title" style={{ marginTop: 4 }}>
              {modulo === 'resultados' && `Votación por departamento — ${anio}`}
              {modulo === 'puestos' && 'Puestos electorales por departamento'}
              {modulo === 'jurados-testigos' && 'Jurados y testigos por departamento'}
            </h3>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Desktop / tablet table */}
        <div className="hidden overflow-hidden md:block" style={{ border: '1px solid var(--civ-border)', borderRadius: 10 }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--civ-bg)', borderBottom: '1px solid var(--civ-border)' }}>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--civ-text-muted)' }}>
                <th className="w-10 px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Departamento</th>
                <th className="px-4 py-2.5 text-right">{headers.primary}</th>
                <th className="px-4 py-2.5 text-right">{headers.secondary}</th>
                <th className="px-4 py-2.5 text-right">{headers.tertiary}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: 'var(--civ-text-muted)' }}>Cargando…</td></tr>
              )}
              {!loading && rows.map((r, i) => {
                const pct = total > 0 ? (r.primary / total) * 100 : 0;
                return (
                  <tr key={r.code} className="hover:bg-[var(--civ-bg)]" style={{ borderBottom: '1px solid var(--civ-border)' }}>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--civ-text-soft)', fontWeight: 600 }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold" style={{ color: 'var(--civ-text)' }}>{r.name}</div>
                      <div className="text-xs" style={{ color: 'var(--civ-text-muted)' }}>DIVIPOLA {r.code}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--civ-text)' }}>{fmt(r.primary)}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--civ-text-muted)' }}>{r.secondary !== undefined ? fmt(r.secondary) : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--civ-text-muted)' }}>
                      {modulo === 'puestos' && r.tertiary !== undefined ? fmt(r.tertiary) : `${pct.toFixed(2)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div className="py-6 text-center" style={{ color: 'var(--civ-text-muted)' }}>Cargando…</div>
          )}
          {!loading && rows.map((r, i) => {
            const pct = total > 0 ? (r.primary / total) * 100 : 0;
            return (
              <div
                key={r.code}
                className="civ-card"
                style={{ padding: 12 }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}>
                      #{i + 1} · DIVIPOLA {r.code}
                    </div>
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--civ-text)' }}>
                      {r.name}
                    </div>
                  </div>
                  <div className="text-right shrink-0" style={{ marginLeft: 12 }}>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: 18, fontWeight: 700, color: 'var(--civ-primary)' }}
                    >
                      {fmt(r.primary)}
                    </div>
                    <div className="civ-eyebrow">{headers.primary}</div>
                  </div>
                </div>
                <div
                  className="grid grid-cols-2"
                  style={{
                    gap: 8,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid var(--civ-border)',
                  }}
                >
                  <div>
                    <div className="civ-eyebrow">{headers.secondary}</div>
                    <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: 'var(--civ-text)' }}>
                      {r.secondary !== undefined ? fmt(r.secondary) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="civ-eyebrow">{headers.tertiary}</div>
                    <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: 'var(--civ-text)' }}>
                      {modulo === 'puestos' && r.tertiary !== undefined ? fmt(r.tertiary) : `${pct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
