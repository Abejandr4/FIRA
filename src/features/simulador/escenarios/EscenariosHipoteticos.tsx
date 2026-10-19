/**
 * Escenarios hipotéticos: clima y manejo modificados sobre el escenario en uso (estimado o con fecha observada).
 * Exploratorio. No cambia la predicción del modelo ni lo financiero.
 * Los controles modificados y las variables que cambian se resaltan (clases esc-control--activo y esc-fila-cambio).
 */
import { useMemo, useState } from "react";
import { Button, Icon, Label, SegmentedControl, Tooltip } from "../../../components/ui";
import type { EntradaDiaria, ParamsSimulador, VariablesSimulador } from "../../../data/tipos";
import { dias, fecha, num, pct } from "../../../lib/formato";
import { diferenciaDias, ErrorSimulacion, sumarDias, type ResultadoSimulacion } from "../motor";
import { TODAS } from "../resultados/metricas";
import {
  aplicarClima, escenarioNeutro, esNeutro, FACTOR_VARIEDAD, lluviaCiclo, simularEscenario, validar,
  type Escenario, type Variedad,
} from "./escenario";

/** Clase del control: se resalta cuando su valor difiere del escenario en uso. */
const claseControl = (modificado: boolean) => `esc-control${modificado ? " esc-control--activo" : ""}`;

