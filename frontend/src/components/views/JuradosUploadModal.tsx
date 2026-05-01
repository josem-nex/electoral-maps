import { useEffect, useState, useCallback } from 'react';
import { api, type PersonalEstado } from '../../api/client';
import { UploadModal, DeleteModal } from './JuradosCrudModals';

interface JuradosManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export function JuradosManagerModal({ open, onClose }: JuradosManagerModalProps) {
  const [estado, setEstado] = useState<PersonalEstado | null>(null);
  const [stage, setStage] = useState<'menu' | 'upload' | 'delete'>('menu');

  const reload = useCallback(() => {
    api.getPersonalEstado().then(setEstado).catch(() => setEstado(null));
  }, []);

  useEffect(() => {
    if (open) {
      setStage('menu');
      reload();
    }
  }, [open, reload]);

  if (!open) return null;

  if (stage === 'upload' && estado) {
    return (
      <UploadModal
        estado={estado}
        onClose={() => { reload(); setStage('menu'); }}
        onSuccess={reload}
      />
    );
  }

  if (stage === 'delete') {
    return (
      <DeleteModal
        onClose={() => setStage('menu')}
        onSuccess={() => { reload(); setStage('menu'); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Gestionar personal</h3>
            <p className="text-xs text-slate-500">Jurados y Testigos</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 p-5">
          {estado && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <div className="text-2xl font-bold tabular-nums text-slate-900">{estado.jurados.toLocaleString('es-CO')}</div>
                <div className="text-xs text-slate-500">Jurados</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <div className="text-2xl font-bold tabular-nums text-slate-900">{estado.testigos.toLocaleString('es-CO')}</div>
                <div className="text-xs text-slate-500">Testigos</div>
              </div>
            </div>
          )}

          <button
            onClick={() => setStage('upload')}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">Cargar archivo</div>
              <div className="text-xs text-slate-500">Importa CSV/XLSX de jurados o testigos</div>
            </div>
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setStage('delete')}
            disabled={!estado || (estado.jurados === 0 && estado.testigos === 0)}
            className="flex w-full items-center justify-between rounded-lg border border-red-200 p-3 text-left hover:bg-red-50 disabled:opacity-50"
          >
            <div>
              <div className="text-sm font-semibold text-red-700">Eliminar datos</div>
              <div className="text-xs text-red-600/80">Elimina jurados, testigos o ambos</div>
            </div>
            <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
