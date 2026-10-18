/**
 * Que si modelo
 * "¿Qué pasaría si…?" del modelo de rendimiento (antes, el expander de la app de Streamlit).
 * Mueve variables satelitales de la parcela y recalcula la predicción en vivo con la fórmula del ridge.
 * Es una exploración del modelo, no un efecto causal. No se enlaza con el simulador ni con lo financiero.
 */

import { useMemo, useState } from "react";
import { Button, Cargando, ErrorDatos, Icon, Label, Tooltip } from "../../components/ui";
import { combinar, useMeta, useModeloRidge, useVariablesModelo } from "../../data/hooks";
import type { MetaModelo, Parcela } from "../../data/tipos";
import { fechaDeDiaDelAnio, num, numSigno } from "../../lib/formato";
import { predecirConCambios, type ModeloRidge, type VariablesModelo } from "./modelo/ridge";

/** Variables que se pueden mover (las mismas que ofrecía la app de Streamlit). */
const EXPLORABLES = [
  { col: "ndvi_p95_s2", nombre: "NDVI máximo", paso: 0.01, decimales: 2, unidad: "",
    ayuda: "Percentil 95 del NDVI de Sentinel-2 en la temporada: qué tan verde llegó a estar la parcela." },
  { col: "ndvi_p05_s2", nombre: "NDVI mínimo", paso: 0.01, decimales: 2, unidad: "",
    ayuda: "Percentil 5 del NDVI en la temporada: el suelo más desnudo que se observó." },
  { col: "gu50_doy_s2", nombre: "Inicio de crecimiento", paso: 1, decimales: 0, unidad: "día", fecha: true,
    ayuda: "Día del año en que el NDVI alcanzó la mitad de su subida." },
  { col: "ndvi_doy_pico_s2", nombre: "Día del pico de NDVI", paso: 1, decimales: 0, unidad: "día", fecha: true,
    ayuda: "Día del año con el NDVI más alto." },
  { col: "dias_sobre90_s2", nombre: "Días con NDVI alto", paso: 1, decimales: 0, unidad: "días",
    ayuda: "Días con NDVI por encima del 90 % de su pico." },
] as const;

export function QueSiModelo({ parcela, onCerrar }: { parcela: Parcela; onCerrar: () => void }) {
  const r = combinar<[ModeloRidge, VariablesModelo, MetaModelo]>(useModeloRidge(), useVariablesModelo(), useMeta());
  return (
    <div className="dx-panel quesi-panel" role="dialog" aria-label={`Explorar el modelo para ${parcela.id}`}>
      <div className="drawer-head">
        <div><Label>{parcela.id} · MODELO DE RENDIMIENTO</Label><div className="card-title">¿Qué pasaría si…?</div></div>
        <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar"><Icon name="close" /></button>
      </div>
      {r.estado === "listo"
        ? <Explorador key={parcela.id} parcela={parcela} modelo={r.datos[0]} vars={r.datos[1]} meta={r.datos[2]} />
        : r.estado === "error" ? <ErrorDatos error={r.error} onReintentar={r.reintentar} /> : <Cargando lineas={5} />}
    </div>
  );
}

function Explorador({ parcela: p, modelo, vars, meta }: { parcela: Parcela; modelo: ModeloRidge; vars: VariablesModelo; meta: MetaModelo }) {
  const original = vars.valores[p.id];
  const [cambios, setCambios] = useState<Record<string, number>>({});

  const rangos = useMemo(() => Object.fromEntries(EXPLORABLES.map((e) => {
    const j = vars.cols.indexOf(e.col);
    const xs = Object.values(vars.valores).map((v) => v[j]).filter((x): x is number => x !== null);
    // Rango de las 197 parcelas, redondeado a múltiplos del paso para que el deslizador caiga en valores exactos.
    const red = (x: number, f: (n: number) => number) => Number((f(x / e.paso) * e.paso).toFixed(6));
    return [e.col, { j, min: red(Math.min(...xs), Math.floor), max: red(Math.max(...xs), Math.ceil) }];
  })), [vars]);

  const modificado = original.map((x, j) => (vars.cols[j] in cambios ? cambios[vars.cols[j]] : x));
  const nueva = predecirConCambios(modelo, p.pred, original, modificado);
  const delta = nueva - p.pred;
  const hayCambios = Object.keys(cambios).length > 0;

  return (
    <>
      <p>Mueve una variable de la parcela y el modelo recalcula la predicción al instante. Solo cambia la corrección satelital; la estimación por ubicación queda igual.</p>
      <p className="quesi-escala">
        El modelo reacciona poco a estas variables, y eso es parte del resultado: la corrección satelital
        está muy contenida (penalización alpha = {num(modelo.alpha, 0)}) y casi toda la predicción viene
        de la ubicación.
      </p>
      <div className="quesi-resultado" aria-live="polite">
        <div><span>Predicción original</span><b>{num(p.pred, 2)} t/ha</b></div>
        <div><span>Con tus valores</span><b>{num(nueva, 2)} t/ha</b></div>
        <div><span>Cambio</span><b className={hayCambios ? "quesi-delta" : ""}>{numSigno(delta, 3)} t/ha</b></div>
      </div>
      {hayCambios && (
        <p className="quesi-escala">
          El cambio equivale al {num((100 * Math.abs(delta)) / meta.q80, 1)} % del intervalo al 80 % (± {num(meta.q80, 2)} t/ha).
        </p>
      )}
      <div className="quesi-lista">
        {EXPLORABLES.map((e) => {
          const { j, min, max } = rangos[e.col];
          const v0 = original[j];
          const v = e.col in cambios ? cambios[e.col] : v0 ?? modelo.medianas[j];
          const mostrar = (x: number) => ("fecha" in e ? `${fechaDeDiaDelAnio(Math.round(x))}` : `${num(x, e.decimales)}${e.unidad ? ` ${e.unidad}` : ""}`);
          return (
            <div className="quesi-var" key={e.col}>
              <div className="quesi-var-head">
                <label htmlFor={`qs-${e.col}`}><strong>{e.nombre}</strong><small>{e.col}</small></label>
                <Tooltip text={e.ayuda} column={e.col} />
              </div>
              <input id={`qs-${e.col}`} type="range" min={min} max={max} step={e.paso} value={v}
                onChange={(ev) => setCambios({ ...cambios, [e.col]: Number(ev.target.value) })} />
              <div className="quesi-var-valores">
                <span>{mostrar(v)}</span>
                <small>{v0 === null ? "Sin dato: el modelo usa la mediana" : e.col in cambios ? `Original: ${mostrar(v0)}` : "Valor original"}</small>
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={() => setCambios({})} disabled={!hayCambios}><Icon name="reset" size={15} /> Restablecer valores</Button>
      <div className="disclaimer"><Icon name="info" size={16} />
        Es una exploración del modelo, no un efecto causal: en la realidad estas variables se mueven juntas, así que cambiar una sola puede dar combinaciones poco realistas. El efecto es pequeño porque casi toda la predicción viene de la ubicación.
      </div>
    </>
  );
}
