import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import type { ResultadosElectorales, TerritorioStats, PersonalEstado } from '../../api/client';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

const fmt = (n: number) => n.toLocaleString('es-CO');
const fmtPct = (n: number, d = 1) => `${n.toFixed(d)}%`;

/** Abbreviate large numbers for compact displays (donut center, etc.). */
function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: JSX.Element;
}
function KpiCard({ label, value, hint, icon }: KpiCardProps) {
  return (
    <div className="civ-card flex items-center" style={{ padding: 16, gap: 14 }}>
      <div
        className="grid shrink-0 place-items-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--civ-primary-soft)',
          color: 'var(--civ-primary)',
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 12, color: 'var(--civ-text-muted)', fontWeight: 500 }}>{label}</div>
        <div
          className="truncate tabular-nums"
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2, color: 'var(--civ-text)' }}
        >
          {value}
        </div>
        {hint && <div style={{ fontSize: 11, color: 'var(--civ-text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

/* Icons for KPI cards */
function IconVotes() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" /><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.97 0 3.79.63 5.27 1.7" />
    </svg>
  );
}
function IconFlag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function IconBlank() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}
function IconNull() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 22V12h6v10" /><path d="M3 9h18" />
    </svg>
  );
}
function IconTable() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconUsersGroup() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function DashboardView() {
  const { modulo } = useUIFiltersStore();
  return (
    <div className="h-full w-full overflow-auto">
      {modulo === 'resultados' && <ResultadosDashboard />}
      {modulo === 'puestos' && <PuestosDashboard />}
      {modulo === 'jurados-testigos' && <JuradosDashboard />}
    </div>
  );
}

/* ──────────────────── Resultados ──────────────────── */

