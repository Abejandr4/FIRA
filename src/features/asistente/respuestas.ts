import { num, numSigno } from "../../lib/formato";
import { posicionRespectoMunicipio, UMBRAL_CERCA_T_HA } from "../parcela/estados";
import { cvAleatorio, cvEspacial, definicion, GLOSARIO, normalizar, type Ctx, type Termino } from "./glosario";

export interface Respuesta { texto: string; fuente: "glosario" | "datos" }

interface Intencion { patron: RegExp; requiereParcela?: boolean; responder: (c: Ctx) => string }

const INTENCIONES: Intencion[] = [
  { // ¿Cómo se calculó esta estimación?
    patron: /^(?=.*\b(como|de donde)\b)(?=.*(calcul|obtuv|obtien|estim|gener|sale))(?=.*(estimacion|prediccion|rendimiento|resultado))/,
    requiereParcela: true,
    responder: ({ parcela: p }) => {
      const q = p!;
      return `La estimación de ${num(q.pred, 2)} t/ha para ${q.id} sale de dos pasos. 1) Estimación inicial: promedio de la media de ${q.municipio} (${num(q.prior_mun, 2)} t/ha) y la de las 5 parcelas vecinas (${num(q.prior_vec, 2)} t/ha), que da ${num(q.prior, 2)} t/ha. 2) Corrección satelital: ${numSigno(q.corr, 2)} t/ha, según el NDVI, la fenología y el terreno de la parcela.` +
        (q.conjunto === "ENTRENAMIENTO" ? " Como esta parcela es de entrenamiento, la estimación se hizo sin usar su rendimiento real." : ""); },
  },
  { // ¿Qué tan confiable es esta estimación?
    patron: /(que tan (confiable|fiable|preciso|seguro)|confiar|margen de error|incertidumbre)/,
    requiereParcela: true,
    responder: ({ parcela: p, meta: m }) => {
      const q = p!, a = cvAleatorio(m);
      const iv = m ? `Intervalo al 80 %: ${num(q.pred - m.q80, 2)}–${num(q.pred + m.q80, 2)} t/ha; al 90 %: ${num(q.pred - m.q90, 2)}–${num(q.pred + m.q90, 2)} t/ha. ` : "";
      const conf = q.confianza === "baja" ? `Esta parcela tiene confianza baja: su municipio solo tiene ${q.n_entren_municipio} ${q.n_entren_municipio === 1 ? "parcela" : "parcelas"} de entrenamiento. ` : "";
      const err = a ? `El error típico del modelo es ${num(a.rmse, 2)} t/ha en validación aleatoria. ` : "";
      return `${iv}${conf}${err}El modelo estima bien el nivel de rendimiento de una zona, pero no distingue entre parcelas del mismo municipio.`; },
  },
  { // Compara con el municipio
    patron: /(compar|frente a|respecto).*(municipio|vecin|promedio|media)|(municipio|vecin).*compar/,
    requiereParcela: true,
    responder: ({ parcela: p, meta: m }) => {
      const q = p!, media = q.media_municipio_entren;
      if (media === null) return `${q.municipio} no tiene parcelas de entrenamiento con rendimiento conocido, así que no hay media municipal con qué comparar.`;
      const rel = posicionRespectoMunicipio(q.pred, media) ?? "cerca de";
      let t = `La estimación de ${q.id} es ${num(q.pred, 2)} t/ha, ${rel} la media municipal (${num(media, 2)} t/ha; diferencia ${numSigno(q.pred - media, 2)} t/ha).`;
      if (m) t += ` La media general de las parcelas de entrenamiento es ${num(m.media_general_entren, 2)} t/ha.`;
      if (q.real !== null) t += ` El rendimiento real de esta parcela es ${num(q.real, 2)} t/ha.`;
      return `${t} «${rel}» es un criterio de interfaz (±${num(UMBRAL_CERCA_T_HA, 1)} t/ha): el modelo casi no distingue entre parcelas del mismo municipio.`; },
  },
  { // ¿Qué tan bueno es el modelo?
    patron: /(que tan (bueno|bien)|desempeno|metricas|error del modelo|precision del modelo)/,
    responder: ({ meta: m }) => {
      const a = cvAleatorio(m), e = cvEspacial(m);
      if (!m || !a) return "Las métricas del modelo aún no se cargan; intenta de nuevo en unos segundos.";
      return `Error típico (RMSE) en validación aleatoria: ${num(a.rmse, 2)} t/ha${a.mae !== undefined ? `; MAE ${num(a.mae, 2)} t/ha` : ""}${a.r2 !== undefined ? `; R² ${num(a.r2, 2)}` : ""}. Predecir siempre la media general daría ${num(m.rmse_media_global, 2)} t/ha. En validación espacial (zonas sin parcelas vecinas conocidas) el error es ${e ? num(e.rmse, 2) : "—"} t/ha. La mayor parte de la mejora viene de la ubicación: el modelo estima bien el nivel de cada zona, pero no distingue entre parcelas del mismo municipio.`; },
  },
  { // ¿Qué datos usa el modelo?
    patron: /(que datos|que variables|que informacion|con que datos|en que se basa)/,
    responder: () => "El modelo usa 34 variables por parcela: índices de Sentinel-2 de abril a octubre de 2025 (nivel, pico y área bajo la curva de NDVI, EVI, LAI, MSI y NDWI), fenología (inicio y mitad del crecimiento, días con NDVI alto, NDVI mensual), forma de la parcela, elevación y pendiente. Además usa el rendimiento de las parcelas de entrenamiento de su municipio y de sus 5 vecinas. No usa Landsat ni el simulador en la predicción.",
  },
  { // ¿Por qué la corrección satelital es tan pequeña?
    patron: /(por que|porque).*(correccion|satelit).*(peque|poca|baja|chica|minima)/,
    responder: ({ meta: m }) => {
      const a = cvAleatorio(m), e = cvEspacial(m);
      const num2 = a?.rmse_prior !== undefined && e?.rmse_prior !== undefined && a && e
        ? ` En las pruebas, con vecinos conocidos las variables satelitales no mejoraron de forma detectable el error (${num(a.rmse_prior, 3)} → ${num(a.rmse, 3)} t/ha); sin vecinos cercanos la mejora fue pequeña (${num(e.rmse_prior, 3)} → ${num(e.rmse, 3)} t/ha).` : "";
      return `Porque la ubicación ya explica casi todo el rendimiento esperado, y las imágenes de satélite no distinguen de forma clara entre parcelas vecinas.${num2}`; },
  },
  { // ¿Qué muestran los colores del mapa?
    patron: /(color|leyenda|gradiente)/,
    responder: ({ todas }) => {
      if (!todas.length) return "Los datos del mapa aún no se cargan.";
      const v = todas.map((p) => p.pred);
      return `El color de cada parcela indica su rendimiento estimado, de bajo (${num(Math.min(...v), 2)} t/ha) a alto (${num(Math.max(...v), 2)} t/ha), según la leyenda del mapa. En las parcelas de entrenamiento es la estimación hecha sin usar su rendimiento real.`; },
  },
];

