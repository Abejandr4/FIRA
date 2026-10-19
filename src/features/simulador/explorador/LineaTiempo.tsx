/**
 * Línea de tiempo del Explorador: reproducir/pausar, deslizador de fecha y dos mini gráficas del ciclo
 * (tiempo térmico y agua en el suelo) con un cursor en el día simulado.
 * "Tiempo térmico" = grados-día acumulados / objetivo de madurez; "Agua en el suelo" = (SW − PMP) / (CC − PMP).
 */
import { useEffect, useMemo, useRef } from "react";
import { Button, Icon } from "../../../components/ui";
import type { EntradaDiaria } from "../../../data/tipos";
import { fechaLarga, num } from "../../../lib/formato";
import { sumarDias, type ResultadoSimulacion } from "../motor";

const MS_POR_DIA = 70;

export function rangoAnimacion(r: ResultadoSimulacion, n: number): [number, number] {
  return [Math.max(0, r.i_siembra - 7), Math.min(n - 1, r.i_madurez + 7)];
}

export function LineaTiempo({ resultado: r, entrada, dia, setDia, reproduciendo, setReproduciendo, gddObjetivo }: {
  resultado: ResultadoSimulacion;
  entrada: EntradaDiaria;
  dia: number;
  setDia: (d: number | ((d: number) => number)) => void;
  reproduciendo: boolean;
  setReproduciendo: (b: boolean) => void;
  gddObjetivo: number;
}) {
  const [ini, fin] = rangoAnimacion(r, entrada.n_dias);
  const finRef = useRef(fin);
  finRef.current = fin;

  useEffect(() => {
    if (!reproduciendo) return;
    const t = setInterval(() => setDia((d) => {
      if (d >= finRef.current) { setReproduciendo(false); return d; }
      return d + 1;
    }), MS_POR_DIA);
    return () => clearInterval(t);
  }, [reproduciendo, setDia, setReproduciendo]);

  const { FC_mm, PWP_mm } = entrada.suelo;
  const pctTermico = (t: number) => Math.min(100, (100 * r.serie.gdd_acum[t]) / gddObjetivo);
  const pctAgua = (t: number) => Math.min(100, Math.max(0, (100 * (r.serie.sw[t] - PWP_mm)) / (FC_mm - PWP_mm)));
  const termico = pctTermico(dia);
  const agua = pctAgua(dia);

  // Series completas del ciclo (no cambian al mover el día; solo se mueve el cursor).
  const series = useMemo(() => {
    const ts = Array.from({ length: fin - ini + 1 }, (_, k) => ini + k);
    return { termico: ts.map(pctTermico), agua: ts.map(pctAgua) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, ini, fin, gddObjetivo, FC_mm, PWP_mm]);

  const alternar = () => {
    if (!reproduciendo && dia >= fin) setDia(ini);
    setReproduciendo(!reproduciendo);
  };
  const cursor = (dia - ini) / Math.max(1, fin - ini);

  return (
    <div className="timeline">
      <div className="date-row">
        <Button onClick={alternar} variant="primary" ariaLabel={reproduciendo ? "Pausar" : "Reproducir"}><Icon name={reproduciendo ? "pause" : "play"} /></Button>
        <div><span>Fecha de simulación</span><b aria-live="off">{fechaLarga(sumarDias(entrada.inicio, dia))}</b></div>
      </div>
      <input className="timeline-range" type="range" min={ini} max={fin} value={Math.min(Math.max(dia, ini), fin)}
        aria-label="Fecha de simulación" onChange={(e) => { setReproduciendo(false); setDia(Number(e.target.value)); }} />

      <MiniSerie titulo="Tiempo térmico" valor={termico} ys={series.termico} cursor={cursor} clase="termico" />
      <MiniSerie titulo="Agua en el suelo" valor={agua} ys={series.agua} cursor={cursor} clase="agua" />
    </div>
  );
}

/** Área pequeña de 0 a 100 % con la cifra del día en grande y un cursor vertical. */
function MiniSerie({ titulo, valor, ys, cursor, clase }: { titulo: string; valor: number; ys: number[]; cursor: number; clase: string }) {
  const W = 300, H = 46;
  const d = useMemo(() => {
    const x = (k: number) => (k / Math.max(1, ys.length - 1)) * W;
    const y = (v: number) => H - (v / 100) * H;
    const linea = ys.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    return { linea, area: `${linea}L${W} ${H}L0 ${H}Z` };
  }, [ys]);
  return (
    <div className={`mini-serie mini-serie--${clase}`}>
      <div className="mini-serie__cabeza"><span>{titulo}</span><b>{num(valor, 0)}<small> %</small></b></div>
      <div className="mini-serie__grafica" role="progressbar" aria-label={titulo} aria-valuenow={Math.round(valor)} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={d.area} className="mini-serie__area" />
          <path d={d.linea} className="mini-serie__linea" />
        </svg>
        <i className="mini-serie__cursor" style={{ left: `${cursor * 100}%` }} />
      </div>
    </div>
  );
}
