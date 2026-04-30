import type { ReactNode } from 'react';

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileFilterDrawer({ open, onClose, children }: MobileFilterDrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9000] sm:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">Filtros</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}
