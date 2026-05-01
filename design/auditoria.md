# Auditoría de estado (reset para retomar implementación)

Documento reorganizado para continuar desde pendientes reales, tomando como base:
- `design/MIGRATION_PLAN.md` (plan original por fases)
- estado actual del código en `frontend/src/*`
- últimos hallazgos reportados en esta misma auditoría

---

## 1) Estado general

La migración **está avanzada**, pero aún hay inconsistencias de estado/sincronización que explican los bugs de filtros reportados (tipo de elección/año/corporación vs navegación territorial y panel derecho).

Para retomar: considerar **Fase 1 y Fase 2 completadas** y **Fase 3 parcialmente completada**.

---

## 2) Verificación de fases 1–3

### Fase 1 — Setup del shell → **COMPLETA**

✅ Implementado:
- `AppShell`, `Tabs`, `FilterBar`, `MobileFilterDrawer`, `ActiveFiltersChips`
- `uiFiltersStore`
- `useEleccionesCatalog`
- Ruteo principal con shell (`App.tsx`)

Notas:
- Se removió el user chip del topbar (alineado con decisión de no mostrar UI sin lógica de auth).
- Default de entrada ya está en resultados 2026 (`/resultados/2026?corp=001`).

### Fase 2 — Tab Mapa → **COMPLETA (base funcional)**

✅ Implementado:
- `MapaView` con layout mapa + panel derecho (`JurisdictionPanel`)
- `ElectoralMap` embebido en card
- Panel lateral integrado por módulo
- Control de consulados en mapa (incluye selector/dropdown)
- Se eliminó el stack viejo de componentes de panel (no aparece `MapInfoRail`)

### Fase 3 — FilterBar dinámico → **PARCIAL**

✅ Implementado:
- `TipoEleccionSelect` conectado a store
- `CandidatoSelect`/`PartidoSelect` dinámicos por elección
- `SearchBar` conectada a navegación territorial
- Acción de jurados/testigos sólo visible en módulo correspondiente

⚠️ Pendiente/incompleto respecto al plan:
- El control explícito de **Nivel** en la FilterBar (definido en `MIGRATION_PLAN.md`) no está como filtro dedicado.
- Persisten bugs de sincronización/limpieza de estado al cambiar elección y navegar en mapa (detallados abajo).

---

## 3) Bugs vigentes a resolver antes de seguir fases nuevas

## BUG-01: Desalineación elección vs ruta/estado al navegar territorios — ✅ RESUELTO

Síntoma reportado:
- Se selecciona presidencial 2018, pero al navegar por zonas/departamentos/municipios termina apareciendo 2026 en ruta/panel o se mezclan datos.

Causa raíz identificada:
- `useEleccionUrlSync.buildUrl` solo descartaba la cola territorial cuando cambiaba el año, pero la preservaba al cambiar **solo corporación**, dejando un path territorial incoherente con la nueva elección.
- `App.tsx` cargaba `localStorage.civica.lastPath` en `EntryRedirect`, lo cual restauraba un path obsoleto (con elección anterior) al entrar a la app por raíz.

Fix aplicado (frontend):
- `frontend/src/hooks/useEleccionUrlSync.ts`: `buildUrl` ahora compara también `corp` actual vs `state.corporacion` y descarta la cola territorial ante cualquier cambio de elección (modulo + anio + corp).
- `frontend/src/stores/uiFiltersStore.ts`: `setEleccion` y `setModulo` ahora invocan `useNavigationStore.getState().reset()` antes de mutar filtros, asegurando que la navegación territorial se reinicie en sincronía con la elección.
- `frontend/src/App.tsx`: eliminado el almacenamiento/lectura de `civica.lastPath`. La entrada siempre redirige a `/resultados/2026?corp=001`.

## BUG-02: Panel derecho conserva datos visuales de contexto previo — ✅ RESUELTO

Síntoma reportado:
- "Se queda pegado" ganador/porcentaje/partido al cambiar tipo de elección o avanzar territorialmente.

Causa raíz identificada:
- `JurisdictionPanel` ponía `loading=true` pero no limpiaba `stats`/`resultados`/`personal` antes del fetch. `ResultadosSection` muestra "Cargando…" solo si `!winner`, así que con datos viejos en estado nunca se veía el loading: se mostraba el dato viejo durante toda la transición.

Fix aplicado:
- `frontend/src/components/views/JurisdictionPanel.tsx`: cada uno de los 3 `useEffect` ahora limpia (`setStats(null)` / `setResultados(null)` / `setPersonal(null)`) inmediatamente antes de iniciar la nueva petición, garantizando que no se muestre data residual de contexto previo.

