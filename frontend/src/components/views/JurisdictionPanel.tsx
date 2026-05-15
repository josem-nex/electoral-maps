import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type {
  PersonalConteo,
  ResultadosElectorales,
  TerritorioStats,
} from '../../api/client';
import { useNavigationStore } from '../../stores/navigationStore';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { useIsMobile } from '../../hooks/useIsMobile';

const fmt = (n: number) => n.toLocaleString('es-CO');
const fmtPct = (n: number, d = 1) => `${n.toFixed(d)}%`;

type SelectionTipo = 'pais' | 'zona' | 'departamento' | 'municipio';

interface Selection {
  tipo: SelectionTipo;
  codigo: string;
  nombre: string;
  layerLabel: string;
}

function deriveSelection(
  current: ReturnType<typeof useNavigationStore.getState>['currentJurisdiccion'],
  selectedMuniCode: string | null,
  selectedMuniName: string | null,
): Selection | null {
  if (!current || current.layer === 'pais') {
    return { tipo: 'pais', codigo: 'CO', nombre: 'Colombia', layerLabel: 'País' };
  }
  if (current.layer === 'departamentos' && selectedMuniCode) {
    return {
      tipo: 'municipio',
      codigo: selectedMuniCode,
      nombre: selectedMuniName ?? selectedMuniCode,
      layerLabel: 'Municipio',
    };
  }
  if (current.layer === 'municipio') {
    const code = current.id.split(':')[1] ?? current.code;
    return { tipo: 'municipio', codigo: code, nombre: current.name, layerLabel: 'Municipio' };
  }
  if (current.layer === 'departamentos') {
    return { tipo: 'departamento', codigo: current.code, nombre: current.name, layerLabel: 'Departamento' };
  }
  if (current.layer === 'zonas') {
    return { tipo: 'zona', codigo: current.code, nombre: current.name, layerLabel: 'Zona' };
  }
  return null;
}

