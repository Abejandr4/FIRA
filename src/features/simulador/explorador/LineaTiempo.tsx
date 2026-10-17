/**
 * Línea de tiempo del Explorador: reproducir/pausar, deslizador de fecha y barras de progreso.
 * "Tiempo térmico" = grados-día acumulados / objetivo de madurez; "Agua en el suelo" = (SW − PMP) / (CC − PMP).
 */
import { useEffect, useRef } from "react";
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
  const termico = Math.min(100, (100 * r.serie.gdd_acum[dia]) / gddObjetivo);
  const agua = Math.min(100, Math.max(0, (100 * (r.serie.sw[dia] - PWP_mm)) / (FC_mm - PWP_mm)));
  const alternar = () => {
    if (!reproduciendo && dia >= fin) setDia(ini);
    setReproduciendo(!reproduciendo);
  };

  return (
    <div className="timeline">
      <div className="date-row">
        <Button onClick={alternar} variant="primary" ariaLabel={reproduciendo ? "Pausar" : "Reproducir"}><Icon name={reproduciendo ? "pause" : "play"} /></Button>
        <div><span>Fecha de simulación</span><b aria-live="off">{fechaLarga(sumarDias(entrada.inicio, dia))}</b></div>
      </div>
      <input className="timeline-range" type="range" min={ini} max={fin} value={Math.min(Math.max(dia, ini), fin)}
        aria-label="Fecha de simulación" onChange={(e) => { setReproduciendo(false); setDia(Number(e.target.value)); }} />
      <div className="progress-label"><span>Tiempo térmico</span><b>{num(termico, 0)} %</b></div>
      <div className="progress" role="progressbar" aria-label="Tiempo térmico" aria-valuenow={Math.round(termico)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${termico}%` }} /></div>
      <div className="progress-label"><span>Agua en el suelo</span><b>{num(agua, 0)} %</b></div>
      <div className="progress water" role="progressbar" aria-label="Agua en el suelo" aria-valuenow={Math.round(agua)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${agua}%` }} /></div>
    </div>
  );
}
