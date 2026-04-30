import companyLogo from '../../../../data/images/LOGO FINAL E DAY TECH.png';

export function Topbar() {
  return (
    <header
      className="civ-card flex shrink-0 items-center justify-between"
      style={{ padding: '14px 18px', gap: 24 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="grid shrink-0 place-items-center overflow-hidden"
          style={{
            width: 56,
            height: 40,
            borderRadius: 10,
            background: '#0c1a23',
            padding: '4px 8px',
            boxShadow: '0 4px 10px rgba(12,26,35,0.18)',
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
            style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--civ-text)' }}
          >
            <span className="truncate">Resultados Electorales</span>
            <span
              className="hidden h-3 w-5 shrink-0 overflow-hidden rounded-sm sm:inline-flex"
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
            style={{ fontSize: 12, color: 'var(--civ-text-muted)', marginTop: 2 }}
          >
            Colombia · Visualización por departamento, municipio y puesto
          </div>
        </div>
      </div>
    </header>
  );
}
