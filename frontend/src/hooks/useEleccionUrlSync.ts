import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useUIFiltersStore,
  type ActiveTab,
  type Modulo,
} from '../stores/uiFiltersStore';
import { ELECCIONES_FLAT } from './useEleccionesCatalog';

/**
 * Bidirectional sync between uiFiltersStore and the URL.
 *
 * URL shape:
 *   /resultados/<anio>[/<zone>/<depto>/<muni>]?corp=<id>[&cand=][&tab=][&nivel=]
 *   /puestos[/<zone>/<depto>/<muni>]?[tab=][nivel=]
 *   /jurados-testigos[/<zone>/<depto>/<muni>]?[tab=][nivel=]
 *
 * The territorial tail of the path is owned by useRouteSync; we only own
 * modulo/anio in the path and corp/cand/tab/nivel in the query string.
 */

function defaultCorpForYear(anio: number): string {
  const opts = ELECCIONES_FLAT.filter((o) => o.modulo === 'resultados' && o.anio === anio);
  if (opts.length === 0) return '001';
  return opts.find((o) => o.corporacion === 'P01')?.corporacion ?? opts[0].corporacion;
}

interface ParsedState {
  modulo: Modulo;
  anio: number;
  corporacion: string;
  candidatoFiltro: string | null;
  partidoFiltro: string | null;
  activeTab: ActiveTab;
}

function parseUrl(pathname: string, search: string): ParsedState | null {
  const segments = pathname.split('/').filter(Boolean);
  const params = new URLSearchParams(search);

  let modulo: Modulo;
  let anio = 0;
  let corporacion = '';

  if (segments[0] === 'puestos') {
    modulo = 'puestos';
  } else if (segments[0] === 'jurados-testigos') {
    modulo = 'jurados-testigos';
  } else if (segments[0] === 'resultados') {
    modulo = 'resultados';
    anio = Number(segments[1]) || 2026;
    corporacion = params.get('corp') || defaultCorpForYear(anio);
  } else {
    return null;
  }

  const tabParam = params.get('tab');
  const validTabs: ActiveTab[] = ['dashboard', 'mapa', 'reportes', 'comparador'];
  let activeTab: ActiveTab = validTabs.includes(tabParam as ActiveTab) ? (tabParam as ActiveTab) : 'mapa';
  if (activeTab === 'comparador' && modulo !== 'resultados') activeTab = 'mapa';

  return {
    modulo,
    anio,
    corporacion,
    candidatoFiltro: params.get('cand'),
    partidoFiltro: params.get('part'),
    activeTab,
  };
}

function buildUrl(state: ParsedState, currentPathname: string, currentSearch: string): string {
  const segments = currentPathname.split('/').filter(Boolean);
  const currentParams = new URLSearchParams(currentSearch);
  const currentCorp = currentParams.get('corp');

  let path: string;
  let preservedTail = '';

  // Preserve territorial tail only when the election context (modulo + anio + corp) is unchanged.
  // Any election change resets territorial navigation (see uiFiltersStore.setEleccion).
  if (state.modulo === 'resultados') {
    path = `/resultados/${state.anio}`;
    const sameContext =
      segments[0] === 'resultados' &&
      Number(segments[1]) === state.anio &&
      currentCorp === state.corporacion;
    if (sameContext) {
      preservedTail = segments.slice(2).join('/');
    }
  } else {
    path = `/${state.modulo}`;
    if (segments[0] === state.modulo) {
      preservedTail = segments.slice(1).join('/');
    }
  }
  if (preservedTail) path += '/' + preservedTail;

  const params = new URLSearchParams();
  if (state.modulo === 'resultados') params.set('corp', state.corporacion);
  if (state.candidatoFiltro) params.set('cand', state.candidatoFiltro);
  if (state.partidoFiltro) params.set('part', state.partidoFiltro);
  if (state.activeTab !== 'mapa') params.set('tab', state.activeTab);

  const search = params.toString();
  return path + (search ? '?' + search : '');
}

export function useEleccionUrlSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastWrittenRef = useRef<string>('');

  // ── URL → store ─────────────────────────────────────────────
  useEffect(() => {
    const sig = location.pathname + location.search;
    if (lastWrittenRef.current === sig) return;

    const parsed = parseUrl(location.pathname, location.search);
    if (!parsed) return;

    const store = useUIFiltersStore.getState();
    const next: Partial<typeof store> = {};
    if (store.modulo !== parsed.modulo) next.modulo = parsed.modulo;
    if (store.anio !== parsed.anio) next.anio = parsed.anio;
    if (store.corporacion !== parsed.corporacion) next.corporacion = parsed.corporacion;
    if (store.candidatoFiltro !== parsed.candidatoFiltro) next.candidatoFiltro = parsed.candidatoFiltro;
    if (store.partidoFiltro !== parsed.partidoFiltro) next.partidoFiltro = parsed.partidoFiltro;
    if (store.activeTab !== parsed.activeTab) next.activeTab = parsed.activeTab;
    if (Object.keys(next).length > 0) {
      useUIFiltersStore.setState(next);
    }
  }, [location.pathname, location.search]);

  // ── store → URL ─────────────────────────────────────────────
  const modulo = useUIFiltersStore((s) => s.modulo);
  const anio = useUIFiltersStore((s) => s.anio);
  const corporacion = useUIFiltersStore((s) => s.corporacion);
  const candidatoFiltro = useUIFiltersStore((s) => s.candidatoFiltro);
  const partidoFiltro = useUIFiltersStore((s) => s.partidoFiltro);
  const activeTab = useUIFiltersStore((s) => s.activeTab);

  useEffect(() => {
    const target = buildUrl(
      { modulo, anio, corporacion, candidatoFiltro, partidoFiltro, activeTab },
      location.pathname,
      location.search,
    );
    const current = location.pathname + location.search;
    if (target === current) return;
    lastWrittenRef.current = target;
    // replace so canonicalization (e.g. adding ?corp=… after a browser back to a
    // history entry that lost it) does not introduce a duplicate history entry.
    navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, anio, corporacion, candidatoFiltro, partidoFiltro, activeTab, location.pathname, location.search]);
}
