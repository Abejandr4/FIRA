/**
 * Cifras que SOLO existen en el reporte técnico (Reporte_Tecnico_AgroCebada2026, borrador) y no en los JSON
 * de public/data. Cada bloque indica su sección. Las métricas del modelo final (RMSE, R², intervalos, n) NO
 * están aquí: se leen de meta.json. Si el reporte cambia, actualiza este archivo.
 */
import type { IconName } from "../../components/ui";
import { num } from "../../lib/formato";

export type Uso = "usado" | "indirecto" | "descartado";

/** Sección 1.2, 4.2, 4.3 y 5.4 g. */
export const FUENTES: { nombre: string; icono: IconName; dato: string; detalle: string; uso: Uso }[] = [
  { nombre: "Sentinel-2", icono: "satellite", dato: `${num(6660, 0)} obs. válidas`, uso: "usado",
    detalle: "Índices NDVI, EVI, LAI, MSI y NDWI. Entre 27 y 42 observaciones por parcela en 2025, filtro de nubes ≤ 40 %." },
  { nombre: "Shapefile del reto", icono: "polygon", dato: "197 polígonos", uso: "usado",
    detalle: "Geometría, estado y municipio. De aquí salen superficie, compacidad, elongación y los priors por ubicación." },
  { nombre: "INEGI · elevación", icono: "mountain", dato: "Modelo de 120 m", uso: "usado",
    detalle: "Elevación y pendiente media por parcela (estadísticos zonales)." },
  { nombre: "Landsat", icono: "satellite", dato: "NDVI 100 % vacío", uso: "descartado",
    detalle: "Solo trae temperatura de superficie (vi6t). Probada como corrección: neutra con Ridge, peor con Random Forest." },
  { nombre: "CHIRPS", icono: "rain", dato: "Celdas de ~5 km", uso: "indirecto",
    detalle: "Precipitación mensual. La zona cabe en pocas celdas: casi no varía entre parcelas del mismo municipio." },
  { nombre: "CHIRTS-ERA5", icono: "thermometer", dato: "Temperatura mensual", uso: "indirecto",
    detalle: "Entró de forma indirecta a través del simulador biofísico (balance hídrico y grados-día)." },
  { nombre: "Planet (PRO)", icono: "sparkle", dato: "Mayor resolución", uso: "indirecto",
    detalle: "Conjunto PRO. El simulador usa su NDVI para fechar el inicio de crecimiento." },
  { nombre: "Simulador biofísico", icono: "cpu", dato: "12 variables", uso: "descartado",
    detalle: "Balance hídrico, grados-día y biomasa. No mejoró la predicción; se usa para explicar (vista Simulador)." },
];

/** Sección 1.2: registros satelitales totales 2022–2025. */
export const REGISTROS_SATELITALES = 107_000;

/** Sección 5.2: RMSE (validación aleatoria, Ridge) de variantes sin y con prior geográfico. */
export const VARIANTES: { nombre: string; rmse: number; conPrior: boolean }[] = [
  { nombre: "Media global", rmse: 0.849, conPrior: false },
  { nombre: "Solo simulador (calibrado)", rmse: 0.846, conPrior: false },
  { nombre: "Geometría y topografía", rmse: 0.827, conPrior: false },
  { nombre: "Sentinel-2 + geometría", rmse: 0.690, conPrior: false },
  { nombre: "Sentinel-2", rmse: 0.678, conPrior: false },
  { nombre: "Sentinel-2 + geometría + Landsat", rmse: 0.647, conPrior: false },
  { nombre: "Prior por municipio", rmse: 0.525, conPrior: true },
  { nombre: "Prior de 5 vecinos", rmse: 0.518, conPrior: true },
  { nombre: "Prior municipio + corrección", rmse: 0.510, conPrior: true },
];

export type Etiqueta = "REAL" | "ruido" | "peor";
export interface Comparacion { variante: string; rmse: number; dif: number; lo: number; hi: number; etiqueta: Etiqueta; final?: boolean }

