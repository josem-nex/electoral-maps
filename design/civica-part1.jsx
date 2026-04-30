/* Variante A — "Cívica": dashboard institucional refinado.
   Paleta azul + acentos por partido. Tabs arriba, filtros en barra. */

const { useState, useMemo, useEffect, useRef } = React;

/* =========================================================================
   Helpers & shared atoms
========================================================================= */
const fmt = (n) => n.toLocaleString('es-CO');
const fmtPct = (n, d = 1) => `${n.toFixed(d)}%`;

const candidatoById = (id) => window.CANDIDATOS.find(c => c.id === id);

function Tab({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`civica-tab ${active ? 'is-active' : ''}`}
      type="button"
    >
      <span className="civica-tab-icon">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function Pill({ tone = 'neutral', children }) {
  return <span className={`civica-pill is-${tone}`}>{children}</span>;
}

function Card({ children, className = '', ...rest }) {
  return <div className={`civica-card ${className}`} {...rest}>{children}</div>;
}

function IconUsers() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
}
function IconFlag() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>);
}
function IconBuilding() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 22V12h6v10"/><path d="M3 9h18"/></svg>);
}
function IconTrend() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>);
}
function IconMap() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>);
}
function IconDash() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>);
}
function IconReport() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></svg>);
}
function IconCompare() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M4 20l16-16"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>);
}
function IconSearch() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
}
function IconArrow() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>);
}
function IconChev() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>);
}
function IconDownload() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
}
function IconRefresh() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>);
}
function IconClose() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
}
function IconLayers() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>);
}

