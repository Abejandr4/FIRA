import { Tooltip } from "../../../components/ui";
import { num, pct } from "../../../lib/formato";
import { nivelKs, TEXTO_NIVEL_KS } from "./lecturas";
import type { DefMetrica } from "./metricas";

export function TarjetaMetrica({ def, valor, base, percentil, nParcelas, casiConstante }: {
  def: DefMetrica;
  valor: number;
  /** Valor del escenario base; si se pasa y difiere, se muestra la variación relativa. */
  base?: number;
  percentil: number;
  nParcelas: number;
  casiConstante: boolean;
}) {
  const nivel = def.semantica === "ks" && !Number.isNaN(valor) ? nivelKs(valor) : null;
  const variacion = base !== undefined && base !== 0 ? (100 * (valor - base)) / Math.abs(base) : null;
  return (
    <div className={`metric-card ${nivel ? `metric-card--ks ks-${nivel}` : ""}`}>
      <div className="metric-top">
        <div><strong>{def.nombre}</strong><small>{def.columna}</small></div>
        <Tooltip text={def.ayuda} column={def.columna} label={`Qué es ${def.nombre.toLowerCase()}`} />
      </div>
      <div className="metric-value">{num(valor, def.decimales)}{def.unidad && <small className="metric-unit"> {def.unidad}</small>}</div>
      {nivel && <div className={`ks-nivel ks-nivel--${nivel}`}>{TEXTO_NIVEL_KS[nivel]}</div>}
      {variacion !== null && (
        <div className="metric-delta">{Math.abs(variacion) < 0.05 ? "Sin cambio" : pct(variacion)} vs. escenario base</div>
      )}
      {casiConstante
        ? <div className="constant-note">Valor casi igual en todas las parcelas</div>
        : <>
          <div className="percentile" role="img" aria-label={`Percentil ${Math.round(percentil)} de ${nParcelas} parcelas`}>
            <span style={{ left: `calc(${Math.min(100, Math.max(0, percentil))}% - 1px)` }} />
          </div>
          <div className="percentile-label">Percentil {Math.round(percentil)} de {nParcelas} parcelas</div>
        </>}
    </div>
  );
}
