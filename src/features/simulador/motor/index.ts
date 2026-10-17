/**
 * Motor del simulador en el navegador: M2 → M3 → M4 → 12 variables.
 * Port fiel de SimuladorBiofisico (variables.py). Se verifica contra biofisicas_197_parcelas.csv con
 * `npm run verificar:motor` (scripts/verificar_motor.ts). Si cambia el Python, hay que cambiar esto.
 *
 * Uso típico (Explorador): simular(entrada, params, fechaPico, "2025-05-05")
 */
import { aDia, deDia } from "./fechas";
import { m2Fenologia } from "./m2_fenologia";
import { m3BalanceHidrico } from "./m3_balance_hidrico";
import { hiPenalizado, m4Lue } from "./m4_lue";
import type { EntradaDiaria, ParamsSimulador, ResultadoSimulacion } from "./tipos";

export * from "./tipos";
export * from "./fechas";

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export class ErrorSimulacion extends Error {}

/**
 * @param fechaPico  fecha del pico de NDVI de la parcela (variables.json → fecha_pico); fija, viene del satélite.
 * @param fechaSiembra  YYYY-MM-DD dentro de la ventana de simulación.
 */
export function simular(
  e: EntradaDiaria, params: ParamsSimulador, fechaPico: string, fechaSiembra: string,
): ResultadoSimulacion {
  const d0 = aDia(e.inicio);
  const n = e.n_dias;
  const iSiembra = aDia(fechaSiembra) - d0;
  if (iSiembra < 0 || iSiembra >= n) {
    throw new ErrorSimulacion(`La fecha de siembra ${fechaSiembra} está fuera de la ventana de simulación`);
  }
  const fen = params.fenologia;

  const m2 = m2Fenologia(e.tmean, iSiembra, params);
  const m3 = m3BalanceHidrico(e.pcp, e.eto, m2.kc, e.suelo, params);
  const bio = m4Lue(e.par, e.fapar_final, m3.ks, iSiembra, m2.i_madurez, params);

  // --- variables.py
  const { i_antesis: iAnt, i_madurez: iMad } = m2;
  const iRef = fen.gdd_variables_ref === "antesis" ? iAnt : aDia(fechaPico) - d0;
  if (iRef < 0 || iRef >= n) throw new ErrorSimulacion(`La serie no incluye la fecha de referencia ${deDia(d0 + iRef)}`);
  const gddRef = m2.gdd_acum[iRef];

  let gddFin: number, caidaOk = true;
  if (fen.gdd_variables_ref === "pico_ndvi") {
    const iPico = Math.min(Math.max(iRef, 0), n - 1);
    const tope = fen.madurez_fapar_frac_pico * e.fapar_final[iPico];
    let iFin = -1;
    for (let t = iPico + 1; t < n; t++) if (e.fapar_final[t] <= tope) { iFin = t; break; }
    caidaOk = iFin !== -1;
    gddFin = m2.gdd_acum[caidaOk ? iFin : n - 1];
  } else {
    gddFin = m2.gdd_acum[iMad];
  }

  let etoAcum = 0, etaAcum = 0, etcAcum = 0, fpar = 0;
  for (let t = iSiembra; t <= iMad; t++) {
    etoAcum += e.eto[t]; etaAcum += m3.eta[t]; etcAcum += e.eto[t] * m2.kc[t];
    fpar += Math.min(1, Math.max(0, e.fapar_final[t]));
  }
  const ksAnt = media(m3.ks.filter((_, t) => m2.estadio[t] === "antesis"));
  const ksLle = media(m3.ks.filter((_, t) => m2.estadio[t] === "llenado"));
  const bioAnt = bio[iAnt], bioTot = bio[iMad];

  return {
    i_siembra: iSiembra, i_antesis: iAnt, i_madurez: iMad,
    fecha_siembra: deDia(d0 + iSiembra), fecha_antesis: deDia(d0 + iAnt), fecha_madurez: deDia(d0 + iMad),
    serie: { gdd_acum: m2.gdd_acum, estadio: m2.estadio, kc: m2.kc, sw: m3.sw, ks: m3.ks, eta: m3.eta, bio },
    variables: {
      GDD_antesis: gddRef,
      GDD_llenado: Math.max(0, gddFin - gddRef),
      DAP_antesis_est: iAnt - iSiembra,
      ETo_acum: etoAcum,
      ETa_acum: etaAcum,
      Deficit_Hidrico_Total: etoAcum - etaAcum,
      KS_prom_antesis: ksAnt,
      KS_prom_llenado: ksLle,
      fPAR_integrado: fpar,
      Biomasa_Antesis_Sim: bioAnt,
      Biomasa_Total_Sim: bioTot,
      HI_penalizado: hiPenalizado(bioAnt, bioTot, ksLle, ksAnt, params),
    },
    extras: {
      Deficit_ETc: etcAcum - etaAcum,
      ciclo_incompleto: iMad >= n - 1,
      caida_fpar_no_alcanzada: !caidaOk,
    },
  };
}
