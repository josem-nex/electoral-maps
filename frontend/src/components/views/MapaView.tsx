import { ElectoralMap } from '../ElectoralMap';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { JurisdictionPanel } from './JurisdictionPanel';

export function MapaView() {
  const { modulo, anio } = useUIFiltersStore();
  const activeView =
    modulo === 'resultados' ? 'resultados' :
    modulo === 'jurados-testigos' ? 'jurados-testigos' :
    'puestos';
  const selectedYear = modulo === 'resultados' ? anio : 2022;

  const mapHeight = 'min(78vh, 820px)';

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]"
    >
      <div
        className="civ-card flex flex-col overflow-hidden"
        style={{ height: mapHeight, minHeight: 520 }}
      >
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--civ-border)',
          }}
        >
          <div className="min-w-0">
            <div className="civ-eyebrow">Mapa</div>
            <div className="civ-card-title truncate" style={{ marginTop: 4 }}>
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

      <div
        className="lg:overflow-hidden"
        style={{
          height: 'auto',
        }}
      >
        <div className="lg:h-[min(78vh,820px)] lg:min-h-[520px] lg:overflow-y-auto">
          <JurisdictionPanel />
        </div>
      </div>
    </div>
  );
}
