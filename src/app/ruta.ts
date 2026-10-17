/**
 * Navegación por hash (sin dependencias). Cada vista se puede enlazar directamente:
 *   #/                         zona de estudio
 *   #/estado/Puebla            estado seleccionado
 *   #/parcela/AGC_011          detalle de parcela
 *   #/simulador/AGC_011        simulador · Resultados
 *   #/simulador/AGC_011/explorador
 */
import { useCallback, useEffect, useState } from "react";

export type Ruta =
  | { vista: "mapa"; estado?: string; parcela?: string }
  | { vista: "simulador"; parcela: string; pestana: "resultados" | "explorador" };

export function leerRuta(hash: string): Ruta {
  const [, a, b, c] = decodeURIComponent(hash.replace(/^#/, "")).split("/");
  if (a === "estado" && b) return { vista: "mapa", estado: b };
  if (a === "parcela" && b) return { vista: "mapa", parcela: b };
  if (a === "simulador" && b) return { vista: "simulador", parcela: b, pestana: c === "explorador" ? "explorador" : "resultados" };
  return { vista: "mapa" };
}

export function escribirRuta(r: Ruta): string {
  if (r.vista === "simulador") return `#/simulador/${r.parcela}${r.pestana === "explorador" ? "/explorador" : ""}`;
  if (r.parcela) return `#/parcela/${r.parcela}`;
  if (r.estado) return `#/estado/${encodeURIComponent(r.estado)}`;
  return "#/";
}

export function useRuta(): [Ruta, (r: Ruta) => void] {
  const [ruta, setRuta] = useState(() => leerRuta(window.location.hash));
  useEffect(() => {
    const f = () => setRuta(leerRuta(window.location.hash));
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const navegar = useCallback((r: Ruta) => { window.location.hash = escribirRuta(r); }, []);
  return [ruta, navegar];
}
