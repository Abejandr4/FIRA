/** Vista B del simulador: retroalimentación con la fecha de siembra real y "¿Y si…?" (deshabilitado). */
import type { CSSProperties } from "react";
import { Button, Icon, Label, SegmentedControl } from "../../../components/ui";
import type { EntradaDiaria, ParamsSimulador, VariablesSimulador } from "../../../data/tipos";
import { EscenariosHipoteticos } from "../escenarios/EscenariosHipoteticos";
import { dias, fecha, num, pct } from "../../../lib/formato";
import { aDia, diferenciaDias, type ResultadoSimulacion } from "../motor";
import { GRUPOS } from "../resultados/metricas";
import type { Escenario } from "../useEscenario";

export function VistaExplorador({ escenario: e, fila, entrada, params }: {
  escenario: Escenario; fila: VariablesSimulador; entrada: EntradaDiaria; params: ParamsSimulador;
}) {
  const ingresada = e.origen === "ingresada";
  const dSie = diferenciaDias(e.activo.fecha_siembra, e.base.fecha_siembra);
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

        {/* Fechas clave: cifra grande con el desplazamiento frente al escenario base */}
        <div className="fechas-grandes">
          {([["Siembra", e.activo.fecha_siembra, dSie], ["Antesis", e.activo.fecha_antesis, dAnt], ["Madurez", e.activo.fecha_madurez, dMad]] as const).map(([n, f, d]) => (
            <div key={n} className={ingresada && d !== 0 ? "is-movida" : ""}>
              <span>{ingresada ? `${n} actualizada` : `${n} · escenario base`}</span>
              <b>{fecha(f).slice(0, 5)}</b>
              <small>{ingresada ? (d === 0 ? "sin cambio" : `${dias(d)} vs. base`) : "Estimada con satélite"}</small>
            </div>
          ))}
        </div>
        <Calendario base={e.base} activo={ingresada ? e.activo : null} />

        {ingresada && <GraficoVariaciones base={e.base} activo={e.activo} />}

        <Button variant="secondary" onClick={e.restablecer} disabled={!e.fechaIngresada}><Icon name="reset" size={16} /> Restablecer a estimada</Button>
        <div className="fixed-note"><Icon name="info" />La predicción de rendimiento del modelo no cambia con esta fecha. El fPAR sigue siendo el observado por el satélite.</div>
      </div>
      <EscenariosHipoteticos key={e.activo.fecha_siembra} entrada={entrada} params={params} fila={fila} base={e.activo} />
    </>
  );
}

