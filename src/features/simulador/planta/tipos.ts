/**
 * Contrato entre el simulador y la planta. El simulador SOLO entrega un EstadoPlanta;
 * la planta (3D o esquema 2D) decide cómo dibujarlo. Así la planta se puede refinar sin tocar el simulador.
 */
import type { Estadio } from "../motor/tipos";

export interface EstadoPlanta {
  /** Etapa del día simulado: pre_siembra (suelo desnudo), vegetativo, antesis, llenado, madurez. */
  etapa: Estadio;
  /** 0–1. Grados-día acumulados / objetivo de madurez. Controla la altura. */
  progresoTermico: number;
  /** 0–1. fPAR del día (satélite). Controla la densidad del follaje. */
  fpar: number;
  /** 0–1. Coeficiente de estrés hídrico (1 = sin estrés). Controla el color y la caída de hojas. */
  ks: number;
  /** 0–1. Biomasa acumulada / máxima biomasa total entre las 197 parcelas. Controla el tamaño de la espiga. */
  biomasaRel: number;
}

/** Atributos que acepta la escena 3D (los de actualizarNodos3D del prototipo AnimacionCebada). */
export interface AtributosPlanta {
  escalaTallo?: number;
  escalaGrosorTallo?: number;
  escalaHojas?: number;
  rotacionHojas?: number;
  giroHojas?: number;
  escalaEspiga?: number;
  inclinacionEspiga?: number;
  colorSuelo?: number | string;
  colorTallo?: number | string;
  colorHojas?: number | string;
  colorEspiga?: number | string;
  visibleEspiga?: boolean;
  /** Añadido: oculta tallo y hojas (suelo desnudo antes de sembrar). */
  visiblePlanta?: boolean;
}

export const ETIQUETA_ETAPA: Record<Estadio, string> = {
  pre_siembra: "Suelo desnudo · antes de sembrar",
  vegetativo: "Vegetativa",
  antesis: "Floración",
  llenado: "Llenado de grano",
  madurez: "Madurez",
};
