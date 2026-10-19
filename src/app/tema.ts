/**
 * Tema claro / oscuro de todo el dashboard.
 * El tema vive en <html data-theme="dark|light">; los colores salen de las variables de tokens.css y tema.css,
 * así que cualquier componente que use var(--…) cambia solo. Varios ThemeToggle pueden convivir:
 * se sincronizan con el evento "agrocebada:tema".
 */
import { useCallback, useEffect, useState } from "react";

export type Tema = "dark" | "light";
const CLAVE = "agrocebada-tema";
const EVENTO = "agrocebada:tema";

function leerGuardado(): Tema {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === "dark" || v === "light") return v;
  } catch { /* almacenamiento bloqueado: se usa el tema por defecto */ }
  return "dark"; // el diseño original es oscuro
}

export function temaActual(): Tema {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function aplicarTema(t: Tema) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(CLAVE, t); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent<Tema>(EVENTO, { detail: t }));
}

// Se aplica al importar el módulo, antes del primer render, para evitar un parpadeo de colores.
if (typeof document !== "undefined") document.documentElement.dataset.theme = leerGuardado();

export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(temaActual);
  useEffect(() => {
    const f = (e: Event) => setTema((e as CustomEvent<Tema>).detail);
    window.addEventListener(EVENTO, f);
    return () => window.removeEventListener(EVENTO, f);
  }, []);
  const alternar = useCallback(() => aplicarTema(temaActual() === "dark" ? "light" : "dark"), []);
  return [tema, alternar];
}