function buscarTermino(norm: string): Termino | null {
  const n = norm.split(" ").length;
  const esPregunta = /^(que (es|son|significa|significan|quiere decir)|define|definicion|explica)/.test(norm);
  if (n > (esPregunta ? 12 : 6)) return null;
  const hay = ` ${norm} `;
  let mejor: Termino | null = null, largo = 0;
  for (const t of GLOSARIO) for (const a of t.alias) {
    const na = normalizar(a);
    if (na.length > largo && hay.includes(` ${na} `)) { mejor = t; largo = na.length; }
  }
  return mejor;
}

/** Responde sin IA. Devuelve null si la pregunta no corresponde a una respuesta guardada. */
export function responderLocal(entrada: string, c: Ctx): Respuesta | null {
  const norm = normalizar(entrada);
  if (!norm) return null;
  const t = buscarTermino(norm);
  if (t) return { texto: definicion(t, c), fuente: "glosario" };
  for (const i of INTENCIONES) {
    if (!i.patron.test(norm)) continue;
    if (i.requiereParcela && !c.parcela)
      return { texto: "Selecciona una parcela en el mapa y vuelve a preguntar: esta respuesta depende de los datos de la parcela.", fuente: "datos" };
    return { texto: i.responder(c), fuente: "datos" };
  }
  return null;
}

export const SUGERENCIAS_PARCELA = ["¿Cómo se calculó esta estimación?", "¿Qué tan confiable es esta estimación?", "Compara con el municipio", "¿Qué significa confianza baja?"];
export const SUGERENCIAS_GENERALES = ["¿Qué tan bueno es el modelo?", "¿Qué datos usa el modelo?", "¿Qué es el prior?", "¿Qué muestran los colores del mapa?"];