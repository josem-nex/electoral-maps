# Plan de Migración — Rediseño "Cívica" → app real

> Documento de referencia para la migración de la UI actual de `electoral-maps` al rediseño propuesto en esta carpeta (`civica-*.jsx`, `civica.css`).
>
> Generado a partir de la conversación de planeación. Mantener actualizado conforme avance la implementación.

---

## 1. Contexto

La app actual (`frontend/`) usa un flujo de "selecciona vista (puestos/resultados/jurados-testigos) + año + drill territorial" desde `LandingEntryScreen`. El rediseño propuesto en `design/civica-*.jsx` reemplaza ese flujo por:

- **Topbar** con marca + chip de usuario.
- **Barra de filtros** superior: Candidato · Nivel · Tipo de Elección · Buscar.
- **4 tabs** principales: Dashboard, Mapa, Reportes, Comparador.

**Objetivo**: migrar el chrome y las vistas a la nueva estructura **sin perder ninguna funcionalidad** existente: resultados (presidenciales 2018/2022/2026, congreso, territoriales 2019/2023), puestos electorales y jurados/testigos (incluyendo carga CSV y borrado).

### Decisiones acordadas

1. **Tipo de Elección** decide el módulo activo: presidencial/congreso/territorial (resultados), puestos, jurados-testigos. Al cambiarlo se reconfiguran las tabs disponibles.
2. **Dashboard** se construye con los endpoints actuales (agregando varias requests en cliente; sin nuevos endpoints).
3. **Candidato** se puebla dinámicamente según el tipo de elección; se oculta cuando el módulo es puestos o jurados-testigos.
4. Se mantienen las **URLs territoriales actuales** (`/puestos/...`, `/resultados/:year/...`, `/jurados-testigos/...`) y `useRouteSync`. Se reemplaza `LandingEntryScreen` por el nuevo chrome.

---

## 2. Estado actual del frontend (referencia)

- **Stack**: React 18 + Vite 7 + React Router v7 + Zustand 5 + Tailwind 4 + Leaflet + TypeScript.
- **Rutas**:
  - `/` → `LandingEntryScreen`
  - `/puestos/*` → `ElectoralMap activeView='puestos'`
  - `/resultados/:year/*` → `ElectoralMap activeView='resultados'`
  - `/jurados-testigos/*` → `ElectoralMap activeView='jurados-testigos'`
- **Componente principal**: `frontend/src/components/ElectoralMap.tsx` (1544 líneas, Leaflet + GeoJSON).
- **Store**: `useNavigationStore` (Zustand) — capa actual, jurisdicción, navegación drill-down.
- **API**: `frontend/src/api/client.ts` — endpoints `/api/v1/jurisdicciones`, `/puestos`, `/search`, `/geojson/*`, `/catalog/departamentos`, `/resultados/electorales`, `/analytics/territorio`, `/personal/*`.

---

## 3. Arquitectura propuesta

### 3.1 Mapeo módulo → tabs disponibles

| Módulo (Tipo de Elección) | Dashboard | Mapa | Reportes | Comparador |
|---|---|---|---|---|
| Presidencial / Congreso / Territorial | ✓ KPIs, top 10, donut partidos | ✓ ElectoralMap (resultados) | ✓ tabla por departamento | ✓ comparar 2 años |
| Puestos electorales | ✓ KPIs (puestos, mesas, potencial) | ✓ ElectoralMap (puestos) | ✓ tabla puestos por depto | — (oculto) |
| Jurados y Testigos | ✓ KPIs (PersonalEstado) + carga CSV | ✓ ElectoralMap (jurados-testigos) | ✓ tabla conteos por depto | — (oculto) |

El `tab` activo se mantiene en estado de la app raíz; cambios de módulo lo resetean a `mapa` (vista por defecto, equivalente al flujo actual).

### 3.2 Estado / stores

