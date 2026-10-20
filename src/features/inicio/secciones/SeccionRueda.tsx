/**
 * Rueda de datos: resumen del proyecto en 8 sectores. Al elegir un sector la rueda gira, el centro muestra la
 * cifra clave y el panel lateral una gráfica pequeña con un enlace a la gráfica completa de su sección.
 * El anillo exterior son las parcelas ordenadas por rendimiento estimado (una marca por parcela).
 * Datos: parcelas.json, meta.json, ndvi.json y modelo/ridge.json (los dos últimos opcionales).
 */
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../../../components/ui";
import type { MetaModelo, Parcela, SerieNdvi } from "../../../data/tipos";
import { fechaDeDiaDelAnio, num, numSigno } from "../../../lib/formato";
import { mediana } from "../../../lib/estadisticas";
import type { ModeloRidge } from "../../parcela/modelo/ridge";
import { movimientoReducido, Revelar, useEnVista } from "../animacion";
import { Encabezado } from "../comunes";
import {
  colorRampa, correlacionesMunicipio, fenologia, grupoDe, histograma, porMunicipio, rmseMediaMunicipal, type Resumen,
} from "../datos";
import "./Rueda.css";

const C = 270;                    // centro del SVG
const R_IN = 118, R_OUT = 222;    // anillo de sectores
const R_TICK0 = 236, R_TICK1 = 258; // anillo de parcelas
const GIRO_AUTO_MS = 6500;

interface Sector {
  id: string; icono: IconName; nombre: string;
  cifra: string; unidad: string;
  titulo: string; texto: ReactNode; grafica: ReactNode;
  destino: string; destinoTexto: string;
}

