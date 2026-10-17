/**
 * Definición de las 12 tarjetas: nombre sencillo, columna técnica, unidad, decimales y texto de ayuda.
 * Los textos de ayuda son los del prompt de diseño (docs/PROMPT_FIRA.md); cada tooltip termina con
 * "Columna: [nombre]" (lo agrega el componente Tooltip).
 */
import type { Variables12 } from "../motor/tipos";

export interface DefMetrica {
  columna: keyof Variables12;
  nombre: string;
  unidad: string;
  decimales: number;
  ayuda: string;
  /** Solo KS lleva color semántico (más alto = mejor). */
  semantica?: "ks";
}

export interface GrupoMetricas {
  id: "fenologia" | "agua" | "luz";
  titulo: string;
  pregunta: string;
  metricas: DefMetrica[];
}

export const GRUPOS: GrupoMetricas[] = [
  {
    id: "fenologia", titulo: "Fenología", pregunta: "¿cuándo?", metricas: [
      { columna: "GDD_antesis", nombre: "Calor hasta floración", unidad: "°C·d", decimales: 0,
        ayuda: "La cebada no cuenta días, cuenta calor. Es el calor que juntó desde la siembra hasta florecer." },
      { columna: "GDD_llenado", nombre: "Calor durante llenado", unidad: "°C·d", decimales: 0,
        ayuda: "Calor que juntó mientras el grano se llenaba, de la floración a la madurez." },
      { columna: "DAP_antesis_est", nombre: "Días hasta floración", unidad: "días", decimales: 0,
        ayuda: "Días transcurridos hasta florecer. La floración suele ser una etapa sensible a la sequía y a las heladas." },
    ],
  },
  {
    id: "agua", titulo: "Agua", pregunta: "¿cuánta tuvo?", metricas: [
      { columna: "ETo_acum", nombre: "Agua que pidió el clima", unidad: "mm", decimales: 0,
        ayuda: "La 'sed' de la atmósfera durante el ciclo: con más calor y sol, más sed." },
      { columna: "ETa_acum", nombre: "Agua que usó el cultivo", unidad: "mm", decimales: 0,
        ayuda: "Agua que la cebada tomó del suelo. Es menor que la anterior cuando la planta aún es chica o cuando faltó agua." },
      { columna: "Deficit_Hidrico_Total", nombre: "Brecha de agua", unidad: "mm", decimales: 0,
        ayuda: "Lo que pidió el clima menos lo que usó el cultivo. Incluye que una planta pequeña usa menos agua, así que por sí sola no indica sequía; sirve para comparar con otras parcelas." },
      { columna: "KS_prom_antesis", nombre: "Estrés en floración", unidad: "", decimales: 2, semantica: "ks",
        ayuda: "1 es toda el agua que necesitaba; 0, casi ninguna. Promedio de unas tres semanas alrededor de la floración." },
      { columna: "KS_prom_llenado", nombre: "Estrés en llenado", unidad: "", decimales: 2, semantica: "ks",
        ayuda: "Lo mismo, durante el llenado del grano. Faltar agua en esta etapa puede reducir el tamaño del grano." },
    ],
  },
  {
    id: "luz", titulo: "Luz y biomasa", pregunta: "¿cuánto creció?", metricas: [
      { columna: "fPAR_integrado", nombre: "Luz aprovechada", unidad: "fPAR·día", decimales: 1,
        ayuda: "Qué tanto cubrió y aprovechó la luz el cultivo, sumado día a día. Viene del satélite: más verde y cerrado, más luz aprovechada." },
      { columna: "Biomasa_Antesis_Sim", nombre: "Materia seca a floración", unidad: "kg/ha", decimales: 0,
        ayuda: "Peso seco de la planta cuando florece. Sirve para comparar parcelas, no como valor absoluto." },
      { columna: "Biomasa_Total_Sim", nombre: "Materia seca total", unidad: "kg/ha", decimales: 0,
        ayuda: "Peso seco de toda la planta al final (paja y grano). No es el rendimiento de grano; úsalo solo para comparar parcelas." },
      { columna: "HI_penalizado", nombre: "Proporción que se vuelve grano", unidad: "", decimales: 2,
        ayuda: "De cada kilo de planta seca, cuánto sería grano. Baja si hubo estrés de agua durante el llenado. En esta versión casi no varía entre parcelas." },
    ],
  },
];

export const TODAS = GRUPOS.flatMap((g) => g.metricas);

/** Columnas extra del escenario base (biofisicas_extras_197_parcelas.csv). */
export const OTRAS_SALIDAS = [
  { columna: "Deficit_ETc", nombre: "Déficit frente a la demanda del cultivo", unidad: "mm",
    ayuda: "Suma de ETo × Kc menos el agua que usó el cultivo. Mide el estrés real, ya descontado el tamaño de la planta." },
  { columna: "ciclo_incompleto", nombre: "Ciclo sin madurez antes del 30-nov", unidad: "",
    ayuda: "Verdadero si la madurez simulada no se alcanzó dentro de la ventana de simulación." },
  { columna: "caida_fpar_no_alcanzada", nombre: "El fPAR no cae a la mitad del pico", unidad: "",
    ayuda: "Verdadero si el fPAR no cae a la mitad del pico antes del 30-nov; en ese caso el calor del llenado se cuenta hasta el último día." },
] as const;