- **Reusar** `useNavigationStore` (`frontend/src/stores/navigationStore.ts`) sin tocar.
- **Crear** nuevo `useUIFiltersStore` (Zustand):
  ```ts
  {
    modulo: 'resultados' | 'puestos' | 'jurados-testigos',
    anio: number,
    corporacion: string,           // '001' Senado, 'P01' Pres 1ra vuelta, etc.
    candidatoFiltro: string | null,
    nivel: 'departamentos' | 'municipio',
    searchQuery: string,
    activeTab: 'dashboard' | 'mapa' | 'reportes' | 'comparador'
  }
  ```
  Reemplaza el estado disperso entre `App.tsx`, `ResultadosElectoralesPanel`, `JuradosTestigosPanel`.
- **Sincronización con URL**: extender `useRouteSync` para leer/escribir `modulo+anio+corporacion` desde el path existente.

### 3.3 Componentes nuevos (TSX, Tailwind)

```
frontend/src/components/shell/
  AppShell.tsx              # layout: <Topbar/><Tabs/><FilterBar/><main>
  Topbar.tsx                # logo + título + chip usuario
  Tabs.tsx                  # 4 tabs, filtra según módulo
  FilterBar.tsx             # 4 selects + acciones
  MobileFilterDrawer.tsx    # bottom sheet ≤640px
  ActiveFiltersChips.tsx    # chips arriba del contenido en mobile
  CandidatoSelect.tsx       # poblado dinámico según año+corporación
  TipoEleccionSelect.tsx    # dropdown agrupado por categoría

frontend/src/components/views/
  DashboardView.tsx
  MapaView.tsx
  JurisdictionPanel.tsx     # panel lateral / bottom sheet
  ReportesView.tsx
  ComparadorView.tsx
  PuestoModal.tsx
  JuradosUploadModal.tsx    # extraído del JuradosTestigosPanel actual

frontend/src/stores/
  uiFiltersStore.ts         # Zustand

frontend/src/hooks/
  useEleccionesCatalog.ts   # fuente única de TIPOS_ELECCION
  useDashboardData.ts       # agregaciones para Dashboard
```

### 3.4 Vistas por tab

#### `DashboardView.tsx`
- **Resultados**: KPIs (total votos, deptos, municipios, participación) iterando `getResultadosElectorales` en nivel país. `Top10Bars` (top 10 deptos por votos del candidato; `Promise.all` de 33 requests, cacheado en store). `Donut` con distribución por partido.
- **Puestos**: KPIs derivados de `getAnalyticsTerritorio('pais', ...)`.
- **Jurados-Testigos**: KPIs de `getPersonalEstado()`.

#### `MapaView.tsx`
- Wrapper que monta el **`ElectoralMap` real** (`frontend/src/components/ElectoralMap.tsx`) dentro de un card.
- Pasa `activeView` derivado del módulo y `selectedYear`.
- **Borra `colombia-map.js` SVG placeholder** del diseño; no se usa.
- Panel lateral derecho `JurisdictionPanel.tsx` (nuevo) — maquetado base de `civica-part2.jsx:136`, conectado a:
  - `getAnalyticsTerritorio` para stats agregados.
  - `getResultadosElectorales` para "Resultados por candidato" (módulo=resultados).
  - `getPersonalConteo` (módulo=jurados-testigos).
  - Drill-down vía `useNavigationStore.navigateTo`.
- **Mobile** (`≤640px`): el panel se convierte en bottom sheet draggeable (50% → 90%).

#### `ReportesView.tsx`
Tabla migrada de `civica-part2.jsx:203` (CivicaReportes). Filas pobladas según módulo:
- Resultados: una fila por departamento, votos del candidato filtrado.
- Puestos: filas con `puestos_count`, `mesas_sum`, `total_sum` por depto.
- Jurados-testigos: filas con conteos jurado/testigo por depto.
- **Mobile**: tabla → cards apiladas (`md:hidden` / `hidden md:table`).

