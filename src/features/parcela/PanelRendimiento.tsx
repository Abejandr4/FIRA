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
 */import type { MetaModelo, Parcela } from "../../data/tipos";
import { Button, Cargando, ErrorDatos, Icon, Label, Tooltip } from "../../components/ui";
import { useMeta } from "../../data/hooks";
import { num, numSigno } from "../../lib/formato";
import { CurvaNdvi } from "./CurvaNdvi";
import { posicionRespectoMunicipio } from "./estados";

const ESCALA = { min: 2, max: 5.6 };   // t/ha; cubre el rango observado (2.0 a 5.59)
const enEscala = (x: number) =>
  `${Math.max(0, Math.min(100, ((x - ESCALA.min) / (ESCALA.max - ESCALA.min)) * 100))}%`;
const ancho = (x: number) => `${Math.max(0, Math.min(100, (x / 6) * 100))}%`;

export function PanelRendimiento({ parcela: p, onSimulador, onQueSi }: { parcela: Parcela; onSimulador: () => void; onQueSi: () => void }) {
  const m = useMeta();
  return (
    <aside className="right-panel parcel-results">
      {m.estado === "listo"
        ? <Contenido p={p} meta={m.datos} onSimulador={onSimulador} onQueSi={onQueSi} />
        : m.estado === "error" ? <ErrorDatos error={m.error} onReintentar={m.reintentar} /> : <Cargando lineas={6} />}
    </aside>
  );
}

function Contenido({ p, meta, onSimulador, onQueSi }: { p: Parcela; meta: MetaModelo; onSimulador: () => void; onQueSi: () => void }) {
  const { q80, q90 } = meta;
  const media = p.media_municipio_entren;
  const rel = posicionRespectoMunicipio(p.pred, media);
  const entren = p.conjunto === "ENTRENAMIENTO";
  const prod = p.area_ha * p.pred;
  const correccionPequena = Math.abs(p.corr) < 0.1;
  const plural = p.n_entren_municipio === 1 ? "parcela" : "parcelas";

  return (
    <>
      <div className="panel-title-row"><div><Label>PARCELA {p.id}</Label><div className="panel-title">Rendimiento</div></div>
        <span className="status-dot">{entren ? "Entrenamiento" : "Predicción"}</span></div>

      <p className="summary">
        Parcela de <b>{num(p.area_ha, 1)} ha</b> en {p.municipio}, con rendimiento estimado de <b>{num(p.pred, 2)} t/ha</b>
        {rel && media !== null && <>, {rel} la media municipal (<b>{num(media, 2)} t/ha</b>)</>}.
      </p>

      {p.confianza === "baja" && (
        <div className="disclaimer"><Icon name="info" size={16} />
          Confianza baja: el municipio tiene solo {p.n_entren_municipio} {plural} de entrenamiento, así que el nivel estimado depende de pocos datos y de la cercanía a otras parcelas.
        </div>
      )}

      <div className="hero-metric">
        <span>{entren ? "Rendimiento estimado (sin usar esta parcela)" : "Rendimiento estimado"}</span>
        <div><strong>{num(p.pred, 2)}</strong><small>t/ha</small></div>
        <div className="interval">
          <span>80 % <b>{num(p.pred - q80, 2)}–{num(p.pred + q80, 2)} t/ha</b></span>
          <span>90 % <b>{num(p.pred - q90, 2)}–{num(p.pred + q90, 2)} t/ha</b></span>
        </div>
      </div>

      {entren && p.real !== null && (
        <div className="split-metrics">
          <div><span>Rendimiento real</span><strong>{num(p.real, 2)} t/ha</strong><small>Dato del conjunto de entrenamiento</small></div>
          <div><span>Error de la estimación</span><strong>{numSigno(p.pred - p.real, 2)} t/ha</strong><small>Estimación − real</small></div>
        </div>
      )}

      <div className="split-metrics">
        <div><span>Producción estimada</span><strong>{num(prod, 1)} t</strong>
          <small>Intervalo 80 % · {num(Math.max(0, p.area_ha * (p.pred - q80)), 1)}–{num(p.area_ha * (p.pred + q80), 1)} t</small></div>
        <div><span>Media municipal</span><strong>{media === null ? "—" : `${num(media, 2)} t/ha`}</strong><small>{p.municipio}</small></div>
      </div>

      <div className="panel-section compact">
        <div className="section-heading">Comparación</div>
        <div className="comparison-scale" role="img"
          aria-label={`General ${num(meta.media_general_entren, 2)} t/ha; municipio ${media === null ? "sin dato" : num(media, 2)} t/ha; parcela ${num(p.pred, 2)} t/ha`}>
          <i className="general" style={{ left: enEscala(meta.media_general_entren) }} />
          {media !== null && <i className="municipal" style={{ left: enEscala(media) }} />}
          <i className="parcel" style={{ left: enEscala(p.pred) }} />
        </div>
        <div className="legend-row">
          <span><i className="legend general" />General {num(meta.media_general_entren, 2)}</span>
          <span><i className="legend municipal" />Municipio {media === null ? "—" : num(media, 2)}</span>
          <span><i className="legend parcel" />Parcela {num(p.pred, 2)}</span>
        </div>
      </div>

      <div className="panel-section compact">
        <div className="section-heading">Cómo se obtuvo <Tooltip text="La estimación inicial es el promedio de la media del municipio y de las 5 parcelas vecinas; después se suma una corrección satelital pequeña." /></div>
        <div className="waterfall">
          <div><span>Municipio</span><i className="w1" style={{ width: ancho(p.prior_mun) }} /><b>{num(p.prior_mun, 2)}</b></div>
          <div><span>Vecinos</span><i className="w2" style={{ width: ancho(p.prior_vec) }} /><b>{num(p.prior_vec, 2)}</b></div>
          <div><span>Promedio = estimación inicial</span><i className="w1" style={{ width: ancho(p.prior) }} /><b>{num(p.prior, 2)}</b></div>
          <div><span>+ Corrección satelital</span><i className="w3" style={{ width: `${Math.max(1.5, (Math.abs(p.corr) / 6) * 100)}%` }} /><b>{numSigno(p.corr, 2)}</b></div>
          <div><span>= Estimación final</span><i className="w1" style={{ width: ancho(p.pred) }} /><b>{num(p.pred, 2)}</b></div>
        </div>
        <p className="caption">
          {correccionPequena
            ? "Casi toda la estimación proviene de la ubicación; la corrección satelital es pequeña."
            : "En esta parcela la corrección satelital es mayor de lo habitual; sigue siendo secundaria frente a la ubicación."}
        </p>
        <button type="button" className="link-button" onClick={onQueSi}>Explorar el modelo: ¿qué pasaría si…? <Icon name="chevron" size={14} /></button>
      </div>

      <div className="panel-section compact">
        <div className="section-heading">NDVI a través del ciclo</div>
        <CurvaNdvi parcela={p} />
      </div>
      <Button variant="primary" onClick={onSimulador} className="wide">Ver simulador (exploratorio) <Icon name="chevron" size={16} /></Button>
      <p className="caption center">Los valores del simulador no forman parte de la predicción.</p>
    </>
  );
}