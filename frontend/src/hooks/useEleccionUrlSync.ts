import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIFiltersStore } from '../stores/uiFiltersStore';

function moduloToPath(modulo: string, anio: number): string {
  if (modulo === 'resultados') return `/resultados/${anio}`;
  if (modulo === 'puestos') return '/puestos';
  if (modulo === 'jurados-testigos') return '/jurados-testigos';
  return '/';
}

function pathToModulo(pathname: string): { modulo: 'resultados' | 'puestos' | 'jurados-testigos' | null; anio?: number } {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'resultados') {
    return { modulo: 'resultados', anio: Number(segments[1]) || 2022 };
  }
  if (segments[0] === 'puestos') return { modulo: 'puestos' };
  if (segments[0] === 'jurados-testigos') return { modulo: 'jurados-testigos' };
  return { modulo: null };
}

/**
 * Bidirectional sync between uiFiltersStore.modulo+anio and URL.
 * - On mount / URL change: reads URL → writes store.
 * - When store.modulo or store.anio changes via UI: writes URL.
 */
export function useEleccionUrlSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modulo, anio, setEleccion } = useUIFiltersStore();
  const lastSyncedPath = useRef<string | null>(null);

  // URL → store
  useEffect(() => {
    if (lastSyncedPath.current === location.pathname) return;
    lastSyncedPath.current = location.pathname;
    const parsed = pathToModulo(location.pathname);
    if (!parsed.modulo) return;
    if (parsed.modulo === modulo && (parsed.anio === undefined || parsed.anio === anio)) return;
    if (parsed.modulo === 'resultados') {
      // Keep existing corporacion if compatible; else default P01 for new year
      setEleccion({ modulo: 'resultados', anio: parsed.anio ?? 2022, corporacion: useUIFiltersStore.getState().corporacion });
    } else {
      setEleccion({ modulo: parsed.modulo, anio: 0, corporacion: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // store → URL
  useEffect(() => {
    const desired = moduloToPath(modulo, anio);
    const segments = location.pathname.split('/').filter(Boolean);
    const currentModuloPath = segments[0] === 'resultados'
      ? `/${segments[0]}/${segments[1] ?? ''}`
      : `/${segments[0] ?? ''}`;
    if (currentModuloPath === desired) return;
    lastSyncedPath.current = desired;
    navigate(desired, { replace: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, anio]);
}