#### `ComparadorView.tsx`
- Sólo visible para módulo=resultados.
- Selector de 2 (año, corporación), monta 2 mini-mapas (versión simplificada de `ElectoralMap` con `interactive={false}`).
- Mobile: stack vertical.

### 3.5 Modal de puesto

`PuestoModal.tsx` — migra `civica-part2.jsx:378`. Conecta a:
- `getPuestos` (filtrar por código).
- Si módulo=jurados-testigos: muestra adicionalmente `getPersonalPuesto(codigo)`.
- Mobile: full-screen.

### 3.6 Carga / borrado de jurados-testigos

No tiene tab dedicada en el diseño. **Solución**: cuando módulo=jurados-testigos, agregar botón "Cargar CSV" en la `FilterBar` (acción primaria) que abre `JuradosUploadModal` con la UI actual de `JuradosTestigosPanel` (upload + delete). Preserva 100% la funcionalidad de `cargarPersonal` y `eliminarPersonal`.

---

## 4. Archivos a modificar

- `frontend/src/App.tsx` — montar `AppShell` en lugar del layout actual; mantener `<Routes>` por debajo.
- `frontend/src/components/LandingEntryScreen.tsx` — eliminar (o redirect a `/resultados/2022`).
- `frontend/src/hooks/useRouteSync.ts` — extender para leer `modulo` y `tab` del state si los queremos en URL (opcional, fase 2).
- `frontend/src/components/ElectoralMap.tsx` — sin cambios funcionales; verificar que funciona embebido en el card de `MapaView` (sin chrome `MapInfoRail`). Mover `MapInfoRail`/`TerritorioStatsPanel` a `JurisdictionPanel.tsx`.
- `frontend/src/components/ResultadosElectoralesPanel.tsx` — extraer fetching a hook reusable; el panel se monta dentro del nuevo `JurisdictionPanel`.
- `frontend/src/components/JuradosTestigosPanel.tsx` — dividir: carga/borrado a `JuradosUploadModal`, visualización a `JurisdictionPanel`.

## 5. Archivos a borrar

- `design/colombia-map.js` (placeholder SVG, ya no se necesita).
- `design/data.js` (mock).
- Carpeta `design/` puede archivarse fuera del repo tras la migración (opcional).
- `frontend/src/components/LandingEntryScreen.tsx` (si se opta por redirect directo).

---

## 6. Estilos

- **Migrar `design/civica.css` → Tailwind**: las clases `civica-*` se reescriben como utility classes.
- Variables CSS (`--civ-primary`, `--civ-border`) van a `frontend/src/index.css` como `:root` vars; el resto se infiere de la paleta Tailwind.
- Densidad: ignorar el toggle `compact/comfortable` (no es producción).
- Color primario: `#1D4E89` como `--civ-primary`.

---

## 7. Responsive

Breakpoints (Tailwind): `sm: 640`, `md: 768`, `lg: 1025`.

| Elemento | Mobile (`≤640`) | Tablet | Desktop |
|---|---|---|---|
| Topbar | logo+título compacto, chip en hamburguesa | igual desktop | completo |
| Tabs | `overflow-x-auto`, snap, activo visible | grid | grid |
| Filtros | botón "Filtros" → bottom sheet + chips activos | colapsa actions | barra completa |
| KPIs | grid 2×2 | 2×2 / 4×1 | 4×1 |
| Top10+Donut | stack vertical (donut arriba) | 2 cols | 2 cols |
| Mapa | `w-full h-[60vh]`, panel = bottom sheet | grid 1col + panel debajo | grid 2 cols |
| Reportes | cards apiladas (sparkline pequeño) | tabla | tabla |
| Comparador | stack vertical | stack | 2 cols |
| Modal puesto | full-screen | modal | modal |
| Tap targets | min `44px` (`min-h-11`) | — | — |

---

## 8. Plan de ejecución (incremental, mergeable por fases)

