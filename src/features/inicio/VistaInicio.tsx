/**
 * Página de inicio (#/): presentación con scroll del reto, los datos, el modelo y la justificación de las variables.
 * Responsable: inicio. Lee datos SOLO por src/data/hooks.ts; las cifras exclusivas del reporte están en reporte.ts.
 */
import { useEffect, useMemo, useState } from "react";
import type { Ruta } from "../../app/ruta";
import { Cargando, ErrorDatos, Icon, ThemeToggle } from "../../components/ui";
import { combinar, useEstadosGeo, useMeta, useModeloRidge, useNdvi, useParcelas } from "../../data/hooks";
import type { MetaModelo, Parcela } from "../../data/tipos";
import { movimientoReducido, useScrollCss } from "./animacion";
import { resumen } from "./datos";
import { Cierre } from "./secciones/Cierre";
import { Hero } from "./secciones/Hero";
import { SeccionDatos } from "./secciones/SeccionDatos";
import { SeccionModelo } from "./secciones/SeccionModelo";
import { SeccionReto } from "./secciones/SeccionReto";
import { SeccionVariables } from "./secciones/SeccionVariables";
import "./inicio.css";

const NAV = [
  { id: "reto", texto: "El reto" },
  { id: "datos", texto: "Datos" },
  { id: "modelo", texto: "Modelo" },
  { id: "variables", texto: "Variables" },
  { id: "uso", texto: "Uso" },
];

const irA = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: movimientoReducido() ? "auto" : "smooth", block: "start" });

export function VistaInicio({ navegar }: { navegar: (r: Ruta) => void }) {
  useScrollCss();
  const base = combinar<[Parcela[], MetaModelo]>(useParcelas(), useMeta());
  const ndvi = useNdvi();
  const ridge = useModeloRidge();
  const geo = useEstadosGeo();
  const [parcelas, meta] = base.datos ?? [];
  const res = useMemo(() => (parcelas ? resumen(parcelas) : undefined), [parcelas]);
  const irMapa = (id?: string) => navegar(id ? { vista: "mapa", parcela: id } : { vista: "mapa" });

  return (
    <div className="inicio">
      <BarraInicio irMapa={() => irMapa()} listo={base.estado === "listo"} />
      <main>
        <Hero res={res} parcelas={parcelas} meta={meta} irA={irA} irMapa={() => irMapa()} />
        {base.estado === "listo" && res && parcelas && meta ? (
          <>
            <SeccionReto parcelas={parcelas} res={res} />
            <SeccionDatos parcelas={parcelas} res={res} meta={meta} ndvi={ndvi.datos} estadosGeo={geo.datos} />
            <SeccionModelo parcelas={parcelas} res={res} meta={meta} irMapa={irMapa} />
            <SeccionVariables parcelas={parcelas} res={res} meta={meta} ridge={ridge.datos} />
            <Cierre res={res} meta={meta} irMapa={() => irMapa()} />
          </>
        ) : (
          <div className="contenedor seccion">
            {base.estado === "error" ? <ErrorDatos error={base.error} onReintentar={base.reintentar} /> : <Cargando lineas={6} />}
          </div>
        )}
      </main>
    </div>
  );
}

function BarraInicio({ irMapa, listo }: { irMapa: () => void; listo: boolean }) {
  const [activa, setActiva] = useState<string | null>(null);
  const [plegada, setPlegada] = useState(false);

  // Sección activa en el menú: la que cruza la mitad de la pantalla. Se observa cuando ya existen las secciones.
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setActiva(e.target.id); }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ["inicio", ...NAV.map((n) => n.id)].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [listo]);

  useEffect(() => {
    const f = () => setPlegada(window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <header className={`barra-inicio${plegada ? " is-plegada" : ""}`}>
      <div className="contenedor barra-inicio__fila">
        <button type="button" className="marca" onClick={() => irA("inicio")}>
          <span className="brand-mark"><Icon name="leaf" size={19} /></span>
          <span><strong>AgroCebada</strong><small>FIRA · Reto 2026</small></span>
        </button>
        <nav className="barra-inicio__nav" aria-label="Secciones">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={activa === n.id ? "on" : ""} aria-current={activa === n.id ? "true" : undefined}
              onClick={() => irA(n.id)}>{n.texto}</button>
          ))}
        </nav>
        <div className="barra-inicio__acciones">
          <ThemeToggle />
          <button type="button" className="boton boton--primario boton--chico" onClick={irMapa}>
            <Icon name="map" size={16} /> Mapa
          </button>
        </div>
      </div>
      <div className="barra-inicio__progreso" aria-hidden="true" />
    </header>
  );
}
