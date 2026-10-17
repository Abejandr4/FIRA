/**
 * Simulador biofísico (vista aparte). Resultados = escenario activo; Explorador = fecha de siembra real.
 * Responsable: simulador. La planta (planta/) y el motor (motor/) tienen sus propios contratos.
 */
import { useEffect, useMemo, useState } from "react";
import type { Ruta } from "../../app/ruta";
import { Button, Cargando, ErrorDatos, Icon, Label, SegmentedControl, Tooltip } from "../../components/ui";
import {
  combinar, useEntradaDiaria, useParamsSimulador, useParcela, useSensibilidad, useVariablesSimulador,
} from "../../data/hooks";
import type { EntradaDiaria, FilaSensibilidad, ParamsSimulador, Parcela, VariablesSimulador } from "../../data/tipos";
import { fecha } from "../../lib/formato";
import { LineaTiempo, rangoAnimacion } from "./explorador/LineaTiempo";
import { VistaExplorador } from "./explorador/VistaExplorador";
import { Planta } from "./planta/Planta";
import { ETIQUETA_ETAPA, type EstadoPlanta } from "./planta/tipos";
import { VistaResultados } from "./resultados/VistaResultados";
import { useEscenario } from "./useEscenario";
import "./simulador.css";

type RutaSim = Extract<Ruta, { vista: "simulador" }>;

export function VistaSimulador({ ruta, navegar }: { ruta: RutaSim; navegar: (r: Ruta) => void }) {
  const r = combinar<[Parcela | null, VariablesSimulador[], ParamsSimulador, EntradaDiaria, FilaSensibilidad[]]>(
    useParcela(ruta.parcela), useVariablesSimulador(), useParamsSimulador(), useEntradaDiaria(ruta.parcela), useSensibilidad(),
  );
  const volver = () => navegar({ vista: "mapa", parcela: ruta.parcela });

  if (r.estado !== "listo") {
    return (
      <div className="simulator">
        <header className="sim-header"><Button variant="ghost" onClick={volver}><Icon name="arrow" /> Volver al mapa</Button>
          <div className="sim-identity"><Label>SIMULADOR BIOFÍSICO</Label><strong>{ruta.parcela}</strong></div></header>
        <div className="data-column">{r.estado === "error" ? <ErrorDatos error={r.error} onReintentar={r.reintentar} /> : <Cargando lineas={6} />}</div>
      </div>
    );
  }
  const [parcela, todas, params, entrada, sensibilidad] = r.datos;
  const fila = todas.find((t) => t.id === ruta.parcela);
  if (!parcela || !fila) {
    return <div className="simulator"><div className="data-column"><ErrorDatos error={new Error(`No existe la parcela ${ruta.parcela}`)} /></div></div>;
  }
  return <Simulador key={parcela.id} {...{ ruta, navegar, parcela, todas, fila, params, entrada, sensibilidad, volver }} />;
}

function Simulador({ ruta, navegar, parcela, todas, fila, params, entrada, sensibilidad, volver }: {
  ruta: RutaSim; navegar: (r: Ruta) => void; parcela: Parcela; todas: VariablesSimulador[]; fila: VariablesSimulador;
  params: ParamsSimulador; entrada: EntradaDiaria; sensibilidad: FilaSensibilidad[]; volver: () => void;
}) {
  const esc = useEscenario(entrada, params, fila);
  const pestana = ruta.pestana;
  const activo = esc.activo;
  const [dia, setDia] = useState(activo.i_madurez);
  const [reproduciendo, setReproduciendo] = useState(false);
  const maxBio = useMemo(() => Math.max(...todas.map((t) => t.Biomasa_Total_Sim)), [todas]);
  const gddObjetivo = params.fenologia.gdd_madurez_objetivo;

  // Al cambiar de escenario o de pestaña, el Explorador vuelve a antes de la siembra (suelo desnudo).
  useEffect(() => { setReproduciendo(false); setDia(rangoAnimacion(activo, entrada.n_dias)[0]); }, [activo, pestana, entrada.n_dias]);

  const t = pestana === "explorador" ? Math.min(Math.max(dia, rangoAnimacion(activo, entrada.n_dias)[0]), entrada.n_dias - 1) : activo.i_madurez;
  const estadoPlanta: EstadoPlanta = {
    // En Resultados se muestra el estado final (madurez); el día de madurez aún cuenta como "llenado" en M2.
    etapa: pestana === "resultados" ? "madurez" : activo.serie.estadio[t],
    progresoTermico: Math.min(1, activo.serie.gdd_acum[t] / gddObjetivo),
    fpar: Math.min(1, Math.max(0, entrada.fapar_final[t])),
    ks: pestana === "resultados" ? activo.variables.KS_prom_llenado : activo.serie.ks[t],
    biomasaRel: activo.serie.bio[t] / maxBio,
  };
  const origenTxt = esc.origen === "ingresada" ? "Ingresada" : "Estimada con satélite";
  const etiquetaPlanta = `${ETIQUETA_ETAPA[estadoPlanta.etapa]} · ${esc.origen === "ingresada" ? "fecha ingresada" : "escenario base"}`;

  return (
    <div className="simulator">
      <header className="sim-header">
        <Button variant="ghost" onClick={volver}><Icon name="arrow" /> Volver al mapa</Button>
        <div className="sim-identity">
          <Label>SIMULADOR BIOFÍSICO</Label>
          <strong>{parcela.id}</strong><span>{parcela.estado} · {parcela.municipio}</span>
          {fila.doble_ciclo && (
            <span className="badge-doble">Doble ciclo
              <Tooltip label="Qué significa doble ciclo" text="El NDVI muestra un primer ciclo de vegetación que cae en julio; la fecha de siembra tiene dos lecturas posibles." />
            </span>
          )}
        </div>
        <div className="key-dates">
          {([["Siembra", activo.fecha_siembra], ["Floración", activo.fecha_antesis], ["Madurez", activo.fecha_madurez]] as const).map(([n, f]) => (
            <div key={n}><span>{n}</span><b>{fecha(f)}</b><small className={esc.origen === "ingresada" ? "origen-ingresada" : ""}>{origenTxt}</small></div>
          ))}
        </div>
        <SegmentedControl label="Vista del simulador" value={pestana}
          onChange={(p) => navegar({ vista: "simulador", parcela: parcela.id, pestana: p })}
          options={[{ value: "resultados", label: "Resultados" }, { value: "explorador", label: "Explorador" }]} />
      </header>
      <main className="sim-body">
        <aside className="plant-column">
          <div><Label>CEBADA DE ESTA PARCELA</Label><div className="plant-title">{pestana === "resultados" ? "Estado final" : "Crecimiento simulado"}</div></div>
          <Planta estado={estadoPlanta} etiqueta={etiquetaPlanta} reproduciendo={reproduciendo} />
          {pestana === "explorador" && (
            <LineaTiempo resultado={activo} entrada={entrada} dia={t} setDia={setDia} reproduciendo={reproduciendo}
              setReproduciendo={setReproduciendo} gddObjetivo={gddObjetivo} />
          )}
          <div className="plant-legend">Representación esquemática; no es una fotografía ni un pronóstico.</div>
        </aside>
        <section className="data-column">
          {pestana === "resultados"
            ? <VistaResultados escenario={esc} todas={todas} fila={fila} sensibilidad={sensibilidad} />
            : <VistaExplorador escenario={esc} fila={fila} />}
        </section>
      </main>
    </div>
  );
}
