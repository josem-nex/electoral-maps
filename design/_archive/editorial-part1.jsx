/* Variante B — "Editorial": layout audaz, mapa protagonista, tipografía mixta. */

const E = {};

E.fmt = (n) => n.toLocaleString('es-CO');
E.fmtPct = (n, d = 1) => `${n.toFixed(d)}%`;
E.candidatoById = (id) => window.CANDIDATOS.find(c => c.id === id);

/* ICONS */
E.IconArrow = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>);
E.IconChev = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>);
E.IconSearch = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
E.IconClose = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
E.IconDown = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
E.IconPin = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>);

/* ============ TOPBAR ============ */
E.Topbar = function({ tab, setTab }) {
  return (
    <header className="ed-topbar">
      <div className="ed-brand">
        <div className="ed-brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 12h20M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <div className="ed-brand-text">
          <div className="ed-brand-name">Atlas</div>
          <div className="ed-brand-sub">Resultados Electorales · Colombia</div>
        </div>
      </div>

      <nav className="ed-nav">
        {[
          ['dashboard', 'Resumen'],
          ['mapa', 'Mapa'],
          ['reportes', 'Reportes'],
          ['comparador', 'Comparador'],
        ].map(([id, label]) => (
          <button key={id} type="button"
            className={`ed-nav-item ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <div className="ed-topbar-right">
        <button type="button" className="ed-search-btn"><E.IconSearch/> Buscar…<kbd>⌘K</kbd></button>
        <div className="ed-avatar">JM</div>
      </div>
    </header>
  );
};

/* ============ FILTERS DRAWER (sticky bar) ============ */
E.Filters = function({ state, set }) {
  const cand = E.candidatoById(state.candidato);
  return (
    <div className="ed-filters">
      <div className="ed-filter">
        <label>Candidato</label>
        <div className="ed-select" style={{borderColor: cand.color+'66'}}>
          <span className="ed-dot" style={{background: cand.color}}/>
          <select value={state.candidato} onChange={(e)=>set({candidato:e.target.value})}>
            {window.CANDIDATOS.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
          </select>
          <E.IconChev/>
        </div>
      </div>
      <div className="ed-filter">
        <label>Elección</label>
        <div className="ed-select">
          <select value={state.eleccion} onChange={(e)=>set({eleccion:e.target.value})}>
            {window.AÑOS.map(a => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
          <E.IconChev/>
        </div>
      </div>
      <div className="ed-filter">
        <label>Nivel</label>
        <div className="ed-select">
          <select value={state.nivel} onChange={(e)=>set({nivel:e.target.value})}>
            {window.NIVELES.map(n => (<option key={n.id} value={n.id}>{n.label}</option>))}
          </select>
          <E.IconChev/>
        </div>
      </div>
      <div className="ed-filter ed-filter-grow">
        <label>Buscar</label>
        <div className="ed-search">
          <E.IconSearch/>
          <input placeholder="Departamento, municipio o puesto…" value={state.q} onChange={(e)=>set({q:e.target.value})}/>
        </div>
      </div>
      <div className="ed-filter-actions">
        <button type="button" className="ed-btn ed-btn-ghost"><E.IconDown/>CSV</button>
        <button type="button" className="ed-btn ed-btn-primary">Aplicar filtros</button>
      </div>
    </div>
  );
};

/* ============ CHOROPLETH ============ */
E.Map = function({ candidato, selectedCode, onSelect, height = 600, dark = false }) {
  const cand = E.candidatoById(candidato);
  const getPct = (code) => {
    const dep = window.DEPARTAMENTOS.find(d => d.code === code);
    if (!dep) return 0;
    const isWinner = dep.ganador === candidato;
    let base = isWinner ? 0.5 : 0.16;
    const noise = ((parseInt(code,10) * 13 + candidato.length) % 17) / 100;
    return Math.min(0.78, base + noise);
  };
  const intensity = (pct) => {
    const c = cand.color;
    const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    const t = 1 - pct;
    const baseR = dark ? 24 : 255, baseG = dark ? 26 : 255, baseB = dark ? 32 : 255;
    const mix = (x, base) => Math.round(x + (base - x) * t);
    return `rgb(${mix(r,baseR)}, ${mix(g,baseG)}, ${mix(b,baseB)})`;
  };

  return (
    <div className={`ed-map ${dark ? 'is-dark' : ''}`} style={{height}}>
      <svg viewBox={window.COLOMBIA_MAP.viewBox} className="ed-map-svg" preserveAspectRatio="xMidYMid meet">
        {window.COLOMBIA_MAP.departments.map(dep => {
          const pct = getPct(dep.code);
          const fill = intensity(pct);
          const isSel = selectedCode === dep.code;
          return (
            <path
              key={dep.code}
              d={dep.d}
              fill={fill}
              stroke={isSel ? (dark ? '#fff' : '#0f172a') : (dark ? '#0b0c10' : '#fff')}
              strokeWidth={isSel ? 2.5 : 0.8}
              className="ed-dep"
              onClick={() => onSelect && onSelect(dep.code)}
            >
              <title>{dep.name} — {E.fmtPct(pct*100, 1)}</title>
            </path>
          );
        })}
      </svg>

      <div className="ed-map-overlay-tl">
        <div className="ed-overlay-eye">Ganador por departamento</div>
        <div className="ed-overlay-name">{cand.nombre}</div>
        <div className="ed-overlay-meta">{cand.partido}</div>
      </div>

      <div className="ed-map-legend">
        {[0.15, 0.32, 0.5, 0.7].map((v,i) => (
          <div key={i} className="ed-legend-item">
            <span className="ed-legend-sw" style={{background: intensity(v)}}/>
            <span>{Math.round(v*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

window.Editorial = E;
