/**
 * Frases de lectura por grupo y niveles de KS, generadas con reglas.
 * Los cortes son CRITERIOS DE INTERFAZ, no umbrales publicados; se documentan en docs/ESTADOS.md.
 */
import type { Variables12 } from "../motor/tipos";

export const CORTES_KS = { poco: 0.95, moderado: 0.8 } as const;

export type NivelKs = "poco" | "moderado" | "alto";

export function nivelKs(ks: number): NivelKs {
  if (ks >= CORTES_KS.poco) return "poco";
  if (ks >= CORTES_KS.moderado) return "moderado";
  return "alto";
}

export const TEXTO_NIVEL_KS: Record<NivelKs, string> = {
  poco: "poco estrés", moderado: "estrés moderado", alto: "estrés alto",
};

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** @param pct percentiles (0–100) de la parcela entre las 197. */
export function lecturaGrupo(grupo: "fenologia" | "agua" | "luz", v: Variables12, pct: Partial<Record<keyof Variables12, number>>): string {
  if (grupo === "fenologia") {
    const p = pct.DAP_antesis_est ?? 50;
    if (p < 25) return "Antesis más temprana que en la mayoría de las parcelas.";
    if (p > 75) return "Antesis más tardía que en la mayoría de las parcelas.";
    return "Antesis estimada dentro del rango central de las parcelas.";
  }
  if (grupo === "agua") {
    return `${mayus(TEXTO_NIVEL_KS[nivelKs(v.KS_prom_antesis)])} en antesis, ${TEXTO_NIVEL_KS[nivelKs(v.KS_prom_llenado)]} en el llenado de grano.`;
  }
  const p = pct.fPAR_integrado ?? 50;
  const nivel = p < 25 ? "bajo" : p > 75 ? "alto" : "intermedio";
  return `Intercepción de radiación ${nivel} respecto al conjunto de parcelas.`;
}
