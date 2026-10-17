/** Utilidades estadísticas compartidas (percentiles, variables casi constantes). */

/** Percentil de `v` dentro de `valores` (0–100): porcentaje de valores ≤ v. Ignora NaN y null. */
export function percentil(v: number, valores: (number | null)[]): number {
  const xs = valores.filter((x): x is number => x !== null && !Number.isNaN(x));
  if (!xs.length || Number.isNaN(v)) return NaN;
  return (100 * xs.filter((x) => x <= v).length) / xs.length;
}

/**
 * Proporción de parcelas que comparten el valor más frecuente (redondeado a `decimales`).
 * Regla de la interfaz: si es > 0.70, la variable es "casi constante" y no se muestra barra de percentil.
 */
export function fraccionModa(valores: number[], decimales = 3): { valor: number; fraccion: number; n: number } {
  const cuenta = new Map<number, number>();
  for (const x of valores) {
    const k = Number(x.toFixed(decimales));
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  let valor = NaN, n = 0;
  for (const [k, c] of cuenta) if (c > n) { valor = k; n = c; }
  return { valor, fraccion: valores.length ? n / valores.length : 0, n };
}

export const UMBRAL_CASI_CONSTANTE = 0.7;

export function mediana(xs: number[]): number {
  const s = [...xs].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
