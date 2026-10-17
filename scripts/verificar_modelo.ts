/**
 * Verifica que la corrección ridge en TypeScript reproduce la predicción del modelo:
 * en las 59 parcelas de PREDICCIÓN, prior + correccion(x) debe ser igual a pred.
 *
 * Uso: npm run verificar:modelo
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { correccion, type ModeloRidge, type VariablesModelo } from "../src/features/parcela/modelo/ridge";
import type { Parcela } from "../src/data/tipos";

const DATA = join(import.meta.dirname, "../public/data");
const leer = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), "utf-8")) as T;

const m = leer<ModeloRidge>("modelo/ridge.json");
const vars = leer<VariablesModelo>("modelo/variables.json");
const parcelas = leer<Parcela[]>("parcelas.json").filter((p) => p.conjunto === "PREDICCION");
const TOL = 1e-3; // t/ha; los JSON guardan 4–6 decimales

let peor = 0, fallas = 0;
for (const p of parcelas) {
  const est = p.prior + correccion(m, vars.valores[p.id]);
  const err = Math.abs(est - p.pred);
  peor = Math.max(peor, err);
  if (err > TOL) { fallas++; console.error(`${p.id}: TS ${est.toFixed(4)} vs modelo ${p.pred}`); }
}
console.log(`${parcelas.length} parcelas de predicción · error máximo ${peor.toExponential(1)} t/ha`);
if (fallas) { console.error(`${fallas} diferencias fuera de tolerancia`); process.exit(1); }
console.log("OK: la corrección ridge en TypeScript reproduce el modelo.");