/* =========================================================================
   Topbar — brand, breadcrumbs, user
========================================================================= */
function Topbar() {
  return (
    <header className="civica-topbar">
      <div className="civica-brand">
        <div className="civica-brand-logo" aria-hidden="true" style={{width:'88px',height:'56px',minWidth:'88px',maxWidth:'88px',minHeight:'56px',maxHeight:'56px',borderRadius:'10px',background:'#0c1a23',display:'grid',placeItems:'center',padding:'6px 10px',boxShadow:'0 2px 10px rgba(12,26,35,0.2)',flexShrink:0,boxSizing:'border-box',overflow:'hidden'}}>
          <img src="assets/eday-tech-logo.png" alt="E Day Tech" style={{maxWidth:'100%',maxHeight:'100%',width:'auto',height:'auto',objectFit:'contain',display:'block'}}/>
        </div>
        <div className="civica-brand-divider" aria-hidden="true"/>
        <div className="civica-brand-text">
          <div className="civica-brand-title">
            Resultados Electorales
            <span className="civica-flag" aria-label="Colombia" title="Colombia">
              <span style={{background:'#FCD116'}}/>
              <span style={{background:'#003893'}}/>
              <span style={{background:'#CE1126'}}/>
            </span>
          </div>
          <div className="civica-brand-sub">Colombia · Visualización por departamento, municipio y puesto</div>
        </div>
      </div>

      <div className="civica-userchip">
        <div className="civica-avatar">JM</div>
        <div className="civica-user-meta">
          <div className="civica-user-name">josem-nex</div>
          <div className="civica-user-role">Coordinador</div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   Filter Bar
========================================================================= */
function FilterBar({ state, set }) {
  return (
    <div className="civica-filterbar">
      <div className="civica-field">
        <label>Candidato / Partido</label>
        <div className="civica-select">
          <span className="civica-select-dot" style={{background: candidatoById(state.candidato).color}}/>
          <select value={state.candidato} onChange={(e) => set({candidato: e.target.value})}>
            {window.CANDIDATOS.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} — {c.siglas}</option>
            ))}
          </select>
          <IconChev/>
        </div>
      </div>

      <div className="civica-field">
        <label>Nivel</label>
        <div className="civica-select">
          <select value={state.nivel} onChange={(e) => set({nivel: e.target.value})}>
            {window.NIVELES.map(n => (<option key={n.id} value={n.id}>{n.label}</option>))}
          </select>
          <IconChev/>
        </div>
      </div>

      <div className="civica-field">
        <label>Tipo de Elección</label>
        <div className="civica-select">
          <select value={state.eleccion} onChange={(e) => set({eleccion: e.target.value})}>
            {window.AÑOS.map(a => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
          <IconChev/>
        </div>
      </div>

      <div className="civica-field civica-field-grow">
        <label>Buscar</label>
        <div className="civica-search">
          <IconSearch/>
          <input
            placeholder="Departamento, municipio, puesto…"
            value={state.q}
            onChange={(e) => set({q: e.target.value})}
          />
        </div>
      </div>

      <div className="civica-field civica-field-actions">
        <button className="civica-btn is-primary" type="button"><IconRefresh/>Actualizar</button>
        <button className="civica-btn is-ghost" type="button"><IconDownload/>Exportar CSV</button>
      </div>
    </div>
  );
}

/* =========================================================================
   KPI cards
========================================================================= */
function KpiCard({ icon, label, value, delta }) {
  return (
    <Card className="civica-kpi">
      <div className="civica-kpi-icon">{icon}</div>
      <div className="civica-kpi-body">
        <div className="civica-kpi-label">{label}</div>
        <div className="civica-kpi-value">{value}</div>
        {delta && <div className="civica-kpi-delta">{delta}</div>}
      </div>
    </Card>
  );
}

/* =========================================================================
   Bar chart — Top 10 by votes
========================================================================= */
function Top10Bars({ candidato }) {
  const data = window.TOP10;
  const max = Math.max(...data.map(d => d.votos));
  const color = candidatoById(candidato).color;
  return (
    <div className="civica-bars">
      {data.map((d, i) => {
        const pct = (d.votos / max) * 100;
        return (
          <div className="civica-bar-row" key={d.code}>
            <div className="civica-bar-rank">{String(i+1).padStart(2,'0')}</div>
            <div className="civica-bar-name">{d.name}</div>
            <div className="civica-bar-track">
              <div className="civica-bar-fill" style={{width: `${pct}%`, background: color}}/>
            </div>
            <div className="civica-bar-val">{fmt(d.votos)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   Donut — distribución por partido
========================================================================= */
function Donut({ size = 220 }) {
  const data = window.PARTIDOS_DIST;
  const total = data.reduce((s,d) => s+d.pct, 0);
  let acc = 0;
  const r = size/2 - 18;
  const cx = size/2, cy = size/2;
  const segs = data.map((d) => {
    const a0 = (acc/total) * Math.PI*2 - Math.PI/2;
    acc += d.pct;
    const a1 = (acc/total) * Math.PI*2 - Math.PI/2;
    const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`, color: d.color, id: d.id, pct: d.pct };
  });
  return (
    <div className="civica-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map(s => (<path key={s.id} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2"/>))}
        <circle cx={cx} cy={cy} r={r-58} fill="#fff"/>
        <text x={cx} y={cy-6} textAnchor="middle" className="civica-donut-num">21.6M</text>
        <text x={cx} y={cy+14} textAnchor="middle" className="civica-donut-lbl">votos válidos</text>
      </svg>
      <ul className="civica-donut-legend">
        {data.map(d => {
          const c = candidatoById(d.id);
          const name = c ? c.nombre.split(' ').slice(-1)[0] : 'Otros';
          return (
            <li key={d.id}>
              <span className="civica-legend-sw" style={{background:d.color}}/>
              <span className="civica-legend-name">{name}</span>
              <span className="civica-legend-pct">{fmtPct(d.pct, 2)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* =========================================================================
   Choropleth Map (SVG)
========================================================================= */
function ChoroplethMap({ candidato, selectedCode, onSelect, height = 540 }) {
  const cand = candidatoById(candidato);
  // For each department, color intensity = pct of vote for selected candidate.
  // We synthesize a stable pseudo pct from code+candidate.
  const getPct = (code) => {
    const dep = window.DEPARTAMENTOS.find(d => d.code === code);
    if (!dep) return 0;
    const isWinner = dep.ganador === candidato;
    let base = isWinner ? 0.45 : 0.18;
    const noise = ((parseInt(code,10) * 13 + candidato.length) % 17) / 100;
    return Math.min(0.7, base + noise);
  };

  const intensityToColor = (pct) => {
    // Mix base color with white based on intensity
    const c = cand.color;
    const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    const t = 1 - pct; // higher pct = more saturated
    const mix = (x) => Math.round(x + (255 - x) * t);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  };

  return (
    <div className="civica-map-wrap" style={{height}}>
      <svg viewBox={window.COLOMBIA_MAP.viewBox} className="civica-map-svg" preserveAspectRatio="xMidYMid meet">
        {window.COLOMBIA_MAP.departments.map(dep => {
          const pct = getPct(dep.code);
          const fill = intensityToColor(pct);
          const isSel = selectedCode === dep.code;
          return (
            <path
              key={dep.code}
              d={dep.d}
              fill={fill}
              stroke={isSel ? '#0f172a' : '#ffffff'}
              strokeWidth={isSel ? 2.5 : 1}
              className="civica-dep"
              onClick={() => onSelect && onSelect(dep.code)}
            >
              <title>{dep.name} — {fmtPct(pct*100, 1)}</title>
            </path>
          );
        })}
      </svg>

      <div className="civica-map-legend">
        <div className="civica-legend-title">% para {cand.nombre.split(' ')[1] || cand.nombre}</div>
        <div className="civica-legend-scale">
          {[0.1,0.25,0.4,0.55,0.7].map((v,i) => (
            <div key={i} className="civica-legend-bin">
              <span className="civica-legend-sw" style={{background: intensityToColor(v)}}/>
              <span>{Math.round(v*100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="civica-map-controls">
        <button type="button" className="civica-mapbtn"><IconLayers/></button>
        <button type="button" className="civica-mapbtn">+</button>
        <button type="button" className="civica-mapbtn">−</button>
      </div>
    </div>
  );
}

/* Continued in part 2 */
window.CivicaPart1 = {
  Topbar, FilterBar, Tab, KpiCard, Top10Bars, Donut, ChoroplethMap, Card, Pill,
  IconUsers, IconFlag, IconBuilding, IconTrend, IconMap, IconDash, IconReport,
  IconCompare, IconArrow, IconChev, IconDownload, IconClose,
  candidatoById, fmt, fmtPct,
};
