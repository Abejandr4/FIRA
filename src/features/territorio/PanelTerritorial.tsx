/**
 * Panel derecho sin parcela seleccionada: medias por estado, distribución y calidad del modelo.
 * TODO(territorio): conectar con datos reales —
 *   - Media estimada por estado: media de `pred` por `estado` (parcelas.json)
 *   - Distribución: histograma de `pred` de las 197 parcelas (o solo las 59 de predicción; decidir)
 *   - Calidad del modelo: meta.cv_aleatorio.rmse, meta.cv_espacial.rmse, meta.rmse_media_global
 * Hoy muestra el relleno del diseño ("XX,X").
 */
import { Icon, Label } from "../../components/ui";

export function PanelTerritorial() {
  return (
    <aside className="right-panel">
      <div className="panel-title-row"><div><Label>ANÁLISIS TERRITORIAL</Label><div className="panel-title">Rendimiento</div></div><Icon name="chart" /></div>
      <div className="panel-section">
        <div className="section-heading">Media estimada por estado</div>
        {["Hidalgo", "Puebla", "Tlaxcala"].map((estado, i) => (
          <div className="bar-row" key={estado}><span>{estado}</span><div className="bar-track"><i style={{ width: `${72 - i * 9}%` }} /></div><strong>XX,X</strong><small>t/ha</small></div>
        ))}
      </div>
      <div className="panel-section">
        <div className="section-heading">Distribución estimada</div>
        <div className="histogram" aria-label="Distribución de rendimientos">
          {[22, 36, 48, 73, 94, 77, 53, 34, 18].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
        </div>
        <div className="axis"><span>XX,X t/ha</span><span>XX,X t/ha</span></div>
      </div>
      <div className="model-note">
        <Icon name="info" size={17} />
        <div><strong>Calidad del modelo</strong><p>Error típico: <b>XX,X t/ha</b> en validación aleatoria y <b>XX,X t/ha</b> en espacial. Predecir la media general: <b>XX,X t/ha</b>.</p></div>
      </div>
      <div className="source-note">Fuente: meta.json</div>
    </aside>
  );
}
