import type { Parcela } from "../../data/tipos";

export type Mensaje = { rol: "usuario" | "bot"; texto: string; fuente?: string };
export type Respuesta = { texto: string; fuente?: string };
export interface Contexto {
  parcela: Parcela | null;
  parcelas: Parcela[];
  meta?: Record<string, any>;
}

/* ---------- AJUSTAR: adaptador a los campos reales de Parcela ---------- */
const rend = (p: Parcela): number => (p as any).rendimiento;   // kg/ha estimado
const conf = (p: Parcela): string => (p as any).confianza;     // "alta" | "media" | "baja"
const comp = (p: Parcela) => (p as any).componentes as
  | { municipal: number; vecinas: number; satelital: number } | undefined;
/* ----------------------------------------------------------------------- */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const fmt = (n: number, d = 0) => n.toLocaleString("es-MX", { maximumFractionDigits: d });
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const AYUDA = "Puedo explicar cómo se calculó una estimación, qué significa la confianza, comparar una parcela con su municipio o mostrar el ranking de rendimiento.";

type Intent = { claves: string[]; responder: (c: Contexto, q: string) => Respuesta };

const intents: Intent[] = [
  {
    claves: ["como se calculo", "como se obtuvo", "estimacion", "metodo", "calcul", "obtuvo"],
    responder: ({ parcela: p }) => {
      if (!p) return { texto: "Selecciona una parcela en el mapa y te explico cómo se obtuvo su estimación." };
      const c = comp(p);
      const det = c
        ? ` En números: referencia municipal ${fmt(c.municipal)} kg/ha, aporte de vecinas ${fmt(c.vecinas)} kg/ha y corrección satelital ${fmt(c.satelital)} kg/ha.`
        : "";
      return {
        texto: `La estimación de la parcela ${p.id} (${fmt(rend(p))} kg/ha) combina la referencia municipal, las parcelas vecinas y una corrección satelital pequeña.${det}`,
        fuente: `parcelas.json · parcela ${p.id}`,
      };
    },
  },
  {
    claves: ["confianza", "confiable", "fiable", "seguro"],
    responder: ({ parcela: p, meta }, q) => {
      const nivel = ["baja", "media", "alta"].find((n) => q.includes(n)) ?? (p ? conf(p) : undefined);
      const def = nivel && meta?.glosario?.[`confianza_${nivel}`]; // el texto vive en meta.json
      const propia = p ? ` La parcela ${p.id} tiene confianza ${conf(p)}.` : "";
      return def
        ? { texto: `${def}${propia}`, fuente: "meta.json · glosario" }
        : { texto: `No hay una definición de ese nivel en los datos cargados.${propia}`, fuente: "parcelas.json" };
    },
  },
  {
    claves: ["municipio", "compara", "promedio", "vecin"],
    responder: ({ parcela: p, parcelas }) => {
      if (!p) return { texto: "Selecciona una parcela para compararla con su municipio." };
      const mismas = parcelas.filter((x) => x.municipio === p.municipio);
      const prom = media(mismas.map(rend));
      const dif = rend(p) - prom;
      return {
        texto: `En ${p.municipio} hay ${mismas.length} parcela(s) con promedio de ${fmt(prom)} kg/ha. La parcela ${p.id} (${fmt(rend(p))} kg/ha) está ${fmt(Math.abs(dif))} kg/ha ${dif >= 0 ? "por encima" : "por debajo"}.`,
        fuente: "parcelas.json",
      };
    },
  },
  {
    claves: ["mayor", "menor", "mejor", "peor", "ranking", "mas alto", "mas bajo", "top"],
    responder: ({ parcelas }, q) => {
      const orden = [...parcelas].sort((a, b) => rend(b) - rend(a));
      const bajo = /menor|peor|mas bajo/.test(q);
      const lista = (bajo ? orden.slice(-3).reverse() : orden.slice(0, 3))
        .map((x) => `${x.id} (${x.municipio}, ${fmt(rend(x))} kg/ha)`).join("; ");
      return { texto: `Las 3 parcelas con ${bajo ? "menor" : "mayor"} rendimiento estimado: ${lista}.`, fuente: "parcelas.json" };
    },
  },
  {
    claves: ["cuantas", "total", "resumen", "general"],
    responder: ({ parcelas }) => {
      const r = parcelas.map(rend);
      return {
        texto: `El dashboard cubre ${parcelas.length} parcelas. Rendimiento estimado: promedio ${fmt(media(r))} kg/ha, mínimo ${fmt(Math.min(...r))} y máximo ${fmt(Math.max(...r))}.`,
        fuente: "parcelas.json",
      };
    },
  },
];

function entidadMencionada({ parcelas }: Contexto, q: string): Respuesta | null {
  const m = q.match(/parcela\s+([a-z0-9_-]+)/);
  const p = m && parcelas.find((x) => norm(String(x.id)) === m[1]);
  if (p) return { texto: `Parcela ${p.id} · ${p.municipio}: ${fmt(rend(p))} kg/ha estimados, confianza ${conf(p)}.`, fuente: `parcelas.json · parcela ${p.id}` };
  const mun = [...new Set(parcelas.map((x) => x.municipio))].find((x) => q.includes(norm(x)));
  if (mun) {
    const ps = parcelas.filter((x) => x.municipio === mun);
    return { texto: `${mun}: ${ps.length} parcela(s), rendimiento promedio estimado ${fmt(media(ps.map(rend)))} kg/ha.`, fuente: "parcelas.json" };
  }
  return null;
}

export function responder(pregunta: string, ctx: Contexto): Respuesta {
  const q = norm(pregunta);
  const directa = entidadMencionada(ctx, q);
  if (directa) return directa;

  let mejor: { score: number; i: Intent } | null = null;
  for (const i of intents) {
    const score = i.claves.filter((k) => q.includes(k)).length;
    if (score > 0 && (!mejor || score > mejor.score)) mejor = { score, i };
  }
  return mejor?.i.responder(ctx, q) ?? { texto: `No encuentro esa información en el dashboard. ${AYUDA}` };
}