## BUG-04: Click handlers de zona/depto con `location.search` stale tras cambiar elección — ✅ RESUELTO

Síntoma reportado:
- Tras cambiar el Tipo de Elección, al seleccionar una zona en el mapa la elección "se revierte" a la anterior; al continuar y seleccionar un departamento se vuelve a sincronizar.

Causa raíz:
- `handleZoneClick` y `handleDepartmentClick` (en `frontend/src/components/ElectoralMap.tsx`) usaban `location.search` por closure. react-leaflet no re-monta el GeoJSON de zonas si la data subyacente no cambia, así que el handler quedaba bound a un closure con el `?corp=...` previo. El `navigate()` del click empujaba la URL con el corp viejo, y el `URL→store` revertía la elección.

Fix aplicado:
- `frontend/src/components/ElectoralMap.tsx`: zone/dept click handlers ahora usan `searchRef.current`, `navigateRef.current`, `activeViewRef.current` y `selectedYearRef.current` (refs ya existentes para el muni handler), garantizando que el closure siempre lea el valor más reciente.

## BUG-05: Back button deja URLs sin `?corp=...` y entradas duplicadas en el historial — ✅ RESUELTO

Síntoma reportado:
- En `/resultados/2026/6/72/72001?corp=001`, al ir atrás aparece `/resultados/2026/6/72` (sin corp), un segundo back no hace nada, y un tercero salta a `/resultados/2026/6/72?corp=001`.

Causa raíz:
- El efecto `store→URL` de `useEleccionUrlSync` solo dependía del estado de filtros, no de `location`. Cuando el browser hacía pop a una entrada de historia sin `?corp=...`, ningún efecto canonicalizaba la URL, dejando entradas redundantes y URLs inconsistentes con el estado.

Fix aplicado:
- `frontend/src/hooks/useEleccionUrlSync.ts`: las deps del efecto `store→URL` ahora incluyen `location.pathname` y `location.search`. Ante cualquier mismatch entre estado y URL, se hace `navigate(target, { replace: true })` para colapsar/canonicalizar sin agregar entradas al historial.

## BUG-03: Limpieza incompleta de estado al cambiar Tipo de Elección — ✅ RESUELTO

Síntoma reportado:
- Cambios de elección no siempre reinician todas las variables derivadas (filtros y/o selección territorial) de forma consistente.

Fix aplicado:
- `frontend/src/stores/uiFiltersStore.ts`: `setEleccion` y `setModulo` ahora resetean explícitamente `candidatoFiltro`, `partidoFiltro`, `searchQuery` **y** la navegación territorial (`useNavigationStore.reset()`). `setModulo` ya no preserva el `candidatoFiltro` previo (era inconsistente: el filtro pertenece a una corporación específica que cambia con el módulo).

---

## 4) Decisiones de producto ya confirmadas (mantener)

1. Default/fallback: **Senado 2026** cuando aplique.
2. Comparador: mantener versión actual (sin mini-mapas coropléticos).
3. No agregar UI sin lógica real detrás (ej. auth fake).
4. Jurados upload/delete: mostrar opción sólo en módulo jurados-testigos.
5. Mantener opción de **consulados** en mapa (con dropdown).

---

## 5) Qué está ya limpio / removido

El árbol de `frontend/src/components/` ya está reducido a:
- `ElectoralMap.tsx`
- `SearchBar.tsx`
- `shell/`
- `views/`

No se observan referencias activas al `LandingEntryScreen` ni a paneles legacy en esa carpeta.

---

## 6) Backlog para reiniciar implementación (sin ejecutar aún)

### Bloque A — Correcciones críticas (prioridad alta) — ✅ COMPLETO

1. ✅ Corregir sincronización elección-ruta-store (BUG-01).
2. ✅ Forzar limpieza visual coherente del panel derecho en cambios de contexto (BUG-02).
3. ✅ Aplicar política explícita de reset de estado al cambiar tipo de elección (BUG-03): el cambio de elección **resetea siempre la navegación territorial a país**, limpia filtros derivados (candidato/partido) y `searchQuery`.

Política de reset definida:
- Cualquier cambio de elección (modulo + anio + corp) → reset de navegación territorial + limpieza de filtros derivados.
- El filtro `Nivel` original del MIGRATION_PLAN queda formalmente **reemplazado** por la navegación territorial existente (drill-down vía mapa/SearchBar). No se reincorpora como control independiente.

