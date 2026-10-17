/**
 * Hooks de datos. Todas las vistas leen datos SOLO por aquí; ningún componente hace fetch directo.
 * Cada hook devuelve un Recurso con estado "cargando" | "listo" | "error" para pintar los estados de carga y error.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { cargarJSON } from "./cargar";
import type {
  EntradaDiaria, FilaSensibilidad, MetaModelo, ParamsSimulador, Parcela, SerieNdvi, VariablesSimulador,
} from "./tipos";
import type { ModeloRidge, VariablesModelo } from "../features/parcela/modelo/ridge";

export type Recurso<T> =
  | { estado: "cargando"; datos?: undefined; error?: undefined; reintentar: () => void }
  | { estado: "error"; datos?: undefined; error: Error; reintentar: () => void }
  | { estado: "listo"; datos: T; error?: undefined; reintentar: () => void };

export function useRecurso<T>(ruta: string | null): Recurso<T> {
  const [intento, setIntento] = useState(0);
  const [r, setR] = useState<{ estado: "cargando" | "listo" | "error"; datos?: T; error?: Error }>({ estado: "cargando" });
  const reintentar = useCallback(() => setIntento((i) => i + 1), []);

  useEffect(() => {
    if (!ruta) return;
    let vivo = true;
    setR({ estado: "cargando" });
    cargarJSON<T>(ruta).then(
      (datos) => vivo && setR({ estado: "listo", datos }),
      (error: Error) => vivo && setR({ estado: "error", error }),
    );
    return () => { vivo = false; };
  }, [ruta, intento]);

  return { ...r, reintentar } as Recurso<T>;
}

export const useMeta = () => useRecurso<MetaModelo>("meta.json");
export const useParcelas = () => useRecurso<Parcela[]>("parcelas.json");
export const useNdvi = () => useRecurso<SerieNdvi>("ndvi.json");
export const useVariablesSimulador = () => useRecurso<VariablesSimulador[]>("simulador/variables.json");
export const useSensibilidad = () => useRecurso<FilaSensibilidad[]>("simulador/sensibilidad.json");
export const useParamsSimulador = () => useRecurso<ParamsSimulador>("simulador/params.json");
export const useModeloRidge = () => useRecurso<ModeloRidge>("modelo/ridge.json");
export const useVariablesModelo = () => useRecurso<VariablesModelo>("modelo/variables.json");
export const useEntradaDiaria = (id: string | null) =>
  useRecurso<EntradaDiaria>(id ? `simulador/diario/${id}.json` : null);

/** Parcela por ID (o null si no existe). */
export function useParcela(id: string | null): Recurso<Parcela | null> {
  const r = useParcelas();
  return useMemo(() => {
    if (r.estado !== "listo") return r as Recurso<Parcela | null>;
    return { ...r, datos: r.datos.find((p) => p.id === id) ?? null };
  }, [r, id]);
}

/** Combina varios recursos: listo solo cuando todos lo están; error si alguno falla. */
export function combinar<T extends unknown[]>(...rs: { [K in keyof T]: Recurso<T[K]> }): Recurso<T> {
  const reintentar = () => rs.forEach((x) => x.reintentar());
  const err = rs.find((x) => x.estado === "error");
  if (err) return { estado: "error", error: err.error as Error, reintentar };
  if (rs.some((x) => x.estado !== "listo")) return { estado: "cargando", reintentar };
  return { estado: "listo", datos: rs.map((x) => x.datos) as T, reintentar };
}
