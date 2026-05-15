import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import type { ResultadosElectorales } from '../../api/client';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { useNavigationStore } from '../../stores/navigationStore';

interface CandidatoOption { codigo: string; nombre: string; partido: string; partidoCodigo: string }
interface PartidoOption { codigo: string; nombre: string }

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

/**
 * Resultados de la jurisdicción actualmente seleccionada en el mapa.
 * El nivel se deriva del navigationStore: si hay municipio seleccionado → muni;
 * si está en dept → departamento; si está en zona → zona; si no, país.
 * Cada drill-down dispara un re-fetch al endpoint en el nuevo nivel.
 */
function useResultadosUbicacion(): { data: ResultadosElectorales | null; loading: boolean } {
  const { modulo, anio, corporacion } = useUIFiltersStore();
  const currentJurisdiccion = useNavigationStore((s) => s.currentJurisdiccion);
  const selectedMunicipioCode = useNavigationStore((s) => s.selectedMunicipioCode);
  const [data, setData] = useState<ResultadosElectorales | null>(null);
  const [loading, setLoading] = useState(false);

  const target = useMemo<{ nivel: 'pais' | 'zona' | 'departamento' | 'municipio'; codigo: string }>(() => {
    if (selectedMunicipioCode) return { nivel: 'municipio', codigo: selectedMunicipioCode };
    if (!currentJurisdiccion || currentJurisdiccion.layer === 'pais') return { nivel: 'pais', codigo: 'CO' };
    if (currentJurisdiccion.layer === 'zonas') return { nivel: 'zona', codigo: currentJurisdiccion.code };
    if (currentJurisdiccion.layer === 'departamentos') return { nivel: 'departamento', codigo: currentJurisdiccion.code };
    if (currentJurisdiccion.layer === 'municipio') return { nivel: 'municipio', codigo: currentJurisdiccion.code };
    return { nivel: 'pais', codigo: 'CO' };
  }, [currentJurisdiccion, selectedMunicipioCode]);

  useEffect(() => {
    if (modulo !== 'resultados' || !corporacion) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    api.getResultadosElectorales(target.nivel, target.codigo, corporacion, anio)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [modulo, anio, corporacion, target.nivel, target.codigo]);

  return { data, loading };
}

/** Single candidato dropdown — for presidenciales (each partido = 1 candidato). */
export function CandidatoSelect() {
  const { candidatoFiltro, partidoFiltro, setCandidatoFiltro, corporacion } = useUIFiltersStore();
  const { data, loading } = useResultadosUbicacion();
  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';

  const options = useMemo<CandidatoOption[]>(() => {
    if (!data) return [];
    const opts: CandidatoOption[] = [];
    for (const p of data.partidos) {
      for (const c of p.top5_candidatos) {
        opts.push({
          codigo: c.codigo,
          nombre: c.nombre || p.partido_nombre || '—',
          partido: p.partido_nombre || '',
          partidoCodigo: p.partido_codigo,
        });
      }
    }
    // Dedupe by candidato codigo
    const seen = new Set<string>();
    const uniq = opts.filter((o) => {
      if (seen.has(o.codigo)) return false;
      seen.add(o.codigo);
      return true;
    });
    // Senado/Cámara: optionally narrow by selected partido
    const filtered = !isPresidencial && partidoFiltro
      ? uniq.filter((o) => o.partidoCodigo === partidoFiltro)
      : uniq;
    // Sort alphabetically for predictable UX in long lists
    return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data, partidoFiltro, isPresidencial]);

  const empty = options.length === 0;

  // Auto-limpiar la selección si el candidato actual no existe en la nueva ubicación.
  // El guard `loading || !data` evita limpiar durante transiciones (data temporalmente null).
  useEffect(() => {
    if (loading || !data) return;
    if (candidatoFiltro && !options.some((o) => o.codigo === candidatoFiltro)) {
      setCandidatoFiltro(null);
    }
  }, [options, candidatoFiltro, loading, data, setCandidatoFiltro]);

  return (
    <select
      value={candidatoFiltro ?? ''}
      onChange={(e) => setCandidatoFiltro(e.target.value || null)}
      disabled={loading || empty}
      style={{
        ...SELECT_STYLES,
        background: loading || empty ? 'var(--civ-bg)' : '#fff',
        color: loading || empty ? 'var(--civ-text-soft)' : 'var(--civ-text)',
      }}
    >
      <option value="">{loading ? 'Cargando…' : 'Todos los candidatos'}</option>
      {options.map((c) => (
        <option key={c.codigo} value={c.codigo}>
          {isPresidencial && c.partido ? `${c.nombre} — ${c.partido}` : c.nombre}
        </option>
      ))}
    </select>
  );
}

/** Partido dropdown — only for Senado/Cámara/territoriales (not presidencial). */
export function PartidoSelect() {
  const { partidoFiltro, setPartidoFiltro } = useUIFiltersStore();
  const { data, loading } = useResultadosUbicacion();

  const options = useMemo<PartidoOption[]>(() => {
    if (!data) return [];
    return data.partidos
      .map((p) => ({ codigo: p.partido_codigo, nombre: p.partido_nombre || '—' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data]);

  const empty = options.length === 0;

  // Auto-limpiar el filtro si el partido seleccionado no tiene votos en la nueva ubicación.
  // setPartidoFiltro también limpia candidatoFiltro en cascada (uiFiltersStore.ts).
  useEffect(() => {
    if (loading || !data) return;
    if (partidoFiltro && !options.some((o) => o.codigo === partidoFiltro)) {
      setPartidoFiltro(null);
    }
  }, [options, partidoFiltro, loading, data, setPartidoFiltro]);

  return (
    <select
      value={partidoFiltro ?? ''}
      onChange={(e) => setPartidoFiltro(e.target.value || null)}
      disabled={loading || empty}
      style={{
        ...SELECT_STYLES,
        background: loading || empty ? 'var(--civ-bg)' : '#fff',
        color: loading || empty ? 'var(--civ-text-soft)' : 'var(--civ-text)',
      }}
    >
      <option value="">{loading ? 'Cargando…' : 'Todos los partidos'}</option>
      {options.map((p) => (
        <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
      ))}
    </select>
  );
}
