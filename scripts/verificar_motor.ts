/**
 * Verifica que el motor TypeScript reproduce el simulador de Python en las 197 parcelas.
 * Compara contra public/data/simulador/variables.json (que el exportador copia de biofisicas_197_parcelas.csv
 * después de comprobar que el pipeline de Python lo reproduce).
 *
 * Uso: npm run verificar:motor
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { simular, type EntradaDiaria, type ParamsSimulador, type Variables12 } from "../src/features/simulador/motor";

const DATA = join(import.meta.dirname, "../public/data/simulador");
const leer = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), "utf-8")) as T;

type FilaVariables = Variables12 & { id: string; fecha_siembra: string; fecha_pico: string;
  fecha_antesis: string; fecha_madurez: string; ciclo_incompleto: boolean; caida_fpar_no_alcanzada: boolean };

const params = leer<ParamsSimulador>("params.json");
const ref = leer<FilaVariables[]>("variables.json");
const VARS: (keyof Variables12)[] = ["GDD_antesis", "GDD_llenado", "DAP_antesis_est", "ETo_acum", "ETa_acum",
  "Deficit_Hidrico_Total", "KS_prom_antesis", "KS_prom_llenado", "fPAR_integrado", "Biomasa_Antesis_Sim",
  "Biomasa_Total_Sim", "HI_penalizado"];
const TOL_REL = 1e-3; // las entradas diarias se guardan con 4 decimales

const peor: Record<string, number> = {};
let fallas = 0;
for (const f of ref) {
  const e = leer<EntradaDiaria>(`diario/${f.id}.json`);
  const s = simular(e, params, f.fecha_pico, f.fecha_siembra);
  if (s.fecha_antesis !== f.fecha_antesis || s.fecha_madurez !== f.fecha_madurez) {
    fallas++; console.error(`${f.id}: fechas ${s.fecha_antesis}/${s.fecha_madurez} vs ${f.fecha_antesis}/${f.fecha_madurez}`);
  }
  if (s.extras.ciclo_incompleto !== f.ciclo_incompleto || s.extras.caida_fpar_no_alcanzada !== f.caida_fpar_no_alcanzada) {
    fallas++; console.error(`${f.id}: banderas distintas`);
  }
  for (const v of VARS) {
    const a = s.variables[v], b = f[v];
    const err = Math.abs(a - b) / Math.max(1, Math.abs(b));
    peor[v] = Math.max(peor[v] ?? 0, err);
    if (!(err <= TOL_REL)) { fallas++; console.error(`${f.id} ${v}: motor ${a} vs Python ${b}`); }
  }
}
console.log("Error relativo máximo por variable (197 parcelas):");
for (const v of VARS) console.log(`  ${v.padEnd(22)} ${peor[v].toExponential(1)}`);
if (fallas) { console.error(`\n${fallas} diferencias fuera de tolerancia`); process.exit(1); }
console.log("\nOK: el motor TypeScript reproduce el simulador de Python.");
