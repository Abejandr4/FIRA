/**
 * Cálculos de la página de inicio. Todo sale de los JSON de public/data (parcelas.json, ndvi.json, meta.json,
 * modelo/ridge.json); aquí solo se agregan, nada se inventa. Las cifras que solo existen en el reporte técnico
 * están en reporte.ts, con su sección.
 */
import type { Parcela, SerieNdvi } from "../../data/tipos";
import { mediana } from "../../lib/estadisticas";

export const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const desv = (xs: number[]) => {
  const m = prom(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};
const finito = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

/** Color categórico por estado: orden alfabético fijo → --s1, --s2, --s3. */
export const colorEstado = (estados: string[], e: string) => {
  const i = estados.indexOf(e);
  return i >= 0 && i < 3 ? `var(--s${i + 1})` : "var(--faint)";
};

/** Rampa secuencial de rendimiento (bajo → alto) en función de t ∈ [0, 1]. */
export const colorRampa = (t: number) =>
  `color-mix(in oklab, var(--seq-hi) ${Math.round(Math.max(0, Math.min(1, t)) * 100)}%, var(--seq-lo))`;

export function resumen(ps: Parcela[]) {
  const entren = ps.filter((p) => p.conjunto === "ENTRENAMIENTO");
  const pred = ps.filter((p) => p.conjunto === "PREDICCION");
  const reales = entren.map((p) => p.real).filter(finito);
  const estados = [...new Set(ps.map((p) => p.estado))].sort((a, b) => a.localeCompare(b, "es"));
  const areas = ps.map((p) => p.area_ha).filter(finito);
  return {
    n: ps.length, entren, pred, reales, estados,
    municipios: new Set(ps.map((p) => p.municipio)).size,
    mediaReal: prom(reales), desvReal: desv(reales),
    minReal: Math.min(...reales), maxReal: Math.max(...reales),
    areaTotal: areas.reduce((a, b) => a + b, 0), areaMedia: prom(areas),
    predsPred: pred.map((p) => p.pred),
    ndviMaxMediano: mediana(ps.map((p) => p.ndvi_p95_s2).filter(finito)),
  };
}
export type Resumen = ReturnType<typeof resumen>;

export interface Municipio { municipio: string; estado: string; reales: { id: string; v: number }[]; nPred: number; media: number }

/** Municipios con al menos una parcela de entrenamiento, del rendimiento medio más alto al más bajo. */
export function porMunicipio(ps: Parcela[]): Municipio[] {
  const m = new Map<string, Municipio>();
  for (const p of ps) {
    const x = m.get(p.municipio) ?? { municipio: p.municipio, estado: p.estado, reales: [], nPred: 0, media: NaN };
    if (p.conjunto === "PREDICCION") x.nPred++;
    else if (finito(p.real)) x.reales.push({ id: p.id, v: p.real });
    m.set(p.municipio, x);
  }
  return [...m.values()]
    .filter((x) => x.reales.length)
    .map((x) => ({ ...x, media: prom(x.reales.map((r) => r.v)) }))
    .sort((a, b) => b.media - a.media);
}

/** Error (RMSE, en muestra) de usar la media de cada municipio como predicción. */
export function rmseMediaMunicipal(munis: Municipio[]) {
  const e = munis.flatMap((m) => m.reales.map((r) => (r.v - m.media) ** 2));
  return Math.sqrt(prom(e));
}

const km = (a: Parcela, b: Parcela) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Mediana de la distancia (km, entre centroides) a la parcela de entrenamiento más cercana. */
export function distanciasVecino(ps: Parcela[]) {
  const entren = ps.filter((p) => p.conjunto === "ENTRENAMIENTO");
  const masCercana = (p: Parcela) => Math.min(...entren.filter((q) => q.id !== p.id).map((q) => km(p, q)));
  return {
    pred: mediana(ps.filter((p) => p.conjunto === "PREDICCION").map(masCercana)),
    entren: mediana(entren.map(masCercana)),
  };
}

export function histograma(xs: number[], ancho = 0.25) {
  const lo = Math.floor(Math.min(...xs) / ancho) * ancho;
  const hi = Math.ceil(Math.max(...xs) / ancho) * ancho;
  const n = Math.max(1, Math.round((hi - lo) / ancho));
  const cuentas = Array<number>(n).fill(0);
  for (const x of xs) cuentas[Math.min(n - 1, Math.floor((x - lo) / ancho))]++;
  return { lo, hi, ancho, cuentas, tope: Math.max(...cuentas) };
}

const cuantil = (s: number[], q: number) => {
  const i = (s.length - 1) * q, a = Math.floor(i), b = Math.ceil(i);
  return s[a] + (s[b] - s[a]) * (i - a);
};

export interface BandaNdvi { estado: string; n: number; p25: (number | null)[]; p50: (number | null)[]; p75: (number | null)[] }

/** Mediana y rango intercuartil del NDVI por estado en cada fecha de la malla. */
export function ndviPorEstado(ndvi: SerieNdvi, ps: Parcela[], estados: string[]): BandaNdvi[] {
  return estados.map((estado) => {
    const ids = ps.filter((p) => p.estado === estado).map((p) => p.id).filter((id) => ndvi.serie[id]);
    const p25: (number | null)[] = [], p50: (number | null)[] = [], p75: (number | null)[] = [];
    ndvi.fechas.forEach((_, i) => {
      const v = ids.map((id) => ndvi.serie[id][i]).filter(finito).sort((a, b) => a - b);
      const ok = v.length >= 3;
      p25.push(ok ? cuantil(v, 0.25) : null);
      p50.push(ok ? cuantil(v, 0.5) : null);
      p75.push(ok ? cuantil(v, 0.75) : null);
    });
    return { estado, n: ids.length, p25, p50, p75 };
  });
}

const pearson = (xs: number[], ys: number[]) => {
  const mx = prom(xs), my = prom(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
};

/** |r| mínimo para p < 0.05 (dos colas) con n parcelas; t de Student por aproximación de Cornish-Fisher. */
export function rCritico(n: number) {
  const df = n - 2, z = 1.959964;
  const t = z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
  return t / Math.sqrt(df + t * t);
}

/** Correlación entre predicción de validación cruzada y rendimiento real DENTRO de cada municipio. */
export function correlacionesMunicipio(ps: Parcela[], minN = 10) {
  const m = new Map<string, { x: number[]; y: number[] }>();
  for (const p of ps) {
    if (p.conjunto !== "ENTRENAMIENTO" || !finito(p.pred_cv) || !finito(p.real)) continue;
    const g = m.get(p.municipio) ?? { x: [], y: [] };
    g.x.push(p.pred_cv); g.y.push(p.real);
    m.set(p.municipio, g);
  }
  return [...m.entries()]
    .filter(([, g]) => g.x.length >= minN)
    .map(([municipio, g]) => ({ municipio, n: g.x.length, r: pearson(g.x, g.y), rCrit: rCritico(g.x.length) }))
    .sort((a, b) => b.n - a.n);
}

/** Calendario medio de la fenología observada con NDVI (días del año). */
export function fenologia(ps: Parcela[]) {
  return {
    gu50: prom(ps.map((p) => p.gu50_doy_s2).filter(finito)),
    pico: prom(ps.map((p) => p.ndvi_doy_pico_s2).filter(finito)),
    diasSobre90: prom(ps.map((p) => p.dias_sobre90_s2).filter(finito)),
    fraccionSinSenescencia: ps.filter((p) => !finito(p.sen50_doy_s2)).length / ps.length,
  };
}

// ---- Variables del modelo (modelo/ridge.json)
export type Grupo = "s2" | "fen" | "geo";

/** Grupo de cada variable según su nombre de columna (reporte, sección 4.4). */
export function grupoDe(col: string): Grupo {
  const c = col.toLowerCase();
  if (/^(area|sup|compac|elong|elev|pend)/.test(c)) return "geo";
  if (/(gu\d|vel|sobre90|amplitud|amp_|_may|_jun|_jul|_ago|_sep|mayo|junio|julio|agosto|sept|ciclo|verde)/.test(c)) return "fen";
  return "s2";
}

const NOMBRES: Record<string, string> = {
  ndvi_p95_s2: "NDVI máximo (p95)", ndvi_p05_s2: "NDVI mínimo (p05)", ndvi_doy_pico_s2: "Día del pico de NDVI",
  gu50_doy_s2: "Mitad de la subida (gu50)", gu25_doy_s2: "Inicio del crecimiento (gu25)",
  dias_sobre90_s2: "Días con NDVI alto", elev_mean: "Elevación media", pend_mean: "Pendiente media",
  compacidad: "Compacidad", elong: "Elongación", area_ha_geom: "Superficie", ciclo_sin_senescencia_s2: "Sin senescencia observada",
};
const TOKENS: Record<string, string> = {
  ndvi: "NDVI", evi: "EVI", lai: "LAI", msi: "MSI", ndwi: "NDWI", p95: "p95", p05: "p05", p5: "p05", mean: "medio",
  media: "medio", auc: "área bajo la curva", std: "variabilidad", sd: "variabilidad", doy: "día", pico: "del pico",
  vel: "velocidad", subida: "de subida", amplitud: "amplitud", dias: "días", sobre90: "sobre 90 %", may: "mayo",
  jun: "junio", jul: "julio", ago: "agosto", sep: "septiembre", intra: "en la parcela",
};
export function nombreVariable(col: string) {
  if (NOMBRES[col]) return NOMBRES[col];
  const t = col.replace(/_s2$/, "").split("_").map((x) => TOKENS[x] ?? x).join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
