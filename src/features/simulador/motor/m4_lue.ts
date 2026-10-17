/** M4 biomasa por eficiencia de uso de la luz e índice de cosecha. Port de m4_lue.py. */
import type { ParamsSimulador } from "./tipos";

/** Biomasa acumulada (kg/ha); dbio = 0 fuera de [siembra, madurez]. */
export function m4Lue(
  par: number[], fapar: number[], ks: number[], iSiembra: number, iMadurez: number, params: ParamsSimulador,
): number[] {
  const rue = params.cultivo.rue_max_g_mj_par;
  const bio = new Array<number>(par.length);
  let acum = 0;
  for (let t = 0; t < par.length; t++) {
    if (t >= iSiembra && t <= iMadurez) acum += par[t] * Math.min(fapar[t], 1) * rue * ks[t] * 10;
    bio[t] = acum;
  }
  return bio;
}

const clip = (x: number, lo: number, hi: number) => (Number.isNaN(x) ? x : Math.min(hi, Math.max(lo, x)));

export function hiPenalizado(
  bioAntesis: number, bioTotal: number, ksLlenado: number, ksAntesis: number, params: ParamsSimulador,
): number {
  const { lue, cultivo } = params;
  const opcion = lue.hi_opcion.toUpperCase();
  if (opcion === "A") return clip(cultivo.hi_base * (1 - lue.hi_beta * (1 - ksLlenado)), 0, cultivo.hi_base);
  if (opcion === "B") {
    const fg = bioTotal > 0 ? (bioTotal - bioAntesis) / bioTotal : 0;
    return clip(lue.hi_kemanian.hi0 + lue.hi_kemanian.s * fg, 0, 0.6);
  }
  return clip(
    cultivo.hi_base * (1 - lue.hi_sens_antesis * (1 - ksAntesis) - lue.hi_sens_llenado * (1 - ksLlenado)),
    0, cultivo.hi_base,
  );
}
