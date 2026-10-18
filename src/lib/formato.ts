/**
 * Formato de números y fechas en un solo lugar.
 * DECISIÓN ABIERTA: el diseño de Figma usa coma decimal ("XX,X t/ha"); la norma en México es punto decimal.
 * Cambiar SEPARADOR_DECIMAL aquí cambia todo el dashboard.
 */
export const SEPARADOR_DECIMAL: "," | "." = ",";
const SEP_MILES = SEPARADOR_DECIMAL === "," ? "." : ",";

export function num(x: number | null | undefined, decimales = 1): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const [ent, dec] = Math.abs(x).toFixed(decimales).split(".");
  const conMiles = ent.length > 3 ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, SEP_MILES) : ent;
  return `${x < 0 ? "−" : ""}${conMiles}${dec ? SEPARADOR_DECIMAL + dec : ""}`;
}

/** Con signo explícito: "+0,12", "−0,08". */
export function numSigno(x: number, decimales = 2): string {
  const r = Number(x.toFixed(decimales));          // evita «−0,00» y «+0,00»
  return `${r > 0 ? "+" : r < 0 ? "" : "±"}${num(r, decimales)}`;
}

export function pct(x: number, decimales = 1): string {
  return `${numSigno(x, decimales)} %`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
  "octubre", "noviembre", "diciembre"];

/** "2025-05-20" → "20/05/2025" */
export function fecha(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2025-05-20" → "20 de mayo, 2025" */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]}, ${a}`;
}

/** Día del año (2025) → "20/05/2025" */
export function fechaDeDiaDelAnio(doy: number, anio = 2025): string {
  return fecha(new Date(Date.UTC(anio, 0, doy)).toISOString());
}

export function dias(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} ${Math.abs(n) === 1 ? "día" : "días"}`;
}
