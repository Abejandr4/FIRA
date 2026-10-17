/**
 * Estado del escenario del simulador: fecha estimada (base) vs. fecha ingresada por el usuario.
 * Corre el motor en el navegador. Nada de aquí toca la predicción del modelo ni lo financiero.
 */
import { useMemo, useState } from "react";
import type { EntradaDiaria, ParamsSimulador, VariablesSimulador } from "../../data/tipos";
import { aDia, ErrorSimulacion, simular, type ResultadoSimulacion } from "./motor";

/** Criterio de interfaz (por definir con el equipo): días entre la siembra ingresada y el inicio de crecimiento observado. */
export const UMBRAL_DIAS_AVISO_NDVI = 45;

export type Origen = "estimada" | "ingresada";

export interface Escenario {
  base: ResultadoSimulacion;
  activo: ResultadoSimulacion;
  origen: Origen;
  fechaIngresada: string;
  setFechaIngresada: (f: string) => void;
  setUsar: (o: Origen) => void;
  usar: Origen;
  restablecer: () => void;
  /** Error del campo (fecha fuera de la ventana). Con error, el escenario activo es el base. */
  errorFecha: string | null;
  igualAEstimada: boolean;
  /** Aviso no bloqueante: la siembra ingresada está muy lejos del inicio de crecimiento observado. */
  avisoNdvi: string | null;
  ventana: { inicio: string; fin: string };
}

export function useEscenario(entrada: EntradaDiaria, params: ParamsSimulador, v: VariablesSimulador): Escenario {
  const [fechaIngresada, setFecha] = useState("");
  const [usar, setUsar] = useState<Origen>("estimada");
  const ventana = params.ventana;

  const base = useMemo(() => simular(entrada, params, v.fecha_pico, v.fecha_siembra), [entrada, params, v]);

  let errorFecha: string | null = null;
  if (fechaIngresada && (aDia(fechaIngresada) < aDia(ventana.inicio) || aDia(fechaIngresada) > aDia(ventana.fin))) {
    errorFecha = "fuera";
  }

  const ingresado = useMemo(() => {
    if (!fechaIngresada || errorFecha) return null;
    try { return simular(entrada, params, v.fecha_pico, fechaIngresada); }
    catch (e) { if (e instanceof ErrorSimulacion) return null; throw e; }
  }, [entrada, params, v, fechaIngresada, errorFecha]);

  const origen: Origen = usar === "ingresada" && ingresado ? "ingresada" : "estimada";
  const activo = origen === "ingresada" && ingresado ? ingresado : base;

  const diasSos = fechaIngresada && !errorFecha ? aDia(v.fecha_sos) - aDia(fechaIngresada) : 0;
  const avisoNdvi = diasSos > UMBRAL_DIAS_AVISO_NDVI ? v.fecha_sos : null;

  return {
    base, activo, origen, usar, ventana, fechaIngresada,
    setFechaIngresada: (f) => { setFecha(f); if (f) setUsar("ingresada"); },
    setUsar,
    restablecer: () => { setFecha(""); setUsar("estimada"); },
    errorFecha,
    igualAEstimada: !!fechaIngresada && fechaIngresada === v.fecha_siembra,
    avisoNdvi,
  };
}
