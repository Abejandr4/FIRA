/**
 * Tarjeta flotante "Datos de la parcela" (secciones 1, 3 y 4 del prompt).
 * Conectado: identificación, conjunto, confianza, coordenadas, superficie, financiero.
 * TODO(parcela): terreno y fenología con percentil frente al municipio (no mostrar percentiles si el
 * municipio tiene < 10 parcelas); forma "regular"/"alargada" a partir de compacidad y elong.
 */
import type { Parcela } from "../../data/tipos";
import { Button, Label, Tooltip } from "../../components/ui";
import { num } from "../../lib/formato";
import { Financiero } from "./Financiero";
import "./parcela.css";

export const TEXTO_CONFIANZA_BAJA = "Pocas parcelas conocidas en este municipio; la estimación inicial es menos fiable.";

export function EtiquetaConfianza({ parcela }: { parcela: Parcela }) {
  return parcela.confianza === "baja"
    ? <span className="badge-con-tooltip"><span className="badge-baja">Confianza baja</span><Tooltip text={TEXTO_CONFIANZA_BAJA} label="Qué significa confianza baja" /></span>
    : <span className="confidence">Confianza estándar</span>;
}

export function TarjetaParcela({ parcela: p, onDx, onSimulador }: { parcela: Parcela; onDx: () => void; onSimulador: () => void }) {
  return (
    <div className="parcel-card" aria-label={`Datos de la parcela ${p.id}`}>
      <div className="card-head"><div><Label>SELECCIÓN ACTUAL</Label><div className="card-title">Datos de la parcela</div></div><EtiquetaConfianza parcela={p} /></div>
      <div className="parcel-id"><strong>{p.id}</strong><span>{p.conjunto === "ENTRENAMIENTO" ? "Entrenamiento (rendimiento conocido)" : "Predicción"}</span></div>
      <div className="meta-grid">
        <div><span>Estado</span><b>{p.estado}</b></div>
        <div><span>Municipio</span><b>{p.municipio}</b></div>
        <div><span>Coordenadas</span><b>{num(p.lat, 4)} · {num(p.lon, 4)}</b></div>
        <div><span>Superficie</span><b>{num(p.area_ha, 1)} ha</b></div>
      </div>
      <div className="card-section">
        <div className="section-heading">Ubicación y terreno</div>
        {/* TODO(parcela): elev_mean (m), pend_mean (°), forma con compacidad/elong */}
        <div className="inline-facts"><span><small>Elevación media</small><b>XXXX m</b></span><span><small>Pendiente media</small><b>XX,X°</b></span><span><small>Forma</small><b>XXXX</b></span></div>
      </div>
      <div className="card-section">
        <div className="section-heading">Fenología observada</div>
        {/* TODO(parcela): gu50_doy_s2, sen50_doy_s2 (null → "Ciclo sin senescencia observada"), dur50_dias_s2, dias_sobre90_s2 */}
        <div className="phenology-row"><span><i />Inicio crecimiento<b>Día XX</b></span><span><i />Inicio senescencia<b>Día XX</b></span><span><i />Duración<b>XX días</b></span></div>
      </div>
      <Financiero parcela={p} />
      <div className="card-actions"><Button onClick={onDx}>Dx. comparativo</Button><Button variant="primary" onClick={onSimulador}>Ver simulador (exploratorio)</Button></div>
      <p className="caption center">Los valores del simulador no forman parte de la predicción.</p>
    </div>
  );
}
