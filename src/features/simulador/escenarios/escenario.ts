/**
 * Escenarios hipotéticos sobre el simulador (antes "¿Y si…?").
 * Modifican las ENTRADAS del motor (lluvia, riego, umbrales térmicos, fecha de siembra) y vuelven a simular.
 * El motor no se toca: se le pasa una copia modificada de la entrada diaria y de los parámetros.
 *
 * Limitación: el fPAR es el observado por el satélite y no responde a los cambios. En un periodo seco la
 * cobertura del cultivo no baja en la simulación; el efecto entra solo por el estrés hídrico (Ks).
 */
import { aDia, simular, type EntradaDiaria, type ParamsSimulador, type ResultadoSimulacion } from "../motor";

export type Variedad = "precoz" | "intermedia" | "tardia";

/** Criterio de interfaz (no calibrado): factor sobre los grados-día objetivo de antesis y madurez. */
export const FACTOR_VARIEDAD: Record<Variedad, number> = { precoz: 0.9, intermedia: 1, tardia: 1.1 };

export interface Escenario {
  fechaSiembra: string;
  periodoSeco: { activo: boolean; inicio: string; dias: number };
  lluviaPct: number;                 // −80 … +80, sobre toda la serie
  riego: { activo: boolean; fecha: string; mm: number };
  variedad: Variedad;
}

export function escenarioNeutro(fechaSiembra: string, fechaMedia: string): Escenario {
  return {
    fechaSiembra,
    periodoSeco: { activo: false, inicio: fechaMedia, dias: 21 },
    lluviaPct: 0,
    riego: { activo: false, fecha: fechaMedia, mm: 30 },
    variedad: "intermedia",
  };
}

export function esNeutro(e: Escenario, fechaBase: string): boolean {
  return e.fechaSiembra === fechaBase && !e.periodoSeco.activo && e.lluviaPct === 0 && !e.riego.activo && e.variedad === "intermedia";
}

/** Valida contra la ventana de simulación. Devuelve mensajes por campo. */
export function validar(e: Escenario, ventana: { inicio: string; fin: string }): Partial<Record<"siembra" | "seco" | "riego", string>> {
  const dentro = (f: string) => !!f && aDia(f) >= aDia(ventana.inicio) && aDia(f) <= aDia(ventana.fin);
  const err: Partial<Record<"siembra" | "seco" | "riego", string>> = {};
  if (!dentro(e.fechaSiembra)) err.siembra = "Fecha fuera de la ventana de simulación.";
  if (e.periodoSeco.activo && (!dentro(e.periodoSeco.inicio) || e.periodoSeco.dias < 1 || e.periodoSeco.dias > 90)) {
    err.seco = "Inicio dentro de la ventana y duración entre 1 y 90 días.";
  }
  if (e.riego.activo && (!dentro(e.riego.fecha) || e.riego.mm <= 0 || e.riego.mm > 150)) {
    err.riego = "Fecha dentro de la ventana y lámina entre 1 y 150 mm.";
  }
  return err;
}

/** Copia de la entrada con la lluvia modificada. */
export function aplicarClima(entrada: EntradaDiaria, e: Escenario): EntradaDiaria {
  const d0 = aDia(entrada.inicio);
  const pcp = entrada.pcp.map((x) => x * (1 + e.lluviaPct / 100));
  if (e.periodoSeco.activo) {
    const i0 = aDia(e.periodoSeco.inicio) - d0;
    for (let t = Math.max(0, i0); t < Math.min(pcp.length, i0 + e.periodoSeco.dias); t++) pcp[t] = 0;
  }
  if (e.riego.activo) {
    const i = aDia(e.riego.fecha) - d0;
    if (i >= 0 && i < pcp.length) pcp[i] += e.riego.mm;
  }
  return { ...entrada, pcp };
}

export function aplicarParams(params: ParamsSimulador, e: Escenario): ParamsSimulador {
  const f = FACTOR_VARIEDAD[e.variedad];
  return {
    ...params,
    fenologia: {
      ...params.fenologia,
      gdd_antesis_objetivo: params.fenologia.gdd_antesis_objetivo * f,
      gdd_madurez_objetivo: params.fenologia.gdd_madurez_objetivo * f,
    },
  };
}

export function simularEscenario(entrada: EntradaDiaria, params: ParamsSimulador, fechaPico: string, e: Escenario): ResultadoSimulacion {
  return simular(aplicarClima(entrada, e), aplicarParams(params, e), fechaPico, e.fechaSiembra);
}

/** Lluvia acumulada (mm) entre la siembra y la madurez de un resultado. */
export function lluviaCiclo(pcp: number[], r: ResultadoSimulacion): number {
  let s = 0;
  for (let t = r.i_siembra; t <= r.i_madurez; t++) s += pcp[t];
  return s;
}