const polar = (r: number, aGrados: number) => {
  const a = (aGrados * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};

function cuña(ri: number, ro: number, a0: number, a1: number) {
  const [x0, y0] = polar(ro, a0), [x1, y1] = polar(ro, a1), [x2, y2] = polar(ri, a1), [x3, y3] = polar(ri, a0);
  const grande = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${ro} ${ro} 0 ${grande} 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 ${grande} 0 ${x3} ${y3}Z`;
}

export function SeccionRueda({ parcelas, res, meta, ndvi, ridge, irA }: {
  parcelas: Parcela[]; res: Resumen; meta: MetaModelo; ndvi?: SerieNdvi; ridge?: ModeloRidge; irA: (id: string) => void;
}) {
  const sectores = useSectores(parcelas, res, meta, ndvi, ridge);
  const n = sectores.length, paso = 360 / n;
  const [activo, setActivo] = useState(0);
  const [giro, setGiro] = useState(0);          // rotación acumulada (siempre por el camino corto)
  const [tocado, setTocado] = useState(false);  // el usuario ya interactuó: se detiene el giro automático
  const [ref, visto] = useEnVista<HTMLDivElement>(0.35);

  const elegir = (j: number, manual = true) => {
    const k = ((j % n) + n) % n;
    let d = ((k - activo) * paso) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    setGiro((g) => g - d);
    setActivo(k);
    if (manual) setTocado(true);
  };

  // Giro automático suave mientras nadie la toca y está en pantalla.
  useEffect(() => {
    if (!visto || tocado || movimientoReducido()) return;
    const t = window.setTimeout(() => elegir(activo + 1, false), GIRO_AUTO_MS);
    return () => window.clearTimeout(t);
  });

  const teclas = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); elegir(activo + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); elegir(activo - 1); }
  };

  // Anillo exterior: una marca por parcela, ordenadas por rendimiento estimado.
  const marcas = useMemo(() => {
    const orden = [...parcelas].sort((a, b) => a.pred - b.pred);
    const lo = orden[0]?.pred ?? 0, hi = orden[orden.length - 1]?.pred ?? 1;
    return orden.map((p, i) => {
      const a = (360 * (i + 0.5)) / orden.length;
      const [x0, y0] = polar(R_TICK0, a), [x1, y1] = polar(p.conjunto === "PREDICCION" ? R_TICK1 + 6 : R_TICK1, a);
      return { id: p.id, x0, y0, x1, y1, color: colorRampa((p.pred - lo) / (hi - lo || 1)) };
    });
  }, [parcelas]);

  const s = sectores[activo];

  return (
    <section id="resumen" className="seccion rueda-seccion" aria-labelledby="rueda-titulo">
      <div className="contenedor">
        <Encabezado numero="00" eyebrow="El proyecto en una vuelta" icono="target"
          titulo={<span id="rueda-titulo">Gira la rueda</span>}>
          Ocho cifras resumen el reto, los datos y el modelo. Elige un sector para ver su gráfica; cada uno lleva a la
          sección completa más abajo.
        </Encabezado>

        <Revelar efecto="zoom">
          <div className="rueda" ref={ref}>
            <div className="rueda__dial">
              <svg viewBox={`0 0 ${2 * C} ${2 * C}`} className="rueda__svg" role="tablist" aria-label="Sectores de la rueda de datos"
                onKeyDown={teclas}>
                <defs>
                  <radialGradient id="rueda-brillo">
                    <stop offset="0" stopColor="var(--amber)" stopOpacity=".22" />
                    <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx={C} cy={C} r={C - 2} fill="url(#rueda-brillo)" />

                <g className="rueda__marcas" aria-hidden="true">
                  {marcas.map((m) => <line key={m.id} x1={m.x0} y1={m.y0} x2={m.x1} y2={m.y1} style={{ stroke: m.color }} />)}
                </g>

                <g className="rueda__giro" style={{ transform: `rotate(${giro}deg)` }}>
                  {sectores.map((sec, i) => {
                    const a = i * paso;
                    const [lx, ly] = polar((R_IN + R_OUT) / 2, a);
                    const on = i === activo;
                    return (
                      <g key={sec.id} role="tab" tabIndex={on ? 0 : -1} aria-selected={on} aria-label={`${sec.nombre}: ${sec.cifra} ${sec.unidad}`}
                        className={`rueda__sector${on ? " is-activo" : ""}`} onClick={() => elegir(i)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(i); } }}>
                        <path d={cuña(R_IN, R_OUT, a - paso / 2 + 0.8, a + paso / 2 - 0.8)} className="rueda__cuña" />
                        <g className="rueda__etiqueta" style={{ transform: `rotate(${-giro}deg)`, transformOrigin: `${lx}px ${ly}px` }}>
                          <g transform={`translate(${lx - 11} ${ly - 26})`} className="rueda__icono"><Icon name={sec.icono} size={22} /></g>
                          <text x={lx} y={ly + 16} textAnchor="middle" className="rueda__nombre">{sec.nombre}</text>
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* Indicador fijo arriba */}
                <path d={`M${C - 11} ${C - R_OUT - 14}L${C + 11} ${C - R_OUT - 14}L${C} ${C - R_OUT + 2}Z`} className="rueda__flecha" />

                <circle cx={C} cy={C} r={R_IN - 10} className="rueda__centro" />
                <g className="rueda__centro-texto" key={s.id}>
                  <text x={C} y={C - 4} textAnchor="middle" className="rueda__cifra">{s.cifra}</text>
                  <text x={C} y={C + 26} textAnchor="middle" className="rueda__unidad">{s.unidad}</text>
                </g>
              </svg>

              <div className="rueda__controles">
                <button type="button" onClick={() => elegir(activo - 1)} aria-label="Sector anterior"><Icon name="arrow" size={18} /></button>
                <span>{activo + 1} / {n}</span>
                <button type="button" onClick={() => elegir(activo + 1)} aria-label="Sector siguiente"><Icon name="chevron" size={18} /></button>
              </div>
              <p className="rueda__nota">Anillo exterior: las {parcelas.length} parcelas, ordenadas por rendimiento estimado. Las marcas largas son las {res.pred.length} por predecir.</p>
            </div>

            <div className="rueda__panel" role="tabpanel" aria-live="polite" key={s.id}>
              <div className="rueda__panel-eyebrow"><span><Icon name={s.icono} size={16} /></span>{s.nombre}</div>
              <h3>{s.titulo}</h3>
              <p>{s.texto}</p>
              <div className="rueda__grafica">{s.grafica}</div>
              <button type="button" className="boton boton--chico" onClick={() => irA(s.destino)}>
                {s.destinoTexto} <Icon name="down" size={15} />
              </button>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}

// ---- Contenido de los sectores
function useSectores(parcelas: Parcela[], res: Resumen, meta: MetaModelo, ndvi?: SerieNdvi, ridge?: ModeloRidge): Sector[] {
  return useMemo(() => {
    const munis = porMunicipio(parcelas);
    const rmseMuni = rmseMediaMunicipal(munis);
    const fen = fenologia(parcelas);
    const corrs = correlacionesMunicipio(parcelas);
    const h = histograma(res.reales, 0.25);
    const grupos = ridge
      ? (["s2", "fen", "geo"] as const).map((g) => ridge.cols.filter((c) => grupoDe(c) === g).length)
      : null;
    const curva = ndvi ? ndvi.fechas.map((_, i) => {
      const vs = Object.values(ndvi.serie).map((s) => s[i]).filter((v): v is number => v !== null && v !== undefined);
      return vs.length ? mediana(vs) : null;
    }) : null;

    return [
      {
        id: "parcelas", icono: "grid", nombre: "Parcelas", cifra: String(res.n), unidad: "parcelas",
        titulo: `${res.entren.length} para aprender, ${res.pred.length} para predecir`,
        texto: <>Polígonos de cebada en {res.estados.join(", ")}. Las de entrenamiento traen su rendimiento medido; el reto pide estimar las demás.</>,
        grafica: <MiniDona partes={[{ v: res.entren.length, color: "var(--s1)", texto: "Entrenamiento" }, { v: res.pred.length, color: "var(--amber)", texto: "Por predecir" }]} />,
        destino: "reto", destinoTexto: "Ver las 197 parcelas",
      },
      {
        id: "rendimiento", icono: "wheat", nombre: "Rendimiento", cifra: num(res.mediaReal, 2), unidad: "t/ha en promedio",
        titulo: "Cuánto rinde la cebada medida",
        texto: <>Va de {num(res.minReal, 1)} a {num(res.maxReal, 1)} t/ha, con una desviación de {num(res.desvReal, 2)}. Predecir siempre la media da un error de {num(meta.rmse_media_global, 2)} t/ha.</>,
        grafica: <MiniHist cuentas={h.cuentas} lo={h.lo} hi={h.hi} />,
        destino: "datos", destinoTexto: "Ver el histograma",
      },
      {
        id: "ubicacion", icono: "location", nombre: "Ubicación", cifra: `−${num(100 * (1 - rmseMuni / meta.rmse_media_global), 0)} %`, unidad: "de error con el municipio",
        titulo: "El lugar explica la mayor parte",
        texto: <>Solo con saber el municipio el error baja de {num(meta.rmse_media_global, 2)} a {num(rmseMuni, 2)} t/ha. Las parcelas por predecir están rodeadas de parcelas conocidas.</>,
        grafica: <MiniBarras max={meta.rmse_media_global} filas={[
          { texto: "Media general", v: meta.rmse_media_global, color: "var(--faint)" },
          { texto: "Media del municipio", v: rmseMuni, color: "var(--s1)" },
        ]} />,
        destino: "datos", destinoTexto: "Ver por municipio",
      },
      {
        id: "temporada", icono: "leaf", nombre: "Temporada", cifra: fechaDeDiaDelAnio(Math.round(fen.pico)).slice(0, 5), unidad: "pico de verdor",
        titulo: "Un ciclo de temporal",
        texto: <>El NDVI llega a la mitad de su subida hacia el día {num(fen.gu50, 0)} y al pico hacia el {num(fen.pico, 0)}. El {num(100 * fen.fraccionSinSenescencia, 0)} % sigue verde al cierre de octubre.</>,
        grafica: curva ? <MiniCurva ys={curva} /> : <p className="rueda__vacio">Cargando la serie de NDVI…</p>,
        destino: "datos", destinoTexto: "Ver las curvas de NDVI",
      },
      {
        id: "modelo", icono: "cpu", nombre: "Modelo", cifra: num(meta.cv_aleatorio.r2, 2), unidad: "R² en validación",
        titulo: "Ubicación + corrección satelital",
        texto: <>Error típico de {num(meta.cv_aleatorio.rmse, 2)} t/ha ({num(100 * (1 - meta.cv_aleatorio.rmse / meta.rmse_media_global), 0)} % menos que la media). Sin vecinos cercanos: {num(meta.cv_espacial.rmse, 2)} t/ha.</>,
        grafica: <MiniBarras max={meta.rmse_media_global} filas={[
          { texto: "Predecir la media", v: meta.rmse_media_global, color: "var(--faint)" },
          { texto: "Solo ubicación", v: meta.cv_aleatorio.rmse_prior, color: "var(--s1)" },
          { texto: "Modelo final", v: meta.cv_aleatorio.rmse, color: "var(--amber)" },
        ]} />,
        destino: "modelo", destinoTexto: "Ver cómo se arma",
      },
      {
        id: "intervalo", icono: "target", nombre: "Intervalo", cifra: `± ${num(meta.q80, 2)}`, unidad: "t/ha al 80 %",
        titulo: "Siempre con su rango",
        texto: <>Al 90 % el rango es de ± {num(meta.q90, 2)} t/ha. Sale de los errores de validación cruzada: el modelo ubica bien la zona y afina poco dentro de ella.</>,
        grafica: <MiniIntervalo q80={meta.q80} q90={meta.q90} centro={meta.media_general_entren} />,
        destino: "modelo", destinoTexto: "Ver real contra estimado",
      },
      {
        id: "variables", icono: "filter", nombre: "Variables", cifra: String(meta.n_variables), unidad: "variables",
        titulo: "Pocas, elegidas antes de ver resultados",
        texto: <>Índices de Sentinel-2, fenología y forma y terreno, con una regresión Ridge que las mantiene contenidas.</>,
        grafica: grupos
          ? <MiniApilada partes={[
              { v: grupos[0], color: "var(--s1)", texto: "Sentinel-2" },
              { v: grupos[1], color: "var(--s2)", texto: "Fenología" },
              { v: grupos[2], color: "var(--s3)", texto: "Forma y terreno" },
            ]} />
          : <p className="rueda__vacio">Cargando el modelo…</p>,
        destino: "variables", destinoTexto: "Ver qué variable pesa más",
      },
      {
        id: "limite", icono: "warning", nombre: "Límite", cifra: "Zonas", unidad: "no parcelas vecinas",
        titulo: "Lo que el modelo no logra",
        texto: <>Dentro de cada municipio, lo estimado y lo real casi no se correlacionan. Sirve para evaluar zonas, no para decidir sobre una parcela individual.</>,
        grafica: <MiniBarras max={1} centro filas={corrs.map((c) => ({ texto: `${c.municipio} (n=${c.n})`, v: c.r, color: "var(--amber)", etiqueta: numSigno(c.r, 2) }))} />,
        destino: "variables", destinoTexto: "Ver el límite",
      },
    ];
  }, [parcelas, res, meta, ndvi, ridge]);
}

// ---- Gráficas pequeñas del panel
function MiniDona({ partes }: { partes: { v: number; color: string; texto: string }[] }) {
  const total = partes.reduce((a, p) => a + p.v, 0), r = 44, c = 2 * Math.PI * r;
  let acum = 0;
  return (
    <div className="mini-dona">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {partes.map((p) => {
          const largo = (c * p.v) / total, off = acum;
          acum += largo;
          return <circle key={p.texto} cx="60" cy="60" r={r} fill="none" stroke={p.color} strokeWidth="16"
            strokeDasharray={`${Math.max(0, largo - 2)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />;
        })}
      </svg>
      <ul>{partes.map((p) => <li key={p.texto}><i style={{ background: p.color }} />{p.texto}<b>{p.v}</b></li>)}</ul>
    </div>
  );
}