/** Calendario del ciclo: siembra → antesis → madurez, escenario base contra fecha ingresada. */
function Calendario({ base, activo }: { base: ResultadoSimulacion; activo: ResultadoSimulacion | null }) {
  const filas = [{ nombre: "Estimada", r: base }, ...(activo ? [{ nombre: "Ingresada", r: activo }] : [])];
  const d0 = Math.min(...filas.map((f) => aDia(f.r.fecha_siembra))) - 5;
  const d1 = Math.max(...filas.map((f) => aDia(f.r.fecha_madurez))) + 5;
  const pos = (f: string) => `${(100 * (aDia(f) - d0)) / (d1 - d0)}%`;
  const ancho = (a: string, b: string) => `${(100 * (aDia(b) - aDia(a))) / (d1 - d0)}%`;
  // Marcas de inicio de mes dentro del rango
  const meses: { dia: number; texto: string }[] = [];
  for (let d = d0; d <= d1; d++) {
    const f = new Date(d * 86_400_000);
    if (f.getUTCDate() === 1) meses.push({ dia: d, texto: f.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" }) });
  }
  return (
    <figure className="calendario">
      <figcaption>Calendario del ciclo
        <span><i className="c-veg" />Siembra → antesis <i className="c-lle" />Antesis → madurez</span>
      </figcaption>
      <div className="calendario__meses">
        {meses.map((m) => <span key={m.dia} style={{ left: `${(100 * (m.dia - d0)) / (d1 - d0)}%` }}>{m.texto}</span>)}
      </div>
      {filas.map(({ nombre, r }) => (
        <div key={nombre} className="calendario__fila">
          <span className="calendario__nombre">{nombre}</span>
          <div className="calendario__pista">
            <i className="c-veg" style={{ left: pos(r.fecha_siembra), width: ancho(r.fecha_siembra, r.fecha_antesis) }}
              title={`Siembra ${fecha(r.fecha_siembra)} → antesis ${fecha(r.fecha_antesis)}: ${diferenciaDias(r.fecha_antesis, r.fecha_siembra)} días`} />
            <i className="c-lle" style={{ left: pos(r.fecha_antesis), width: ancho(r.fecha_antesis, r.fecha_madurez) }}
              title={`Antesis ${fecha(r.fecha_antesis)} → madurez ${fecha(r.fecha_madurez)}: ${diferenciaDias(r.fecha_madurez, r.fecha_antesis)} días`} />
            {[r.fecha_siembra, r.fecha_antesis, r.fecha_madurez].map((f) => <b key={f} style={{ left: pos(f) }} />)}
          </div>
          <small>{diferenciaDias(r.fecha_madurez, r.fecha_siembra)} días</small>
        </div>
      ))}
    </figure>
  );
}

/** Variación (%) de las 12 variables frente al escenario base: barras divergentes por grupo y el mayor cambio destacado. */
function GraficoVariaciones({ base, activo }: { base: ResultadoSimulacion; activo: ResultadoSimulacion }) {
  const grupos = GRUPOS.map((g) => ({
    ...g,
    filas: g.metricas.map((m) => {
      const b = base.variables[m.columna], a = activo.variables[m.columna];
      return { m, a, b, v: b !== 0 ? (100 * (a - b)) / Math.abs(b) : 0 };
    }),
  }));
  const todas = grupos.flatMap((g) => g.filas);
  const tope = Math.max(5, ...todas.map((f) => Math.abs(f.v)));
  const mayor = todas.reduce((m, f) => (Math.abs(f.v) > Math.abs(m.v) ? f : m), todas[0]);
  const cambiaron = todas.filter((f) => Math.abs(f.v) >= 0.05).length;

  return (
    <details className="variaciones variaciones--grafico" open>
      <summary>Variación de las variables frente al escenario base</summary>

      <div className="variaciones__resumen">
        <div className="variaciones__mayor">
          <span>Mayor cambio</span>
          <b className={mayor.v < 0 ? "baja" : "sube"}>{Math.abs(mayor.v) < 0.05 ? "±0 %" : pct(mayor.v)}</b>
          <small>{mayor.m.nombre}: {num(mayor.b, mayor.m.decimales)} → {num(mayor.a, mayor.m.decimales)} {mayor.m.unidad}</small>
        </div>
        <div className="variaciones__conteo">
          <b>{cambiaron}</b><span>de {todas.length} variables cambian</span>
        </div>
      </div>

      <div className="variaciones__eje" aria-hidden="true">
        <span>−{num(tope, 0)} %</span><span>0</span><span>+{num(tope, 0)} %</span>
      </div>
      {grupos.map((g) => (
        <div key={g.id} className="variaciones__grupo">
          <div className="variaciones__titulo">{g.titulo}</div>
          {g.filas.map((f, i) => {
            const sinCambio = Math.abs(f.v) < 0.05;
            return (
              <div key={f.m.columna} className="variaciones__fila" style={{ "--i": i } as CSSProperties}
                title={`${f.m.nombre}: ${num(f.b, f.m.decimales)} → ${num(f.a, f.m.decimales)} ${f.m.unidad}`}>
                <span className="variaciones__nombre">{f.m.nombre}</span>
                <div className="variaciones__pista">
                  {!sinCambio && <i className={f.v < 0 ? "neg" : "pos"} style={{ "--w": Math.min(1, Math.abs(f.v) / tope) } as CSSProperties} />}
                </div>
                <b className={sinCambio ? "cero" : f.v < 0 ? "baja" : "sube"}>{sinCambio ? "sin cambio" : pct(f.v)}</b>
                <small>{num(f.a, f.m.decimales)} {f.m.unidad}</small>
              </div>
            );
          })}
        </div>
      ))}
    </details>
  );
}
