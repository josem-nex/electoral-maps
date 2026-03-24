import { useState, useEffect, useRef, useCallback } from 'react';
import {
  api,
  type PersonalEstado,
  type PersonalConteo,
  type PersonaResumen,
  type CargaResponse,
} from '../api/client';
import type { PuestoElectoral } from '../api/client';
import type { Jurisdiccion } from '../stores/navigationStore';

type TipoTab = 'jurado' | 'testigo';

interface JuradosTestigosPanelProps {
  currentJurisdiccion: Jurisdiccion | null;
  selectedPuesto: PuestoElectoral | null;
}

// ─── Upload Modal ────────────────────────────────────────────────────────────

interface UploadModalProps {
  estado: PersonalEstado;
  onClose: () => void;
  onSuccess: (res: CargaResponse) => void;
}

function UploadModal({ estado, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tipoOverride, setTipoOverride] = useState<'jurado' | 'testigo' | ''>('');
  const [stage, setStage] = useState<'select' | 'confirm' | 'loading' | 'result'>('select');
  const [cargaResult, setCargaResult] = useState<CargaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A file is always one type. If tipoOverride is set we know exactly which count is at risk;
  // otherwise we show both counts and clarify that only the detected type will be replaced.
  const relevantCount =
    tipoOverride === 'jurado' ? estado.jurados :
    tipoOverride === 'testigo' ? estado.testigos :
    Math.max(estado.jurados, estado.testigos); // at least one type might be affected

  const needsConfirmation = tipoOverride
    ? relevantCount > 0
    : (estado.jurados > 0 || estado.testigos > 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
  };

  const handleProceed = () => {
    if (!file) { setError('Seleccione un archivo.'); return; }
    if (needsConfirmation) {
      setStage('confirm');
    } else {
      doUpload();
    }
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
                  className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
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
                <button onClick={handleProceed} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
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
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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

// ─── Delete Modal ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteModal({ onClose, onSuccess }: DeleteModalProps) {
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

// ─── Persona Row ──────────────────────────────────────────────────────────────

function PersonaRow({ persona }: { persona: PersonaResumen }) {
  const nombre = [persona.primer_nombre, persona.segundo_nombre, persona.primer_apellido, persona.segundo_apellido]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0">
      <p className="text-sm font-medium text-slate-900">{nombre}</p>
      <p className="text-xs text-slate-500 mt-0.5">CC {persona.cedula}</p>
      {(persona.celular || persona.telefono) && (
        <p className="text-xs text-slate-500">{persona.celular ?? persona.telefono}</p>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function JuradosTestigosPanel({
  currentJurisdiccion,
  selectedPuesto,
}: JuradosTestigosPanelProps) {
  const [tab, setTab] = useState<TipoTab>('jurado');
  const [estado, setEstado] = useState<PersonalEstado | null>(null);
  const [conteo, setConteo] = useState<PersonalConteo | null>(null);
  const [personas, setPersonas] = useState<{ jurados: PersonaResumen[]; testigos: PersonaResumen[] } | null>(null);
  const [conteoLoading, setConteoLoading] = useState(false);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const reloadEstado = useCallback(async () => {
    const e = await api.getPersonalEstado();
    setEstado(e);
  }, []);

  useEffect(() => {
    reloadEstado();
  }, [reloadEstado]);

  // Reload conteo when territory changes
  useEffect(() => {
    if (!currentJurisdiccion) return;
    if (selectedPuesto) return; // handled separately

    const layer = currentJurisdiccion.layer;
    let nivel: 'pais' | 'zona' | 'departamento' | 'municipio' | null = null;
    let codigo = '';

    if (layer === 'pais') { nivel = 'pais'; codigo = 'CO'; }
    else if (layer === 'zonas') { nivel = 'zona'; codigo = currentJurisdiccion.code; }
    else if (layer === 'departamentos') { nivel = 'departamento'; codigo = currentJurisdiccion.code; }
    else if (layer === 'municipio' || layer === 'localidad') { nivel = 'municipio'; codigo = currentJurisdiccion.code; }

    if (!nivel) return;

    setConteoLoading(true);
    api.getPersonalConteos(nivel, codigo)
      .then(setConteo)
      .catch(() => setConteo(null))
      .finally(() => setConteoLoading(false));
  }, [currentJurisdiccion, selectedPuesto]);

  // Reload personas when puesto changes
  useEffect(() => {
    if (!selectedPuesto) { setPersonas(null); return; }
    setPersonasLoading(true);
    api.getPersonalPuesto(selectedPuesto.codigo_puesto)
      .then(setPersonas)
      .catch(() => setPersonas(null))
      .finally(() => setPersonasLoading(false));
  }, [selectedPuesto]);

  const noData = estado !== null && estado.jurados === 0 && estado.testigos === 0;

  const tabPersonas = tab === 'jurado' ? personas?.jurados : personas?.testigos;
  const tabConteo = tab === 'jurado' ? conteo?.jurados : conteo?.testigos;
  const tabHasData = tab === 'jurado' ? (estado?.jurados ?? 0) > 0 : (estado?.testigos ?? 0) > 0;

  return (
    <div className="hidden h-full min-h-0 lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Personal Electoral</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Jurados y Testigos</h2>
        </div>
        {!noData && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowUpload(true)}
              title="Cargar archivo"
              className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              title="Eliminar datos"
              className="rounded-lg border border-red-200 p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {noData ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center gap-5">
          <div className="rounded-full bg-slate-100 p-5">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">Sin datos cargados</p>
            <p className="mt-1 text-sm text-slate-500">Cargue una plantilla de jurados o testigos para comenzar.</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Cargar archivo
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-slate-200 px-6 pt-4 flex gap-1">
            {(['jurado', 'testigo'] as TipoTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
                  tab === t
                    ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'jurado' ? 'Jurados' : 'Testigos'}
                {estado && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    ({t === 'jurado' ? estado.jurados : estado.testigos})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!tabHasData ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
                <p className="text-sm text-slate-500">
                  No hay {tab === 'jurado' ? 'jurados' : 'testigos'} cargados.
                </p>
                <button onClick={() => setShowUpload(true)} className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  Cargar archivo
                </button>
              </div>
            ) : selectedPuesto ? (
              // Puesto view — list of persons
              personasLoading ? (
                <div className="flex items-center gap-3 px-6 py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="text-sm text-slate-500">Cargando personal…</p>
                </div>
              ) : tabPersonas && tabPersonas.length > 0 ? (
                <div>
                  <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {tab === 'jurado' ? 'Jurados' : 'Testigos'} — {selectedPuesto.puesto}
                  </p>
                  {tabPersonas.map((p, i) => <PersonaRow key={i} persona={p} />)}
                </div>
              ) : (
                <p className="px-6 py-6 text-sm text-slate-500">
                  No hay {tab === 'jurado' ? 'jurados' : 'testigos'} asignados a este puesto.
                </p>
              )
            ) : (
              // Territory view — conteo
              <div className="px-6 py-6">
                {conteoLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-slate-500">Calculando…</p>
                  </div>
                ) : conteo !== null ? (
                  <div className="rounded-2xl bg-slate-50 p-5 text-center">
                    <p className="text-4xl font-bold text-slate-900">{tabConteo?.toLocaleString('es-CO')}</p>
                    <p className="mt-1 text-base text-slate-500">
                      {tab === 'jurado' ? 'Jurados' : 'Testigos'} en {currentJurisdiccion?.name ?? 'este territorio'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Seleccione un territorio para ver el conteo.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {showUpload && estado && (
        <UploadModal
          estado={estado}
          onClose={() => setShowUpload(false)}
          onSuccess={() => reloadEstado()}
        />
      )}

      {showDelete && (
        <DeleteModal
          onClose={() => setShowDelete(false)}
          onSuccess={() => reloadEstado()}
        />
      )}
    </div>
  );
}
