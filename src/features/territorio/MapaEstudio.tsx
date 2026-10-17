/**
 * Mapa de la zona de estudio.
 * ESTADO ACTUAL: esquema del diseño de Figma (formas de estado y parcelas ilustrativas).
 * TODO(territorio): sustituir por el mapa real con public/data/parcelas.geojson (MapLibre o Leaflet con
 * teselas de CARTO), coloreando cada polígono por `pred` (o `real` en entrenamiento) y conservando:
 *   - clic en estado → navegar({ vista: "mapa", estado })
 *   - clic en parcela → navegar({ vista: "mapa", parcela: id })
 *   - polígono seleccionado con borde ámbar y línea guía hacia la tarjeta
 */
import { useState } from "react";

const ESTADOS = [
  { id: "Hidalgo", path: "M144 65l61-25 46 18 14 48-34 32-58-5-42-28z", labelX: 193, labelY: 88 },
  { id: "Tlaxcala", path: "M186 153l49-17 34 18-9 31-50 8-35-18z", labelX: 218, labelY: 167 },
  { id: "Puebla", path: "M168 202l91-13 34 28-17 80-57 43-71-26 16-48-25-32z", labelX: 221, labelY: 255 },
];

const PARCELAS_ESQUEMA = [
  "184,140 208,133 216,152 194,160", "218,134 242,142 238,161 216,153", "196,163 219,155 229,178 205,188",
  "231,166 259,160 265,182 237,190", "209,191 236,183 242,207 216,214", "245,193 270,186 278,211 251,219",
  "177,214 208,202 215,229 188,236", "220,222 249,214 257,239 229,248", "260,223 285,216 290,244 268,252",
  "194,243 224,235 230,262 202,270",
];

export function MapaEstudio({ estado, parcelaSeleccionada, onEstado, onParcela }: {
  estado?: string;
  parcelaSeleccionada?: string;
  onEstado: (estado: string) => void;
  /** En el esquema, cualquier polígono abre la parcela de ejemplo; con el mapa real será la del polígono. */
  onParcela: () => void;
}) {
  const [hover, setHover] = useState("");
  const nivel = parcelaSeleccionada ? 2 : estado ? 1 : 0;
  return (
    <svg className={`study-map level-${nivel}`} viewBox="0 0 700 480" role="img" aria-label="Mapa de la zona de estudio">
      <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" /></pattern></defs>
      <rect width="700" height="480" className="map-bg" />
      <rect width="700" height="480" fill="url(#grid)" className="map-grid" />
      <path className="roads" d="M18 382C126 292 235 344 338 229S536 145 686 54M80 56c113 71 145 142 236 196s176 107 352 94" />
      <g className="state-group">
        {ESTADOS.map((s, i) => (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover("")} onClick={() => onEstado(s.id)}>
            <path className={`state-shape state-${i} ${hover === s.id ? "is-hovered" : ""} ${estado === s.id ? "is-selected" : ""}`} d={s.path} />
            <text x={s.labelX} y={s.labelY}>{s.id}</text>
          </g>
        ))}
      </g>
      {nivel > 0 && (
        <g className="parcels">
          {PARCELAS_ESQUEMA.map((pts, i) => (
            <polygon key={pts} points={pts} className={i === 4 && nivel > 1 ? "selected-parcel" : `parcel-fill-${i % 4}`}
              onClick={(e) => { e.stopPropagation(); onParcela(); }} />
          ))}
        </g>
      )}
      {nivel > 1 && <g className="leader"><path d="M228 200C300 184 318 132 359 126" /><circle cx="228" cy="200" r="4" /></g>}
    </svg>
  );
}
