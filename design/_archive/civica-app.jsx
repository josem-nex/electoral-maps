/* Variante A — root component (CivicaApp) and styles consumer */
const { useState: useStateA, useEffect: useEffectA } = React;
const P1A = window.CivicaPart1;
const P2A = window.CivicaPart2;

function CivicaApp() {
  const [tab, setTab] = useStateA('dashboard');
  const [filters, setFilters] = useStateA({
    candidato: 'petro',
    nivel: 'departamentos',
    eleccion: '2022-p1',
    q: '',
  });
  const [selectedCode, setSelectedCode] = useStateA('11');
  const [puestoOpen, setPuestoOpen] = useStateA(false);

  const set = (patch) => setFilters((f) => ({...f, ...patch}));

  return (
    <div className="civica-app" data-density="comfortable">
      <P1A.Topbar/>

      <div className="civica-tabs">
        <P1A.Tab active={tab==='dashboard'} onClick={() => setTab('dashboard')} icon={<P1A.IconDash/>}>Dashboard</P1A.Tab>
        <P1A.Tab active={tab==='mapa'}      onClick={() => setTab('mapa')}      icon={<P1A.IconMap/>}>Mapa</P1A.Tab>
        <P1A.Tab active={tab==='reportes'}  onClick={() => setTab('reportes')}  icon={<P1A.IconReport/>}>Reportes</P1A.Tab>
        <P1A.Tab active={tab==='comparador'}onClick={() => setTab('comparador')}icon={<P1A.IconCompare/>}>Comparador</P1A.Tab>
      </div>

      <P1A.FilterBar state={filters} set={set}/>

      <div className="civica-body">
        {tab === 'dashboard'   && <P2A.CivicaDashboard filters={filters} onSelectDept={(c) => { setSelectedCode(c); setTab('mapa'); }}/>}
        {tab === 'mapa'        && <P2A.CivicaMapa filters={filters} selectedCode={selectedCode} onSelectDept={setSelectedCode} onOpenPuesto={() => setPuestoOpen(true)}/>}
        {tab === 'reportes'    && <P2A.CivicaReportes filters={filters}/>}
        {tab === 'comparador'  && <P2A.CivicaComparador filters={filters}/>}
      </div>

      <P2A.PuestoModal open={puestoOpen} onClose={() => setPuestoOpen(false)}/>
    </div>
  );
}

window.CivicaApp = CivicaApp;
