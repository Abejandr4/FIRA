/**
 * Panel derecho sin parcela seleccionada: medias por estado, distribución y calidad del modelo.
 * Datos: `pred` de las 197 parcelas (parcelas.json) y las métricas de validación (meta.json).
 * Decisión: la distribución usa las 197 parcelas, igual que el mapa. En las de entrenamiento, `pred` es la
 * estimación hecha sin usar esa parcela, así que ninguna estimación conoce su propio rendimiento.
 */
import { useMemo } from "react";
import { Cargando, ErrorDatos, Icon, Label } from "../../components/ui";
import { combinar, useMeta, useParcelas } from "../../data/hooks";
import type { MetaModelo, Parcela } from "../../data/tipos";
import { num } from "../../lib/formato";

const ESCALA_MAX = 6;   // t/ha; mismo criterio que el ancho de la cascada en PanelRendimiento
const N_BINS = 9;

export function PanelTerritorial() {
  const r = combinar<[Parcela[], MetaModelo]>(useParcelas(), useMeta());
  return (
    <aside className="right-panel">
      <div className="panel-title-row"><div><Label>ANÁLISIS TERRITORIAL</Label><div className="panel-title">Rendimiento</div></div><Icon name="chart" /></div>
      {r.estado === "listo"
        ? <Contenido parcelas={r.datos[0]} meta={r.datos[1]} />
        : r.estado === "error" ? <ErrorDatos error={r.error} onReintentar={r.reintentar} /> : <Cargando lineas={6} />}
    </aside>
  );
}

function Contenido({ parcelas, meta }: { parcelas: Parcela[]; meta: MetaModelo }) {
  const medias = useMemo(() => {
    const estados = [...new Set(parcelas.map((p) => p.estado))].sort();
    return estados.map((estado) => {
      const xs = parcelas.filter((p) => p.estado === estado).map((p) => p.pred);
      return { estado, n: xs.length, media: xs.reduce((a, b) => a + b, 0) / xs.length };
    });
  }, [parcelas]);

  const hist = useMemo(() => {
    const v = parcelas.map((p) => p.pred);
    const min = Math.min(...v), max = Math.max(...v);
    const ancho = (max - min) / N_BINS || 1;
    const cuentas = Array<number>(N_BINS).fill(0);
    for (const x of v) cuentas[Math.min(N_BINS - 1, Math.floor((x - min) / ancho))]++;
    return { min, max, ancho, cuentas, tope: Math.max(...cuentas) };
  }, [parcelas]);

  const nEntren = parcelas.filter((p) => p.conjunto === "ENTRENAMIENTO").length;

  return (
    <>
      <div className="panel-section">
        <div className="section-heading">Media estimada por estado</div>
        {medias.map((m) => (
          <div className="bar-row" key={m.estado} title={`${m.n} parcelas`}>
            <span>{m.estado}</span>
            <div className="bar-track"><i style={{ width: `${Math.min(100, (m.media / ESCALA_MAX) * 100)}%` }} /></div>
            <strong>{num(m.media, 2)}</strong><small>t/ha</small>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="section-heading">Distribución estimada</div>
        <div className="histogram" role="img" aria-label="Distribución de rendimientos estimados de las parcelas">
          {hist.cuentas.map((c, i) => (
            <span key={i} style={{ height: `${(c / hist.tope) * 100}%` }}
              title={`${num(hist.min + i * hist.ancho, 2)}–${num(hist.min + (i + 1) * hist.ancho, 2)} t/ha: ${c} ${c === 1 ? "parcela" : "parcelas"}`} />
          ))}
        </div>
        <div className="axis"><span>{num(hist.min, 2)} t/ha</span><span>{num(hist.max, 2)} t/ha</span></div>
        <p className="caption">
          {parcelas.length} parcelas ({parcelas.length - nEntren} de predicción y {nEntren} de entrenamiento).
          En las de entrenamiento se usa la estimación hecha sin su propio rendimiento.
        </p>
      </div>

      <div className="model-note">
        <Icon name="info" size={17} />
        <div>
          <strong>Calidad del modelo</strong>
          <p>
            Error típico: <b>{num(meta.cv_aleatorio.rmse, 2)} t/ha</b> en validación aleatoria y{" "}
            <b>{num(meta.cv_espacial.rmse, 2)} t/ha</b> en espacial. Predecir la media general: <b>{num(meta.rmse_media_global, 2)} t/ha</b>.
          </p>
          <p>Estima bien el nivel de cada zona, pero no distingue entre parcelas del mismo municipio.</p>
        </div>
      </div>
      <div className="source-note">Fuente: parcelas.json y meta.json</div>
    </>
  );
}