export function JurisdictionPanel() {
  const { currentJurisdiccion, selectedMunicipioCode, selectedMunicipioName } = useNavigationStore();
  const { modulo, anio, corporacion, candidatoFiltro, partidoFiltro } = useUIFiltersStore();
  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';
  const isMobile = useIsMobile();

  const selection = useMemo(
    () => deriveSelection(currentJurisdiccion, selectedMunicipioCode, selectedMunicipioName),
    [currentJurisdiccion, selectedMunicipioCode, selectedMunicipioName],
  );

  const [stats, setStats] = useState<TerritorioStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadosElectorales | null>(null);
  const [resultadosLoading, setResultadosLoading] = useState(false);
  const [personal, setPersonal] = useState<PersonalConteo | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);

  useEffect(() => {
    if (!selection) { setStats(null); setStatsLoading(false); return; }
    let cancelled = false;
    setStats(null);
    setStatsLoading(true);
    api.getAnalyticsTerritorio(selection.tipo, selection.codigo)
      .then((s) => { if (!cancelled) { setStats(s); setStatsLoading(false); } })
      .catch(() => { if (!cancelled) { setStats(null); setStatsLoading(false); } });
    return () => { cancelled = true; };
  }, [selection?.tipo, selection?.codigo]);

  useEffect(() => {
    if (modulo !== 'resultados' || !selection) {
      setResultados(null);
      setResultadosLoading(false);
      return;
    }
    let cancelled = false;
    setResultados(null);
    setResultadosLoading(true);
    api.getResultadosElectorales(selection.tipo, selection.codigo, corporacion, anio)
      .then((r) => { if (!cancelled) { setResultados(r); setResultadosLoading(false); } })
      .catch(() => { if (!cancelled) { setResultados(null); setResultadosLoading(false); } });
    return () => { cancelled = true; };
  }, [modulo, selection?.tipo, selection?.codigo, corporacion, anio]);

  useEffect(() => {
    if (modulo !== 'jurados-testigos' || !selection) {
      setPersonal(null);
      setPersonalLoading(false);
      return;
    }
    let cancelled = false;
    setPersonal(null);
    setPersonalLoading(true);
    api.getPersonalConteos(selection.tipo, selection.codigo)
      .then((p) => { if (!cancelled) { setPersonal(p); setPersonalLoading(false); } })
      .catch(() => { if (!cancelled) { setPersonal(null); setPersonalLoading(false); } });
    return () => { cancelled = true; };
  }, [modulo, selection?.tipo, selection?.codigo]);

  const totalVotos = resultados
    ? (resultados.votos_validos || resultados.partidos.reduce((s, p) => s + p.partido_votos, 0))
    : 0;

  // Flatten to (candidato, partido) entries — works for both presidencial (1 cand/partido)
  // and congreso (multiple cands/partido). When candidatoFiltro is set, we focus on that one.
  const candidatos = useMemo(() => {
    if (!resultados) return [];
    return resultados.partidos.flatMap((p) =>
      p.top5_candidatos.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre || p.partido_nombre || '—',
        partido: p.partido_nombre || '',
        partidoCodigo: p.partido_codigo,
        votos: c.votos,
        pct: totalVotos > 0 ? (c.votos / totalVotos) * 100 : 0,
      })),
    );
  }, [resultados, totalVotos]);

  const partidoTop5 = useMemo(() => {
    if (!resultados) return [];
    return resultados.partidos
      .slice()
      .sort((a, b) => b.partido_votos - a.partido_votos)
      .slice(0, 5)
      .map((p) => ({
        partido: p.partido_nombre || '—',
        partidoCodigo: p.partido_codigo,
        candidatoTop: p.top5_candidatos[0]?.nombre || null,
        votos: p.partido_votos,
        pct: totalVotos > 0 ? (p.partido_votos / totalVotos) * 100 : 0,
      }));
  }, [resultados, totalVotos]);

  // Filter by partido (Senado/Cámara only) — narrow candidatos to those of the selected party
  const filteredPartido = useMemo(() => {
    if (isPresidencial || !partidoFiltro || !resultados) return null;
    return resultados.partidos.find((p) => p.partido_codigo === partidoFiltro) ?? null;
  }, [resultados, partidoFiltro, isPresidencial]);

  const winner = useMemo(() => {
    if (!resultados) return null;
    if (candidatoFiltro) {
      const c = candidatos.find((x) => x.codigo === candidatoFiltro);
      if (c) return { nombre: c.nombre, subtitle: c.partido, pct: c.pct, votos: c.votos };
    }
    if (filteredPartido) {
      return {
        nombre: filteredPartido.partido_nombre || '—',
        subtitle: 'Partido seleccionado',
        pct: totalVotos > 0 ? (filteredPartido.partido_votos / totalVotos) * 100 : 0,
        votos: filteredPartido.partido_votos,
      };
    }
    if (isPresidencial) {
      const top = candidatos.slice().sort((a, b) => b.votos - a.votos)[0];
      if (!top) return null;
      return { nombre: top.nombre, subtitle: top.partido, pct: top.pct, votos: top.votos };
    }
    const top = partidoTop5[0];
    if (!top) return null;
    return {
      nombre: top.candidatoTop ?? top.partido,
      subtitle: top.candidatoTop ? top.partido : '',
      pct: top.pct,
      votos: top.votos,
    };
  }, [resultados, candidatoFiltro, filteredPartido, candidatos, partidoTop5, isPresidencial, totalVotos]);

  const top5 = useMemo(() => {
    if (!resultados) return [];
    if (filteredPartido) {
      // Top 5 candidatos within the selected partido
      return filteredPartido.top5_candidatos
        .slice()
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 5)
        .map((c) => ({
          titulo: c.nombre || '—',
          subtitulo: null,
          pct: totalVotos > 0 ? (c.votos / totalVotos) * 100 : 0,
          votos: c.votos,
          codigo: c.codigo,
        }));
    }
    if (isPresidencial) {
      return candidatos
        .slice()
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 5)
        .map((c) => ({
          titulo: c.nombre,
          subtitulo: c.partido || null,
          pct: c.pct,
          votos: c.votos,
          codigo: c.codigo,
        }));
    }
    return partidoTop5.map((p, i) => ({
      titulo: p.partido,
      subtitulo: p.candidatoTop ? `Más votado: ${p.candidatoTop}` : null,
      pct: p.pct,
      votos: p.votos,
      codigo: p.partidoCodigo || `partido-${i}`,
    }));
  }, [resultados, isPresidencial, candidatos, partidoTop5, filteredPartido, totalVotos]);

  // Empty state — pais level or no selection
  if (!selection) {
    return <EmptyPanel />;
  }

  return (
    <aside
      className="civ-card flex flex-col overflow-y-auto"
      style={{ padding: 16, gap: isMobile ? 12 : 14 }}
    >
      <div>
        <div className="civ-eyebrow">{selection.layerLabel} · {selection.codigo}</div>
        <h3
          className="truncate"
          style={{ marginTop: 4, fontSize: isMobile ? 19 : 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--civ-text)' }}
        >
          {selection.nombre}
        </h3>
      </div>

      {modulo === 'resultados' && (
        <ResultadosSection
          loading={resultadosLoading}
          winner={winner}
          top5={top5}
          totals={resultados}
          isMobile={isMobile}
          topLabel={
            filteredPartido ? `Top 5 candidatos · ${filteredPartido.partido_nombre || ''}`.trim() :
            isPresidencial ? 'Top 5 candidatos' : 'Top 5 partidos'
          }
          winnerLabel={
            candidatoFiltro ? 'Candidato seleccionado' :
            filteredPartido ? 'Partido seleccionado' :
            'Más votado'
          }
        />
      )}

      {modulo === 'puestos' && (
        <PuestosStatsSection stats={stats} loading={statsLoading} isMobile={isMobile} />
      )}

      {modulo === 'jurados-testigos' && (
        <JuradosSection
          stats={stats}
          statsLoading={statsLoading}
          personal={personal}
          personalLoading={personalLoading}
          isMobile={isMobile}
        />
      )}
    </aside>
  );
}

