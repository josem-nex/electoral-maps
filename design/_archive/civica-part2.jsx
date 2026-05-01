/* Variante A — part 2: tab bodies (Dashboard, Mapa, Reportes, Comparador) + screens */

const { useState: useStateA2, useMemo: useMemoA2 } = React;
const P1 = window.CivicaPart1;

/* =========================================================================
   Dashboard tab
========================================================================= */
function CivicaDashboard({ filters, onSelectDept }) {
  const cand = P1.candidatoById(filters.candidato);
  return (
    <div className="civica-stack">
      {/* KPI strip */}
      <div className="civica-kpi-grid">
        <P1.KpiCard icon={<P1.IconUsers/>} label="Total Votos" value={P1.fmt(window.KPIS.totalVotos)} delta="+3.2% vs 2018"/>
        <P1.KpiCard icon={<P1.IconFlag/>}   label="Departamentos" value={window.KPIS.departamentos} delta="33 reportando"/>
        <P1.KpiCard icon={<P1.IconBuilding/>} label="Municipios" value={P1.fmt(window.KPIS.municipios)} delta="100% reportados"/>
        <P1.KpiCard icon={<P1.IconTrend/>}  label="Participación" value={P1.fmtPct(window.KPIS.participacion)} delta="+1.4 pp"/>
      </div>

      {/* Charts row */}
      <div className="civica-chart-row">
        <P1.Card className="civica-chart-card">
          <div className="civica-card-head">
            <div>
              <div className="civica-card-eyebrow">Análisis Electoral</div>
              <h3 className="civica-card-title">Top 10 departamentos por votos</h3>
            </div>
            <div className="civica-card-actions">
              <span className="civica-pill is-accent" style={{background: cand.color+'1A', color: cand.color}}>
                <span className="civica-legend-sw" style={{background:cand.color}}/>{cand.nombre}
              </span>
            </div>
          </div>
          <P1.Top10Bars candidato={filters.candidato}/>
        </P1.Card>

        <P1.Card className="civica-donut-card">
          <div className="civica-card-head">
            <div>
              <div className="civica-card-eyebrow">Distribución</div>
              <h3 className="civica-card-title">Por candidato</h3>
            </div>
          </div>
          <P1.Donut/>
        </P1.Card>
      </div>

      {/* Quick actions */}
      <div className="civica-quick-grid">
        <QuickAction
          title="Generar Reporte"
          subtitle="PDF completo con tablas y mapas"
          icon={<P1.IconReport/>}
        />
        <QuickAction
          title="Ver Estadísticas"
          subtitle="Análisis avanzado por jurisdicción"
          icon={<P1.IconTrend/>}
        />
        <QuickAction
          title="Exportar Datos"
          subtitle="CSV con resultados detallados"
          icon={<P1.IconDownload/>}
        />
        <QuickAction
          title="Comparar Elecciones"
          subtitle="Histórico 2010 → 2022"
          icon={<P1.IconCompare/>}
        />
      </div>

      {/* Mini map preview */}
      <P1.Card className="civica-mini-map">
        <div className="civica-card-head">
          <div>
            <div className="civica-card-eyebrow">Mapa</div>
            <h3 className="civica-card-title">Resultado por departamento</h3>
          </div>
          <button type="button" className="civica-link">Ver mapa completo <P1.IconArrow/></button>
        </div>
        <P1.ChoroplethMap candidato={filters.candidato} height={360} onSelect={onSelectDept}/>
      </P1.Card>
    </div>
  );
}

function QuickAction({ icon, title, subtitle }) {
  return (
    <button type="button" className="civica-quick">
      <span className="civica-quick-icon">{icon}</span>
      <span className="civica-quick-title">{title}</span>
      <span className="civica-quick-sub">{subtitle}</span>
    </button>
  );
}

