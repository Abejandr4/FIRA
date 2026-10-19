/**
 * Tarjeta flotante "Datos de la parcela" (secciones 1, 3 y 4 del prompt).
 * Conectado: identificación, conjunto, confianza, coordenadas, superficie, terreno, fenología y financiero.
 * Los percentiles frente al municipio solo se muestran con 10 o más parcelas (ver comparacion.ts).
 */
import type { Parcela } from "../../data/tipos";
import { Button, Icon, Label, Tooltip } from "../../components/ui";
import { fechaDeDiaDelAnio, num } from "../../lib/formato";
import {
  clasificarForma, MIN_PARCELAS_PERCENTIL, percentilEnMunicipio,
  UMBRAL_ALARGADA, UMBRAL_COMPACIDAD, type ColPercentil,
} from "./comparacion";
import { Financiero } from "./Financiero";
import "./parcela.css";

export const TEXTO_CONFIANZA_BAJA = "Pocas parcelas conocidas en este municipio; la estimación inicial es menos fiable.";

export function EtiquetaConfianza({ parcela }: { parcela: Parcela }) {
  return parcela.confianza === "baja"
    ? <span className="badge-con-tooltip"><span className="badge-baja">Confianza baja</span><Tooltip text={TEXTO_CONFIANZA_BAJA} label="Qué significa confianza baja" /></span>
    : <span className="confidence">Confianza estándar</span>;
}

const dia = (d: number | null) => (d === null ? "—" : `Día ${num(d, 0)}`);
const conFecha = (d: number | null, def: string) => (d === null ? def : `${def}. Día ${num(d, 0)} = ${fechaDeDiaDelAnio(Math.round(d))}`);

export function TarjetaParcela({ parcela: p, delMunicipio, onDx, onSimulador, onCerrar }: {
  parcela: Parcela; delMunicipio: Parcela[]; onDx: () => void; onSimulador: () => void; onCerrar: () => void;
}) {
  const n = delMunicipio.length;
  const hayPercentiles = n >= MIN_PARCELAS_PERCENTIL;
  const forma = clasificarForma(p.compacidad, p.elong);
  const partes = (items: [string, ColPercentil][]) =>
    items.map(([t, col]) => [t, percentilEnMunicipio(p, delMunicipio, col)] as const)
      .filter((x): x is readonly [string, number] => x[1] !== null)
      .map(([t, v]) => `${t} ${v}`).join(" · ");

  const lineaTerreno = hayPercentiles ? partes([["elevación", "elev_mean"], ["pendiente", "pend_mean"]]) : "";
  const lineaFeno = [
    hayPercentiles ? partes([["inicio de crecimiento", "gu50_doy_s2"], ["senescencia", "sen50_doy_s2"], ["duración", "dur50_dias_s2"]]) : "",
  ].map((s) => (s ? `Percentil frente al municipio: ${s}.` : "")).concat(
    p.dias_sobre90_s2 !== null ? [`Días con NDVI cercano al pico: ${num(p.dias_sobre90_s2, 0)}.`] : [],
  ).filter(Boolean).join(" ");

  return (
      <div className="parcel-card" aria-label={`Datos de la parcela ${p.id}`}>
      <div className="card-head">
        <div><Label>SELECCIÓN ACTUAL</Label><div className="card-title">Datos de la parcela</div></div>
        <div className="card-head-acciones">
          <EtiquetaConfianza parcela={p} />
          <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar la tarjeta de la parcela" title="Cerrar">
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
      <div className="parcel-id"><strong>{p.id}</strong><span>{p.conjunto === "ENTRENAMIENTO" ? "Entrenamiento (rendimiento conocido)" : "Predicción"}</span></div>
      <div className="meta-grid">
        <div><span>Estado</span><b>{p.estado}</b></div>
        <div><span>Municipio</span><b>{p.municipio}</b></div>
        <div><span>Coordenadas</span><b>{num(p.lat, 4)} · {num(p.lon, 4)}</b></div>
        <div><span>Superficie</span><b>{num(p.area_ha, 1)} ha</b></div>
      </div>

      <div className="card-section">
        <div className="section-heading">Ubicación y terreno</div>
        <div className="inline-facts">
          <span><small>Elevación media</small><b>{p.elev_mean === null ? "—" : `${num(p.elev_mean, 0)} msnm`}</b></span>
          <span><small>Pendiente media</small><b>{p.pend_mean === null ? "—" : `${num(p.pend_mean, 1)}°`}</b></span>
          <span title={forma === null ? undefined
            : `Relación largo/ancho ${num(p.elong, 1)} · compacidad ${num(p.compacidad, 2)} (1 = círculo). Alargada si largo/ancho ≥ ${UMBRAL_ALARGADA} o compacidad < ${num(UMBRAL_COMPACIDAD, 1)}.`}>
            <small>Forma</small><b>{forma === null ? "—" : forma === "alargada" ? "Alargada" : "Regular"}</b>
          </span>
        </div>
        {hayPercentiles
          ? (lineaTerreno && <p className="caption">Percentil frente a las {n} parcelas del municipio (50 = valor típico): {lineaTerreno}.</p>)
          : <p className="caption">El municipio tiene solo {n} {n === 1 ? "parcela" : "parcelas"}; con menos de {MIN_PARCELAS_PERCENTIL} no se muestran percentiles.</p>}
      </div>

      <div className="card-section">
        <div className="section-heading">Fenología observada</div>
        <div className="phenology-row">
          <span title={conFecha(p.gu50_doy_s2, "Día en que el NDVI alcanzó la mitad de su subida")}><i />Inicio crecimiento<b>{dia(p.gu50_doy_s2)}</b></span>
          <span title={p.sen50_doy_s2 === null ? "El NDVI no cayó a la mitad de su amplitud antes del 31 de octubre"
            : conFecha(p.sen50_doy_s2, "Día en que el NDVI cayó a la mitad de su amplitud")}>
            <i />Inicio senescencia<b>{p.sen50_doy_s2 === null ? "Ciclo sin senescencia observada" : dia(p.sen50_doy_s2)}</b></span>
          <span title="Días entre la mitad de la subida y la mitad de la caída del NDVI"><i />Duración<b>{p.dur50_dias_s2 === null ? "—" : `${num(p.dur50_dias_s2, 0)} días`}</b></span>
        </div>
        {lineaFeno && <p className="caption">{lineaFeno}</p>}
      </div>

      <Financiero parcela={p} />
      <div className="card-actions"><Button onClick={onDx}>Diagnóstico</Button><Button variant="primary" onClick={onSimulador}>Ver simulador (exploratorio)</Button></div>
      <p className="caption center">Los valores del simulador no forman parte de la predicción.</p>
    </div>
  );
}