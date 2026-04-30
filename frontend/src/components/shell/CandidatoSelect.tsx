import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ResultadosElectorales } from '../../api/client';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

interface CandidatoOption {
  codigo: string;
  nombre: string;
  partido: string;
}

const SELECT_STYLES: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 10px',
  border: '1px solid var(--civ-border)',
  borderRadius: 8,
  background: '#fff',
  fontSize: 13,
  color: 'var(--civ-text)',
  outline: 'none',
  cursor: 'pointer',
};

export function CandidatoSelect() {
  const { modulo, anio, corporacion, candidatoFiltro, setCandidatoFiltro } = useUIFiltersStore();
  const [options, setOptions] = useState<CandidatoOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modulo !== 'resultados' || !corporacion) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getResultadosElectorales('pais', 'CO', corporacion, anio)
      .then((r: ResultadosElectorales) => {
        if (cancelled) return;
        const opts: CandidatoOption[] = [];
        for (const p of r.partidos) {
          for (const c of p.top5_candidatos) {
            opts.push({ codigo: c.codigo, nombre: c.nombre, partido: p.partido_nombre });
          }
        }
        const seen = new Set<string>();
        const uniq = opts.filter((o) => {
          if (seen.has(o.codigo)) return false;
          seen.add(o.codigo);
          return true;
        });
        setOptions(uniq);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setOptions([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [modulo, anio, corporacion]);

  return (
    <select
      value={candidatoFiltro ?? ''}
      onChange={(e) => setCandidatoFiltro(e.target.value || null)}
      disabled={loading || options.length === 0}
      style={{
        ...SELECT_STYLES,
        background: loading || options.length === 0 ? 'var(--civ-bg)' : '#fff',
        color: loading || options.length === 0 ? 'var(--civ-text-soft)' : 'var(--civ-text)',
      }}
    >
      <option value="">{loading ? 'Cargando…' : 'Todos los candidatos'}</option>
      {options.map((c) => (
        <option key={c.codigo} value={c.codigo}>
          {c.nombre} — {c.partido}
        </option>
      ))}
    </select>
  );
}
