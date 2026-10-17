/** M3 balance hídrico de un solo depósito. Port de m3_balance_hidrico.py (_balance_parcela). */
import type { ParamsSimulador } from "./tipos";

export interface SalidaM3 {
  sw: number[];
  ks: number[];
  eta: number[];
}

export function m3BalanceHidrico(
  pcp: number[], eto: number[], kc: number[],
  suelo: { FC_mm: number; PWP_mm: number; AWC_mm: number },
  params: ParamsSimulador,
): SalidaM3 {
  const { FC_mm: fc, PWP_mm: pwp, AWC_mm: awc } = suelo;
  const p = params.cultivo.p_agotamiento;
  const n = pcp.length;
  const sw = new Array<number>(n), ks = new Array<number>(n), eta = new Array<number>(n);

  const umbral = fc - p * awc;
  const denom = (1 - p) * awc;
  let swPrev = pwp + params.suelo.sw_inicial_frac_awc * awc;

  for (let t = 0; t < n; t++) {
    let k = swPrev >= umbral ? 1 : (swPrev - pwp) / denom;   // KS con el agua del día anterior
    k = Math.min(1, Math.max(0, k));
    const demanda = eto[t] * kc[t] * k;
    const disponible = Math.max(0, swPrev + pcp[t] - pwp);
    const e = Math.min(demanda, disponible);
    const s = Math.min(fc, swPrev + pcp[t] - e);
    ks[t] = k; eta[t] = e; sw[t] = s;
    swPrev = s;
  }
  return { sw, ks, eta };
}