function EmptyPanel() {
  const isMobile = useIsMobile();
  return (
    <aside
      className="civ-card flex flex-col items-center justify-center text-center"
      style={{ padding: 24, gap: 8, minHeight: 240 }}
    >
      <div
        className="grid place-items-center"
        style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--civ-primary-soft)', color: 'var(--civ-primary)', marginBottom: 4,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      </div>
      <h4 style={{ fontSize: isMobile ? 16 : 14, fontWeight: 600, color: 'var(--civ-text)' }}>Selecciona una jurisdicción</h4>
      <p style={{ fontSize: isMobile ? 14 : 12, color: 'var(--civ-text-muted)', lineHeight: 1.5, maxWidth: 260 }}>
        Haz click en una zona o departamento del mapa para ver el detalle de la jurisdicción.
      </p>
    </aside>
  );
}

interface ResultadosSectionProps {
  loading: boolean;
  winner: { nombre: string; subtitle: string; votos: number; pct: number } | null;
  top5: { titulo: string; subtitulo: string | null; pct: number; votos: number; codigo: string }[];
  totals: ResultadosElectorales | null;
  topLabel: string;
  winnerLabel: string;
  isMobile: boolean;
}

function ResultadosSection({ loading, winner, top5, totals, topLabel, winnerLabel, isMobile }: ResultadosSectionProps) {
  if (loading && !winner) {
    return <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', textAlign: 'center', padding: 24 }}>Cargando resultados…</div>;
  }
  if (!winner) {
    return <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', textAlign: 'center', padding: 12 }}>Sin datos para esta jurisdicción.</div>;
  }
  return (
    <>
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: '4px 1fr auto',
          gap: 12,
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--civ-border)',
          background: 'var(--civ-primary-soft)',
        }}
      >
        <div style={{ width: 4, height: '100%', minHeight: 36, borderRadius: 2, background: 'var(--civ-primary)' }} />
        <div className="min-w-0">
          <div className="civ-eyebrow">{winnerLabel}</div>
          <div className="truncate" style={{ fontWeight: 700, fontSize: isMobile ? 15 : 14, lineHeight: 1.2, color: 'var(--civ-text)' }}>
            {winner.nombre}
          </div>
          {winner.subtitle && (
            <div className="truncate" style={{ fontSize: isMobile ? 12 : 11, color: 'var(--civ-text-muted)', marginTop: 2 }}>
              {winner.subtitle}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: isMobile ? 23 : 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--civ-primary)' }}>
            {fmtPct(winner.pct, 1)}
          </div>
          <div className="tabular-nums" style={{ fontSize: isMobile ? 11 : 10, color: 'var(--civ-text-muted)' }}>
            {fmt(winner.votos)}
          </div>
        </div>
      </div>

      {totals && (
        <div
          className="grid grid-cols-3"
          style={{ gap: 8, padding: 12, background: 'var(--civ-bg)', borderRadius: 8 }}
        >
          <Stat label="Válidos" value={fmt(totals.votos_validos)} isMobile={isMobile} />
          <Stat label="Blancos" value={fmt(totals.votos_blancos)} isMobile={isMobile} />
          <Stat label="Nulos" value={fmt(totals.votos_nulos)} isMobile={isMobile} />
        </div>
      )}

      <div>
        <div className="civ-eyebrow" style={{ marginBottom: 8 }}>{topLabel}</div>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {top5.map((p) => (
            <div key={p.codigo} className="grid items-center" style={{ gridTemplateColumns: '1fr auto', gap: 8 }}>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: isMobile ? 13 : 12, color: 'var(--civ-text)', fontWeight: 600 }}>
                  {p.titulo}
                </div>
                {p.subtitulo && (
                  <div className="truncate" style={{ fontSize: isMobile ? 11 : 10, color: 'var(--civ-text-muted)', marginTop: 1 }}>
                    {p.subtitulo}
                  </div>
                )}
                <div className="relative overflow-hidden" style={{ height: isMobile ? 7 : 6, background: 'var(--civ-bg)', borderRadius: 99, marginTop: 4 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, p.pct)}%`, background: 'var(--civ-primary)', borderRadius: 99 }} />
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: isMobile ? 12 : 11, color: 'var(--civ-text-muted)', minWidth: 48, textAlign: 'right' }}>
                {fmtPct(p.pct, 1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PuestosStatsSection({ stats, loading, isMobile }: { stats: TerritorioStats | null; loading: boolean; isMobile: boolean }) {
  if (loading && !stats) {
    return <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', textAlign: 'center', padding: 24 }}>Cargando…</div>;
  }
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2" style={{ gap: 8, padding: 12, background: 'var(--civ-bg)', borderRadius: 8 }}>
      <Stat label="Puestos" value={fmt(stats.puestos_count)} isMobile={isMobile} />
      <Stat label="Mesas" value={fmt(stats.mesas_sum)} isMobile={isMobile} />
      <Stat label="Potencial" value={fmt(stats.total_sum)} isMobile={isMobile} />
      <Stat label="M / H" value={`${fmt(stats.mujeres_sum)} / ${fmt(stats.hombres_sum)}`} isMobile={isMobile} />
    </div>
  );
}

function JuradosSection({
  stats, statsLoading, personal, personalLoading, isMobile,
}: {
  stats: TerritorioStats | null; statsLoading: boolean;
  personal: PersonalConteo | null; personalLoading: boolean;
  isMobile: boolean;
}) {
  return (
    <>
      {(personalLoading || personal) && (
        <div className="grid grid-cols-2" style={{ gap: 8, padding: 12, background: 'var(--civ-bg)', borderRadius: 8 }}>
          <Stat label="Jurados" value={personal ? fmt(personal.jurados) : '…'} isMobile={isMobile} />
          <Stat label="Testigos" value={personal ? fmt(personal.testigos) : '…'} isMobile={isMobile} />
        </div>
      )}
      {(statsLoading || stats) && (
        <div className="grid grid-cols-2" style={{ gap: 8, padding: 12, background: 'var(--civ-bg)', borderRadius: 8 }}>
          <Stat label="Puestos" value={stats ? fmt(stats.puestos_count) : '…'} isMobile={isMobile} />
          <Stat label="Mesas" value={stats ? fmt(stats.mesas_sum) : '…'} isMobile={isMobile} />
        </div>
      )}
    </>
  );
}

function Stat({ label, value, isMobile }: { label: string; value: string; isMobile: boolean }) {
  return (
    <div>
      <div className="tabular-nums" style={{ fontSize: isMobile ? 17 : 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--civ-text)' }}>
        {value}
      </div>
      <div style={{ fontSize: isMobile ? 11 : 10, color: 'var(--civ-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
