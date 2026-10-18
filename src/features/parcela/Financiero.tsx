/**
 * Estimación financiera (sección 3 del prompt).
 * Ingreso bruto = pred × area_ha × precio; rango con el intervalo al 80 % (meta.q80).
 * Sin precio capturado no se muestra ningún número. No incluye costos.
 * Nunca se enlaza con el simulador.
 */
import { useState } from "react";
import { useMeta } from "../../data/hooks";
import type { Parcela } from "../../data/tipos";
import { fecha, num } from "../../lib/formato";

const pesos = (x: number) => `$ ${num(Math.round(x), 0)} MXN`;

/** Lee "6500", "6,500", "6.500", "6500,50", "6,500.50"… Devuelve null si no hay un precio positivo. */
export function leerPrecio(texto: string): number | null {
  const t = texto.replace(/[^\d.,]/g, "");
  if (!t) return null;
  const iPunto = t.lastIndexOf("."), iComa = t.lastIndexOf(",");
  let ent = t, dec = "";
  if (iPunto >= 0 && iComa >= 0) {                       // con ambos, el último es el decimal
    const k = Math.max(iPunto, iComa);
    ent = t.slice(0, k); dec = t.slice(k + 1);
  } else if (iPunto >= 0 || iComa >= 0) {
    const partes = t.split(iPunto >= 0 ? "." : ",");
    const ultimo = partes[partes.length - 1];
    if (partes.length > 2 || ultimo.length === 3) ent = partes.join("");   // miles
    else { ent = partes[0]; dec = ultimo; }                                // decimal
  }
  const v = Number(`${ent.replace(/[.,]/g, "")}${dec ? `.${dec}` : ""}`);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function Financiero({ parcela: p }: { parcela: Parcela }) {
  const meta = useMeta();
  const [precio, setPrecio] = useState("");
  const [fuente, setFuente] = useState("");
  const [fechaPrecio, setFechaPrecio] = useState("");
  const precioNum = leerPrecio(precio);
  const q80 = meta.datos?.q80;
  const ingreso = (rendimiento: number) => Math.max(0, rendimiento) * p.area_ha * (precioNum ?? 0);

  return (
    <div className="card-section finance">
      <div className="section-heading">Estimación financiera</div>
      <label>Precio por tonelada<input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="$ MXN / t" /></label>
      <div className="finance-fuente">
        <label>Fuente <input value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder="p. ej. SIAP" /></label>
        <label>Fecha <input type="date" value={fechaPrecio} onChange={(e) => setFechaPrecio(e.target.value)} /></label>
      </div>
      {precioNum === null ? <p>Captura un precio por tonelada para calcular el ingreso.</p>
        : meta.estado === "error" ? <p>No se pudo cargar el intervalo de predicción; recarga la página.</p>
        : q80 === undefined ? <p>Cargando el intervalo de predicción…</p>
        : (
          <div className="finance-result" aria-live="polite">
            <span>Ingreso bruto estimado <b>{pesos(ingreso(p.pred))}</b></span>
            <span>Con rendimiento bajo (límite del 80 %) <b>{pesos(ingreso(p.pred - q80))}</b></span>
            <span>Con rendimiento alto (límite del 80 %) <b>{pesos(ingreso(p.pred + q80))}</b></span>
            {p.real !== null && <span>Con el rendimiento real (referencia) <b>{pesos(ingreso(p.real))}</b></span>}
            <small>
              Precio usado: {pesos(precioNum)} por tonelada
              {fuente && ` · ${fuente}`}{fechaPrecio && ` · ${fecha(fechaPrecio)}`}.
              {" "}Ingreso bruto = rendimiento × superficie × precio; no incluye costos.
            </small>
          </div>
        )}
    </div>
  );
}