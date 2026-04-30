/* Mock electoral data for Colombia 2022 — Presidencial 1ra Vuelta */
/* Used by both design variants. Numbers are realistic but illustrative. */

window.CANDIDATOS = [
  { id: 'petro',     nombre: 'Gustavo Petro',         partido: 'Pacto Histórico',     siglas: 'PH',  color: '#D62828', votos: 8527768, pct: 40.32 },
  { id: 'hernandez', nombre: 'Rodolfo Hernández',     partido: 'Liga Gob. Anticorr.', siglas: 'LGA', color: '#F4A261', votos: 5953209, pct: 28.15 },
  { id: 'fico',      nombre: 'Federico Gutiérrez',    partido: 'Equipo por Colombia', siglas: 'EPC', color: '#1D4E89', votos: 5058010, pct: 23.91 },
  { id: 'fajardo',   nombre: 'Sergio Fajardo',        partido: 'Centro Esperanza',    siglas: 'CE',  color: '#2A9D8F', votos:  888585, pct:  4.20 },
  { id: 'betancourt',nombre: 'Íngrid Betancourt',     partido: 'Verde Oxígeno',       siglas: 'VO',  color: '#8AB17D', votos:  158650, pct:  0.75 },
  { id: 'rodriguez', nombre: 'John Milton Rodríguez', partido: 'Colombia Justa Libres',siglas: 'CJL', color: '#6A4C93', votos:  121859, pct:  0.58 },
];

window.AÑOS = [
  { id: '2022-p1', label: 'Presidencial 2022 (1ra Vuelta)' },
  { id: '2022-p2', label: 'Presidencial 2022 (2da Vuelta)' },
  { id: '2022-c',  label: 'Cámara de Representantes 2022' },
  { id: '2022-s',  label: 'Senado 2022' },
  { id: '2018-p1', label: 'Presidencial 2018 (1ra Vuelta)' },
  { id: '2018-p2', label: 'Presidencial 2018 (2da Vuelta)' },
];

window.NIVELES = [
  { id: 'pais',          label: 'País' },
  { id: 'zonas',         label: 'Zonas' },
  { id: 'departamentos', label: 'Departamentos' },
  { id: 'municipios',    label: 'Municipios' },
  { id: 'puestos',       label: 'Puestos' },
];