export function EscenariosHipoteticos({ entrada, params, fila, base }: {
  entrada: EntradaDiaria;
  params: ParamsSimulador;
  fila: VariablesSimulador;
  /** Escenario en uso (fecha estimada o fecha observada ingresada). */
  base: ResultadoSimulacion;
}) {
  const inicial = () => escenarioNeutro(base.fecha_siembra, sumarDias(base.fecha_antesis, -15));
  const [esc, setEsc] = useState<Escenario>(inicial);
  const errores = validar(esc, params.ventana);
  const hayError = Object.keys(errores).length > 0;
  const neutro = esNeutro(esc, base.fecha_siembra);

  const resultado = useMemo(() => {
    if (hayError || neutro) return null;
    try { return simularEscenario(entrada, params, fila.fecha_pico, esc); }
    catch (e) { if (e instanceof ErrorSimulacion) return null; throw e; }
  }, [entrada, params, fila.fecha_pico, esc, hayError, neutro]);

  const set = <K extends keyof Escenario>(k: K, v: Escenario[K]) => setEsc((s) => ({ ...s, [k]: v }));
  const gdd = (f: number) => `${num(params.fenologia.gdd_antesis_objetivo * f, 0)} / ${num(params.fenologia.gdd_madurez_objetivo * f, 0)} °C·d`;
  const lluviaBase = lluviaCiclo(entrada.pcp, base);
  const lluviaEsc = resultado ? lluviaCiclo(aplicarClima(entrada, esc).pcp, resultado) : lluviaBase;

  return (
    <section className="escenarios" aria-labelledby="esc-titulo">
      <div className="field-heading">
        <div><Label>ANÁLISIS DE ESCENARIOS</Label><div className="card-title" id="esc-titulo">Escenarios hipotéticos</div></div>
        <Button onClick={() => setEsc(inicial())} disabled={neutro}><Icon name="reset" size={15} /> Restablecer</Button>
      </div>
      <p className="esc-intro">
        Modificaciones de clima y manejo sobre el escenario en uso (siembra {fecha(base.fecha_siembra)}). El simulador se
        vuelve a ejecutar con las entradas modificadas. Exploratorio: no cambia la predicción del modelo.
      </p>

      <div className="esc-controles">
        <div className={claseControl(esc.fechaSiembra !== base.fecha_siembra)}>
          <label htmlFor="esc-siembra"><strong>Fecha de siembra</strong></label>
          <input id="esc-siembra" type="date" value={esc.fechaSiembra} min={params.ventana.inicio} max={params.ventana.fin}
            aria-invalid={!!errores.siembra} onChange={(e) => set("fechaSiembra", e.target.value)} />
          {errores.siembra && <small className="field-error">{errores.siembra}</small>}
        </div>

        <div className={claseControl(esc.variedad !== "intermedia")}>
          <div className="esc-control-head"><strong>Ciclo de la variedad</strong>
            <Tooltip text="Escala los grados-día objetivo de antesis y madurez (±10 %). Es un supuesto de interfaz, no una calibración por variedad." /></div>
          <SegmentedControl small label="Ciclo de la variedad" value={esc.variedad} onChange={(v: Variedad) => set("variedad", v)}
            options={[{ value: "precoz", label: "Precoz" }, { value: "intermedia", label: "Intermedia" }, { value: "tardia", label: "Tardía" }]} />
          <small>Antesis / madurez: {gdd(FACTOR_VARIEDAD[esc.variedad])}{esc.variedad === "intermedia" && " (caso base)"}</small>
        </div>

        <div className={claseControl(esc.lluviaPct !== 0)}>
          <label htmlFor="esc-lluvia"><strong>Precipitación del ciclo</strong></label>
          <input id="esc-lluvia" type="range" min={-80} max={80} step={10} value={esc.lluviaPct}
            onChange={(e) => set("lluviaPct", Number(e.target.value))} />
          <small>{esc.lluviaPct === 0 ? "Sin cambio" : pct(esc.lluviaPct, 0)} · {num(lluviaEsc, 0)} mm en el ciclo (en uso: {num(lluviaBase, 0)} mm)</small>
        </div>

        <div className={claseControl(esc.periodoSeco.activo)}>
          <label className="esc-check"><input type="checkbox" checked={esc.periodoSeco.activo}
            onChange={(e) => set("periodoSeco", { ...esc.periodoSeco, activo: e.target.checked })} /><strong>Periodo sin lluvia</strong></label>
          <div className="esc-fila" aria-disabled={!esc.periodoSeco.activo}>
            <input type="date" aria-label="Inicio del periodo sin lluvia" disabled={!esc.periodoSeco.activo} value={esc.periodoSeco.inicio}
              min={params.ventana.inicio} max={params.ventana.fin} onChange={(e) => set("periodoSeco", { ...esc.periodoSeco, inicio: e.target.value })} />
            <input type="number" aria-label="Duración en días" disabled={!esc.periodoSeco.activo} min={1} max={90} value={esc.periodoSeco.dias}
              onChange={(e) => set("periodoSeco", { ...esc.periodoSeco, dias: Number(e.target.value) })} /><span>días</span>
          </div>
          {errores.seco && <small className="field-error">{errores.seco}</small>}
        </div>

        <div className={claseControl(esc.riego.activo)}>
          <label className="esc-check"><input type="checkbox" checked={esc.riego.activo}
            onChange={(e) => set("riego", { ...esc.riego, activo: e.target.checked })} /><strong>Riego de auxilio</strong></label>
          <div className="esc-fila" aria-disabled={!esc.riego.activo}>
            <input type="date" aria-label="Fecha del riego" disabled={!esc.riego.activo} value={esc.riego.fecha}
              min={params.ventana.inicio} max={params.ventana.fin} onChange={(e) => set("riego", { ...esc.riego, fecha: e.target.value })} />
            <input type="number" aria-label="Lámina de riego en mm" disabled={!esc.riego.activo} min={1} max={150} value={esc.riego.mm}
              onChange={(e) => set("riego", { ...esc.riego, mm: Number(e.target.value) })} /><span>mm</span>
          </div>
          {errores.riego && <small className="field-error">{errores.riego}</small>}
        </div>
      </div>

      {neutro && <div className="info-note"><Icon name="info" size={16} />Sin modificaciones: el escenario coincide con el que está en uso.</div>}
      {resultado && <ComparacionEscenario base={base} esc={resultado} entrada={entrada} />}

      <div className="fixed-note"><Icon name="info" />
        El fPAR se mantiene como el observado por el satélite, de modo que la cobertura del cultivo no responde a los cambios:
        el efecto sobre la biomasa entra solo por el estrés hídrico (Ks). La fecha del pico de NDVI también es la observada.
      </div>
    </section>
  );
}

