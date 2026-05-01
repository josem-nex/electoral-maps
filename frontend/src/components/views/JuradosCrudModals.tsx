import { useState, useRef } from 'react';
import { api, type PersonalEstado, type CargaResponse } from '../../api/client';

interface UploadModalProps {
  estado: PersonalEstado;
  onClose: () => void;
  onSuccess: (res: CargaResponse) => void;
}

export function UploadModal({ estado, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tipoOverride, setTipoOverride] = useState<'jurado' | 'testigo' | ''>('');
  const [stage, setStage] = useState<'select' | 'confirm' | 'loading' | 'result'>('select');
  const [cargaResult, setCargaResult] = useState<CargaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const relevantCount =
    tipoOverride === 'jurado' ? estado.jurados :
    tipoOverride === 'testigo' ? estado.testigos :
    Math.max(estado.jurados, estado.testigos);

  const needsConfirmation = tipoOverride
    ? relevantCount > 0
    : (estado.jurados > 0 || estado.testigos > 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
  };

  const handleProceed = () => {
    if (!file) { setError('Seleccione un archivo.'); return; }
    if (needsConfirmation) setStage('confirm');
    else doUpload();
  };

  const doUpload = async () => {
    if (!file) return;
    setStage('loading');
    setError(null);
    try {
      const res = await api.cargarPersonal(file, tipoOverride || undefined);
      setCargaResult(res);
      setStage('result');
      onSuccess(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al cargar el archivo.');
      setStage('select');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 sm:p-10">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Cargar archivo de personal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          {stage === 'select' && (
            <>
              <p className="text-sm text-slate-600">
                Seleccione el archivo .xlsx o .csv exportado de la plantilla de Jurados o Testigos.
                El tipo se detecta automáticamente por las columnas; si la detección falla puede forzarlo.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Archivo</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--civ-primary-soft)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--civ-primary)] hover:file:bg-[var(--civ-primary)]/10"
                />
                {file && <p className="mt-1 text-xs text-slate-500">{file.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo <span className="font-normal text-slate-500">(opcional — fuerza detección)</span>
                </label>
                <select
                  value={tipoOverride}
                  onChange={e => setTipoOverride(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Detectar automáticamente</option>
                  <option value="jurado">Jurados</option>
                  <option value="testigo">Testigos</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleProceed}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                  style={{ background: 'var(--civ-primary)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--civ-primary-hover)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'var(--civ-primary)'; }}
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {stage === 'confirm' && (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
                {tipoOverride ? (
                  <p>
                    Esta acción reemplazará <strong>{relevantCount}</strong> registro{relevantCount !== 1 ? 's' : ''} existentes de{' '}
                    <strong>{tipoOverride === 'jurado' ? 'jurados' : 'testigos'}</strong>. Los datos actuales serán eliminados.
                  </p>
                ) : (
                  <>
                    <p>El tipo se detectará automáticamente del archivo. Solo se reemplazarán los registros del tipo detectado.</p>
                    <p>Registros actuales — Jurados: <strong>{estado.jurados}</strong> · Testigos: <strong>{estado.testigos}</strong></p>
                  </>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setStage('select')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Atrás
                </button>
                <button onClick={doUpload} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                  Sí, reemplazar
                </button>
              </div>
            </>
          )}

          {stage === 'loading' && (
            <div className="flex items-center gap-3 py-4">
              <div
                className="h-5 w-5 animate-spin rounded-full"
                style={{ border: '2px solid var(--civ-primary)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm text-slate-600">Procesando archivo…</p>
            </div>
          )}

          {stage === 'result' && cargaResult && (
            <>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">Carga completada ({cargaResult.tipo})</p>
                <p className="mt-1">Insertados: <strong>{cargaResult.insertados}</strong> · Omitidos: <strong>{cargaResult.omitidos}</strong></p>
              </div>
              {cargaResult.errores.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-600">Fila</th>
                        <th className="px-3 py-2 text-left text-slate-600">Razón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargaResult.errores.map((e, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-500">{e.fila}</td>
                          <td className="px-3 py-1.5 text-slate-700">{e.razon}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeleteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteModal({ onClose, onSuccess }: DeleteModalProps) {
  const [tipo, setTipo] = useState<'jurado' | 'testigo' | 'todos'>('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.eliminarPersonal(tipo);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al eliminar datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 sm:p-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-red-700">Eliminar datos de personal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">¿Qué eliminar?</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="todos">Todos (jurados y testigos)</option>
              <option value="jurado">Solo jurados</option>
              <option value="testigo">Solo testigos</option>
            </select>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Esta acción eliminará permanentemente los datos seleccionados.
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
