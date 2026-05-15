import companyLogo from '../../../../data/images/logo.png';
import { useIsMobile } from '../../hooks/useIsMobile';

export function Topbar() {
  const isMobile = useIsMobile();
  return (
    <header
      className="civ-card flex shrink-0 items-center justify-between"
      style={{ padding: isMobile ? '12px 14px' : '18px 22px', gap: isMobile ? 12 : 24 }}
    >
      <div className="flex items-center min-w-0" style={{ gap: isMobile ? 10 : 16 }}>
        <div
          className="grid shrink-0 place-items-center overflow-hidden"
          style={{
            width: isMobile ? 60 : 88,
            height: isMobile ? 40 : 58,
            borderRadius: 12,
            background: '#0c1a23',
            padding: '4px 6px',
            boxShadow: '0 4px 12px rgba(12,26,35,0.22)',
          }}
        >
          <img
            src={companyLogo}
            alt="E-Day Tech"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
        <div className="min-w-0">
          <div
            className="flex items-center gap-2 truncate"
            style={{ fontWeight: 700, fontSize: isMobile ? 17 : 19, letterSpacing: '-0.01em', color: 'var(--civ-text)' }}
          >
            <span className="truncate">Resultados Electorales</span>
            <span
              className="hidden h-3.5 w-6 shrink-0 overflow-hidden rounded-sm sm:inline-flex"
              aria-label="Colombia"
              title="Colombia"
            >
              <span className="h-full flex-1" style={{ background: '#FCD116' }} />
              <span className="h-full flex-1" style={{ background: '#003893' }} />
              <span className="h-full flex-1" style={{ background: '#CE1126' }} />
            </span>
          </div>
          <div
            className="hidden truncate sm:block"
            style={{ fontSize: 13, color: 'var(--civ-text-muted)', marginTop: 3 }}
          >
            Colombia · Visualización por departamento, municipio y puesto
          </div>
        </div>
      </div>
    </header>
  );
}
