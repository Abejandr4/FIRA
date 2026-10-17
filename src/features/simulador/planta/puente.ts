/**
 * Puente biofísico → planta ("biophysics_bridge" del README de AnimacionCebada).
 * Traduce un EstadoPlanta a los atributos de actualizarNodos3D. Los puntos de anclaje son las
 * ETAPAS_PRUEBA del prototipo (vegetativo, espigamiento, madurez); entre ellos se interpola.
 *
 * Qué controla cada elemento (prompt de diseño):
 *   densidad del follaje = fPAR · color = KS · tamaño de la espiga = biomasa acumulada
 */
import type { AtributosPlanta, EstadoPlanta } from "./tipos";

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

export function lerpColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  return [16, 8, 0].reduce((acc, s) => acc | (Math.round(lerp(ch(a, s), ch(b, s), t)) << s), 0);
}

export const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

// Colores del prototipo
export const COLOR = {
  hojaVerde: 0x4c9a2a, hojaTierna: 0x5cb52e, hojaSeca: 0xc9b04a, hojaMadura: 0xb7a444,
  talloVerde: 0x5a9a2f, talloMaduro: 0xc9b04a,
  espigaVerde: 0x9ccc4a, espigaDorada: 0xd8b13a,
  suelo: 0x6b4a2b,
};

/** Estrés visual 0–1 a partir de KS (KS ≥ 0.95 se ve sano). */
export const estresVisual = (ks: number) => clamp01((0.95 - ks) / 0.45);

export function estadoA3D(e: EstadoPlanta): AtributosPlanta {
  if (e.etapa === "pre_siembra") {
    return { visiblePlanta: false, visibleEspiga: false, colorSuelo: COLOR.suelo };
  }
  const estres = estresVisual(e.ks);
  const madura = e.etapa === "madurez";
  const llenado = e.etapa === "llenado";
  const conEspiga = e.etapa === "antesis" || llenado || madura;

  const base = madura ? COLOR.hojaMadura : lerpColor(COLOR.hojaTierna, COLOR.hojaVerde, e.progresoTermico * 2);
  return {
    visiblePlanta: true,
    // vegetativo 0.45 → espigamiento 0.85 → madurez 1 (anclas del prototipo)
    escalaTallo: lerp(0.2, 1, e.progresoTermico / 0.75),
    escalaGrosorTallo: lerp(0.8, 1.05, e.progresoTermico),
    escalaHojas: lerp(0.55, 1.1, e.fpar / 0.9),
    rotacionHojas: lerp(-0.2, 0.25, madura ? 1 : estres),     // hojas caídas con estrés o al madurar
    colorHojas: lerpColor(base, COLOR.hojaSeca, estres),
    colorTallo: madura ? COLOR.talloMaduro : lerpColor(COLOR.talloVerde, COLOR.talloMaduro, estres * 0.6),
    visibleEspiga: conEspiga,
    escalaEspiga: conEspiga ? lerp(0.6, 1.2, e.biomasaRel) : 0.01,
    colorEspiga: madura ? COLOR.espigaDorada : llenado ? lerpColor(COLOR.espigaVerde, COLOR.espigaDorada, (e.progresoTermico - 0.55) / 0.45) : COLOR.espigaVerde,
    inclinacionEspiga: madura ? 0.35 : llenado ? lerp(0, 0.35, (e.progresoTermico - 0.55) / 0.45) : 0,
    colorSuelo: COLOR.suelo,
  };
}
