import { ElectoralMap } from '../ElectoralMap';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

export function MapaView() {
  const { modulo, anio } = useUIFiltersStore();
  const activeView =
    modulo === 'resultados' ? 'resultados' :
    modulo === 'jurados-testigos' ? 'jurados-testigos' :
    'puestos';
  const selectedYear = modulo === 'resultados' ? anio : 2022;

  return (
    <div
      className="civ-card flex flex-col overflow-hidden"
      style={{ height: 'min(78vh, 820px)', minHeight: 520 }}
    >
      <div
        className="flex shrink-0 items-center justify-between"
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--civ-border)',
        }}
      >
        <div>
          <div className="civ-eyebrow">Mapa</div>
          <div className="civ-card-title" style={{ marginTop: 4 }}>
            {modulo === 'resultados' ? `Colombia · Resultados ${anio}` :
             modulo === 'puestos' ? 'Colombia · Puestos electorales' :
             'Colombia · Jurados y Testigos'}
          </div>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <ElectoralMap activeView={activeView} selectedYear={selectedYear} />
      </div>
    </div>
  );
}
