/**
 * Corrección satelital del modelo (ridge) evaluada en el navegador, para Sensibilidad de la predición.
 * Fórmula exacta del pipeline de sklearn (SimpleImputer → StandardScaler → RidgeCV):
 *   corr = intercepto + Σ coef_j · (x_j − media_j) / escala_j,   x_j faltante → mediana_j
 * Datos: public/data/modelo/ridge.json (lo genera scripts/exportar_datos.py, que verifica la fórmula
 * contra sklearn). Verificación en TS: npm run verificar:modelo.
 */

/** public/data/modelo/ridge.json */
export interface ModeloRidge {
  fuente: string;
  cols: string[];
  medianas: number[];
  medias: number[];
  escalas: number[];
  coef: number[];
  intercepto: number;
  alpha: number;
}

/** public/data/modelo/variables.json — las 34 variables del modelo por parcela (null = faltante). */
export interface VariablesModelo {
  cols: string[];
  valores: Record<string, (number | null)[]>;
}

/** Aporte de cada variable a la corrección, en t/ha (sin el intercepto). */
export function aportes(m: ModeloRidge, x: (number | null)[]): number[] {
  return m.cols.map((_, j) => {
    const v = x[j] ?? m.medianas[j];
    return (m.coef[j] * (v - m.medias[j])) / m.escalas[j];
  });
}

/** Corrección satelital en t/ha. */
export function correccion(m: ModeloRidge, x: (number | null)[]): number {
  return aportes(m, x).reduce((a, b) => a + b, m.intercepto);
}

/**
 * Predicción con variables modificadas. Se suma el CAMBIO de la corrección a la predicción mostrada,
 * para que con los valores originales el resultado sea exactamente `pred` (también en ENTRENAMIENTO,
 * donde `pred` se ajustó sin la propia parcela y la corrección final usa las 138).
 */
export function predecirConCambios(m: ModeloRidge, pred: number, original: (number | null)[], modificado: (number | null)[]): number {
  return pred + correccion(m, modificado) - correccion(m, original);
}
