export function Footer() {
  return (
    <footer
      className="civ-card flex shrink-0 flex-col items-center justify-between gap-2 sm:flex-row"
      style={{ padding: '14px 18px', fontSize: 12, color: 'var(--civ-text-muted)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontWeight: 600, color: 'var(--civ-text)' }}>Resultados Electorales</span>
        <span>· Colombia</span>
      </div>
      <div className="flex items-center gap-3">
        <span>E-Day Tech</span>
        <span style={{ color: 'var(--civ-border-strong)' }}>·</span>
        <span>Datos: Registraduría Nacional del Estado Civil</span>
      </div>
    </footer>
  );
}
