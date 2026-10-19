import { useEffect, useRef, useState } from "react";
import { Tooltip } from "../../../components/ui";
import { num, pct } from "../../../lib/formato";
import { nivelKs, TEXTO_NIVEL_KS } from "./lecturas";
import type { DefMetrica } from "./metricas";

/** Cuenta desde el valor anterior hasta el nuevo (al cambiar de escenario la cifra "rueda"). */
function useValorAnimado(valor: number, ms = 650) {
  const [v, setV] = useState(valor);
  const previo = useRef(valor);
  useEffect(() => {
    const desde = previo.current;
    previo.current = valor;
    if (Number.isNaN(valor) || Number.isNaN(desde) || desde === valor
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(valor); return; }
    let raf = 0;
    const t0 = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setV(desde + (valor - desde) * e);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);
  return v;
}

/** Medidor circular de 0 a 1 para el coeficiente de estrés hídrico (1 = sin estrés). */
function AnilloKs({ valor, grande }: { valor: number; grande?: boolean }) {
  const r = grande ? 54 : 26, w = grande ? 12 : 7, s = 2 * (r + w), c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, Number.isNaN(valor) ? 0 : valor));
  return (
    <svg className="ks-anillo" width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      <circle cx={s / 2} cy={s / 2} r={r} className="ks-anillo__fondo" style={{ strokeWidth: w }} />
      <circle cx={s / 2} cy={s / 2} r={r} className="ks-anillo__valor" style={{ strokeWidth: w, strokeDasharray: c, strokeDashoffset: c * (1 - f) }}
        transform={`rotate(-90 ${s / 2} ${s / 2})`} />
    </svg>
  );
}

/** Medio círculo con la posición de la parcela entre todas (percentil). */
function SemiPercentil({ percentil, n }: { percentil: number; n: number }) {
  const p = Math.max(0, Math.min(100, Number.isNaN(percentil) ? 0 : percentil));
  const r = 70, c = Math.PI * r;
  const ang = Math.PI * (1 - p / 100);
  const [x, y] = [90 + r * Math.cos(ang), 86 - r * Math.sin(ang)];
  return (
    <div className="semi-pct">
      <svg viewBox="0 0 180 100" aria-hidden="true">
        <path d={`M20 86A${r} ${r} 0 0 1 160 86`} className="semi-pct__fondo" />
        <path d={`M20 86A${r} ${r} 0 0 1 160 86`} className="semi-pct__valor" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - p / 100) }} />
        <circle cx={x} cy={y} r="7" className="semi-pct__punto" />
      </svg>
      <div className="semi-pct__texto"><b>{Math.round(p)}</b><span>percentil entre {n} parcelas</span></div>
    </div>
  );
}

export function TarjetaMetrica({ def, valor, base, percentil, nParcelas, casiConstante, destacada, lectura }: {
  def: DefMetrica;
  valor: number;
  /** Valor del escenario base; si se pasa y difiere, se muestra la variación relativa. */
  base?: number;
  percentil: number;
  nParcelas: number;
  casiConstante: boolean;
  /** Tarjeta grande del grupo: cifra mayor, medidor de percentil y una frase de lectura. */
  destacada?: boolean;
  lectura?: string;
}) {
  const animado = useValorAnimado(valor);
  const nivel = def.semantica === "ks" && !Number.isNaN(valor) ? nivelKs(valor) : null;
  const variacion = base !== undefined && base !== 0 ? (100 * (valor - base)) / Math.abs(base) : null;
  const clases = ["metric-card", destacada ? "metric-card--destacada" : "", nivel ? `metric-card--ks ks-${nivel}` : ""].join(" ");

  return (
    <div className={clases}>
      <div className="metric-top">
        <div><strong>{def.nombre}</strong><small>{def.columna}</small></div>
        <Tooltip text={def.ayuda} column={def.columna} label={`Qué es ${def.nombre.toLowerCase()}`} />
      </div>

      <div className="metric-cuerpo">
        <div>
          <div className="metric-value">{num(animado, def.decimales)}{def.unidad && <small className="metric-unit"> {def.unidad}</small>}</div>
          {nivel && <div className={`ks-nivel ks-nivel--${nivel}`}>{TEXTO_NIVEL_KS[nivel]}</div>}
          {variacion !== null && (
            <div className="metric-delta">{Math.abs(variacion) < 0.05 ? "Sin cambio" : pct(variacion)} vs. escenario base</div>
          )}
          {destacada && lectura && <p className="metric-lectura">{lectura}</p>}
        </div>
        {nivel && <AnilloKs valor={valor} grande={destacada} />}
      </div>

      {casiConstante
        ? <div className="constant-note">Valor casi igual en todas las parcelas</div>
        : destacada
          ? <SemiPercentil percentil={percentil} n={nParcelas} />
          : <>
            <div className="percentile" role="img" aria-label={`Percentil ${Math.round(percentil)} de ${nParcelas} parcelas`}>
              <span style={{ left: `calc(${Math.min(100, Math.max(0, percentil))}% - 1px)` }} />
            </div>
            <div className="percentile-label">Percentil {Math.round(percentil)} de {nParcelas} parcelas</div>
          </>}
    </div>
  );
}
