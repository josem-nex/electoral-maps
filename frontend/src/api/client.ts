import axios from 'axios';
import type { ElectoralLayer, Jurisdiccion } from '../stores/navigationStore';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface PuestoElectoral {
  codigo_puesto: string;
  departamento_codigo: string;
  municipio_codigo: string;
  departamento: string;
  municipio: string;
  puesto: string;
  comuna?: string;
  direccion?: string;
  mujeres?: number;
  hombres?: number;
  total?: number;
  mesas?: number;
  latitud: number;
  longitud: number;
}

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  code: string;
  parent_code?: string;
  parent_name?: string;
  direccion?: string;
  center_lat: number;
  center_lon: number;
  zoom: number;
}

export interface TerritorioStats {
  tipo: string;
  codigo: string;
  nombre?: string;
  puestos_count: number;
  mesas_sum: number;
  total_sum: number;
  mujeres_sum: number;
  hombres_sum: number;
}

export interface ResultadosCandidato {
  codigo: string;
  nombre: string;
  votos: number;
}

export interface ResultadosPartido {
  partido_codigo: string;
  partido_nombre: string;
  partido_votos: number;
  pct_partido: number;
  top5_candidatos: ResultadosCandidato[];
}

export interface ResultadosElectorales {
  anio: number;
  nivel: string;
  nivel_codigo: string;
  nivel_nombre: string;
  corporacion_codigo: string;
  corporacion_nombre: string;
  votos_total: number;
  votos_validos: number;
  votos_nulos: number;
  votos_blancos: number;
  partidos: ResultadosPartido[];
}

export interface PersonalEstado {
  jurados: number;
  testigos: number;
}

export interface PersonalConteo {
  jurados: number;
  testigos: number;
}

export interface PersonaResumen {
  cedula: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono: string | null;
  celular: string | null;
  correo: string | null;
  direccion: string | null;
  nivel_educativo: string | null;
  referenciado_por: string | null;
  codigo_puesto: string;
}

export interface PersonalPuesto {
  jurados: PersonaResumen[];
  testigos: PersonaResumen[];
}

export interface CargaErrorItem {
  fila: number;
  razon: string;
}

export interface CargaResponse {
  tipo: string;
  insertados: number;
  omitidos: number;
  errores: CargaErrorItem[];
}

export const api = {
  // Get jurisdictions by layer
  async getJurisdicciones(layer: ElectoralLayer, parentCode?: string): Promise<Jurisdiccion[]> {
    const params: any = { layer };
    if (parentCode) params.parent_code = parentCode;
    const response = await apiClient.get('/api/v1/jurisdicciones', { params });
    return response.data;
  },

  // Get children of a jurisdiction
  async getJurisdiccionChildren(id: string): Promise<Jurisdiccion[]> {
    const response = await apiClient.get(`/api/v1/jurisdicciones/${id}/children`);
    return response.data;
  },

  // Get puestos filtered by jurisdiction
  async getPuestos(filters: {
    departamento_codigo?: string;
    municipio_codigo?: string;
    localidad_codigo?: string;
    limit?: number;
  }): Promise<PuestoElectoral[]> {
    const response = await apiClient.get('/api/v1/puestos', { params: filters });
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  },

  // Search
  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const response = await apiClient.get('/api/v1/search', { params: { q: query, limit } });
    // El endpoint devuelve SearchPage { total, items } o un array directo
    const data = response.data;
    const items: any[] = Array.isArray(data) ? data : (data.items ?? []);
    return items
      .filter((item: any) => item.type === 'departamento' || item.type === 'municipio')
      .map((item: any): SearchResult => ({
        id: String(item.id),
        type: item.type,
        name: item.nombre_completo ?? '',
        code: item.geo_code ?? String(item.id),
        parent_code: item.parent_code,
        parent_name: item.parent_name,
        center_lat: item.center_lat ?? 4.57,
        center_lon: item.center_lon ?? -74.30,
        zoom: item.zoom ?? 8,
      }));
  },

  // Get GeoJSON for departments
  async getDepartamentosGeoJSON(): Promise<any> {
    const response = await apiClient.get('/api/v1/geojson/departamentos');
    return response.data;
  },

  async getDepartamentosCatalog(): Promise<Jurisdiccion[]> {
    const response = await apiClient.get('/api/v1/catalog/departamentos');
    return response.data;
  },

  // Get GeoJSON for municipalities in one department
  async getMunicipiosGeoJSON(departamentoCodigo: string): Promise<any> {
    const response = await apiClient.get('/api/v1/geojson/municipios', {
      params: { departamento_codigo: departamentoCodigo },
    });
    return response.data;
  },

  // Get electoral results for a territory level
  async getResultadosElectorales(
    nivel: 'pais' | 'zona' | 'departamento' | 'municipio' | 'puesto',
    nivel_codigo: string,
    corporacion: '001' | '002',
    anio: number,
  ): Promise<ResultadosElectorales> {
    const response = await apiClient.get('/api/v1/resultados/electorales', {
      params: { nivel, nivel_codigo, corporacion, anio },
    });
    return response.data;
  },

  // Get aggregated puestos statistics for a territory (department or municipality)
  async getAnalyticsTerritorio(
    tipo: 'pais' | 'zona' | 'departamento' | 'municipio',
    codigo: string,
  ): Promise<TerritorioStats> {
    const response = await apiClient.get('/api/v1/analytics/territorio', {
      params: { tipo, codigo },
    });
    return response.data;
  },

  // Personal electoral — jurados y testigos
  async getPersonalEstado(): Promise<PersonalEstado> {
    const response = await apiClient.get('/api/v1/personal/estado');
    return response.data;
  },

  async getPersonalConteos(
    nivel: 'pais' | 'zona' | 'departamento' | 'municipio',
    codigo: string,
  ): Promise<PersonalConteo> {
    const response = await apiClient.get('/api/v1/personal/conteos', {
      params: { nivel, codigo },
    });
    return response.data;
  },

  async getPersonalPuesto(codigoPuesto: string): Promise<PersonalPuesto> {
    const response = await apiClient.get(`/api/v1/personal/puesto/${codigoPuesto}`);
    return response.data;
  },

  async cargarPersonal(file: File, tipoOverride?: 'jurado' | 'testigo'): Promise<CargaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const params = tipoOverride ? { tipo_override: tipoOverride } : {};
    const response = await apiClient.post('/api/v1/personal/cargar', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async eliminarPersonal(tipo: 'jurado' | 'testigo' | 'todos'): Promise<{ eliminados: number }> {
    const response = await apiClient.delete(`/api/v1/personal/${tipo}`);
    return response.data;
  },
};
