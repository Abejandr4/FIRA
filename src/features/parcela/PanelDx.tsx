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

const SENALES_EJEMPLO = [
  "NDVI máximo por encima del rango habitual; verificar cobertura observada.",
  "Inicio de crecimiento más tardío; contrastar con la fecha de siembra.",
  "Duración del ciclo menor; revisar el registro fenológico en campo.",
];

export function PanelDx({ parcela, onCerrar }: { parcela: Parcela; onCerrar: () => void }) {
  return (
    <div className="dx-panel" role="dialog" aria-label={`Diagnóstico comparativo de ${parcela.id}`}>
      <div className="drawer-head"><div><Label>{parcela.id}</Label><div className="card-title">Dx. comparativo</div></div>
        <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar"><Icon name="close" /></button></div>
      <p>Señales frente a parcelas del mismo municipio</p>
      {SENALES_EJEMPLO.map((x, i) => <div className="signal" key={x}><span>0{i + 1}</span><p>{x}</p></div>)}
      <div className="disclaimer"><Icon name="info" size={16} />Estas señales describen diferencias con parcelas similares; no demuestran causalidad ni cuantifican una mejora.</div>
    </div>
  );
}
