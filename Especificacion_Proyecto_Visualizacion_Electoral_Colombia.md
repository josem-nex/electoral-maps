# Especificación técnica para proyecto de visualización electoral en Colombia

## Alcance funcional (MVP) — pantallas / vistas (una por "Capa")

Las "Capas" definidas por el cliente (PPTX) serán vistas separadas en la web, seleccionables por menú desplegable y navegables por _drill-down_ (click en mapa → ir a la siguiente capa). Las capas son:

1. **País (Nacional)** — vista inicial: mapa de Colombia con los 32 departamentos + Bogotá.
2. **Zonas** (Excel llamado ZONAS VS MUNICIPIOS en el folder data/usar/):
   - Zona 1: Bogotá D.C.
   - Zona 2: Costa.
   - Zona 3: NorOccidente.
   - Zona 4: SurOccidente.
   - Zona 5: Centro Oriente.
   - Zona 6: Sur.
   - Zona 7: Consulados. (como un pequeño globo aparte o filtro en el mapa)
3. **Departamentos** — vista por departamento.
<!-- 4. **Región** —    -->
4. **Municipio** — mapa con municipios .
5. **Localidad (Bogotá)** — vista especial hasta localidad y UPZ si aplica.
6. **Puesto Electoral** — Puestos desde los municipios, cada puesto es seleccionable y aparecen a la derecha detalles del puesto: coordenadas, mesas, personas, etc etc. (Archivo INFO_X_Puesto) . Ten en cuenta que una vez esté el mapa los puestos se deben ubicar de acuerdo a las coordenadas que el cliente proporcionó en el excel de puestos, no es necesario geocodificar ni nada, solo ubicar los puntos en el mapa.

Cada vista debe permitir:

- Selección de la capa desde un **menú desplegable** global.
- **Click en polígonos** (p. ej. en un departamento) para “drill-down” a la siguiente capa (ej. departamento → municipios).
- **Zoom automático** y centrado cuando se selecciona una jurisdicción por dropdown o búsqueda.
- **Overlay** de puntos: puestos electorales (marcadores) con popup que muestre datos básicos y botón “ver detalle / editar” .
- **Filtrado por año/elección** (el PDF solicita "CONSULTAR TODOS LOS AÑOS PARA CADA CAPA").

---

## Mapas

Dentro de la carpeta data/mapas se encuentran difeentes archivos de mapas que encontré en internet. Ahí creo que hay archivos de shape, de geojson, de topojson, etc. El cliente no especificó exactamente qué mapas usar, por lo tanto puedes elegir el que consideres más adecuado para cada capa, o incluso usar un mapa base y superponer los polígonos de cada capa usando los códigos DIVIPOLA para hacer el match. Lo importante es que el mapa sea preciso y permita hacer click en cada jurisdicción para navegar a la siguiente capa. Recuerda que se debe tener al menos hasta el nivel de municipio y la posibilidad de posteriormente agregar los puestos electorales como puntos sobre el mapa utilizando las coordenadas proporcionadas por el cliente en el excel de puestos.

---

## Funcionalidades por jurisdicción (según PPTX / PDF)

Cada región solo tiene coordinador.

Por cada jurisdicción electoral:
Hay **Jurado** y **Testigo** los cuales no estan predefinidos y debe haber una opcion tambien para agregar un nuevo jurado o testigo. También alguna opcion para visualizar los jurados y testigos asignados a cada jurisdicción. Esto es una tabla con un CRUD simple para cada uno. Los datos de cada tabla son los excel Plantilla Jurados ... y Platilla Testigos ... en el folder data/usar/ del repositorio.

---

## Otros datos a mostrar por zona (solo para departamentos/municipios y puestos)

Además de esos datos, en dependencia a una opcion desplegable que se refiera a los años posibles, se mostraran los datos correspondientes a los resultados electorales del año seleccionado. Estos resultados pueden llegar hasta el nivel de puesto, o su suma a nivel municipio o departamento. Un ejemplo de estos datos se encuentra en la carpeta 2022/ donde tambien se debe seleccionar si se desea ver los resultados de Camara o de Senado.

