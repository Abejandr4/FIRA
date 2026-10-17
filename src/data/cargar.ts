/** Carga de JSON desde public/data con caché en memoria (cada archivo se pide una sola vez). */
const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<unknown>>();

export class ErrorDatos extends Error {}

export function cargarJSON<T>(ruta: string): Promise<T> {
  let p = cache.get(ruta);
  if (!p) {
    p = fetch(BASE + ruta).then((r) => {
      if (!r.ok) throw new ErrorDatos(`No se pudo cargar ${ruta} (${r.status})`);
      return r.json();
    });
    p.catch(() => cache.delete(ruta)); // permite reintentar
    cache.set(ruta, p);
  }
  return p as Promise<T>;
}
