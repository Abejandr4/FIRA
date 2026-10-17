/**
 * M2 fenología por tiempo térmico. Port de SimuladorBiofisico/src/simulador/m2_fenologia.py
 * (solo modo "umbral_gdd", que es el caso base; el modo "satelite" es una sensibilidad).
 */
import type { Estadio, ParamsSimulador } from "./tipos";

function primerIndice(cond: boolean[]): number {
  const i = cond.indexOf(true);
  return i === -1 ? cond.length - 1 : i;
}

/** np.interp: lineal por tramos, constante fuera del rango. */
function interp(x: number, xp: number[], fp: number[]): number {
  if (x <= xp[0]) return fp[0];
  if (x >= xp[xp.length - 1]) return fp[fp.length - 1];
  for (let k = 1; k < xp.length; k++) {
    if (x <= xp[k]) {
      const t = (x - xp[k - 1]) / (xp[k] - xp[k - 1]);
      return fp[k - 1] + t * (fp[k] - fp[k - 1]);
    }
  }
  return fp[fp.length - 1];
}

export interface SalidaM2 {
  gdd_acum: number[];
  estadio: Estadio[];
  kc: number[];
  i_antesis: number;
  i_madurez: number;
}

/** @param iSiembra índice del día de siembra dentro de la serie (0 = inicio). */
export function m2Fenologia(tmean: number[], iSiembra: number, params: ParamsSimulador): SalidaM2 {
  const fen = params.fenologia;
  const cul = params.cultivo;
  if (fen.modo !== "umbral_gdd") throw new Error(`Motor del navegador: modo ${fen.modo} no implementado`);
  const n = tmean.length;

  const gdd_acum = new Array<number>(n);
  let acum = 0;
  for (let t = 0; t < n; t++) {
    if (t >= iSiembra) acum += Math.max(0, tmean[t] - fen.tbase_c);
    gdd_acum[t] = acum;
  }

  const i_antesis = primerIndice(gdd_acum.map((g) => g >= fen.gdd_antesis_objetivo));
  const i_madurez = Math.max(primerIndice(gdd_acum.map((g) => g >= fen.gdd_madurez_objetivo)), i_antesis);

  const estadio = new Array<Estadio>(n);
  for (let t = 0; t < n; t++) {
    if (t < iSiembra) estadio[t] = "pre_siembra";
    else if (Math.abs(t - i_antesis) <= fen.ventana_antesis_dias) estadio[t] = "antesis";
    else if (t < i_antesis) estadio[t] = "vegetativo";
    else if (t <= i_madurez) estadio[t] = "llenado";
    else estadio[t] = "madurez";
  }

  // Kc por tramos (FAO-56), en días desde el inicio de la serie
  const dSie = Math.max(iSiembra, 0);
  const finIni = dSie + fen.kc_frac_inicial * (i_antesis - dSie);
  const finMid = i_antesis + fen.kc_frac_mid * (i_madurez - i_antesis);
  const xp = [dSie, finIni, i_antesis, finMid, i_madurez];
  for (let k = 1; k < 5; k++) xp[k] = Math.max(xp[k], xp[k - 1]);   // maximum.accumulate
  for (let k = 0; k < 5; k++) xp[k] += 1e-6 * k;                     // estrictamente creciente
  const fp = [cul.kc_ini, cul.kc_ini, cul.kc_mid, cul.kc_mid, cul.kc_end];
  const kc = Array.from({ length: n }, (_, t) => interp(t, xp, fp));

  return { gdd_acum, estadio, kc, i_antesis, i_madurez };
}
