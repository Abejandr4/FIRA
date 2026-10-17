/** Vista B del simulador: retroalimentación con la fecha de siembra real y "¿Y si…?" (deshabilitado). */
import { Button, Icon, Label, SegmentedControl } from "../../../components/ui";
import type { EntradaDiaria, ParamsSimulador, VariablesSimulador } from "../../../data/tipos";
import { EscenariosHipoteticos } from "../escenarios/EscenariosHipoteticos";
import { dias, fecha, num, pct } from "../../../lib/formato";
import { diferenciaDias } from "../motor";
import { TODAS } from "../resultados/metricas";
import type { Escenario } from "../useEscenario";

export function VistaExplorador({ escenario: e, fila, entrada, params }: {
  escenario: Escenario; fila: VariablesSimulador; entrada: EntradaDiaria; params: ParamsSimulador;
}) {
  const ingresada = e.origen === "ingresada";
  const dAnt = diferenciaDias(e.activo.fecha_antesis, e.base.fecha_antesis);
  const dMad = diferenciaDias(e.activo.fecha_madurez, e.base.fecha_madurez);

  return (
    <>
      <div className="data-heading"><div><Label>EXPLORADOR</Label><div className="page-title">Ajuste con la fecha de siembra observada</div></div></div>
      <div className="feedback-card">
        <div className="field-heading">
          <div><strong id="siembra-real">Fecha de siembra observada</strong><span>Opcional</span></div>
          <p>Por defecto: Estimada con satélite · {fecha(fila.fecha_siembra)}</p>
        </div>
        <label className={`date-input ${e.errorFecha ? "date-input--error" : ""}`}>
          <Icon name="calendar" />
          <input type="date" aria-labelledby="siembra-real" aria-invalid={!!e.errorFecha} aria-describedby="siembra-error"
            value={e.fechaIngresada} min={e.ventana.inicio} max={e.ventana.fin}
            onChange={(ev) => e.setFechaIngresada(ev.target.value)} />
        </label>
        {e.errorFecha && (
          <div className="field-error" id="siembra-error" role="alert">
            Fuera de la ventana de simulación ({fecha(e.ventana.inicio)} a {fecha(e.ventana.fin)}). Se usa la fecha estimada.
          </div>
        )}
        <div className="use-row">
          <span>Usar en el escenario:</span>
          <SegmentedControl small label="Fecha que usa el escenario" value={e.origen} onChange={e.setUsar}
            options={[{ value: "estimada", label: "Estimada" },
              { value: "ingresada", label: "Ingresada", disabled: !e.fechaIngresada || !!e.errorFecha }]} />
        </div>
        <div className="fira-chip">Referencia FIRA: principios de mayo (aproximada)</div>
        {e.igualAEstimada && <div className="info-note"><Icon name="info" size={16} />La fecha ingresada es la misma que la estimada; el escenario no cambia.</div>}
        {e.avisoNdvi && (
          <div className="ndvi-warning" role="status"><Icon name="warning" />
            El NDVI de esta parcela no muestra crecimiento hasta {fecha(e.avisoNdvi)}. Puede deberse a siembra en seco o a una fecha aproximada.</div>
        )}
        <div className="updated-dates">
          <div><span>{ingresada ? "Antesis actualizada" : "Antesis · escenario base"}</span><b>{fecha(e.activo.fecha_antesis)}</b><small>{ingresada ? dias(dAnt) : "Estimada con satélite"}</small></div>
          <div><span>{ingresada ? "Madurez actualizada" : "Madurez · escenario base"}</span><b>{fecha(e.activo.fecha_madurez)}</b><small>{ingresada ? dias(dMad) : "Estimada con satélite"}</small></div>
        </div>
        {ingresada && (
          <details className="variaciones" open>
            <summary>Variación de las variables frente al escenario base</summary>
            <ul>
              {TODAS.map((m) => {
                const b = e.base.variables[m.columna], a = e.activo.variables[m.columna];
                const v = b !== 0 ? (100 * (a - b)) / Math.abs(b) : 0;
                return <li key={m.columna}><span>{m.nombre}</span><b>{Math.abs(v) < 0.05 ? "sin cambio" : pct(v)}</b><small>{num(a, m.decimales)} {m.unidad}</small></li>;
              })}
            </ul>
          </details>
        )}
        <Button variant="secondary" onClick={e.restablecer} disabled={!e.fechaIngresada}><Icon name="reset" size={16} /> Restablecer a estimada</Button>
        <div className="fixed-note"><Icon name="info" />La predicción de rendimiento del modelo no cambia con esta fecha. El fPAR sigue siendo el observado por el satélite.</div>
      </div>
      <EscenariosHipoteticos key={e.activo.fecha_siembra} entrada={entrada} params={params} fila={fila} base={e.activo} />
    </>
  );
}