### Fase 1 — Setup del shell
Crear `uiFiltersStore`, `useEleccionesCatalog`, `AppShell`, `Topbar`, `Tabs`, `FilterBar` (sin lógica conectada — sólo UI con state local). Render dentro de `App.tsx` por encima de las rutas existentes. **Verificar que la app vieja sigue funcionando debajo.**

### Fase 2 — Tab Mapa
Mover `ElectoralMap` dentro de `MapaView` con card chrome; reemplazar `MapInfoRail` por nuevo `JurisdictionPanel` (desktop). Conectar filtros (candidato + tipo elección) al store y propagar a `ElectoralMap`.

### Fase 3 — FilterBar dinámico
Poblar Candidato según año/corporación; conectar Buscar a `apiClient.search`; conectar Nivel a `useNavigationStore`.

### Fase 4 — Tab Reportes (resultados)
Tabla por departamento con sparkline.

### Fase 5 — Tab Dashboard (resultados)
KPIs + Top10 + Donut.

### Fase 6 — Tab Comparador
2 mini-mapas + selectores.

### Fase 7 — Módulo Puestos
Variantes de Dashboard/Mapa/Reportes para `activeView='puestos'`.

### Fase 8 — Módulo Jurados-Testigos
Variantes + `JuradosUploadModal`.

### Fase 9 — Modal Puesto
Con datos reales y enganchado al click sobre marker en el mapa.

### Fase 10 — Responsive
Bottom sheets, drawer de filtros, cards apiladas en Reportes, full-screen modal.

### Fase 11 — Cleanup
Eliminar `LandingEntryScreen`, código muerto de paneles antiguos, carpeta `design/`.

---

## 9. Verificación end-to-end

Tras cada fase:
- `cd frontend && bun run dev` — la app arranca sin errores.
- `bun run build` — typecheck pasa.
- Probar en navegador (golden path por módulo):
  - **Resultados**: cambiar a "Presidenciales 2022 1ra vuelta" → click en Antioquia → panel muestra ganador + resultados → drill a municipio → tabla Reportes muestra mismos datos → Comparador con 2018 1ra vs 2022 1ra renderiza ambos mini-mapas.
  - **Puestos**: cambiar tipo elección a "Puestos electorales" → mapa muestra markers en Bogotá → click en marker abre modal con coords/mesas → Reportes muestra conteo por depto.
  - **Jurados-Testigos**: cambiar a "Jurados y Testigos" → KPIs muestran conteos de `/personal/estado` → botón "Cargar CSV" abre modal → upload de CSV de prueba → conteo se refresca.
  - **Mobile** (DevTools 375px): tabs scrollean, botón Filtros abre drawer, mapa ocupa pantalla, panel sube como bottom sheet.
- Deep-link: pegar URL `/resultados/2022/.../05001` directamente → `useRouteSync` reconstruye estado y navega al mapa correcto.

---

## 10. Riesgos / supuestos

- **Performance del Dashboard**: iterar 33 departamentos vía `Promise.all` sobre `getResultadosElectorales` puede ser pesado. Mitigación: cachear resultados en `uiFiltersStore` por (año+corporación), invalidar al cambiar filtros.
- **Bottom sheet draggeable**: implementación custom (~80 líneas con `pointer events`) o agregar dependencia (`vaul` ~6kb). Recomendación: empezar custom.
- Tweaks (color primario configurable, densidad) del diseño se ignoran en producción; si se requieren después, se añade un panel de settings.

---

## 11. Estado de avance

- [x] Fase 1 — Setup del shell
- [x] Fase 2 — Tab Mapa
- [x] Fase 3 — FilterBar dinámico
- [x] Fase 4 — Tab Reportes
- [x] Fase 5 — Tab Dashboard
- [x] Fase 6 — Tab Comparador
- [x] Fase 7 — Módulo Puestos
- [x] Fase 8 — Módulo Jurados-Testigos
- [x] Fase 9 — Modal Puesto
- [x] Fase 10 — Responsive
- [ ] Fase 11 — Cleanup
