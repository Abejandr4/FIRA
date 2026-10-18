/**
 * Contrato de datos del dashboard. Cada campo corresponde a un archivo de public/data/ generado por
 * scripts/exportar_datos.py. La tabla completa (campo → archivo → columna de origen → unidad) está en
 * docs/CONTRATO_DASHBOARD.md. Si cambias un tipo aquí, cambia el exportador y el contrato en el mismo PR.
 */
import type { Extras, Variables12 } from "../features/simulador/motor/tipos";

export type Conjunto = "ENTRENAMIENTO" | "PREDICCION";
export type Confianza = "baja" | "estandar";

/** public/data/parcelas.json — una fila por parcela (197). */
export interface Parcela {
  id: string;                    // ID_POLIGONO, p. ej. "AGC_011"
  conjunto: Conjunto;
  estado: string;
  municipio: string;
  lat: number;                   // grados
  lon: number;                   // grados
  area_ha: number;               // area_ha_geom, ha
  n_entren_municipio: number;    // parcelas de entrenamiento en el municipio
  confianza: Confianza;          // "baja" si n_entren_municipio < 3
  /** Rendimiento estimado, t/ha. En ENTRENAMIENTO: fuera de muestra (ajustado sin la propia parcela). */
  pred: number;
  prior_mun: number;             // estimación por municipio, t/ha
  prior_vec: number;             // estimación por las 5 parcelas vecinas, t/ha
  prior: number;                 // (prior_mun + prior_vec) / 2, t/ha
  corr: number;                  // corrección satelital (ridge), t/ha; pred = prior + corr
  real: number | null;           // RENDIMIENTO_T_HA, solo ENTRENAMIENTO
  pred_cv: number | null;        // predicción de validación cruzada (oof_train.csv), solo ENTRENAMIENTO
  media_municipio_entren: number | null; // media de RENDIMIENTO_T_HA en el municipio (entrenamiento)
  elev_mean: number;             // m
  pend_mean: number;             // grados
  compacidad: number;            // 0–1
  elong: number;                 // ≥ 1
  ndvi_p95_s2: number;           // NDVI máximo (percentil 95)
  ndvi_doy_pico_s2: number;      // día del año del pico de NDVI
  gu50_doy_s2: number;           // día del año del inicio de crecimiento
  sen50_doy_s2: number | null;   // día del año del inicio de senescencia (null: sin senescencia observada)
  dur50_dias_s2: number | null;  // días
  dias_sobre90_s2: number;       // días con NDVI sobre el 90 % del pico
}

/** public/data/meta.json */
export interface MetaModelo {
  generado: string;
  fuente: string;
  config: string;
  n_variables: number;
  n_train: number;
  n_pred: number;
  q80: number;                   // ± t/ha, intervalo de predicción al 80 %
  q90: number;                   // ± t/ha, intervalo de predicción al 90 %
  media_general_entren: number;  // t/ha
  cv_aleatorio: { rmse: number; rmse_prior: number; r2: number; mae: number };
  cv_espacial: { rmse: number; rmse_prior: number; r2: number };
  rmse_media_global: number;     // t/ha, error de predecir siempre la media
}

/** public/data/ndvi.json — malla de 5 días, abril–octubre 2025. */
export interface SerieNdvi {
  fechas: string[];
  serie: Record<string, (number | null)[]>;
}

/** public/data/simulador/variables.json — escenario base por parcela (197). */
export interface VariablesSimulador extends Variables12, Extras {
  id: string;
  fecha_siembra: string;       // la que usa el escenario base (estimada con NDVI)
  fecha_siembra_A: string;
  fecha_siembra_B: string;     // solo distinta en parcelas de doble ciclo
  doble_ciclo: boolean;
  fecha_sos: string;           // inicio de crecimiento observado (NDVI de Planet)
  fecha_pico: string;          // pico de NDVI
  fecha_antesis: string;       // floración simulada
  fecha_madurez: string;       // madurez simulada
}

/** public/data/simulador/sensibilidad.json — una fila por escenario × variable. */
export interface FilaSensibilidad {
  escenario: string;
  grupo: string;
  etiqueta: string;
  variable: string;
  cambio_mediano_pct: number | null;
  rho_spearman: number | null;
}

/** public/data/estados.geojson y parcelas.geojson (grados lon/lat). */
export interface PropsEstado { cve: string; nombre: string }
export interface PropsParcelaGeo { id: string }
export interface ColeccionGeo<P> {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: P; geometry: { type: string; coordinates: unknown } }[];
}

export type { EntradaDiaria, ParamsSimulador, Variables12, Extras } from "../features/simulador/motor/tipos";
