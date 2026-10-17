/**
 * Sensibilidad global del simulador (docs/SENSIBILIDAD.md del repo SimuladorBiofisico).
 * Por escenario: mayor cambio mediano (|%|) entre las 12 variables y el ρ de Spearman más bajo
 * (qué tanto cambia el orden entre parcelas). Los supuestos de siembra van primero.
 */
import type { FilaSensibilidad } from "../../../data/tipos";
import { num } from "../../../lib/formato";
import { TODAS } from "./metricas";

const VARIABLES = new Set<string>(TODAS.map((m) => m.columna));
const ORDEN_GRUPOS = ["Siembra", "M2 fenología", "M1 clima", "M3 balance hídrico", "M4 biomasa", "M4 índice de cosecha"];

interface Fila { etiqueta: string; grupo: string; magnitud: number; variable: string; rhoMin: number | null }

export function resumirSensibilidad(filas: FilaSensibilidad[]): Fila[] {
  const porEsc = new Map<string, Fila>();
  for (const f of filas) {
    if (!VARIABLES.has(f.variable) || f.grupo === "Variables GDD") continue; // definiciones alternativas, no supuestos
    const actual = porEsc.get(f.escenario) ?? { etiqueta: f.etiqueta, grupo: f.grupo, magnitud: 0, variable: "", rhoMin: null };
    const m = Math.abs(f.cambio_mediano_pct ?? 0);
    if (m > actual.magnitud) { actual.magnitud = m; actual.variable = f.variable; }
    if (f.rho_spearman !== null && (actual.rhoMin === null || f.rho_spearman < actual.rhoMin)) actual.rhoMin = f.rho_spearman;
    porEsc.set(f.escenario, actual);
  }
  const rank = (g: string) => { const i = ORDEN_GRUPOS.indexOf(g); return i === -1 ? 99 : i; };
  return [...porEsc.values()].sort((a, b) => rank(a.grupo) - rank(b.grupo) || b.magnitud - a.magnitud);
}

export function GraficoSensibilidad({ filas }: { filas: FilaSensibilidad[] }) {
  const datos = resumirSensibilidad(filas);
  const max = Math.max(...datos.map((d) => d.magnitud), 1);
  return (
    <section className="sensitivity" aria-labelledby="sens-titulo">
      <div className="group-heading"><div><span>04</span><strong id="sens-titulo">Sensibilidad</strong><em>¿qué supuesto pesa más?</em></div>
        <p>Cambio mediano por parcela al mover un supuesto a la vez (197 parcelas).</p></div>
      <div className="sens-head" aria-hidden="true"><span>Supuesto</span><span>Mayor cambio mediano</span><span>ρ mínimo</span></div>
      <ul className="sens-list">
        {datos.map((d) => (
          <li key={d.etiqueta} title={`${d.etiqueta}: ${num(d.magnitud, 1)} % en ${d.variable}; ρ mínimo ${d.rhoMin === null ? "—" : num(d.rhoMin, 2)}`}>
            <span className="sens-label"><small>{d.grupo}</small>{d.etiqueta}</span>
            <span className="sens-bar"><i style={{ width: `${(100 * d.magnitud) / max}%` }} /><b>{num(d.magnitud, 1)} %</b><small>{d.variable}</small></span>
            <span className="sens-rho">{d.rhoMin === null ? "—" : num(d.rhoMin, 2)}</span>
          </li>
        ))}
      </ul>
      <p className="caption">ρ de Spearman entre el escenario y el caso base: cerca de 1, el orden entre parcelas casi no cambia (solo cambia la escala). Fuente: sensibilidad_resumen.csv.</p>
    </section>
  );
}