/* =========================================================================
   Mapa tab — choropleth + side panel detail
========================================================================= */
function CivicaMapa({ filters, selectedCode, onSelectDept, onOpenPuesto }) {
  const dep = selectedCode ? window.DEPARTAMENTOS.find(d => d.code === selectedCode) : null;
  return (
    <div className="civica-map-grid">
      <P1.Card className="civica-map-card">
        <div className="civica-card-head">
          <div>
            <div className="civica-card-eyebrow">Mapa</div>
            <h3 className="civica-card-title">Colombia · {window.AÑOS.find(a => a.id===filters.eleccion).label}</h3>
          </div>
          <div className="civica-card-actions">
            <button type="button" className="civica-btn is-ghost">Reiniciar vista</button>
            <button type="button" className="civica-btn is-ghost"><P1.IconDownload/>PNG</button>
          </div>
        </div>
        <P1.ChoroplethMap candidato={filters.candidato} selectedCode={selectedCode} onSelect={onSelectDept} height={620}/>
      </P1.Card>

      <aside className="civica-side-panel">
        {!dep && (
          <P1.Card className="civica-empty">
            <div className="civica-empty-icon"><P1.IconMap/></div>
            <h4>Selecciona un departamento</h4>
            <p>Haz click en el mapa para ver el detalle de la jurisdicción, drill-down a municipios y resultados por puesto.</p>
            <div className="civica-empty-tip">
              <P1.IconArrow/> Tip: Ctrl+click para abrir en panel adjunto
            </div>
          </P1.Card>
        )}
        {dep && <JurisdictionDetail dep={dep} candidato={filters.candidato} onOpenPuesto={onOpenPuesto} onClose={() => onSelectDept(null)}/>}
      </aside>
    </div>
  );
}