function MiniHist({ cuentas, lo, hi }: { cuentas: number[]; lo: number; hi: number }) {
  const tope = Math.max(...cuentas, 1);
  return (
    <div className="mini-hist">
      <div className="mini-hist__barras">{cuentas.map((c, i) => <i key={i} style={{ "--h": c / tope, "--i": i } as CSSProperties} />)}</div>
      <div className="mini-eje"><span>{num(lo, 1)} t/ha</span><span>{num(hi, 1)} t/ha</span></div>
    </div>
  );
}

function MiniBarras({ filas, max, centro }: { filas: { texto: string; v: number; color: string; etiqueta?: string }[]; max: number; centro?: boolean }) {
  return (
    <div className={`mini-barras${centro ? " mini-barras--centro" : ""}`}>
      {filas.map((f, i) => (
        <div key={f.texto} className="mini-barras__fila" style={{ "--i": i } as CSSProperties}>
          <span>{f.texto}</span>
          <div className="mini-barras__pista">
            <i className={f.v < 0 ? "neg" : ""} style={{ "--w": Math.min(1, Math.abs(f.v) / max), background: f.color } as CSSProperties} />
          </div>
          <b>{f.etiqueta ?? num(f.v, 2)}</b>
        </div>
      ))}
    </div>
  );
}