## API (endpoints sugeridos / contrato mínimo)

`/api/v1/auth/` — login, refresh token  
`/api/v1/jurisdicciones/` — GET (lista), POST, PUT, DELETE  
`/api/v1/jurisdicciones/{id}/children` — GET (p. ej. obtener municipios de un departamento)  
`/api/v1/puestos/` — GET con filtros (municipio, bounding box, zoom), POST, PUT, DELETE  
`/api/v1/imports/excel` — POST (subir Excel para importación y validación)  
`/api/v1/asignaciones/` — CRUD para revisores/comités  
`/api/v1/search` — búsqueda global (municipio, puesto, persona)  
`/api/v1/analytics/` — endpoints para gráficos sencillos por año/ jurisdicción

---

## Frontend — vistas y componentes

Debe ser una SPA (Single Page Application) con navegación fluida entre capas y sin recargas completas. El diseño debe ser limpio y funcional, con foco en la usabilidad para usuarios institucionales (no técnicos).
También debe ser user friendly y visualmente bonito.

**Stack recomendado**: React + Vite + TypeScript + Tailwind CSS (o Chakra/UI)  
**Map library**: Mapbox GL (privado) o MapLibre GL (open-source) OR Leaflet (más simple).  
**Componentes clave**:

- Shell: header con selector de Capa (dropdown), buscador, perfil de usuario.
- Mapa central: soporte para polígonos (GeoJSON/tiles) + puntos (puestos), clustering, popups.
- Sidebar / panel info: detalles de la jurisdicción seleccionada, tablas (ag-grid o react-table), botones de edición/import.
- Modal / formulario: CRUD para asignar revisores, subir Excel, editar puesto.
- Página de administración: gestión de usuarios/roles, logs, imports.

**UX sugerida**: Transiciones suaves al hacer drill-down, highlight de geometría seleccionada, breadcrumbs para volver a capas superiores.

---

## Rendimiento y escalabilidad (recomendaciones técnicas)

- **Base espacial**: PostgreSQL + PostGIS para consultas espaciales (contains, within, nearest).
- **Vector tiles**: si la app tendrá muchos polígonos y/o puntos, considere generar vector tiles (tip: Tippecanoe, TileServer GL) y servir tiles para que el cliente no cargue GeoJSON pesados.
- **Clustering** de puntos a cliente para miles de puestos (o server-side clustering para tens/hundreds of thousands).
- **Simplificación TopoJSON** (mapshaper) para reducir tamaño en el frontend cuando use GeoJSON.
- **Cache**: Redis para consultas frecuentes y resultados agregados por año/ jurisdicción.
- **Escalado**: Usa las mejores practicas de programacion, separar API y frontend, despliegue en cloud (AWS/GCP/DO).

---

## Seguridad y privacidad

- Autenticación JWT + HTTPS.
- Roles y scope por jurisdicción (un editor solo puede modificar su departamento/municipio).
- Validación y sanitización en imports Excel.
- Logs/audit trail para actividad sensible.

---

## Pipeline de ingestión de datos (flujo sugerido)

1. Subir Excel / CSV con puestos o tablas de jurados.
2. Validación automática (coincidencia con DIVIPOLA: códigos y nombres).
3. Geocodificación si faltan coordenadas (opcional — preferible evitar y pedir coordenadas al cliente).
4. Inserción en `puesto_electoral` con control de duplicados.
5. Matching: relacionar filas con polígonos usando `ST_Contains(polygon, point)` para asignar municipio automáticamente.

---

## Pruebas, Documentación y Entregables

**Entregables mínimos:**

- Código backend (FastAPI) con tests unitarios básicos.
- Esquema de DB y scripts de migración (Alembic).
- Frontend (React) con páginas para cada capa, búsqueda y CRUD.
- Script/importador para convertir shapefiles → GeoJSON/TopoJSON y proceso de simplificación.
- Manual de usuario breve y guía de despliegue (Docker + docker-compose).
- Conjunto de pruebas (unitarias y E2E mínimas).

