/**
 * Planta esquemática 2D con las mismas variantes que la 3D.
 * Se usa cuando el navegador no tiene WebGL o mientras carga la escena 3D.
 */
import type { EstadoPlanta } from "./tipos";
import { COLOR, estadoA3D, estresVisual, hex } from "./puente";

const HOJAS = [
  "M141 290c-41-31-66-28-91-20 32 4 55 20 90 48",
  "M143 252c37-36 66-34 91-30-33 9-55 27-91 57",
  "M141 211c-36-33-59-29-80-22 26 5 48 23 80 48",
  "M141 173c31-33 55-31 76-25-28 8-46 25-76 48",
];

export function PlantaEsquema({ estado: e }: { estado: EstadoPlanta }) {
  const a = estadoA3D(e);
  const visible = a.visiblePlanta !== false;
  const altura = a.escalaTallo ?? 1;
  const nHojas = Math.max(1, Math.min(4, Math.round(1 + (e.fpar / 0.9) * 3)));
  const caida = (a.rotacionHojas ?? 0) * 40; // grados
  const hoja = typeof a.colorHojas === "number" ? hex(a.colorHojas) : hex(COLOR.hojaVerde);
  const tallo = typeof a.colorTallo === "number" ? hex(a.colorTallo) : hex(COLOR.talloVerde);
  const espiga = typeof a.colorEspiga === "number" ? hex(a.colorEspiga) : hex(COLOR.espigaDorada);
  const estres = estresVisual(e.ks);

  return (
    <svg viewBox="0 0 280 390" role="img"
      aria-label={visible ? `Planta de cebada esquemática, ${estres > 0.3 ? "con estrés hídrico" : "sin estrés hídrico visible"}` : "Suelo desnudo antes de la siembra"}>
      <path className="ground" d="M25 355c56-20 173-22 230 0" />
      {visible && (
        <g transform={`translate(141 352) scale(${altura}) translate(-141 -352)`}>
          <path className="stem" style={{ stroke: tallo }} d="M141 352c3-84 4-171-1-251" />
          {HOJAS.slice(0, nHojas).map((d, i) => (
            <path key={d} className="leaf-shape" d={d} style={{ stroke: hoja, strokeWidth: 4 + e.fpar * 2 }}
              transform={`rotate(${(i % 2 ? 1 : -1) * caida} 141 ${290 - i * 39})`} />
          ))}
          {a.visibleEspiga && (
            <g className="ear" style={{ fill: espiga, stroke: espiga }}
              transform={`rotate(${(a.inclinacionEspiga ?? 0) * 57} 141 104) translate(141 104) scale(${a.escalaEspiga ?? 1}) translate(-141 -104)`}>
              <path d="M140 104c-18-19-15-53 1-70 18 17 20 51-1 70Z" />
              <path d="m138 92-35-28m37 16 36-31m-36 16-31-28m32 14 31-28m-31 15-19-27m19 13 17-30" />
            </g>
          )}
          <path className="roots" d="m141 351-33 24m33-24 0 31m0-31 35 25m-34-14-19 22m20-22 18 22" />
        </g>
      )}
    </svg>
  );
}