function MiniCurva({ ys }: { ys: (number | null)[] }) {
  const W = 320, H = 110, vals = ys.filter((v): v is number => v !== null);
  const lo = Math.min(...vals) - 0.03, hi = Math.max(...vals) + 0.03;
  const x = (i: number) => (i / Math.max(1, ys.length - 1)) * W;
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 12);
  let d = "", pluma = false;
  ys.forEach((v, i) => { if (v === null) { pluma = false; return; } d += `${pluma ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; pluma = true; });
  return (
    <div className="mini-curva">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`${d}L${W} ${H}L0 ${H}Z`} className="mini-curva__area" />
        <path d={d} pathLength={1} className="mini-curva__linea" />
      </svg>
      <div className="mini-eje"><span>Abril</span><span>NDVI mediano de todas las parcelas</span><span>Octubre</span></div>
    </div>
  );
}

function MiniIntervalo({ q80, q90, centro }: { q80: number; q90: number; centro: number }) {
  const lo = centro - 1.2, hi = centro + 1.2, pos = (v: number) => `${(100 * (v - lo)) / (hi - lo)}%`;
  return (
    <div className="mini-intervalo">
      <div className="mini-intervalo__pista">
        <i className="b90" style={{ left: pos(centro - q90), width: `calc(${pos(centro + q90)} - ${pos(centro - q90)})` }} />
        <i className="b80" style={{ left: pos(centro - q80), width: `calc(${pos(centro + q80)} - ${pos(centro - q80)})` }} />
        <i className="punto" style={{ left: pos(centro) }} />
      </div>
      <div className="mini-eje"><span>{num(centro - q90, 2)}</span><span>estimación de ejemplo: {num(centro, 2)} t/ha</span><span>{num(centro + q90, 2)}</span></div>
    </div>
  );
}

function MiniApilada({ partes }: { partes: { v: number; color: string; texto: string }[] }) {
  const total = partes.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <div className="mini-apilada">
      <div className="mini-apilada__barra">{partes.map((p) => <i key={p.texto} style={{ flexGrow: p.v, background: p.color }} title={`${p.texto}: ${p.v}`} />)}</div>
      <ul>{partes.map((p) => <li key={p.texto}><i style={{ background: p.color }} />{p.texto}<b>{p.v}</b><small>{num((100 * p.v) / total, 0)} %</small></li>)}</ul>
    </div>
  );
}
