/**
 * Animaciones de la página de inicio, sin dependencias:
 *  - useEnVista / Revelar: el elemento entra con una transición la primera vez que aparece en pantalla.
 *  - useContador / Contador: números que cuentan desde 0 hasta su valor.
 *  - useScrollCss: escribe --scroll-y y --scroll-p en <html> (parallax y barra de progreso en CSS, sin re-render).
 *  - useTip / TipGrafico: tooltip de las gráficas.
 * Todo respeta prefers-reduced-motion.
 */
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { num } from "../../lib/formato";

export const movimientoReducido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useEnVista<T extends Element>(umbral = 0.15) {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visto) return;
    if (!("IntersectionObserver" in window)) { setVisto(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } },
      { threshold: umbral, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [umbral, visto]);
  return [ref, visto] as const;
}

type Efecto = "subir" | "izq" | "der" | "zoom";

/** Envuelve contenido que aparece al hacer scroll. Las gráficas internas animan con `.is-visible`. */
export function Revelar({ children, className = "", retraso = 0, efecto = "subir" }: {
  children: ReactNode; className?: string; retraso?: number; efecto?: Efecto;
}) {
  const [ref, visto] = useEnVista<HTMLDivElement>();
  return (
    <div ref={ref} className={`revelar revelar--${efecto}${visto ? " is-visible" : ""} ${className}`}
      style={{ "--retraso": `${retraso}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

export function useContador(objetivo: number, activo: boolean, duracion = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!activo) return;
    if (movimientoReducido()) { setV(objetivo); return; }
    let raf = 0;
    const t0 = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / duracion);
      setV(objetivo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, activo, duracion]);
  return v;
}

export function Contador({ valor, decimales = 0, activo, sufijo = "" }: { valor: number; decimales?: number; activo: boolean; sufijo?: string }) {
  const v = useContador(valor, activo);
  return <>{num(v, decimales)}{sufijo}</>;
}

/** Variables CSS de scroll en <html>: --scroll-y (px, sin unidad) y --scroll-p (0–1 de la página). */
export function useScrollCss() {
  useEffect(() => {
    const raiz = document.documentElement;
    let raf = 0;
    const f = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = raiz.scrollHeight - raiz.clientHeight;
        raiz.style.setProperty("--scroll-y", String(window.scrollY));
        raiz.style.setProperty("--scroll-p", String(max > 0 ? window.scrollY / max : 0));
      });
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
      raiz.style.removeProperty("--scroll-y");
      raiz.style.removeProperty("--scroll-p");
    };
  }, []);
}

// ---- Tooltip de gráficas
export interface Tip { x: number; y: number; contenido: ReactNode }

export function useTip() {
  const contRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const mostrar = (e: PointerEvent<Element> | FocusEvent<Element>, contenido: ReactNode) => {
    const c = contRef.current?.getBoundingClientRect();
    if (!c) return;
    if ("clientX" in e) setTip({ x: e.clientX - c.left, y: e.clientY - c.top, contenido });
    else {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ x: r.left + r.width / 2 - c.left, y: r.top - c.top, contenido });
    }
  };
  return { contRef, tip, mostrar, ocultar: () => setTip(null) };
}

export function TipGrafico({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return <div className="g-tip" style={{ left: tip.x, top: tip.y }} role="status">{tip.contenido}</div>;
}