/** Sección 5.3: bootstrap pareado (2,000 remuestreos) contra el prior mixto. dif > 0 = mejor que el prior. */
export const BOOTSTRAP: Record<"aleatoria" | "espacial", { referencia: number; filas: Comparacion[] }> = {
  aleatoria: {
    referencia: 0.509,
    filas: [
      { variante: "Prior por municipio (solo)", rmse: 0.537, dif: -0.029, lo: -0.054, hi: -0.003, etiqueta: "peor" },
      { variante: "Corrección con Sentinel-2", rmse: 0.510, dif: -0.002, lo: -0.012, hi: 0.009, etiqueta: "ruido" },
      { variante: "+ fenología", rmse: 0.507, dif: 0.001, lo: -0.007, hi: 0.010, etiqueta: "ruido" },
      { variante: "+ fenología + geometría (final)", rmse: 0.508, dif: 0.001, lo: -0.007, hi: 0.010, etiqueta: "ruido", final: true },
      { variante: "Ensamble Ridge + Random Forest", rmse: 0.514, dif: -0.005, lo: -0.018, hi: 0.010, etiqueta: "ruido" },
      { variante: "Arq. 1 con simulador", rmse: 0.505, dif: 0.004, lo: -0.009, hi: 0.019, etiqueta: "ruido" },
    ],
  },
  espacial: {
    referencia: 0.630,
    filas: [
      { variante: "Corrección con Sentinel-2", rmse: 0.624, dif: 0.006, lo: -0.006, hi: 0.017, etiqueta: "ruido" },
      { variante: "+ fenología", rmse: 0.615, dif: 0.015, lo: 0.007, hi: 0.023, etiqueta: "REAL" },
      { variante: "+ fenología + geometría (final)", rmse: 0.614, dif: 0.016, lo: 0.007, hi: 0.024, etiqueta: "REAL", final: true },
      { variante: "Ensamble Ridge + Random Forest", rmse: 0.619, dif: 0.011, lo: -0.003, hi: 0.025, etiqueta: "ruido" },
      { variante: "Arq. 1 con simulador", rmse: 0.615, dif: 0.015, lo: -0.0, hi: 0.029, etiqueta: "ruido" },
    ],
  },
};

/** Sección 5.5: OLS frente a Ridge (validación aleatoria). */
export const OLS_RIDGE = [
  { modelo: "Ridge · 34 variables", rmse: 0.508, final: true },
  { modelo: "Ridge · 8 variables", rmse: 0.508 },
  { modelo: "OLS · 8 variables", rmse: 0.525 },
  { modelo: "OLS · 34 variables", rmse: 0.611 },
];

/** Sección 5.5: sensibilidad a la penalización alpha. */
export const ALPHA = {
  soloPrior: { aleatoria: 0.509, espacial: 0.630 },
  filas: [
    { alpha: 100, correccion: 0.107, aleatoria: 0.514, espacial: 0.604 },
    { alpha: 300, correccion: 0.079, aleatoria: 0.508, espacial: 0.606 },
    { alpha: 1000, correccion: 0.046, aleatoria: 0.507, espacial: 0.614 },
    { alpha: 3000, correccion: 0.022, aleatoria: 0.507, espacial: 0.621 },
    { alpha: 10000, correccion: 0.008, aleatoria: 0.508, espacial: 0.625 },
    { alpha: 100000, correccion: 0.001, aleatoria: 0.508, espacial: 0.627 },
  ],
};

/** Sección 5.6: simulador biofísico. */
export const SIMULADOR = { mediaSimulada: 5.13, correlacion: 0.124, rCritico: 0.17 };

/** Sección 5.4: conteos de observaciones como identificador de ubicación. */
export const N_OBS = { rmseSoloNobsL8Aleatoria: 0.69, rmseSoloNobsL8Espacial: 0.76, rmseMedia: 0.85 };
