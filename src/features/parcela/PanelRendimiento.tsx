/**
 * Panel derecho con parcela seleccionada (sección 2 y 5 del prompt).
 * TODO(parcela), campo por campo (parcelas.json + meta.json):
 *   - Resumen: área (area_ha), municipio, pred, media_municipio_entren; "por encima / cerca / por debajo"
 *     con un criterio de interfaz documentado en docs/ESTADOS.md.
 *   - Tarjeta principal: pred; intervalo 80 % = pred ± meta.q80; 90 % = pred ± meta.q90.
 *   - ENTRENAMIENTO: mostrar `real` y error (pred − real) junto a la estimación.
 *   - Producción: pred × area_ha (t), con intervalo 80 %.
 *   - Comparación: meta.media_general_entren, media_municipio_entren, pred.
 *   - Cómo se obtuvo: prior_mun y prior_vec lado a lado → su promedio `prior` → + corr → pred.
 *     OJO: el prior es el PROMEDIO de municipio y vecinos, no una suma; la cascada no debe sumar los tres.
 *   - NDVI: ndvi.json[id] contra la mediana del municipio; marcador en ndvi_p95_s2 / ndvi_doy_pico_s2.
 */
import type { Parcela } from "../../data/tipos";
import { Button, Icon, Label, Tooltip } from "../../components/ui";
import { CurvaNdvi } from "./CurvaNdvi";

export function PanelRendimiento({ parcela: p, onSimulador, onQueSi }: { parcela: Parcela; onSimulador: () => void; onQueSi: () => void }) {
  return (
    <aside className="right-panel parcel-results">
      <div className="panel-title-row"><div><Label>PARCELA {p.id}</Label><div className="panel-title">Rendimiento</div></div>
        <span className="status-dot">{p.conjunto === "ENTRENAMIENTO" ? "Entrenamiento" : "Predicción"}</span></div>
      <p className="summary">Parcela de <b>XX,X ha</b> en {p.municipio}, con rendimiento estimado de <b>XX,X t/ha</b>, cerca de la media municipal (<b>XX,X t/ha</b>).</p>
      <div className="hero-metric">
        <span>Rendimiento estimado</span>
        <div><strong>XX,X</strong><small>t/ha</small></div>
        <div className="interval"><span>80 % <b>XX,X–XX,X t/ha</b></span><span>90 % <b>XX,X–XX,X t/ha</b></span></div>
      </div>
      <div className="split-metrics">
        <div><span>Producción estimada</span><strong>XX,X t</strong><small>Intervalo 80 % · XX,X–XX,X t</small></div>
        <div><span>Media municipal</span><strong>XX,X t/ha</strong><small>{p.municipio}</small></div>
      </div>
      <div className="panel-section compact">
        <div className="section-heading">Comparación</div>
        <div className="comparison-scale"><i className="general" /><i className="municipal" /><i className="parcel" /></div>
        <div className="legend-row"><span><i className="legend general" />General</span><span><i className="legend municipal" />Municipio</span><span><i className="legend parcel" />Parcela</span></div>
      </div>
      <div className="panel-section compact">
        <div className="section-heading">Cómo se obtuvo <Tooltip text="La estimación inicial es el promedio de la media del municipio y de las 5 parcelas vecinas; después se suma una corrección satelital pequeña." /></div>
        <div className="waterfall"><div><span>Municipio</span><i className="w1" /></div><div><span>Vecinos</span><i className="w2" /></div><div><span>Satélite</span><i className="w3" /></div></div>
        <p className="caption">Casi toda la estimación proviene de la ubicación; la corrección satelital es pequeña.</p>
        <button type="button" className="link-button" onClick={onQueSi}>Explorar el modelo: ¿qué pasaría si…? <Icon name="chevron" size={14} /></button>
      </div>
      <div className="panel-section compact">
        <div className="section-heading">NDVI a través del ciclo</div>
        <CurvaNdvi parcela={p} />
      </div>
      <Button variant="primary" onClick={onSimulador} className="wide">Ver simulador (exploratorio) <Icon name="chevron" size={16} /></Button>
      <p className="caption center">Los valores del simulador no forman parte de la predicción.</p>
    </aside>
  );
}
