import type { Parcela } from "../../data/tipos";
import { fechaDeDiaDelAnio, num } from "../../lib/formato";

export const MIN_PARCELAS = 10;
const P_ALTO = 0.9, P_BAJO = 0.1, MAX_SENALES = 4;

type Col = "ndvi_p95_s2" | "gu50_doy_s2" | "pend_mean" | "dur50_dias_s2";

// Nota: dur50_dias_s2 solo existe en ~36 % de las parcelas (las que senescieron antes del 31 de octubre);
// la comparación se hace entre las parcelas del municipio que sí lo tienen.
const REGLAS: { col: Col; fmt: (x: number) => string; alto: string; bajo: string }[] = [
  { col: "ndvi_p95_s2", fmt: (x) => num(x, 2),
    alto: "NDVI máximo por encima del rango habitual del municipio; verificar cobertura observada",
    bajo: "NDVI máximo por debajo del rango habitual del municipio; verificar vigor y densidad del cultivo en campo" },
  { col: "gu50_doy_s2", fmt: (x) => fechaDeDiaDelAnio(Math.round(x)),
    alto: "Inicio de crecimiento más tardío que la mayoría; contrastar con la fecha de siembra",
    bajo: "Inicio de crecimiento más temprano que la mayoría; contrastar con la fecha de siembra" },
  { col: "pend_mean", fmt: (x) => `${num(x, 1)}°`,
    alto: "Pendiente mayor que la de la mayoría de las parcelas del municipio; revisar drenaje y manejo del suelo en campo",
    bajo: "Terreno más plano que la mayoría de las parcelas del municipio" },
  { col: "dur50_dias_s2", fmt: (x) => `${num(x, 0)} días`,
    alto: "Duración del ciclo mayor que la habitual; revisar el registro fenológico en campo",
    bajo: "Duración del ciclo menor que la habitual; revisar el registro fenológico en campo" },
];

export type ResultadoDx =
  | { tipo: "insuficiente"; n: number }
  | { tipo: "sin_diferencias"; n: number }
  | { tipo: "senales"; n: number; textos: string[] };

const rangoPercentil = (v: number, xs: number[]) =>
  (xs.filter((x) => x < v).length + 0.5 * xs.filter((x) => x === v).length) / xs.length;

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function generarSenales(p: Parcela, delMunicipio: Parcela[]): ResultadoDx {
  const otras = delMunicipio.filter((x) => x.id !== p.id);
  const n = otras.length + 1;
  if (n < MIN_PARCELAS) return { tipo: "insuficiente", n };

  const halladas: { dist: number; texto: string }[] = [];
  for (const r of REGLAS) {
    const v = p[r.col] as number | null;
    if (v === null) continue;
    const xs = otras.map((x) => x[r.col] as number | null).filter((x): x is number => x !== null);
    if (xs.length < MIN_PARCELAS - 1) continue;
    const rango = rangoPercentil(v, xs);
    if (rango < P_ALTO && rango > P_BAJO) continue;
    const base = rango >= P_ALTO ? r.alto : r.bajo;
    halladas.push({ dist: Math.abs(rango - 0.5),
      texto: `${base} (parcela: ${r.fmt(v)}; mediana del municipio: ${r.fmt(mediana(xs))}).` });
  }
  halladas.sort((a, b) => b.dist - a.dist);
  return halladas.length === 0
    ? { tipo: "sin_diferencias", n }
    : { tipo: "senales", n, textos: halladas.slice(0, MAX_SENALES).map((h) => h.texto) };
}