function JurisdictionDetail({ dep, candidato, onOpenPuesto, onClose }) {
  const cand = P1.candidatoById(dep.ganador);
  return (
    <P1.Card className="civica-detail">
      <div className="civica-detail-head">
        <div>
          <div className="civica-card-eyebrow">Departamento · {dep.code}</div>
          <h3 className="civica-detail-title">{dep.name}</h3>
        </div>
        <button type="button" className="civica-iconbtn" onClick={onClose} aria-label="Cerrar"><P1.IconClose/></button>
      </div>

      <div className="civica-winner" style={{borderColor: cand.color+'40', background: cand.color+'0D'}}>
        <div className="civica-winner-flag" style={{background: cand.color}}/>
        <div>
          <div className="civica-winner-eyebrow">Ganador</div>
          <div className="civica-winner-name">{cand.nombre}</div>
          <div className="civica-winner-meta">{cand.partido} · {cand.siglas}</div>
        </div>
        <div className="civica-winner-pct">{P1.fmtPct(45.6, 1)}</div>
      </div>

      <div className="civica-detail-stats">
        <div><div className="civica-detail-num">{P1.fmt(dep.votos)}</div><div className="civica-detail-lbl">Votos válidos</div></div>
        <div><div className="civica-detail-num">{P1.fmtPct(dep.participacion)}</div><div className="civica-detail-lbl">Participación</div></div>
        <div><div className="civica-detail-num">{P1.fmt(dep.mesas)}</div><div className="civica-detail-lbl">Mesas</div></div>
      </div>

      <div className="civica-detail-section">
        <div className="civica-detail-section-title">Resultados por candidato</div>
        <div className="civica-mini-bars">
          {window.CANDIDATOS.slice(0,5).map((c) => {
            const pct = c.id === dep.ganador ? 45.6 : (c.pct * 0.8 + ((parseInt(dep.code,10)*7) % 9));
            return (
              <div key={c.id} className="civica-mini-bar">
                <span className="civica-mini-name">{c.nombre.split(' ').slice(-1)[0]}</span>
                <div className="civica-mini-track"><div className="civica-mini-fill" style={{width: `${Math.min(60,pct)}%`, background: c.color}}/></div>
                <span className="civica-mini-pct">{P1.fmtPct(pct,1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="civica-detail-section">
        <div className="civica-detail-section-title">Drill-down</div>
        <div className="civica-drill-list">
          {[
            {n:'Municipios', v: '125 entidades'},
            {n:'Puestos electorales', v: P1.fmt(Math.round(dep.mesas*0.6)) + ' puestos'},
            {n:'Resultados por puesto', v: 'Disponible'},
          ].map((r,i) => (
            <button key={i} type="button" className="civica-drill" onClick={i===1?onOpenPuesto:undefined}>
              <span>{r.n}</span>
              <span className="civica-drill-meta">{r.v}</span>
              <P1.IconArrow/>
            </button>
          ))}
        </div>
      </div>
    </P1.Card>
  );
}

/* =========================================================================
   Reportes tab
========================================================================= */
function CivicaReportes({ filters }) {
  const cand = P1.candidatoById(filters.candidato);
  const rows = window.DEPARTAMENTOS.slice().sort((a,b) => b.votos - a.votos);
  return (
    <P1.Card className="civica-reports">
      <div className="civica-card-head">
        <div>
          <div className="civica-card-eyebrow">Reporte detallado</div>
          <h3 className="civica-card-title">Votación por departamento — {cand.nombre}</h3>
        </div>
        <div className="civica-card-actions">
          <button type="button" className="civica-btn is-ghost"><P1.IconDownload/>Descargar CSV</button>
          <button type="button" className="civica-btn is-primary"><P1.IconReport/>Generar PDF</button>
        </div>
      </div>

      <div className="civica-table-wrap">
        <table className="civica-table">
          <thead>
            <tr>
              <th style={{width:32}}>#</th>
              <th>Ubicación</th>
              <th>Nivel geográfico</th>
              <th className="civica-num">Votos</th>
              <th className="civica-num">Mesas informadas</th>
              <th className="civica-num">% del total</th>
              <th>Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = (r.votos / window.KPIS.totalVotos) * 100;
              return (
                <tr key={r.code}>
                  <td className="civica-rank">{i+1}</td>
                  <td>
                    <div className="civica-cell-loc">
                      <span className="civica-loc-dot" style={{background: P1.candidatoById(r.ganador).color}}/>
                      <div>
                        <div className="civica-loc-name">{r.name}</div>
                        <div className="civica-loc-sub">DIVIPOLA {r.code}</div>
                      </div>
                    </div>
                  </td>
                  <td><P1.Pill tone="neutral">Departamento</P1.Pill></td>
                  <td className="civica-num">{P1.fmt(r.votos)}</td>
                  <td className="civica-num">{P1.fmt(r.mesas)} / {P1.fmt(r.mesas)}</td>
                  <td className="civica-num">{P1.fmtPct(pct,2)}</td>
                  <td>
                    <Sparkline winner={r.ganador === filters.candidato}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </P1.Card>
  );
}

function Sparkline({ winner }) {
  const pts = [];
  let y = 30;
  for (let i = 0; i < 8; i++) {
    y += (Math.sin(i*1.3 + (winner?0.3:0)) * 6);
    pts.push(`${i*12},${30 + y*0.4}`);
  }
  return (
    <svg width="96" height="24" viewBox="0 0 96 60" style={{verticalAlign:'middle'}}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={winner ? '#16a34a' : '#94a3b8'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================================
   Comparador tab
========================================================================= */
function CivicaComparador({ filters }) {
  return (
    <div className="civica-stack">
      <P1.Card>
        <div className="civica-card-head">
          <div>
            <div className="civica-card-eyebrow">Comparador histórico</div>
            <h3 className="civica-card-title">Presidenciales 2010 → 2022 (% del ganador)</h3>
          </div>
          <div className="civica-card-actions">
            <select className="civica-mini-select" defaultValue="nacional">
              <option value="nacional">Nacional</option>
              <option value="boyaca">Boyacá</option>
              <option value="bogota">Bogotá D.C.</option>
            </select>
          </div>
        </div>
        <HistoricoChart/>
      </P1.Card>

      <div className="civica-compare-row">
        <P1.Card className="civica-compare-card">
          <div className="civica-card-head">
            <div className="civica-card-eyebrow">2018 — 1ra vuelta</div>
            <h3 className="civica-card-title">Iván Duque</h3>
          </div>
          <div className="civica-compare-pct" style={{color:'#1D4E89'}}>39.14%</div>
          <div className="civica-compare-meta">7,569,693 votos · 32/33 deptos</div>
          <MiniMap intensityFn={(c)=> ((parseInt(c,10)*11)%30+30)/100} color="#1D4E89"/>
        </P1.Card>

        <P1.Card className="civica-compare-card">
          <div className="civica-card-head">
            <div className="civica-card-eyebrow">2022 — 1ra vuelta</div>
            <h3 className="civica-card-title">Gustavo Petro</h3>
          </div>
          <div className="civica-compare-pct" style={{color:'#D62828'}}>40.32%</div>
          <div className="civica-compare-meta">8,527,768 votos · 25/33 deptos</div>
          <MiniMap intensityFn={(c)=> ((parseInt(c,10)*7)%30+35)/100} color="#D62828"/>
        </P1.Card>
      </div>
    </div>
  );
}

function HistoricoChart() {
  const data = window.HISTORICO;
  const W = 800, H = 220, P = 36;
  const xs = data.map((_,i) => P + (i/(data.length-1))*(W-P*2));
  const ys = data.map(d => H-P - (d.pct/60)*(H-P*2));
  const path = data.map((_,i) => (i?'L':'M')+xs[i]+' '+ys[i]).join(' ');
  return (
    <div className="civica-historico">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="civica-historico-svg">
        {[0,1,2,3].map(g => (
          <line key={g} x1={P} x2={W-P} y1={P + g*((H-P*2)/3)} y2={P + g*((H-P*2)/3)} stroke="#e2e8f0" strokeDasharray="4 4"/>
        ))}
        <path d={path} fill="none" stroke="#1D4E89" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        {data.map((d,i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="6" fill="#fff" stroke="#1D4E89" strokeWidth="3"/>
            <text x={xs[i]} y={ys[i]-14} textAnchor="middle" className="civica-h-num">{d.pct.toFixed(1)}%</text>
            <text x={xs[i]} y={H-12} textAnchor="middle" className="civica-h-year">{d.year}</text>
            <text x={xs[i]} y={H+4} textAnchor="middle" className="civica-h-name">{d.ganador}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MiniMap({ intensityFn, color }) {
  const intensity = (pct) => {
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    const t = 1 - pct;
    const mix = (x) => Math.round(x + (255 - x) * t);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  };
  return (
    <svg viewBox={window.COLOMBIA_MAP.viewBox} className="civica-minimap-svg">
      {window.COLOMBIA_MAP.departments.map(dep => (
        <path key={dep.code} d={dep.d} fill={intensity(intensityFn(dep.code))} stroke="#fff" strokeWidth="0.8"/>
      ))}
    </svg>
  );
}

/* =========================================================================
   Puesto detail modal
========================================================================= */
function PuestoModal({ open, onClose }) {
  if (!open) return null;
  const p = window.PUESTO_SAMPLE;
  return (
    <div className="civica-modal-bg" onClick={onClose}>
      <div className="civica-modal" onClick={(e) => e.stopPropagation()}>
        <div className="civica-modal-head">
          <div>
            <div className="civica-card-eyebrow">Puesto Electoral · {p.codigo}</div>
            <h3 className="civica-modal-title">{p.nombre}</h3>
            <div className="civica-modal-sub">{p.direccion}</div>
          </div>
          <button type="button" className="civica-iconbtn" onClick={onClose}><P1.IconClose/></button>
        </div>

        <div className="civica-modal-grid">
          <div>
            <div className="civica-modal-stats">
              <div><div className="civica-detail-num">{p.mesas}</div><div className="civica-detail-lbl">Mesas</div></div>
              <div><div className="civica-detail-num">{P1.fmt(p.potencial)}</div><div className="civica-detail-lbl">Potencial</div></div>
              <div><div className="civica-detail-num">{P1.fmt(p.votosEmitidos)}</div><div className="civica-detail-lbl">Votos emitidos</div></div>
              <div><div className="civica-detail-num">{P1.fmtPct(p.votosEmitidos/p.potencial*100)}</div><div className="civica-detail-lbl">Participación</div></div>
            </div>

            <div className="civica-detail-section">
              <div className="civica-detail-section-title">Resultados</div>
              <div className="civica-mini-bars">
                {p.resultados.map(r => {
                  const c = P1.candidatoById(r.id);
                  const pct = (r.votos / p.votosEmitidos) * 100;
                  return (
                    <div key={r.id} className="civica-mini-bar">
                      <span className="civica-mini-name">{c.nombre}</span>
                      <div className="civica-mini-track"><div className="civica-mini-fill" style={{width:`${pct}%`,background:c.color}}/></div>
                      <span className="civica-mini-pct">{P1.fmt(r.votos)} · {P1.fmtPct(pct,1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="civica-modal-loc">
              <div className="civica-modal-loc-row"><span>Departamento</span><strong>{p.departamento}</strong></div>
              <div className="civica-modal-loc-row"><span>Municipio</span><strong>{p.municipio}</strong></div>
              <div className="civica-modal-loc-row"><span>Zona</span><strong>{p.zona}</strong></div>
              <div className="civica-modal-loc-row"><span>Coordenadas</span><strong>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</strong></div>
            </div>
            <div className="civica-mini-pin">
              <svg viewBox="0 0 200 200" className="civica-pin-svg">
                <rect x="0" y="0" width="200" height="200" fill="#f1f5f9"/>
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1="0" x2="200" y1={i*40+20} y2={i*40+20} stroke="#e2e8f0" strokeWidth="0.5"/>
                ))}
                {[0,1,2,3,4].map(i => (
                  <line key={'v'+i} y1="0" y2="200" x1={i*40+20} x2={i*40+20} stroke="#e2e8f0" strokeWidth="0.5"/>
                ))}
                <circle cx="100" cy="100" r="22" fill="#1D4E89" fillOpacity="0.18"/>
                <circle cx="100" cy="100" r="8" fill="#1D4E89" stroke="#fff" strokeWidth="2"/>
              </svg>
              <div className="civica-pin-cap">Ubicación aproximada en mapa</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CivicaPart2 = { CivicaDashboard, CivicaMapa, CivicaReportes, CivicaComparador, PuestoModal };