**Criterios de aceptación (ejemplos):**

- Puede seleccionar una "Capa" del dropdown y el mapa centra la jurisdicción.
- Al clickear un departamento, se muestran y permiten navegar sus municipios.
- Subida de Excel con puestos valida y crea marcadores que aparecen en el mapa.
- Asignación de un revisor a una jurisdicción queda registrada y visible.

---

## Estimación (referencia en PDF del cliente)

El PDF incluye una propuesta de etapas y estimación: **MVP 50h + Refinamiento/UX/Despliegue 30h = 80h** (total) con honorarios y costos indicados por el autor del PDF. Recomendamos revisar y ajustar la estimación tras definir alcance del MVP y tras decidir si se hace Streamlit prototipo o implementación completa en FastAPI+React. fileciteturn0file0

---

## Recomendaciones y sugerencias prácticas

- **Usar los códigos DIVIPOLA como llave maestra** para ligar datos tabulares con polígonos. citeturn0search2
- **Evitar GeoJSON masivo en frontend**: usar TopoJSON o vector tiles para mapas de producción.
- **Definir workflows de importación** (plantillas Excel con validaciones) antes de comenzar el desarrollo para evitar retrabajo.
- **UX**: prototipar interacciones críticas (dropdown de capas + drill-down), idealmente con Figma o un prototipo rápido.
- **Backups** periódicos y snapshots de la BD (especialmente por la información crítica de personas y cargos).
- **Considerar accesibilidad** (WCAG) si el cliente planea uso público o institucional.

---

## Tareas en las que puedes apoyarte, debes añadir, eliminar, mejorarlas como consideres

**Sprint 0 — Preparación y prototipo rápido**

1. Crear repositorios (backend / frontend) con estructura básica.
2. Preparar entorno Postgres + PostGIS.
3. Revisar todos los archivos en data/usar/ y ver cuáles sirven para hacer los mapas y luego colocar latitud/longitud
4. Cargar dataset de puestos (las coordenadas proporcionadas por el cliente) en DB y comprobar `ST_Contains` match.
5. Entregar prototipo MVP (opcional Streamlit) que muestre las capas, dropdown y drill-down.

**Sprint 1 — API básica y frontend**

1. Implementar modelos DB y migraciones.
2. Endpoints CRUD para jurisdicciones.
3. Frontend básico (React) con mapa, dropdown de capas, popups y búsqueda.
4. Importador de Excel con validación básica.
5. Tests básicos y documentación.

**Sprint 2 — Funcionalidades por jurisdicción**

1. CRUD para revisores, comités, jurados, testigos.
2. No es necesario autenticacion por el momento.
3. Export / Import avanzado y logs.
4. UI para asignaciones y edición in-place.

**Sprint 3 — Rendimiento y despliegue**

1. Optimización (tiles, simplificación).
2. Preparar CI/CD y despliegue.
3. Manual de usuario, pruebas E2E, entrega.

## Qué no tener en cuenta:

Por el momento no hace falta autenticacion en la página ni modulos de seguridad. No añadas otras funcionalidades además de las aquí expuestas (a menos que sea necesaria para llegar a las aqui expuestas, igual me puedes preguntar).

---

## Recursos y herramientas sugeridas (rápido)

- Backend: FastAPI, SQLAlchemy, Alembic, pydantic.
- DB: PostgreSQL + PostGIS.
- Frontend: React + TypeScript + Tailwind (o Chakra), Vite.
- Map: MapLibre GL / Mapbox GL / Leaflet + React-Leaflet.
- Geo tools: GDAL/OGR, mapshaper, Tippecanoe (tiles), QGIS para inspección.
- CI/CD: GitHub Actions.
- Contenedores: Docker + docker-compose.
`
## Ayuda:

La carpeta dashboard_sgr es un proyecto donde tambien utilizan un mapa de colombia, te puedes apoyar un poco en lo que consideres.
