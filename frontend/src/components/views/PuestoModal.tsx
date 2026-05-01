import { useEffect, useMemo, useState } from 'react';
import { usePuestoModalStore } from '../../stores/puestoModalStore';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import {
  api,
  type PersonaResumen,
  type ResultadosElectorales,
  type ResultadosPartido,
} from '../../api/client';

const fmt = (n: number) => n.toLocaleString('es-CO');
const fmtPct = (n: number, d = 1) => `${n.toFixed(d)}%`;

export function PuestoModal() {
  const { puesto, close } = usePuestoModalStore();
  const { modulo, anio, corporacion } = useUIFiltersStore();

  const [personal, setPersonal] = useState<{ jurados: PersonaResumen[]; testigos: PersonaResumen[] } | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);

  const [resultados, setResultados] = useState<ResultadosElectorales | null>(null);
  const [resultadosLoading, setResultadosLoading] = useState(false);

  const [partidoFiltro, setPartidoFiltro] = useState<string>('');

  useEffect(() => {
    if (!puesto || modulo !== 'jurados-testigos') {
      setPersonal(null);
      setPersonalLoading(false);
      return;
    }
    let cancelled = false;
    setPersonal(null);
    setPersonalLoading(true);
    api.getPersonalPuesto(puesto.codigo_puesto)
      .then((p) => { if (!cancelled) { setPersonal(p); setPersonalLoading(false); } })
      .catch(() => { if (!cancelled) { setPersonal(null); setPersonalLoading(false); } });
    return () => { cancelled = true; };
  }, [puesto, modulo]);

  useEffect(() => {
    if (!puesto || modulo !== 'resultados') {
      setResultados(null);
      setResultadosLoading(false);
      return;
    }
    let cancelled = false;
    setResultados(null);
    setResultadosLoading(true);
    setPartidoFiltro('');
    api.getResultadosElectorales('puesto', puesto.codigo_puesto, corporacion, anio)
      .then((r) => { if (!cancelled) { setResultados(r); setResultadosLoading(false); } })
      .catch(() => { if (!cancelled) { setResultados(null); setResultadosLoading(false); } });
    return () => { cancelled = true; };
  }, [puesto, modulo, corporacion, anio]);

  // Reset partido filter when puesto changes
  useEffect(() => { setPartidoFiltro(''); }, [puesto?.codigo_puesto]);

  const totalVotosValidos = resultados
    ? (resultados.votos_validos || resultados.partidos.reduce((s, p) => s + p.partido_votos, 0))
    : 0;

  const sortedPartidos = useMemo<ResultadosPartido[]>(() => {
    if (!resultados) return [];
    return resultados.partidos.slice().sort((a, b) => b.partido_votos - a.partido_votos);
  }, [resultados]);

  const top3Partidos = sortedPartidos.slice(0, 3);

  const partidoSeleccionado = useMemo<ResultadosPartido | null>(() => {
    if (!resultados || !partidoFiltro) return null;
    return resultados.partidos.find((p) => p.partido_codigo === partidoFiltro) ?? null;
  }, [resultados, partidoFiltro]);

  if (!puesto) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={close}
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid var(--civ-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4"
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--civ-border)',
            background: 'var(--civ-primary-soft)',
          }}
        >
          <div className="min-w-0">
            <div className="civ-eyebrow">Puesto electoral · {puesto.codigo_puesto}</div>
            <h3
              className="truncate"
              style={{
                marginTop: 6,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--civ-text)',
              }}
            >
              {puesto.puesto}
            </h3>
            {puesto.direccion && (
              <div
                className="truncate"
                style={{ marginTop: 4, fontSize: 13, color: 'var(--civ-text-muted)' }}
              >
                {puesto.direccion}
              </div>
            )}
          </div>
          <button
            onClick={close}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/60"
            aria-label="Cerrar"
            style={{ color: 'var(--civ-text-muted)' }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div
          className="grid flex-1 grid-cols-1 gap-6 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          style={{ padding: 28 }}
        >
          {/* Left column: stats + ubicación + personal */}
          <div className="flex flex-col" style={{ gap: 20 }}>
            <StatsCard puesto={puesto} />

            <UbicacionCard puesto={puesto} />

            {modulo === 'jurados-testigos' && (
              <PersonalCard
                loading={personalLoading}
                personal={personal}
              />
            )}
          </div>

          {/* Right column: resultados (modulo=resultados) */}
          <div className="flex flex-col" style={{ gap: 16 }}>
            {modulo === 'resultados' ? (
              <ResultadosCard
                loading={resultadosLoading}
                resultados={resultados}
                top3Partidos={top3Partidos}
                totalValidos={totalVotosValidos}
                partidos={sortedPartidos}
                partidoFiltro={partidoFiltro}
                setPartidoFiltro={setPartidoFiltro}
                partidoSeleccionado={partidoSeleccionado}
                anio={anio}
                corporacionNombre={resultados?.corporacion_nombre ?? ''}
              />
            ) : (
              <ContextHelpCard modulo={modulo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatsCard({ puesto }: { puesto: NonNullable<ReturnType<typeof usePuestoModalStore.getState>['puesto']> }) {
  return (
    <div className="civ-card" style={{ padding: 16 }}>
      <div className="civ-eyebrow" style={{ marginBottom: 10 }}>Censo electoral</div>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
        <Stat label="Mesas" value={puesto.mesas ? fmt(puesto.mesas) : '—'} />
        <Stat label="Potencial" value={puesto.total ? fmt(puesto.total) : '—'} />
        <Stat label="Mujeres" value={puesto.mujeres ? fmt(puesto.mujeres) : '—'} />
        <Stat label="Hombres" value={puesto.hombres ? fmt(puesto.hombres) : '—'} />
      </div>
      {(() => {
        const total = puesto.total ?? 0;
        const m = puesto.mujeres ?? 0;
        const h = puesto.hombres ?? 0;
        if (total <= 0 || m + h <= 0) return null;
        const mPct = (m / (m + h)) * 100;
        const hPct = 100 - mPct;
        return (
          <div style={{ marginTop: 14 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="civ-eyebrow">Distribución M / H</span>
              <span className="tabular-nums" style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}>
                {fmtPct(mPct, 0)} / {fmtPct(hPct, 0)}
              </span>
            </div>
            <div
              className="overflow-hidden"
              style={{ height: 6, borderRadius: 99, background: 'var(--civ-bg)' }}
            >
              <div className="flex h-full">
                <div style={{ width: `${mPct}%`, background: '#ec4899' }} />
                <div style={{ width: `${hPct}%`, background: 'var(--civ-primary)' }} />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function UbicacionCard({ puesto }: { puesto: NonNullable<ReturnType<typeof usePuestoModalStore.getState>['puesto']> }) {
  return (
    <div className="civ-card" style={{ padding: 0 }}>
      <div
        className="civ-eyebrow"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--civ-border)',
        }}
      >
        Ubicación
      </div>
      <dl style={{ padding: '4px 0' }}>
        <Row k="Departamento" v={puesto.departamento} />
        <Row k="Municipio" v={puesto.municipio} />
        {puesto.comuna && <Row k="Comuna" v={puesto.comuna} />}
        <Row k="Código" v={puesto.codigo_puesto} />
        <Row k="Coordenadas" v={`${puesto.latitud.toFixed(4)}, ${puesto.longitud.toFixed(4)}`} />
      </dl>
    </div>
  );
}

function PersonalCard({
  loading,
  personal,
}: {
  loading: boolean;
  personal: { jurados: PersonaResumen[]; testigos: PersonaResumen[] } | null;
}) {
  return (
    <div className="civ-card" style={{ padding: 0 }}>
      <div
        className="civ-eyebrow"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--civ-border)' }}
      >
        Personal asignado
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading && <div style={{ padding: 16, fontSize: 13, color: 'var(--civ-text-muted)' }}>Cargando…</div>}
        {!loading && personal && (
          <PersonalSection jurados={personal.jurados} testigos={personal.testigos} />
        )}
        {!loading && !personal && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--civ-text-muted)' }}>
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultadosCardProps {
  loading: boolean;
  resultados: ResultadosElectorales | null;
  top3Partidos: ResultadosPartido[];
  totalValidos: number;
  partidos: ResultadosPartido[];
  partidoFiltro: string;
  setPartidoFiltro: (v: string) => void;
  partidoSeleccionado: ResultadosPartido | null;
  anio: number;
  corporacionNombre: string;
}

function ResultadosCard({
  loading,
  resultados,
  top3Partidos,
  totalValidos,
  partidos,
  partidoFiltro,
  setPartidoFiltro,
  partidoSeleccionado,
  anio,
  corporacionNombre,
}: ResultadosCardProps) {
  const heading = corporacionNombre ? `${corporacionNombre} · ${anio}` : `Resultados ${anio}`;

  return (
    <div className="civ-card flex flex-col" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--civ-border)',
        }}
      >
        <div className="civ-eyebrow">Resultados en este puesto</div>
        <div
          className="truncate"
          style={{
            marginTop: 2,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--civ-text)',
          }}
        >
          {heading}
        </div>
      </div>

      {/* Filtro de partido */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--civ-border)',
          background: 'var(--civ-bg)',
        }}
      >
        <label className="civ-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
          Filtrar por partido
        </label>
        <select
          value={partidoFiltro}
          onChange={(e) => setPartidoFiltro(e.target.value)}
          disabled={loading || partidos.length === 0}
          style={{
            width: '100%',
            height: 36,
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
          <option value="">Top 3 partidos · Top 3 candidatos</option>
          {partidos.map((p) => (
            <option key={p.partido_codigo} value={p.partido_codigo}>
              {p.partido_nombre || p.partido_codigo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        {loading && (
          <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', padding: 16, textAlign: 'center' }}>
            Cargando resultados…
          </div>
        )}

        {!loading && !resultados && (
          <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', padding: 16, textAlign: 'center' }}>
            Sin datos electorales para este puesto.
          </div>
        )}

        {!loading && resultados && resultados.partidos.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', padding: 16, textAlign: 'center' }}>
            Sin partidos registrados en este puesto.
          </div>
        )}

        {!loading && resultados && partidoSeleccionado && (
          <PartidoDetalle
            partido={partidoSeleccionado}
            totalValidos={totalValidos}
          />
        )}

        {!loading && resultados && !partidoSeleccionado && top3Partidos.length > 0 && (
          <Top3PartidosList partidos={top3Partidos} totalValidos={totalValidos} />
        )}
      </div>

      {!loading && resultados && (
        <div
          className="grid grid-cols-3"
          style={{
            gap: 8,
            padding: 14,
            borderTop: '1px solid var(--civ-border)',
            background: 'var(--civ-bg)',
          }}
        >
          <Stat label="Válidos" value={fmt(resultados.votos_validos)} />
          <Stat label="Blancos" value={fmt(resultados.votos_blancos)} />
          <Stat label="Nulos" value={fmt(resultados.votos_nulos)} />
        </div>
      )}
    </div>
  );
}

function Top3PartidosList({ partidos, totalValidos }: { partidos: ResultadosPartido[]; totalValidos: number }) {
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {partidos.map((p, i) => {
        const pct = totalValidos > 0 ? (p.partido_votos / totalValidos) * 100 : 0;
        const candidatos = p.top5_candidatos.slice().sort((a, b) => b.votos - a.votos).slice(0, 3);
        return (
          <div
            key={p.partido_codigo}
            style={{
              border: '1px solid var(--civ-border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                padding: '10px 12px',
                background: i === 0 ? 'var(--civ-primary-soft)' : 'var(--civ-bg)',
              }}
            >
              <RankBadge rank={i + 1} highlight={i === 0} />
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--civ-text)' }}>
                  {p.partido_nombre || '—'}
                </div>
                <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}>
                  {fmt(p.partido_votos)} votos
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: i === 0 ? 'var(--civ-primary)' : 'var(--civ-text)',
                  }}
                >
                  {fmtPct(pct, 1)}
                </div>
              </div>
            </div>

            {candidatos.length > 0 && (
              <div style={{ padding: '10px 12px' }}>
                <div className="civ-eyebrow" style={{ marginBottom: 6 }}>Top 3 candidatos</div>
                <div className="flex flex-col" style={{ gap: 4 }}>
                  {candidatos.map((c) => (
                    <CandidatoRow
                      key={c.codigo}
                      nombre={c.nombre || '—'}
                      votos={c.votos}
                      pct={totalValidos > 0 ? (c.votos / totalValidos) * 100 : 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PartidoDetalle({ partido, totalValidos }: { partido: ResultadosPartido; totalValidos: number }) {
  const pct = totalValidos > 0 ? (partido.partido_votos / totalValidos) * 100 : 0;
  const candidatos = partido.top5_candidatos.slice().sort((a, b) => b.votos - a.votos);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
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
          <div className="civ-eyebrow">Partido seleccionado</div>
          <div className="truncate" style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: 'var(--civ-text)' }}>
            {partido.partido_nombre || '—'}
          </div>
          <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--civ-text-muted)', marginTop: 2 }}>
            {fmt(partido.partido_votos)} votos · {candidatos.length} candidato{candidatos.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--civ-primary)' }}>
            {fmtPct(pct, 1)}
          </div>
        </div>
      </div>

      <div>
        <div className="civ-eyebrow" style={{ marginBottom: 8 }}>
          Candidatos del partido en este puesto
        </div>
        {candidatos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--civ-text-muted)', padding: 12, textAlign: 'center' }}>
            Sin candidatos registrados.
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {candidatos.map((c) => (
              <CandidatoRow
                key={c.codigo}
                nombre={c.nombre || '—'}
                votos={c.votos}
                pct={totalValidos > 0 ? (c.votos / totalValidos) * 100 : 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CandidatoRow({ nombre, votos, pct }: { nombre: string; votos: number; pct: number }) {
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto auto', gap: 10 }}>
      <div className="min-w-0">
        <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--civ-text)' }}>
          {nombre}
        </div>
        <div
          className="relative overflow-hidden"
          style={{ height: 4, marginTop: 4, background: 'var(--civ-bg)', borderRadius: 99 }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, pct)}%`,
              background: 'var(--civ-primary)',
              borderRadius: 99,
            }}
          />
        </div>
      </div>
      <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--civ-text-muted)', minWidth: 60, textAlign: 'right' }}>
        {fmt(votos)}
      </div>
      <div className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: 'var(--civ-text)', minWidth: 48, textAlign: 'right' }}>
        {fmtPct(pct, 1)}
      </div>
    </div>
  );
}

function RankBadge({ rank, highlight }: { rank: number; highlight?: boolean }) {
  return (
    <div
      className="grid place-items-center tabular-nums"
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: highlight ? 'var(--civ-primary)' : '#fff',
        color: highlight ? '#fff' : 'var(--civ-text)',
        border: '1px solid var(--civ-border)',
      }}
    >
      {rank}
    </div>
  );
}

function ContextHelpCard({ modulo }: { modulo: string }) {
  const msg =
    modulo === 'puestos'
      ? 'Cambia el Tipo de Elección a una opción de Resultados (Senado, Cámara, Presidencial, Territoriales) para ver los votos en este puesto.'
      : 'Cambia el Tipo de Elección a una opción de Resultados para ver los votos en este puesto.';
  return (
    <div
      className="civ-card flex flex-col items-center justify-center text-center"
      style={{ padding: 24, gap: 8, minHeight: 220 }}
    >
      <div
        className="grid place-items-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--civ-primary-soft)',
          color: 'var(--civ-primary)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--civ-text)' }}>Resultados no disponibles</h4>
      <p style={{ fontSize: 12, color: 'var(--civ-text-muted)', lineHeight: 1.5, maxWidth: 280 }}>
        {msg}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 8px',
        borderRadius: 8,
        background: '#fff',
        border: '1px solid var(--civ-border)',
        textAlign: 'center',
      }}
    >
      <div
        className="tabular-nums"
        style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--civ-text)' }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--civ-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3"
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--civ-border)',
      }}
    >
      <dt
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
          color: 'var(--civ-text-muted)',
        }}
      >
        {k}
      </dt>
      <dd
        className="truncate"
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--civ-text)' }}
      >
        {v}
      </dd>
    </div>
  );
}

function PersonalSection({ jurados, testigos }: { jurados: PersonaResumen[]; testigos: PersonaResumen[] }) {
  return (
    <div className="text-sm">
      <div
        style={{
          padding: '8px 16px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--civ-primary)',
          background: 'var(--civ-primary-soft)',
          borderBottom: '1px solid var(--civ-border)',
        }}
      >
        Jurados ({jurados.length})
      </div>
      {jurados.length === 0 && (
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--civ-text-muted)' }}>
          Sin jurados asignados
        </div>
      )}
      {jurados.map((p) => <PersonaItem key={'j-' + p.cedula} p={p} />)}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#047857',
          background: '#ecfdf5',
          borderBottom: '1px solid var(--civ-border)',
          borderTop: '1px solid var(--civ-border)',
        }}
      >
        Testigos ({testigos.length})
      </div>
      {testigos.length === 0 && (
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--civ-text-muted)' }}>
          Sin testigos asignados
        </div>
      )}
      {testigos.map((p) => <PersonaItem key={'t-' + p.cedula} p={p} />)}
    </div>
  );
}

function PersonaItem({ p }: { p: PersonaResumen }) {
  const nombre = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');
  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--civ-border)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--civ-text)' }}>{nombre}</div>
      <div style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}>CC {p.cedula}</div>
    </div>
  );
}
