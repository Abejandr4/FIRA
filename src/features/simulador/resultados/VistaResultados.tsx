/** Vista A del simulador: 12 tarjetas en tres grupos, otras salidas, sensibilidad y advertencias. */
import { useMemo } from "react";
import { Icon, Label, Tooltip } from "../../../components/ui";
import type { FilaSensibilidad, VariablesSimulador } from "../../../data/tipos";
import { fraccionModa, percentil, UMBRAL_CASI_CONSTANTE } from "../../../lib/estadisticas";
import { num } from "../../../lib/formato";
import type { Variables12 } from "../motor/tipos";
import type { Escenario } from "../useEscenario";
import { GraficoSensibilidad } from "./GraficoSensibilidad";
import { lecturaGrupo } from "./lecturas";
import { GRUPOS, OTRAS_SALIDAS, TODAS } from "./metricas";
import { TarjetaMetrica } from "./TarjetaMetrica";

export function VistaResultados({ escenario, todas, fila, sensibilidad }: {
  escenario: Escenario;
  /** Escenario base de las 197 parcelas (para percentiles y variables casi constantes). */
  todas: VariablesSimulador[];
  fila: VariablesSimulador;
  sensibilidad: FilaSensibilidad[];
}) {
  const v = escenario.activo.variables;
  const conBase = escenario.origen === "ingresada";

  const estadistica = useMemo(() => {
    const out = {} as Record<keyof Variables12, { valores: number[]; casiConstante: boolean; moda: ReturnType<typeof fraccionModa> }>;
    for (const m of TODAS) {
      const valores = todas.map((t) => t[m.columna]);
      const moda = fraccionModa(valores, 6); // valores exactos, no redondeados a la pantalla
      out[m.columna] = { valores, moda, casiConstante: moda.fraccion > UMBRAL_CASI_CONSTANTE };
    }
    return out;
  }, [todas]);

  const pcts = Object.fromEntries(TODAS.map((m) => [m.columna, percentil(v[m.columna], estadistica[m.columna].valores)])) as Record<keyof Variables12, number>;
  const hi = estadistica.HI_penalizado.moda;

  return (
    <>
      <div className="data-heading">
        <div><Label>{conBase ? "ESCENARIO CON FECHA INGRESADA" : "ESCENARIO BASE"}</Label><div className="page-title">Variables biofísicas simuladas</div></div>
        <span className="neutral-badge"><Icon name="calendar" size={15} /> {conBase ? "Fecha de siembra ingresada" : "Fecha estimada con satélite"}</span>
      </div>
      {GRUPOS.map((g, gi) => (
        <section className="metric-group" key={g.id} aria-labelledby={`grupo-${g.id}`}>
          <div className="group-heading">
            <div><span>0{gi + 1}</span><strong id={`grupo-${g.id}`}>{g.titulo}</strong><em>{g.pregunta}</em></div>
            <p>{lecturaGrupo(g.id, v, pcts)}</p>
          </div>
          <div className={`metric-grid metric-grid-${g.metricas.length}`}>
            {g.metricas.map((m) => (
              <TarjetaMetrica key={m.columna} def={m} valor={v[m.columna]} percentil={pcts[m.columna]} nParcelas={todas.length}
                base={conBase ? escenario.base.variables[m.columna] : undefined} casiConstante={estadistica[m.columna].casiConstante} />
            ))}
          </div>
        </section>
      ))}

      <details className="other-outputs">
        <summary>Otras salidas del simulador <span>{OTRAS_SALIDAS.length} variables · escenario base</span></summary>
        <dl className="other-list">
          {OTRAS_SALIDAS.map((o) => {
            const x = fila[o.columna];
            return (
              <div key={o.columna}>
                <dt>{o.nombre} <Tooltip text={o.ayuda} column={o.columna} /></dt>
                <dd>{typeof x === "boolean" ? (x ? "Sí" : "No") : `${num(x, 1)} ${o.unidad}`}</dd>
              </div>
            );
          })}
        </dl>
      </details>

      <GraficoSensibilidad filas={sensibilidad} />

      <div className="warnings">
        <div><Icon name="warning" size={17} />La biomasa total es un criterio de ordenamiento entre parcelas, no un valor absoluto, y no es rendimiento de grano.</div>
        <div><Icon name="info" size={17} />El índice de cosecha vale {num(hi.valor, 2)} en {hi.n} de {todas.length} parcelas.</div>
      </div>
    </>
  );
}
