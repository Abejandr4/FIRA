/**
 * Estimación financiera (sección 3 del prompt).
 * Ingreso bruto = pred × area_ha × precio; rango con el intervalo al 80 % (meta.q80).
 * Sin precio capturado no se muestra ningún número. No incluye costos.
 * Nunca se enlaza con el simulador.
 */
import { useState } from "react";
import { useMeta } from "../../data/hooks";
import type { Parcela } from "../../data/tipos";
import { num } from "../../lib/formato";

const pesos = (x: number) => `$ ${num(Math.round(x), 0)} MXN`;

export function Financiero({ parcela: p }: { parcela: Parcela }) {
  const meta = useMeta();
  const [precio, setPrecio] = useState("");
  const [fuente, setFuente] = useState("");
  const [fechaPrecio, setFechaPrecio] = useState("");
  const precioNum = Number(precio.replace(/[^\d.]/g, ""));
  const valido = precio !== "" && precioNum > 0;
  const q80 = meta.datos?.q80;

  return (
    <div className="card-section finance">
      <div className="section-heading">Estimación financiera</div>
      <label>Precio por tonelada<input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="$ MXN / t" /></label>
      <div className="finance-fuente">
        <label>Fuente <input value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder="p. ej. SIAP" /></label>
        <label>Fecha <input type="date" value={fechaPrecio} onChange={(e) => setFechaPrecio(e.target.value)} /></label>
      </div>
      {!valido || q80 === undefined ? <p>Captura un precio por tonelada para calcular el ingreso.</p> : (
        <div className="finance-result" aria-live="polite">
          <span>Ingreso bruto estimado <b>{pesos(p.pred * p.area_ha * precioNum)}</b></span>
          <span>Rendimiento bajo (80 %) <b>{pesos((p.pred - q80) * p.area_ha * precioNum)}</b></span>
          <span>Rendimiento alto (80 %) <b>{pesos((p.pred + q80) * p.area_ha * precioNum)}</b></span>
          {(fuente || fechaPrecio) && <small>Precio: {fuente || "fuente sin indicar"}{fechaPrecio && ` · ${fechaPrecio}`}</small>}
        </div>
      )}
    </div>
  );
}
