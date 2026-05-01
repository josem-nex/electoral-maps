/* Variante B — part 2: Tabs (Resumen, Mapa, Reportes, Comparador) + modals */

const E2 = window.Editorial;

/* ============ DASHBOARD / RESUMEN ============ */
E2.Resumen = function({ filters, onSelectDept }) {
  const cand = E2.candidatoById(filters.candidato);
  return (
    <div className="ed-stack">
      {/* HERO HEADLINE */}
      <section className="ed-hero">
        <div>
          <div className="ed-eyebrow">Presidencial · 1ra vuelta · 2022</div>
          <h1 className="ed-headline">
            <span style={{color: cand.color}}>{cand.nombre.split(' ')[0]} {cand.nombre.split(' ')[1]}</span> lidera<br/>
            con <span className="ed-headline-num">40,32%</span> del voto nacional.
          </h1>
          <p className="ed-lede">8.527.768 votos sobre 21,6M válidos. Ganó en 25 de los 33 departamentos del país, con mayor concentración en la Costa Caribe y Bogotá.</p>
        </div>
        <div className="ed-hero-meta">
          <div className="ed-meta-row"><span>Mesas reportadas</span><strong>112.150 / 112.150</strong></div>
          <div className="ed-meta-row"><span>Última actualización</span><strong>19 jun · 22:48</strong></div>
          <div className="ed-meta-row"><span>Estado</span><strong className="ed-meta-ok">100% computado</strong></div>
        </div>
      </section>

      {/* BIG NUMBERS */}
      <section className="ed-bignums">
        <div><div className="ed-bignum">{E2.fmt(window.KPIS.totalVotos)}</div><div className="ed-biglbl">Votos válidos</div></div>
        <div><div className="ed-bignum">{window.KPIS.departamentos}</div><div className="ed-biglbl">Departamentos</div></div>
        <div><div className="ed-bignum">{E2.fmt(window.KPIS.municipios)}</div><div className="ed-biglbl">Municipios</div></div>
        <div><div className="ed-bignum">{E2.fmt(window.KPIS.puestos)}</div><div className="ed-biglbl">Puestos</div></div>
        <div><div className="ed-bignum">{E2.fmtPct(window.KPIS.participacion)}</div><div className="ed-biglbl">Participación</div></div>
      </section>

      {/* MAP + RANKING */}
      <section className="ed-grid-map-rank">
        <div className="ed-block">
          <div className="ed-block-head">
            <div>
              <div className="ed-eyebrow">Mapa</div>
              <h2 className="ed-block-title">Resultado territorial</h2>
            </div>
            <a className="ed-tlink">Ver mapa completo <E2.IconArrow/></a>
          </div>
          <E2.Map candidato={filters.candidato} height={460} onSelect={onSelectDept}/>
        </div>
        <div className="ed-block">
          <div className="ed-block-head">
            <div>
              <div className="ed-eyebrow">Top 10</div>
              <h2 className="ed-block-title">Departamentos por votos</h2>
            </div>
          </div>
          <ol className="ed-rank">
            {window.TOP10.map((d,i) => {
              const c = E2.candidatoById(d.ganador);
              const max = window.TOP10[0].votos;
              return (
                <li key={d.code} className="ed-rank-item">
                  <span className="ed-rank-num">{String(i+1).padStart(2,'0')}</span>
                  <span className="ed-rank-name">{d.name}</span>
                  <span className="ed-rank-meta">
                    <span className="ed-rank-bar"><span style={{width: `${(d.votos/max)*100}%`, background: c.color}}/></span>
                    <span className="ed-rank-val">{E2.fmt(d.votos)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* DONUT + WINNERS GRID */}
      <section className="ed-grid-donut-deps">
        <div className="ed-block">
          <div className="ed-block-head">
            <div>
              <div className="ed-eyebrow">Distribución nacional</div>
              <h2 className="ed-block-title">Por candidato</h2>
            </div>
          </div>
          <E2.Donut/>
        </div>
        <div className="ed-block">
          <div className="ed-block-head">
            <div>
              <div className="ed-eyebrow">Ganador por territorio</div>
              <h2 className="ed-block-title">33 departamentos</h2>
            </div>
            <div className="ed-tabchips">
              {window.CANDIDATOS.slice(0,3).map(c => {
                const count = window.DEPARTAMENTOS.filter(d => d.ganador === c.id).length;
                return (
                  <span key={c.id} className="ed-chip">
                    <span className="ed-dot" style={{background: c.color}}/>
                    <span>{c.nombre.split(' ').slice(-1)[0]}</span>
                    <strong>{count}</strong>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="ed-deps-grid">
            {window.DEPARTAMENTOS.slice().sort((a,b)=>b.votos-a.votos).map(d => {
              const c = E2.candidatoById(d.ganador);
              return (
                <div key={d.code} className="ed-dep-card" style={{borderLeftColor: c.color}}>
                  <div className="ed-dep-name">{d.name}</div>
                  <div className="ed-dep-meta">{c.nombre.split(' ').slice(-1)[0]} · {E2.fmt(d.votos)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

/* ============ DONUT ============ */
E2.Donut = function() {
  const data = window.PARTIDOS_DIST;
  const total = data.reduce((s,d)=>s+d.pct, 0);
  let acc = 0;
  const size = 240, r = size/2 - 10, cx = size/2, cy = size/2;
  const segs = data.map((d) => {
    const a0 = (acc/total) * Math.PI*2 - Math.PI/2;
    acc += d.pct;
    const a1 = (acc/total) * Math.PI*2 - Math.PI/2;
    const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const xi0 = cx + (r-44)*Math.cos(a0), yi0 = cy + (r-44)*Math.sin(a0);
    const xi1 = cx + (r-44)*Math.cos(a1), yi1 = cy + (r-44)*Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return {
      d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r-44} ${r-44} 0 ${large} 0 ${xi0} ${yi0} Z`,
      color: d.color, id: d.id, pct: d.pct
    };
  });
  return (
    <div className="ed-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map(s => (<path key={s.id} d={s.d} fill={s.color}/>))}
      </svg>
      <div className="ed-donut-legend">
        {data.map(d => {
          const c = E2.candidatoById(d.id);
          const name = c ? c.nombre : 'Otros';
          return (
            <div key={d.id} className="ed-legend-row">
              <span className="ed-legend-sq" style={{background:d.color}}/>
              <span className="ed-legend-name">{name}</span>
              <span className="ed-legend-pct">{E2.fmtPct(d.pct,2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============ MAP TAB ============ */
E2.MapTab = function({ filters, selectedCode, onSelectDept, onOpenPuesto }) {
  const dep = selectedCode ? window.DEPARTAMENTOS.find(d => d.code === selectedCode) : null;
  return (
    <div className="ed-map-tab">
      <div className="ed-map-stage">
        <E2.Map candidato={filters.candidato} selectedCode={selectedCode} onSelect={onSelectDept} height={760} dark={true}/>
      </div>
      <aside className="ed-map-side">
        {!dep && (
          <div className="ed-empty">
            <div className="ed-empty-eye">Sin selección</div>
            <h3 className="ed-empty-title">Click en un departamento</h3>
            <p className="ed-empty-text">Selecciona una jurisdicción del mapa para hacer drill-down a sus municipios y puestos electorales.</p>
            <ul className="ed-empty-tips">
              <li><kbd>↑↓</kbd> Navegar lista</li>
              <li><kbd>Enter</kbd> Drill-down</li>
              <li><kbd>Esc</kbd> Volver</li>
            </ul>
          </div>
        )}
        {dep && <E2.JurisdictionCard dep={dep} onOpenPuesto={onOpenPuesto} onClose={() => onSelectDept(null)}/>}
      </aside>
    </div>
  );
};

E2.JurisdictionCard = function({ dep, onOpenPuesto, onClose }) {
  const cand = E2.candidatoById(dep.ganador);
  return (
    <div className="ed-jcard">
      <div className="ed-jhead">
        <div>
          <div className="ed-eyebrow ed-eye-light">Departamento · DIVIPOLA {dep.code}</div>
          <h3 className="ed-jtitle">{dep.name}</h3>
        </div>
        <button type="button" className="ed-iconbtn" onClick={onClose}><E2.IconClose/></button>
      </div>

      <div className="ed-winner-strip" style={{background: cand.color}}>
        <div>
          <div className="ed-winner-eye">Ganador</div>
          <div className="ed-winner-name">{cand.nombre}</div>
        </div>
        <div className="ed-winner-pct">45,6%</div>
      </div>

      <div className="ed-jstats">
        <div><div className="ed-jstat-num">{E2.fmt(dep.votos)}</div><div className="ed-jstat-lbl">Votos</div></div>
        <div><div className="ed-jstat-num">{E2.fmtPct(dep.participacion)}</div><div className="ed-jstat-lbl">Participación</div></div>
        <div><div className="ed-jstat-num">{E2.fmt(dep.mesas)}</div><div className="ed-jstat-lbl">Mesas</div></div>
      </div>

      <div className="ed-jsection">
        <div className="ed-jsection-title">Resultados por candidato</div>
        {window.CANDIDATOS.slice(0,5).map(c => {
          const pct = c.id === dep.ganador ? 45.6 : (c.pct * 0.85 + ((parseInt(dep.code,10)*7)%9));
          return (
            <div key={c.id} className="ed-jrow">
              <span className="ed-jrow-name">{c.nombre.split(' ').slice(-1)[0]}</span>
              <span className="ed-jrow-bar"><span style={{width: `${Math.min(60,pct)}%`, background: c.color}}/></span>
              <span className="ed-jrow-pct">{E2.fmtPct(pct,1)}</span>
            </div>
          );
        })}
      </div>

      <div className="ed-jsection">
        <div className="ed-jsection-title">Drill-down</div>
        <div className="ed-jdrill">
          <button type="button" className="ed-drill-btn">
            <span><strong>125</strong> Municipios</span><E2.IconArrow/>
          </button>
          <button type="button" className="ed-drill-btn" onClick={onOpenPuesto}>
            <span><strong>{E2.fmt(Math.round(dep.mesas*0.6))}</strong> Puestos electorales</span><E2.IconArrow/>
          </button>
          <button type="button" className="ed-drill-btn">
            <span>Resultados por puesto</span><E2.IconArrow/>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============ REPORTES ============ */
E2.Reportes = function({ filters }) {
  const rows = window.DEPARTAMENTOS.slice().sort((a,b)=>b.votos-a.votos);
  return (
    <div className="ed-block ed-reports">
      <div className="ed-block-head">
        <div>
          <div className="ed-eyebrow">Reporte detallado</div>
          <h2 className="ed-block-title">Votación por jurisdicción</h2>
        </div>
        <div className="ed-actions">
          <button type="button" className="ed-btn ed-btn-ghost"><E2.IconDown/>CSV</button>
          <button type="button" className="ed-btn ed-btn-primary">Generar PDF</button>
        </div>
      </div>

      <table className="ed-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ubicación</th>
            <th>Ganador</th>
            <th className="ed-tnum">Votos</th>
            <th className="ed-tnum">Mesas</th>
            <th className="ed-tnum">% del total</th>
            <th>Tendencia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => {
            const c = E2.candidatoById(r.ganador);
            const pct = (r.votos / window.KPIS.totalVotos) * 100;
            return (
              <tr key={r.code}>
                <td className="ed-trank">{i+1}</td>
                <td>
                  <div className="ed-tloc">
                    <div className="ed-tloc-name">{r.name}</div>
                    <div className="ed-tloc-sub">DIVIPOLA {r.code} · {E2.fmt(Math.round(r.mesas*0.6))} puestos</div>
                  </div>
                </td>
                <td>
                  <span className="ed-tchip">
                    <span className="ed-dot" style={{background: c.color}}/>
                    {c.nombre.split(' ').slice(-1)[0]}
                  </span>
                </td>
                <td className="ed-tnum">{E2.fmt(r.votos)}</td>
                <td className="ed-tnum">{E2.fmt(r.mesas)}</td>
                <td className="ed-tnum">{E2.fmtPct(pct,2)}</td>
                <td><E2.Spark code={r.code}/></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

E2.Spark = function({ code }) {
  const seed = parseInt(code,10);
  const pts = Array.from({length:7}, (_,i) => 30 + Math.sin(i*0.9 + seed*0.13)*12 + (i*1.2));
  return (
    <svg width="80" height="24" viewBox="0 0 80 60">
      <polyline
        points={pts.map((y,i) => `${i*13},${60-y}`).join(' ')}
        fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
};

/* ============ COMPARADOR ============ */
E2.Comparador = function() {
  return (
    <div className="ed-stack">
      <section className="ed-block">
        <div className="ed-block-head">
          <div>
            <div className="ed-eyebrow">Comparador histórico</div>
            <h2 className="ed-block-title">Presidenciales 2010 → 2022</h2>
          </div>
        </div>
        <E2.Historico/>
      </section>
      <section className="ed-compare-grid">
        <E2.CompareCard year="2018" name="Iván Duque" pct="39,14%" votos="7.569.693" deptos="32/33" color="#1D4E89" intensity={(c)=> ((parseInt(c,10)*11)%30+30)/100}/>
        <E2.CompareCard year="2022" name="Gustavo Petro" pct="40,32%" votos="8.527.768" deptos="25/33" color="#D62828" intensity={(c)=> ((parseInt(c,10)*7)%30+35)/100}/>
      </section>
    </div>
  );
};

E2.CompareCard = function({ year, name, pct, votos, deptos, color, intensity }) {
  const intCol = (p) => {
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    const t = 1 - p;
    const mix = (x) => Math.round(x + (255 - x) * t);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  };
  return (
    <div className="ed-block">
      <div className="ed-eyebrow">{year} · 1ra vuelta</div>
      <h2 className="ed-cmp-name">{name}</h2>
      <div className="ed-cmp-pct" style={{color}}>{pct}</div>
      <div className="ed-cmp-meta">{votos} votos · {deptos} deptos</div>
      <svg viewBox={window.COLOMBIA_MAP.viewBox} className="ed-cmp-map">
        {window.COLOMBIA_MAP.departments.map(dep => (
          <path key={dep.code} d={dep.d} fill={intCol(intensity(dep.code))} stroke="#fff" strokeWidth="0.6"/>
        ))}
      </svg>
    </div>
  );
};

E2.Historico = function() {
  const data = window.HISTORICO;
  const W = 800, H = 240, P = 40;
  const xs = data.map((_,i) => P + (i/(data.length-1))*(W-P*2));
  const ys = data.map(d => H-P - (d.pct/60)*(H-P*2));
  const path = data.map((_,i) => (i?'L':'M')+xs[i]+' '+ys[i]).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H+30}`} className="ed-historico">
      {[0,1,2,3].map(g => (
        <line key={g} x1={P} x2={W-P} y1={P + g*((H-P*2)/3)} y2={P + g*((H-P*2)/3)} stroke="#e2e8f0" strokeDasharray="3 4"/>
      ))}
      <path d={path} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r="6" fill="#fff" stroke="#0f172a" strokeWidth="2.5"/>
          <text x={xs[i]} y={ys[i]-14} textAnchor="middle" className="ed-h-num">{d.pct.toFixed(1)}%</text>
          <text x={xs[i]} y={H} textAnchor="middle" className="ed-h-year">{d.year}</text>
          <text x={xs[i]} y={H+22} textAnchor="middle" className="ed-h-name">{d.ganador}</text>
        </g>
      ))}
    </svg>
  );
};

/* ============ PUESTO MODAL ============ */
E2.PuestoModal = function({ open, onClose }) {
  if (!open) return null;
  const p = window.PUESTO_SAMPLE;
  return (
    <div className="ed-modal-bg" onClick={onClose}>
      <div className="ed-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ed-modal-head">
          <div>
            <div className="ed-eyebrow">Puesto Electoral · {p.codigo}</div>
            <h3 className="ed-modal-title">{p.nombre}</h3>
            <div className="ed-modal-sub"><E2.IconPin/> {p.direccion}</div>
          </div>
          <button type="button" className="ed-iconbtn" onClick={onClose}><E2.IconClose/></button>
        </div>

        <div className="ed-modal-body">
          <div className="ed-modal-stats">
            <div><div className="ed-bignum-sm">{p.mesas}</div><div className="ed-biglbl">Mesas</div></div>
            <div><div className="ed-bignum-sm">{E2.fmt(p.potencial)}</div><div className="ed-biglbl">Potencial</div></div>
            <div><div className="ed-bignum-sm">{E2.fmt(p.votosEmitidos)}</div><div className="ed-biglbl">Emitidos</div></div>
            <div><div className="ed-bignum-sm">{E2.fmtPct(p.votosEmitidos/p.potencial*100)}</div><div className="ed-biglbl">Participación</div></div>
          </div>

          <div className="ed-modal-grid">
            <div>
              <div className="ed-jsection-title">Resultados</div>
              {p.resultados.map(r => {
                const c = E2.candidatoById(r.id);
                const pct = (r.votos / p.votosEmitidos) * 100;
                return (
                  <div key={r.id} className="ed-jrow">
                    <span className="ed-jrow-name">{c.nombre}</span>
                    <span className="ed-jrow-bar"><span style={{width:`${pct}%`,background:c.color}}/></span>
                    <span className="ed-jrow-pct">{E2.fmt(r.votos)} · {E2.fmtPct(pct,1)}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="ed-modal-loc">
                <div className="ed-loc-row"><span>Departamento</span><strong>{p.departamento}</strong></div>
                <div className="ed-loc-row"><span>Municipio</span><strong>{p.municipio}</strong></div>
                <div className="ed-loc-row"><span>Zona</span><strong>{p.zona}</strong></div>
                <div className="ed-loc-row"><span>Coordenadas</span><strong>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</strong></div>
              </div>
              <svg viewBox="0 0 200 160" className="ed-modal-pin">
                <rect x="0" y="0" width="200" height="160" fill="#f1f5f9"/>
                {[0,1,2,3].map(i => (<line key={i} x1="0" x2="200" y1={i*40+20} y2={i*40+20} stroke="#e2e8f0" strokeWidth="0.5"/>))}
                {[0,1,2,3,4].map(i => (<line key={'v'+i} y1="0" y2="160" x1={i*40+20} x2={i*40+20} stroke="#e2e8f0" strokeWidth="0.5"/>))}
                <circle cx="100" cy="80" r="20" fill="#0f172a" fillOpacity="0.12"/>
                <circle cx="100" cy="80" r="8" fill="#0f172a" stroke="#fff" strokeWidth="2"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ APP ROOT ============ */
E2.App = function() {
  const [tab, setTab] = React.useState('dashboard');
  const [filters, setFilters] = React.useState({
    candidato: 'petro',
    nivel: 'departamentos',
    eleccion: '2022-p1',
    q: '',
  });
  const [selectedCode, setSelectedCode] = React.useState('11');
  const [puestoOpen, setPuestoOpen] = React.useState(false);
  const set = (patch) => setFilters((f) => ({...f, ...patch}));

  return (
    <div className="ed-app" data-density="comfortable">
      <E2.Topbar tab={tab} setTab={setTab}/>
      <E2.Filters state={filters} set={set}/>
      <main className="ed-main">
        {tab === 'dashboard'  && <E2.Resumen filters={filters} onSelectDept={(c)=>{setSelectedCode(c); setTab('mapa');}}/>}
        {tab === 'mapa'       && <E2.MapTab filters={filters} selectedCode={selectedCode} onSelectDept={setSelectedCode} onOpenPuesto={()=>setPuestoOpen(true)}/>}
        {tab === 'reportes'   && <E2.Reportes filters={filters}/>}
        {tab === 'comparador' && <E2.Comparador/>}
      </main>
      <E2.PuestoModal open={puestoOpen} onClose={()=>setPuestoOpen(false)}/>
    </div>
  );
};

window.EditorialApp = E2.App;
