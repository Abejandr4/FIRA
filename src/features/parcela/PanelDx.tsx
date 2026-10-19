/**
 * Diagnóstico comparativo (sección 6 del prompt).
 * TODO(parcela): generar 2–4 señales con reglas frente a las parcelas del mismo municipio
 * (ndvi_p95_s2, gu50_doy_s2, pend_mean, dur50_dias_s2), redactadas como observaciones a verificar en campo.
 * Sin diferencias relevantes → "Sin diferencias relevantes frente a parcelas del municipio".
 * Municipios con < 10 parcelas: no mostrar percentiles.
 * Hoy muestra las señales de ejemplo del diseño.
 */
import type { Parcela } from "../../data/tipos";
import { Icon, Label } from "../../components/ui";
import { generarSenales } from "./senales";

export function PanelDx({ parcela, delMunicipio, onCerrar }: { parcela: Parcela; delMunicipio: Parcela[]; onCerrar: () => void }) {
  const r = generarSenales(parcela, delMunicipio);
  return (
    <div className="dx-panel" role="dialog" aria-label={`Diagnóstico comparativo de ${parcela.id}`}>
      <div className="drawer-head"><div><Label>{parcela.id}</Label><div className="card-title">Diagnóstico comparativo</div></div>
        <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar"><Icon name="close" /></button></div>
      <p>Señales frente a parcelas del mismo municipio</p>
      {r.tipo === "insuficiente" && (
        <p className="caption">El municipio tiene solo {r.n} {r.n === 1 ? "parcela" : "parcelas"}; con menos de 10 no se comparan percentiles.</p>
      )}
      {r.tipo === "sin_diferencias" && (
        <p className="caption">Sin diferencias relevantes frente a parcelas del municipio ({r.n} parcelas comparadas).</p>
      )}
      {r.tipo === "senales" && r.textos.map((x, i) => <div className="signal" key={x}><span>0{i + 1}</span><p>{x}</p></div>)}
      {r.tipo === "senales" && (
        <p className="caption">Se señala lo que queda fuera del rango entre los percentiles 10 y 90 de las {r.n} parcelas del municipio.</p>
      )}
      <div className="disclaimer"><Icon name="info" size={16} />Estas señales describen diferencias con parcelas similares; no demuestran causalidad ni cuantifican una mejora.</div>
    </div>
  );
}