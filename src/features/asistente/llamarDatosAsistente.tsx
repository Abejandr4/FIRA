import { useEffect, useState } from "react";
import type { Parcela } from "../../data/tipos";

interface Datos { parcelas: Parcela[]; meta: Record<string, any> }

const base = `${import.meta.env.BASE_URL}data/modelo/`;
let cache: Promise<Datos> | null = null;

function cargar(): Promise<Datos> {
  cache ??= Promise.all([
    fetch(`${base}parcelas.json`).then((r) => r.json()),
    fetch(`${base}meta.json`).then((r) => r.json()).catch(() => ({})),
  ]).then(([p, meta]) => ({
    parcelas: Array.isArray(p) ? p : p.parcelas ?? [], // AJUSTAR si tu JSON tiene otra forma
    meta,
  }));
  return cache;
}

export function useDatosAsistente() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { cargar().then(setDatos).catch(() => setError(true)); }, []);
  return { datos, error };
}