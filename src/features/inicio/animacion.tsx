/**
 * Animaciones de la página de inicio, sin dependencias:
 *  - useEnVista / Revelar: el elemento entra con una transición la primera vez que aparece en pantalla.
 *  - useContador / Contador: números que cuentan desde 0 hasta su valor.
 *  - useScrollCss: escribe --scroll-y y --scroll-p en <html> (parallax y barra de progreso en CSS, sin re-render).
 *  - useTip / TipGrafico: tooltip de las gráficas.
 * Todo respeta prefers-reduced-motion.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from "react";
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

/**
 * Efectos ligados al scroll, escritos directo en el DOM (sin re-render y sin tocar variables CSS de <html>,
 * que obligarían al navegador a recalcular los estilos de toda la página en cada cuadro).
 */
export function useEfectosScroll() {
  useEffect(() => {
    const raiz = document.documentElement;
    const barra = document.querySelector<HTMLElement>(".barra-inicio__progreso");
    const hero = document.querySelector<HTMLElement>(".hero");
    const ilu = document.querySelector<HTMLElement>(".hero__ilustracion");
    const reducido = movimientoReducido();
    let raf = 0, pendiente = false, fuera = false;
    const pintar = () => {
      pendiente = false;
      const y = window.scrollY;
      const max = raiz.scrollHeight - raiz.clientHeight;
      if (barra) barra.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const alto = hero?.offsetHeight ?? window.innerHeight;
      const ahoraFuera = y > alto;
      if (ahoraFuera !== fuera) { fuera = ahoraFuera; hero?.classList.toggle("is-fuera", fuera); }
      if (ilu && !reducido && !fuera) ilu.style.transform = `translate3d(0, ${(-0.12 * y).toFixed(1)}px, 0)`;
    };
    const f = () => { if (!pendiente) { pendiente = true; raf = requestAnimationFrame(pintar); } };
    pintar();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, []);
}

// ---- Tooltip de gráficas: vive en un almacén propio para no re-renderizar la gráfica al mover el mouse.
export interface Tip { x: number; y: number; contenido: ReactNode }

export interface AlmacenTip {
  get: () => Tip | null;
  set: (t: Tip | null) => void;
  sub: (f: () => void) => () => void;
}

function crearAlmacen(): AlmacenTip {
  let valor: Tip | null = null, raf = 0, siguiente: Tip | null = null;
  const subs = new Set<() => void>();
  const avisar = () => subs.forEach((f) => f());
  return {
    get: () => valor,
    set: (t) => {
      siguiente = t;
      if (t === null) { cancelAnimationFrame(raf); raf = 0; valor = null; avisar(); return; }
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; valor = siguiente; avisar(); });
    },
    sub: (f) => { subs.add(f); return () => { subs.delete(f); }; },
  };
}

export function useTip() {
  const contRef = useRef<HTMLDivElement>(null);
  const [tip] = useState(crearAlmacen);
  const mostrar = (e: PointerEvent<Element> | FocusEvent<Element>, contenido: ReactNode) => {
    const c = contRef.current?.getBoundingClientRect();
    if (!c) return;
    if ("clientX" in e) tip.set({ x: e.clientX - c.left, y: e.clientY - c.top, contenido });
    else {
      const r = e.currentTarget.getBoundingClientRect();
      tip.set({ x: r.left + r.width / 2 - c.left, y: r.top - c.top, contenido });
    }
  };
  return { contRef, tip, mostrar, ocultar: () => tip.set(null) };
}

export function TipGrafico({ tip }: { tip: AlmacenTip }) {
  const t = useSyncExternalStore(tip.sub, tip.get);
  if (!t) return null;
  return <div className="g-tip" style={{ transform: `translate3d(${t.x}px, ${t.y}px, 0) translate(-50%, calc(-100% - 14px))` }} role="status">{t.contenido}</div>;
}