/* 33 departamentos de Colombia con datos del ganador de 2022-p1 */
window.DEPARTAMENTOS = [
  { code: '11', name: 'Bogotá D.C.',      ganador: 'petro',     votos: 1820000, participacion: 64.3, mesas: 6320, lat: 4.71,  lon: -74.07 },
  { code: '05', name: 'Antioquia',         ganador: 'fico',      votos: 1640000, participacion: 60.1, mesas: 9410, lat: 7.20,  lon: -75.50 },
  { code: '76', name: 'Valle del Cauca',   ganador: 'petro',     votos: 1180000, participacion: 58.4, mesas: 6780, lat: 3.80,  lon: -76.55 },
  { code: '08', name: 'Atlántico',         ganador: 'petro',     votos:  720000, participacion: 56.2, mesas: 3120, lat: 10.69, lon: -74.87 },
  { code: '25', name: 'Cundinamarca',      ganador: 'petro',     votos:  710000, participacion: 59.7, mesas: 4980, lat: 5.03,  lon: -74.03 },
  { code: '68', name: 'Santander',         ganador: 'hernandez', votos:  680000, participacion: 61.5, mesas: 3460, lat: 6.64,  lon: -73.65 },
  { code: '13', name: 'Bolívar',           ganador: 'petro',     votos:  540000, participacion: 53.8, mesas: 3010, lat: 8.68,  lon: -74.46 },
  { code: '54', name: 'Norte de Santander',ganador: 'hernandez', votos:  410000, participacion: 56.0, mesas: 2240, lat: 7.95,  lon: -72.83 },
  { code: '20', name: 'Cesar',             ganador: 'petro',     votos:  330000, participacion: 55.1, mesas: 1640, lat: 9.33,  lon: -73.65 },
  { code: '47', name: 'Magdalena',         ganador: 'petro',     votos:  310000, participacion: 51.9, mesas: 1680, lat: 10.41, lon: -74.40 },
  { code: '23', name: 'Córdoba',           ganador: 'petro',     votos:  580000, participacion: 57.2, mesas: 2680, lat: 8.74,  lon: -75.88 },
  { code: '50', name: 'Meta',              ganador: 'petro',     votos:  280000, participacion: 56.4, mesas: 1820, lat: 3.86,  lon: -73.08 },
  { code: '66', name: 'Risaralda',         ganador: 'fico',      votos:  240000, participacion: 60.8, mesas: 1480, lat: 5.31,  lon: -75.93 },
  { code: '17', name: 'Caldas',            ganador: 'fico',      votos:  290000, participacion: 62.1, mesas: 1660, lat: 5.29,  lon: -75.51 },
  { code: '63', name: 'Quindío',           ganador: 'petro',     votos:  170000, participacion: 59.9, mesas:  900, lat: 4.46,  lon: -75.66 },
  { code: '15', name: 'Boyacá',            ganador: 'hernandez', votos:  430000, participacion: 60.5, mesas: 2940, lat: 5.45,  lon: -73.36 },
  { code: '52', name: 'Nariño',            ganador: 'petro',     votos:  490000, participacion: 56.7, mesas: 2580, lat: 1.21,  lon: -77.28 },
  { code: '19', name: 'Cauca',             ganador: 'petro',     votos:  410000, participacion: 53.4, mesas: 2120, lat: 2.44,  lon: -76.61 },
  { code: '73', name: 'Tolima',            ganador: 'hernandez', votos:  410000, participacion: 58.1, mesas: 2380, lat: 4.43,  lon: -75.23 },
  { code: '41', name: 'Huila',             ganador: 'hernandez', votos:  350000, participacion: 60.2, mesas: 2010, lat: 2.93,  lon: -75.28 },
  { code: '70', name: 'Sucre',             ganador: 'petro',     votos:  280000, participacion: 53.1, mesas: 1290, lat: 9.30,  lon: -75.39 },
  { code: '44', name: 'La Guajira',        ganador: 'petro',     votos:  220000, participacion: 49.7, mesas: 1080, lat: 11.54, lon: -72.91 },
  { code: '85', name: 'Casanare',          ganador: 'hernandez', votos:  130000, participacion: 57.4, mesas:  870, lat: 5.34,  lon: -72.39 },
  { code: '18', name: 'Caquetá',           ganador: 'petro',     votos:  130000, participacion: 50.6, mesas:  840, lat: 1.61,  lon: -75.61 },
  { code: '86', name: 'Putumayo',          ganador: 'petro',     votos:  110000, participacion: 47.3, mesas:  640, lat: 0.43,  lon: -76.13 },
  { code: '81', name: 'Arauca',            ganador: 'petro',     votos:   90000, participacion: 48.2, mesas:  490, lat: 6.55,  lon: -71.00 },
  { code: '95', name: 'Guaviare',          ganador: 'petro',     votos:   30000, participacion: 45.8, mesas:  220, lat: 2.04,  lon: -72.33 },
  { code: '99', name: 'Vichada',           ganador: 'petro',     votos:   20000, participacion: 41.2, mesas:  120, lat: 4.42,  lon: -69.79 },
  { code: '94', name: 'Guainía',           ganador: 'petro',     votos:   12000, participacion: 44.6, mesas:   60, lat: 2.58,  lon: -68.54 },
  { code: '97', name: 'Vaupés',            ganador: 'petro',     votos:    8000, participacion: 38.4, mesas:   40, lat: 0.85,  lon: -70.81 },
  { code: '91', name: 'Amazonas',          ganador: 'petro',     votos:   18000, participacion: 39.7, mesas:   80, lat: -1.44, lon: -71.57 },
  { code: '88', name: 'San Andrés',        ganador: 'petro',     votos:   16000, participacion: 53.5, mesas:   70, lat: 12.55, lon: -81.71 },
  { code: '27', name: 'Chocó',             ganador: 'petro',     votos:  160000, participacion: 47.9, mesas:  900, lat: 5.69,  lon: -76.65 },
];

window.PARTIDOS_DIST = [
  { id: 'petro',     pct: 40.32, color: '#D62828' },
  { id: 'hernandez', pct: 28.15, color: '#F4A261' },
  { id: 'fico',      pct: 23.91, color: '#1D4E89' },
  { id: 'fajardo',   pct:  4.20, color: '#2A9D8F' },
  { id: 'otros',     pct:  3.42, color: '#8D99AE' },
];

/* Top 10 para barras */
window.TOP10 = window.DEPARTAMENTOS
  .slice()
  .sort((a, b) => b.votos - a.votos)
  .slice(0, 10);

window.KPIS = {
  totalVotos: 21622778,
  departamentos: 33,
  municipios: 1122,
  puestos: 13742,
  participacion: 54.98,
  mesas: 112150,
};

/* Sample puesto detail */
window.PUESTO_SAMPLE = {
  codigo: 'PE-11001-0042',
  nombre: 'Colegio Nacional Restrepo',
  direccion: 'Calle 17 Sur # 24-30, Antonio Nariño',
  municipio: 'Bogotá D.C.',
  departamento: 'Bogotá D.C.',
  zona: 'Zona 1 — Bogotá',
  lat: 4.5826, lon: -74.0974,
  mesas: 24, potencial: 8120, votosEmitidos: 4986,
  resultados: [
    { id: 'petro', votos: 2480 },
    { id: 'hernandez', votos: 1180 },
    { id: 'fico', votos: 1120 },
    { id: 'fajardo', votos: 142 },
    { id: 'betancourt', votos: 38 },
    { id: 'rodriguez', votos: 26 },
  ],
};

/* Histórico para comparador */
window.HISTORICO = [
  { year: 2010, ganador: 'Santos',   pct: 46.6 },
  { year: 2014, ganador: 'Santos',   pct: 50.9 },
  { year: 2018, ganador: 'Duque',    pct: 54.0 },
  { year: 2022, ganador: 'Petro',    pct: 50.4 },
];