function ResultadosDashboard() {
  const { anio, corporacion, candidatoFiltro } = useUIFiltersStore();
  const [paisRes, setPaisRes] = useState<ResultadosElectorales | null>(null);
  const [byDepto, setByDepto] = useState<Map<string, ResultadosElectorales>>(new Map());
  const [departamentos, setDepartamentos] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPaisRes(null);
    setByDepto(new Map());
    (async () => {
      try {
        const [pais, catalog] = await Promise.all([
          api.getResultadosElectorales('pais', 'CO', corporacion, anio),
          api.getDepartamentosCatalog(),
        ]);
        if (cancelled) return;
        setPaisRes(pais);
        const depList = catalog.map((c) => ({ code: c.code, name: c.name }));
        setDepartamentos(depList);

        const results = await Promise.all(
          depList.map(async (d) => {
            try {
              const r = await api.getResultadosElectorales('departamento', d.code, corporacion, anio);
              return [d.code, r] as const;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const map = new Map<string, ResultadosElectorales>();
        for (const item of results) if (item) map.set(item[0], item[1]);
        setByDepto(map);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [anio, corporacion]);

  const top10 = useMemo(() => {
    if (departamentos.length === 0) return [];
    const items = departamentos.map((d) => {
      const r = byDepto.get(d.code);
      let votos = r?.votos_validos ?? 0;
      if (r && candidatoFiltro) {
        for (const p of r.partidos) {
          const c = p.top5_candidatos.find((c) => c.codigo === candidatoFiltro);
          if (c) { votos = c.votos; break; }
        }
      }
      return { code: d.code, name: d.name, votos };
    });
    return items.sort((a, b) => b.votos - a.votos).slice(0, 10);
  }, [byDepto, departamentos, candidatoFiltro]);

  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';

  const distribSegments = useMemo(() => {
    if (!paisRes) return [];
    const total = paisRes.partidos.reduce((s, p) => s + p.partido_votos, 0);
    if (isPresidencial) {
      // Each partido has 1 candidato in presidenciales; show candidatos
      const cands = paisRes.partidos.flatMap((p) =>
        p.top5_candidatos.map((c) => ({
          id: c.codigo || `${p.partido_codigo}-${c.nombre}`,
          nombre: c.nombre || p.partido_nombre || '—',
          votos: c.votos,
          pct: total > 0 ? (c.votos / total) * 100 : 0,
        })),
      );
      return cands
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 8)
        .map((c, i) => ({ ...c, color: PARTY_COLORS[i % PARTY_COLORS.length] }));
    }
    return paisRes.partidos
      .slice()
      .sort((a, b) => b.partido_votos - a.partido_votos)
      .slice(0, 8)
      .map((p, i) => ({
        id: p.partido_codigo || `partido-${i}`,
        nombre: p.partido_nombre || '—',
        votos: p.partido_votos,
        pct: total > 0 ? (p.partido_votos / total) * 100 : 0,
        color: PARTY_COLORS[i % PARTY_COLORS.length],
      }));
  }, [paisRes, isPresidencial]);

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<IconVotes />}
          label="Votos válidos"
          value={paisRes ? fmt(paisRes.votos_validos) : (loading ? '…' : '—')}
        />
        <KpiCard
          icon={<IconFlag />}
          label="Departamentos"
          value={departamentos.length > 0 ? String(departamentos.length) : (loading ? '…' : '—')}
        />
        <KpiCard
          icon={<IconBlank />}
          label="Votos en blanco"
          value={paisRes ? fmt(paisRes.votos_blancos) : (loading ? '…' : '—')}
        />
        <KpiCard
          icon={<IconNull />}
          label="Votos nulos"
          value={paisRes ? fmt(paisRes.votos_nulos) : (loading ? '…' : '—')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="civ-card" style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <div className="civ-eyebrow">Análisis</div>
            <h3 className="civ-card-title" style={{ marginTop: 4 }}>
              Top 10 departamentos {candidatoFiltro ? '· candidato seleccionado' : '· votos válidos'}
            </h3>
          </div>
          {loading && top10.length === 0 && <div className="py-8 text-center" style={{ color: 'var(--civ-text-muted)' }}>Cargando…</div>}
          {top10.length > 0 && <Top10Bars items={top10} />}
        </div>

        <div className="civ-card" style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <div className="civ-eyebrow">Distribución</div>
            <h3 className="civ-card-title" style={{ marginTop: 4 }}>{isPresidencial ? 'Por candidato (nacional)' : 'Por partido (nacional)'}</h3>
          </div>
          {!paisRes && <div className="py-8 text-center" style={{ color: 'var(--civ-text-muted)' }}>{loading ? 'Cargando…' : '—'}</div>}
          {paisRes && <Donut segments={distribSegments} totalLabel={fmtShort(paisRes.votos_validos)} />}
        </div>
      </div>
    </div>
  );
}

const PARTY_COLORS = ['#1D4E89', '#D62828', '#F77F00', '#06A77D', '#7B2CBF', '#0EA5E9', '#A16207', '#64748B'];

function Top10Bars({ items }: { items: { code: string; name: string; votos: number }[] }) {
  const max = Math.max(1, ...items.map((d) => d.votos));
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {items.map((d, i) => {
        const pct = (d.votos / max) * 100;
        return (
          <div key={d.code} className="flex items-center gap-2 text-sm">
            <div
              className="w-6 shrink-0 text-right tabular-nums"
              style={{ fontSize: 11, color: 'var(--civ-text-muted)', fontWeight: 600 }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div
              className="w-20 shrink-0 truncate sm:w-28 lg:w-32"
              style={{ fontSize: 12, color: 'var(--civ-text)', fontWeight: 600 }}
            >
              {d.name}
            </div>
            <div
              className="relative flex-1 overflow-hidden"
              style={{ height: 8, borderRadius: 99, background: 'var(--civ-bg)' }}
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
              className="w-16 shrink-0 text-right tabular-nums sm:w-24"
              style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}
            >
              {fmt(d.votos)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DonutSegment { id: string; nombre: string; votos: number; pct: number; color: string }
function Donut({ segments, totalLabel }: { segments: DonutSegment[]; totalLabel: string }) {
  const size = 220;
  const r = size / 2 - 18;
  const innerR = r - 58;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, d) => s + d.pct, 0) || 1;
  let acc = 0;
  const paths = segments.map((d) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.pct;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`, color: d.color };
  });
  // Auto-shrink the centered label so long numbers (e.g. "10.5M" or "1,234,567")
  // never spill outside the inner hole. Diameter of inner hole = innerR*2.
  // Approx char width ≈ fontSize * 0.6; cap fontSize by available width.
  const maxFontSize = Math.min(22, Math.floor((innerR * 2 * 0.85) / Math.max(1, totalLabel.length * 0.6)));
  const labelFontSize = Math.max(12, maxFontSize);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />)}
        <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: labelFontSize, fontWeight: 700, letterSpacing: '-0.02em', fill: 'var(--civ-text)' }}
        >
          {totalLabel}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--civ-text-muted)' }}>
          votos válidos
        </text>
      </svg>
      <ul
        className="w-full min-w-0 flex-1 text-sm sm:w-auto"
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {segments.map((d) => (
          <li key={d.id} className="flex min-w-0 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span
              className="min-w-0 flex-1 truncate"
              style={{ fontSize: 12, color: 'var(--civ-text)' }}
            >
              {d.nombre}
            </span>
            <span className="shrink-0 tabular-nums" style={{ fontSize: 11, color: 'var(--civ-text-muted)' }}>
              {fmtPct(d.pct, 2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ──────────────────── Puestos ──────────────────── */

function PuestosDashboard() {
  const [stats, setStats] = useState<TerritorioStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAnalyticsTerritorio('pais', 'CO')
      .then((s) => { if (!cancelled) { setStats(s); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e?.message ?? 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-2">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={<IconBuilding />} label="Puestos electorales" value={stats ? fmt(stats.puestos_count) : (loading ? '…' : '—')} />
        <KpiCard icon={<IconTable />} label="Mesas" value={stats ? fmt(stats.mesas_sum) : (loading ? '…' : '—')} />
        <KpiCard icon={<IconUsers />} label="Potencial total" value={stats ? fmt(stats.total_sum) : (loading ? '…' : '—')} />
        <KpiCard
          icon={<IconUsersGroup />}
          label="Composición"
          value={stats ? `${fmtShort(stats.mujeres_sum)} / ${fmtShort(stats.hombres_sum)}` : (loading ? '…' : '—')}
          hint="Mujeres / Hombres"
        />
      </div>
    </div>
  );
}

/* ──────────────────── Jurados ──────────────────── */

function JuradosDashboard() {
  const [estado, setEstado] = useState<PersonalEstado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPersonalEstado()
      .then((e) => { if (!cancelled) { setEstado(e); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e?.message ?? 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-2">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <KpiCard icon={<IconUsers />} label="Jurados registrados" value={estado ? fmt(estado.jurados) : (loading ? '…' : '—')} />
        <KpiCard icon={<IconShield />} label="Testigos registrados" value={estado ? fmt(estado.testigos) : (loading ? '…' : '—')} />
      </div>
    </div>
  );
}