### Bloque B — Cierre de Fase 3

4. ✅ Documentado: filtro **Nivel** queda reemplazado por la navegación territorial drill-down. No se agrega a FilterBar.

### Bloque C — Verificación de fases posteriores (4–10)

Según `design/MIGRATION_PLAN.md` §11, las fases 4–10 figuran como completadas. Verificación contra el diseño "civica" y alineación de tokens:

5. ✅ Fase 4 (Reportes) — `ReportesView.tsx`. Tabla desktop y cards mobile alineadas con tokens `var(--civ-*)`. Mobile cards usan `civ-card`, `civ-eyebrow`, `var(--civ-primary)` para destacar el valor primario.
6. ✅ Fase 5 (Dashboard) — `DashboardView.tsx`. KPI cards ya usaban `civ-card`. `Top10Bars` y `Donut` migrados de `slate-*`/`blue-*` Tailwind a tokens `var(--civ-*)` + `var(--civ-primary)`.
7. ✅ Fase 6 (Comparador) — `ComparadorView.tsx`. Header, MiniStats, top 5 partidos y winner card migrados a tokens civica. Selector de elección con estilo consistente con `CandidatoSelect`.
8. ✅ Fase 7 (Puestos) y Fase 8 (Jurados-Testigos) — variantes ya implementadas vía `MapaView`/`DashboardView`/`ReportesView` switch por `modulo`. Acción "Cargar CSV" expuesta solo en módulo jurados-testigos vía `JuradosUploadModal`.
9. ✅ Fase 9 (Modal Puesto) — `PuestoModal.tsx` rediseñado: layout 2-col más amplio, tokens civica, sección de resultados con top 3 partidos × top 3 candidatos y filtro de partido.
10. ⏳ Fase 10 (Responsive 375 / 768 / 1024 / 1920) — verificación visual manual pendiente. La estructura responsive (grid lg:, sm:, md:hidden) ya existe.
11. 🟡 Fase 11 (Cleanup) — parcial:
    - ✅ `frontend/src/components/views/PlaceholderView.tsx` eliminado (sin referencias).
    - ✅ Componentes legacy ya eliminados (en git status como `D`): `Breadcrumbs.tsx`, `JuradosTestigosPanel.tsx`, `LandingEntryScreen.tsx`, `MapInfoRail.tsx`, `MapLayout.tsx`, `PuestoDetailPanel.tsx`, `ResultadosElectoralesPanel.tsx`, `SkeletonLoader.tsx`, `TeritorioStatsPanel.tsx`, `ResponsiveLayout.test.tsx`, `MapInfoRail.test.tsx`. Pendiente: confirmar y commitear las eliminaciones.
    - ⏳ `design/colombia-map.js`, `design/data.js`, `design/civica-*.jsx`, `design/editorial*`, `design/Electoral Maps Redesign.html` — son referencia visual congelada del diseño "civica". Evaluar si se mueven fuera del repo o se conservan como referencia.

### Inconsistencias menores residuales (no bloqueantes)

Quedan usos de Tailwind `slate-*`/`blue-*` en:
- `ElectoralMap.tsx` (controles del mapa, popups)
- `SearchBar.tsx`
- `shell/NavigationStrip.tsx`, `shell/ActiveFiltersChips.tsx`, `shell/MobileFilterDrawer.tsx`
- `views/JuradosUploadModal.tsx`, `views/JuradosCrudModals.tsx`

Estos no se migraron en esta pasada para evitar cambios extensos no solicitados. Migrar a tokens civica es una mejora futura de bajo riesgo.

---

## 7) Semáforo de avance actualizado

- ✅ Fase 1 — Setup del shell
- ✅ Fase 2 — Tab Mapa
- ✅ Fase 3 — FilterBar dinámico (bugs resueltos, sync verificada)
- ✅ Fase 4 — Reportes (alineada a tokens civica)
- ✅ Fase 5 — Dashboard (alineada a tokens civica)
- ✅ Fase 6 — Comparador (alineada a tokens civica)
- ✅ Fase 7 — Módulo Puestos
- ✅ Fase 8 — Módulo Jurados-Testigos
- ✅ Fase 9 — Modal Puesto (rediseñado: layout amplio + resultados top 3×3 + filtro partido)
- 🟡 Fase 10 — Responsive (estructura presente; verificación manual pendiente)
- 🟡 Fase 11 — Cleanup (PlaceholderView eliminado; quedan: confirmar deletes en git status, decidir destino de `design/civica-*.jsx`)

