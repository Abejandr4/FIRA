import type { Parcela } from "../../data/tipos";

export const MIN_PARCELAS_PERCENTIL = 10;
export const UMBRAL_ALARGADA = 4;       // relación largo/ancho del rectángulo mínimo
export const UMBRAL_COMPACIDAD = 0.3;   // 1 = círculo; menor = contorno más irregular

export type ColPercentil = "elev_mean" | "pend_mean" | "gu50_doy_s2" | "sen50_doy_s2" | "dur50_dias_s2";

/**
 * Percentil (1–99) de la parcela entre las parcelas del municipio. `delMunicipio` incluye la propia parcela.
 * Devuelve null si falta el dato o si hay menos de 10 parcelas del municipio con ese dato.
 */
export function percentilEnMunicipio(p: Parcela, delMunicipio: Parcela[], col: ColPercentil): number | null {
  const v = p[col] as number | null;
  if (v === null) return null;
  const xs = delMunicipio.map((x) => x[col] as number | null).filter((x): x is number => x !== null);
  if (xs.length < MIN_PARCELAS_PERCENTIL) return null;
  const menores = xs.filter((x) => x < v).length;
  const iguales = xs.filter((x) => x === v).length;
  const pct = (100 * (menores + 0.5 * iguales)) / xs.length;
  return Math.min(99, Math.max(1, Math.round(pct)));
}

export function clasificarForma(compacidad: number | null, elong: number | null): "regular" | "alargada" | null {
  if (compacidad === null && elong === null) return null;
  const alargada = (elong !== null && elong >= UMBRAL_ALARGADA) || (compacidad !== null && compacidad < UMBRAL_COMPACIDAD);
  return alargada ? "alargada" : "regular";
}