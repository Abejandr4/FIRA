/** Fechas como días enteros (UTC) para evitar problemas de zona horaria. */
const DIA_MS = 86_400_000;

export function aDia(fecha: string): number {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / DIA_MS);
}

export function deDia(dia: number): string {
  return new Date(dia * DIA_MS).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  return deDia(aDia(fecha) + dias);
}

export function diferenciaDias(a: string, b: string): number {
  return aDia(a) - aDia(b);
}
