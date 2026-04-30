import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { ELECCIONES_GROUPS, findEleccion } from '../../hooks/useEleccionesCatalog';

const SELECT_STYLES: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 10px',
  border: '1px solid var(--civ-border)',
  borderRadius: 8,
  background: '#fff',
  fontSize: 13,
  color: 'var(--civ-text)',
  outline: 'none',
  cursor: 'pointer',
};

export function TipoEleccionSelect() {
  const { modulo, anio, corporacion, setEleccion } = useUIFiltersStore();
  const current = findEleccion(modulo, anio, corporacion);

  return (
    <select
      value={current?.id ?? ''}
      onChange={(e) => {
        const id = e.target.value;
        for (const g of ELECCIONES_GROUPS) {
          const opt = g.options.find((o) => o.id === id);
          if (opt) {
            setEleccion({ modulo: opt.modulo, anio: opt.anio, corporacion: opt.corporacion });
            return;
          }
        }
      }}
      style={SELECT_STYLES}
    >
      {ELECCIONES_GROUPS.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
