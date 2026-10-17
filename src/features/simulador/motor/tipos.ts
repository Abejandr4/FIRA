/**
 * Tipos del motor del simulador en el navegador.
 * Espejo de SimuladorBiofisico/src/simulador (M2–M4 + variables). M1 (clima) llega ya calculado
 * en public/data/simulador/diario/<ID>.json, porque no depende de la fecha de siembra.
 */

/** Entradas diarias de una parcela (public/data/simulador/diario/<ID>.json). */
export interface EntradaDiaria {
  id: string;
  /** Primer día de la serie, YYYY-MM-DD (15-mar-2025). */
  inicio: string;
  n_dias: number;
  suelo: { FC_mm: number; PWP_mm: number; AWC_mm: number };
  tmean: number[]; // °C (M1)
  pcp: number[];   // mm/día
  par: number[];   // MJ/m²/día (M1)
  eto: number[];   // mm/día (M1, Hargreaves)
  fapar_final: number[]; // 0–1 (satélite)
}

/** Subconjunto de configs/params.yaml que usa el motor (public/data/simulador/params.json). */
export interface ParamsSimulador {
  ventana: { inicio: string; fin: string };
  fenologia: {
    tbase_c: number;
    gdd_antesis_objetivo: number;
    gdd_madurez_objetivo: number;
    ventana_antesis_dias: number;
    gdd_variables_ref: "pico_ndvi" | "pico_ndvi_hasta_madurez_modelo" | "antesis";
    modo: "umbral_gdd" | "satelite";
    madurez_fapar_frac_pico: number;
    kc_frac_inicial: number;
    kc_frac_mid: number;
  };
  cultivo: {
    kc_ini: number; kc_mid: number; kc_end: number;
    p_agotamiento: number; rue_max_g_mj_par: number; hi_base: number;
  };
  suelo: { sw_inicial_frac_awc: number };
  lue: {
    hi_opcion: "A" | "B" | "C";
    hi_sens_antesis: number; hi_sens_llenado: number; hi_beta: number;
    hi_kemanian: { hi0: number; s: number };
  };
}

export type Estadio = "pre_siembra" | "vegetativo" | "antesis" | "llenado" | "madurez";

/** Serie diaria simulada (lo que consume la planta y la línea de tiempo). */
export interface SerieSimulada {
  gdd_acum: number[];
  estadio: Estadio[];
  kc: number[];
  sw: number[];  // mm
  ks: number[];  // 0–1
  eta: number[]; // mm/día
  bio: number[]; // kg/ha acumulada
}

/** Las 12 variables + extras, con los mismos nombres de columna que biofisicas_197_parcelas.csv. */
export interface Variables12 {
  GDD_antesis: number;
  GDD_llenado: number;
  DAP_antesis_est: number;
  ETo_acum: number;
  ETa_acum: number;
  Deficit_Hidrico_Total: number;
  KS_prom_antesis: number;
  KS_prom_llenado: number;
  fPAR_integrado: number;
  Biomasa_Antesis_Sim: number;
  Biomasa_Total_Sim: number;
  HI_penalizado: number;
}

export interface Extras {
  Deficit_ETc: number;
  ciclo_incompleto: boolean;
  caida_fpar_no_alcanzada: boolean;
}

export interface ResultadoSimulacion {
  /** Índices de día (0 = inicio de la serie). */
  i_siembra: number;
  i_antesis: number;
  i_madurez: number;
  fecha_siembra: string;
  fecha_antesis: string;
  fecha_madurez: string;
  serie: SerieSimulada;
  variables: Variables12;
  extras: Extras;
}