function ComparacionEscenario({ base, esc, entrada }: { base: ResultadoSimulacion; esc: ResultadoSimulacion; entrada: EntradaDiaria }) {
  return (
    <div className="esc-resultado" aria-live="polite">
      <div className="updated-dates">
        <div><span>Antesis</span><b>{fecha(esc.fecha_antesis)}</b><small>{dias(diferenciaDias(esc.fecha_antesis, base.fecha_antesis))} frente al escenario en uso</small></div>
        <div><span>Madurez</span><b>{fecha(esc.fecha_madurez)}</b><small>{dias(diferenciaDias(esc.fecha_madurez, base.fecha_madurez))} frente al escenario en uso</small></div>
      </div>
      <table className="esc-tabla">
        <thead><tr><th scope="col">Variable</th><th scope="col">En uso</th><th scope="col">Hipotético</th><th scope="col">Cambio</th></tr></thead>
        <tbody>
          {TODAS.map((m) => {
            const a = base.variables[m.columna], b = esc.variables[m.columna];
            const v = a !== 0 ? (100 * (b - a)) / Math.abs(a) : 0;
            const cambia = Math.abs(v) >= 0.05;
            return (
              <tr key={m.columna} className={cambia ? "esc-fila-cambio" : ""}>
                <th scope="row">{m.nombre}<small>{m.columna}</small></th>
                <td>{num(a, m.decimales)} {m.unidad}</td>
                <td>{num(b, m.decimales)} {m.unidad}</td>
                <td className={cambia ? "esc-cambio" : ""}>{cambia ? pct(v) : "sin cambio"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <GraficoAgua base={base} esc={esc} entrada={entrada} />
    </div>
  );
}

/** Agua disponible en el suelo (0 = punto de marchitez, 100 = capacidad de campo), en uso vs. hipotético. */
function GraficoAgua({ base, esc, entrada }: { base: ResultadoSimulacion; esc: ResultadoSimulacion; entrada: EntradaDiaria }) {
  const { FC_mm, PWP_mm } = entrada.suelo;
  const i0 = Math.min(base.i_siembra, esc.i_siembra);
  const i1 = Math.max(base.i_madurez, esc.i_madurez);
  const W = 640, H = 150, P = { l: 46, r: 10, t: 10, b: 22 };
  const x = (t: number) => P.l + ((t - i0) / Math.max(1, i1 - i0)) * (W - P.l - P.r);
  const y = (sw: number) => P.t + (1 - Math.min(1, Math.max(0, (sw - PWP_mm) / (FC_mm - PWP_mm)))) * (H - P.t - P.b);
  const linea = (r: ResultadoSimulacion) => r.serie.sw.slice(i0, i1 + 1).map((s, k) => `${k ? "L" : "M"}${x(i0 + k).toFixed(1)} ${y(s).toFixed(1)}`).join(" ");
  return (
    <figure className="esc-grafico">
      <figcaption>Agua disponible en el suelo durante el ciclo
        <span className="esc-leyenda"><i className="l-base" />En uso <i className="l-esc" />Hipotético</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Agua disponible en el suelo, escenario en uso y escenario hipotético">
        {[0, 50, 100].map((v) => {
          const yy = P.t + (1 - v / 100) * (H - P.t - P.b);
          return <g key={v}><line x1={P.l} x2={W - P.r} y1={yy} y2={yy} className="esc-grid" /><text x={P.l - 6} y={yy + 4} className="esc-eje" textAnchor="end">{v} %</text></g>;
        })}
        <text x={P.l} y={H - 4} className="esc-eje">{fecha(sumarDias(entrada.inicio, i0))}</text>
        <text x={W - P.r} y={H - 4} className="esc-eje" textAnchor="end">{fecha(sumarDias(entrada.inicio, i1))}</text>
        <path d={linea(base)} className="esc-linea-base" />
        <path d={linea(esc)} className="esc-linea-esc" />
      </svg>
    </figure>
  );
}
