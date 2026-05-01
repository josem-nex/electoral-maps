import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../stores/navigationStore';
import { api } from '../api/client';
import type { Jurisdiccion } from '../stores/navigationStore';

/**
 * Reconstructs Zustand navigation state from URL on initial load,
 * refresh, or browser back/forward navigation.
 *
 * URL hierarchy: /:view(/:year)?/:zoneCode?/:deptoCode?/:muniCode?
 *
 * Parses path segments from location.pathname so ElectoralMap can be mounted
 * under a single wildcard route (e.g. /puestos/*) without remounting on depth
 * changes.
 */
export function useRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse territorial segments from pathname regardless of route depth
  const segments = location.pathname.split('/').filter(Boolean);
  // segments[0] = view ('puestos' | 'resultados' | 'jurados-testigos')
  // For resultados: segments[1] = year, territorial params start at index 2
  // For others: territorial params start at index 1
  const territorialOffset = segments[0] === 'resultados' ? 2 : 1;
  const zoneCode = segments[territorialOffset] ?? undefined;
  const deptoCode = segments[territorialOffset + 1] ?? undefined;
  const muniCode = segments[territorialOffset + 2] ?? undefined;

  const {
    currentJurisdiccion,
    selectedMunicipioCode,
    navigateTo,
    setSelectedMunicipioCode,
    reset,
  } = useNavigationStore();

  useEffect(() => {
    // Derive the view-level path for redirect fallbacks (e.g. '/puestos' or '/resultados/2026')
    const segments = location.pathname.split('/').filter(Boolean);
    const viewPath = segments[0] === 'resultados'
      ? `/${segments[0]}/${segments[1] ?? ''}`
      : `/${segments[0] ?? ''}`;

    // ── Case 1: No territorial params — ensure país level ─────────────────────
    if (!zoneCode) {
      const isAtPais = currentJurisdiccion?.layer === 'pais' && !selectedMunicipioCode;
      if (!isAtPais) reset();
      return;
    }

    // ── Case 2: Zone only, no dept — ensure zone level ────────────────────────
    if (zoneCode && !deptoCode) {
      const isAtThisZone =
        currentJurisdiccion?.layer === 'zonas' &&
        currentJurisdiccion.code === zoneCode &&
        !selectedMunicipioCode;
      if (isAtThisZone) return; // already in sync

      // Reconstruct zone navigation from catalog
      let cancelled = false;
      api.getDepartamentosCatalog().then((depts) => {
        if (cancelled) return;
        const zoneDepts = depts.filter((d) => String(d.zone_id) === zoneCode);
        if (zoneDepts.length === 0) {
          navigate(viewPath, { replace: true });
          return;
        }
        const avgLat = zoneDepts.reduce((s, d) => s + d.center_lat, 0) / zoneDepts.length;
        const avgLon = zoneDepts.reduce((s, d) => s + d.center_lon, 0) / zoneDepts.length;
        const zone: Jurisdiccion = {
          id: `zone:${zoneCode}`,
          layer: 'zonas',
          name: zoneDepts[0].zone_name ?? `Zona ${zoneCode}`,
          code: zoneCode,
          center_lat: avgLat,
          center_lon: avgLon,
          zoom: 6.6,
        };
        reset();
        navigateTo(zone);
      }).catch(() => {
        if (!cancelled) navigate(viewPath, { replace: true });
      });
      return () => { cancelled = true; };
    }

    // ── Case 3: Zone + dept (+ optional muni) ────────────────────────────────
    const isAtThisDept =
      currentJurisdiccion?.layer === 'departamentos' &&
      currentJurisdiccion.code === deptoCode;
    const muniMatches = muniCode
      ? selectedMunicipioCode === muniCode
      : selectedMunicipioCode === null;
    if (isAtThisDept && muniMatches) return; // already in sync

    // If URL has no muni but store has one, clear it (back nav from muni → depto)
    if (isAtThisDept && !muniCode && selectedMunicipioCode) {
      setSelectedMunicipioCode(null);
      return;
    }

    // Reconstruct state from URL
    let cancelled = false;

    api.getDepartamentosCatalog().then((depts) => {
      if (cancelled) return;

      const dept = depts.find((d) => d.code === deptoCode);
      if (!dept) {
        navigate(`${viewPath}/${zoneCode}`, { replace: true });
        return;
      }

      // Build zone jurisdiction from catalog
      const zoneDepts = depts.filter((d) => String(d.zone_id) === zoneCode);
      const avgLat = zoneDepts.reduce((s, d) => s + d.center_lat, 0) / (zoneDepts.length || 1);
      const avgLon = zoneDepts.reduce((s, d) => s + d.center_lon, 0) / (zoneDepts.length || 1);
      const zone: Jurisdiccion = {
        id: `zone:${zoneCode}`,
        layer: 'zonas',
        name: dept.zone_name ?? `Zona ${zoneCode}`,
        code: zoneCode!,
        center_lat: avgLat,
        center_lon: avgLon,
        zoom: 6.6,
      };

      reset();
      navigateTo(zone);
      navigateTo(dept);

      if (!muniCode) return;

      return api.getJurisdicciones('municipio', deptoCode!).then((munis) => {
        if (cancelled) return;
        const muni = munis.find((m) => m.code === muniCode);
        if (muni) {
          setSelectedMunicipioCode(muniCode, muni.name);
        } else {
          navigate(`${viewPath}/${zoneCode}/${deptoCode}`, { replace: true });
        }
      });
    }).catch(() => {
      if (!cancelled) navigate(viewPath, { replace: true });
    });

    return () => { cancelled = true; };
    // location.pathname is sufficient — zoneCode/deptoCode/muniCode are derived from it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
