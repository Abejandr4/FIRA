/**
 * Mapa de la zona de estudio: globo interactivo (MapLibre) con tres niveles de zoom.
 *   nivel 0  Tierra girando; hover y clic en un estado → onEstado(nombre)
 *   nivel 1  estado seleccionado: encuadra sus parcelas; clic en parcela → onParcela(id)
 *   nivel 2  parcela seleccionada: acerca la cámara y resalta el polígono con borde ámbar
 * La cámara sigue a las props `estado` y `parcelaSeleccionada` (que vienen de la ruta), así que el botón
 * "atrás" del navegador y los enlaces directos funcionan igual que un clic.
 *
 * Controles (esquina superior izquierda): acercar, alejar y menú de capas (mapa base, parcelas,
 * nombres de estados y modo noche).
 *
 * Datos (solo por src/data/hooks.ts): parcelas.json (pred, lat, lon), parcelas.geojson y estados.geojson.
 * Los colores de MapLibre no leen variables CSS; los literales de abajo salen de src/styles/tokens.css.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { ExpressionSpecification, GeoJSONSourceSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Icon } from "../../components/ui";
import { useEstadosGeo, useParcelasGeo } from "../../data/hooks";
import type { ColeccionGeo, Parcela, PropsEstado, PropsParcelaGeo } from "../../data/tipos";
import { num } from "../../lib/formato";

// ---- Constantes visuales
const AMBAR = "#dca93a";                       // --amber
const COLOR_BAJO = "#1d423d";                  // mismo degradado que .gradient-key en territorio.css
const COLOR_ALTO = "#65a998";
const COLOR_SIN_DATO = "#3a444b";              // --line-strong
/** Mapas base sin llave (Esri). */
const TESELAS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TESELAS_SATELITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const VISTA = { center: [-98.6, 19.9] as [number, number], zoom: 4.8 };
const ZOOM_PARCELA = 14;
const GIRO_GRADOS_POR_SEG = 0.3;
const LIMITES_GIRO: [number, number] = [-101, -96];   // el globo oscila entre estas longitudes
/** Espacio libre entre la tarjeta de la parcela y la parcela centrada (px). */
const MARGEN_TARJETA = 16;
/** Separación mínima entre nombres de estados (px). */
const MARGEN_ETIQUETAS = 6;

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    base: { type: "raster", tiles: [TESELAS], tileSize: 256, maxzoom: 16 },
    satelite: { type: "raster", tiles: [TESELAS_SATELITE], tileSize: 256, maxzoom: 18 },
  },
  layers: [
    { id: "fondo", type: "background", paint: { "background-color": "#0e1519" } },
    { id: "base", type: "raster", source: "base" },
    { id: "satelite", type: "raster", source: "satelite", layout: { visibility: "none" } },
  ],
};

const CAPAS_PARCELAS = ["parcelas-poligonos", "parcelas-borde", "parcelas-puntos"];

const cielo = (modoNoche: boolean) => modoNoche ? {
  "sky-color": "#071326", "horizon-color": "#245b91", "fog-color": "#03070d",
  "sky-horizon-blend": 0.7, "horizon-fog-blend": 0.55, "fog-ground-blend": 0.22,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] as ExpressionSpecification,
} : {
  "sky-color": "#1b3a73", "horizon-color": "#7fb3d9", "fog-color": "#0b0e11",
  "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.5, "fog-ground-blend": 0.2,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] as ExpressionSpecification,
};

// ---- Preparación de datos (se hace una vez por carga)
type Caja = [[number, number], [number, number]];
type Ancla = "center" | "top" | "bottom" | "left";

/**
 * Dónde va cada nombre respecto al centro de su estado. Los tres estados están juntos, así que se separan
 * hacia fuera (Hidalgo arriba, Puebla abajo). Si aun así chocan, se oculta el de menor prioridad.
 */
const ANCLA_ETIQUETA: Record<string, Ancla> = { Hidalgo: "bottom", Puebla: "top", Tlaxcala: "center" };

function primerVertice(c: unknown): number[] {
  let x = c as unknown[];
  while (Array.isArray(x[0])) x = x[0] as unknown[];
  return x as number[];
}

const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

/** Centro de área (lon, lat) y área de un Polygon o MultiPolygon, con sus anillos exteriores. */
function centroGeometria(g: { type: string; coordinates: unknown }): { centro: [number, number]; area: number } | null {
  const poligonos = (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []) as number[][][][];
  let A = 0, cx = 0, cy = 0;
  for (const pol of poligonos) {
    const anillo = pol[0];
    if (!anillo || anillo.length < 3) continue;
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < anillo.length - 1; i++) {
      const [x0, y0] = anillo[i], [x1, y1] = anillo[i + 1];
      const k = x0 * y1 - x1 * y0;
      a += k; x += (x0 + x1) * k; y += (y0 + y1) * k;
    }
    if (a === 0) continue;
    A += a / 2; cx += x / 6; cy += y / 6;
  }
  return A ? { centro: [cx / A, cy / A], area: Math.abs(A) } : null;
}

function prepararDatos(parcelas: Parcela[], est: ColeccionGeo<PropsEstado>, geo: ColeccionGeo<PropsParcelaGeo>) {
  // Comprobación de coordenadas: si salen en metros, el exportador olvidó pasar a EPSG:4326.
  const v = est.features[0] ? primerVertice(est.features[0].geometry.coordinates) : [0, 0];
  if (Math.abs(v[0]) > 180 || Math.abs(v[1]) > 90) {
    console.warn("estados.geojson no está en lon/lat (grados). Primer vértice:", v);
  }

  const porEstado = new Map<string, Parcela[]>();
  parcelas.forEach((p) => porEstado.set(p.estado, [...(porEstado.get(p.estado) ?? []), p]));

  const cajas: Record<string, Caja> = {};
  porEstado.forEach((l, nombre) => {
    const lons = l.map((p) => p.lon), lats = l.map((p) => p.lat);
    cajas[nombre] = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
  });

  // Nombres en el centro de cada estado (no en el promedio de sus parcelas, que están todas cerca de la frontera).
  // Orden = prioridad cuando chocan: primero el estado más grande.
  const etiquetas = est.features
    .filter((f) => porEstado.has(f.properties.nombre))
    .map((f) => {
      const c = centroGeometria(f.geometry);
      const l = porEstado.get(f.properties.nombre)!;
      return {
        nombre: f.properties.nombre,
        lngLat: c?.centro ?? [media(l.map((p) => p.lon)), media(l.map((p) => p.lat))] as [number, number],
        area: c?.area ?? 0,
        ancla: ANCLA_ETIQUETA[f.properties.nombre] ?? "center",
      };
    })
    .sort((a, b) => b.area - a.area);

  const estados = {
    ...est,
    features: est.features.map((f) => {
      const l = porEstado.get(f.properties.nombre) ?? [];
      return { ...f, properties: { ...f.properties, n: l.length, media: l.length ? media(l.map((p) => p.pred)) : null } };
    }),
  };

  const porId = new Map(parcelas.map((p) => [p.id, p]));
  const poligonos = {
    ...geo,
    features: geo.features.map((f) => {
      const p = porId.get(f.properties.id);
      return { ...f, properties: { id: f.properties.id, pred: p?.pred ?? null, conjunto: p?.conjunto ?? null } };
    }),
  };
  const puntos = {
    type: "FeatureCollection" as const,
    features: parcelas.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, pred: p.pred, conjunto: p.conjunto },
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
    })),
  };

  const preds = parcelas.map((p) => p.pred);
  const mediasEstado = estados.features.map((f) => f.properties.media).filter((m): m is number => m !== null);
  return {
    estados, poligonos, puntos, cajas, etiquetas, porId,
    rangoPred: [Math.min(...preds), Math.max(...preds)] as [number, number],
    rangoEstados: [Math.min(...mediasEstado), Math.max(...mediasEstado)] as [number, number],
  };
}

type Datos = ReturnType<typeof prepararDatos>;

const rampa = (prop: string, lo: number, hi: number): ExpressionSpecification => [
  "case", ["==", ["get", prop], null], COLOR_SIN_DATO,
  ["interpolate", ["linear"], ["get", prop], lo, COLOR_BAJO, hi > lo ? hi : lo + 1e-6, COLOR_ALTO],
];

function aplicarModoNoche(map: maplibregl.Map, datos: Datos, modoNoche: boolean) {
  if (!map.getLayer("estados-relleno")) return;
  const bajo = modoNoche ? "#063c2b" : COLOR_BAJO;
  const alto = modoNoche ? "#52e29a" : COLOR_ALTO;
  const sinDato = modoNoche ? "#164d3b" : COLOR_SIN_DATO;
  const [lo, hi] = datos.rangoEstados;
  map.setPaintProperty("base", "raster-opacity", modoNoche ? 0.28 : 1);
  map.setPaintProperty("satelite", "raster-opacity", modoNoche ? 0.35 : 1);
  map.setPaintProperty("estados-relleno", "fill-color", [
    "case", ["==", ["get", "media"], null], sinDato,
    ["interpolate", ["linear"], ["get", "media"], lo, bajo, hi > lo ? hi : lo + 1e-6, alto],
  ]);
  map.setPaintProperty("estados-borde", "line-color", [
    "case", ["boolean", ["feature-state", "hover"], false], AMBAR, modoNoche ? "#8dffd0" : "#9fb0b5",
  ]);
}

type Fondo = "oscuro" | "satelite";

/** Mapa base y visibilidad de las parcelas (menú de capas). */
function aplicarCapas(map: maplibregl.Map, fondo: Fondo, verParcelas: boolean) {
  if (!map.getLayer("parcelas-poligonos")) return;
  map.setLayoutProperty("base", "visibility", fondo === "oscuro" ? "visible" : "none");
  map.setLayoutProperty("satelite", "visibility", fondo === "satelite" ? "visible" : "none");
  CAPAS_PARCELAS.forEach((id) => map.setLayoutProperty(id, "visibility", verParcelas ? "visible" : "none"));
}

/** Ancho (px) que tapa la tarjeta de la parcela en el lado derecho del mapa; 0 si no hay tarjeta. */
function anchoTapado(el: HTMLElement): number {
  const area = el.closest<HTMLElement>(".map-area");
  const tarjeta = area?.querySelector<HTMLElement>(".parcel-card");
  if (!area || !tarjeta) return 0;
  // offsetLeft no cambia con la animación de entrada de la tarjeta (que usa transform).
  return Math.max(0, area.clientWidth - tarjeta.offsetLeft + MARGEN_TARJETA);
}

// ---- Componente
interface Props {
  estado?: string;
  parcelaSeleccionada?: string;
  parcelas?: Parcela[];
  onEstado: (estado: string) => void;
  onParcela: (id: string) => void;
  /** Si se pasa, aparece el botón para volver al inicio cuando hay una selección activa. */
  onVolver?: () => void;
}

interface Tip { x: number; y: number; titulo: string; detalle: string }

export function MapaEstudio({ estado, parcelaSeleccionada, parcelas, onEstado, onParcela, onVolver }: Props) {
  const geoEstados = useEstadosGeo();
  const geoParcelas = useParcelasGeo();
  const contenedor = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [modoNoche, setModoNoche] = useState(false);
  const [fondo, setFondo] = useState<Fondo>("oscuro");
  const [verParcelas, setVerParcelas] = useState(true);
  const [verEtiquetas, setVerEtiquetas] = useState(true);
  const [menuCapas, setMenuCapas] = useState(false);
  const mapa = useRef<maplibregl.Map | null>(null);

  // `.datos` es estable entre renders; el objeto Recurso no lo es (se crea de nuevo en cada render).
  const dEstados = geoEstados.datos, dParcelas = geoParcelas.datos;
  const datos = useMemo<Datos | null>(
    () => (dEstados && dParcelas && parcelas ? prepararDatos(parcelas, dEstados, dParcelas) : null),
    [dEstados, dParcelas, parcelas],
  );

  // Las funciones del mapa viven en un efecto que solo corre al tener datos; leen las props actuales de aquí.
  const actual = useRef({ estado, parcela: parcelaSeleccionada, onEstado, onParcela });
  useEffect(() => { actual.current = { estado, parcela: parcelaSeleccionada, onEstado, onParcela }; });
  const prefs = useRef({ modoNoche, fondo, verParcelas });
  useEffect(() => { prefs.current = { modoNoche, fondo, verParcelas }; });
  const encuadrar = useRef<((animar: boolean) => void) | null>(null);
  const centrarRegion = useRef<((animar: boolean) => void) | null>(null);
  const detenerGiro = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!datos || !contenedor.current) return;
    const el = contenedor.current;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = new maplibregl.Map({
      container: el, style: ESTILO, center: VISTA.center, zoom: VISTA.zoom, attributionControl: false, maxPitch: 60,
    });
    mapa.current = map;
    map.on("error", (e) => console.error("MapLibre:", e.error?.message ?? e));

    let usuario = false;          // el usuario tocó el mapa: se detiene el giro hasta que regrese al nivel 0
    let hoverActivo = false;
    let hoverCve: string | null = null;
    let raf = 0;
    const marcadores: { marcador: maplibregl.Marker; el: HTMLElement; lngLat: [number, number]; ancla: Ancla }[] = [];
    detenerGiro.current = () => { usuario = true; };

    const marcarEstado = (cve: string | null) => {
      if (cve === hoverCve) return;
      if (hoverCve !== null) map.setFeatureState({ source: "estados", id: hoverCve }, { hover: false });
      hoverCve = cve;
      if (cve !== null) map.setFeatureState({ source: "estados", id: cve }, { hover: true });
    };

    // Oculta los nombres que chocarían con uno de mayor prioridad (los marcadores HTML no evitan colisiones solos).
    let acomodoPendiente = false;
    const acomodarEtiquetas = () => {
      acomodoPendiente = false;
      const puestas: { x0: number; y0: number; x1: number; y1: number }[] = [];
      for (const m of marcadores) {
        const p = map.project(m.lngLat), w = m.el.offsetWidth, h = m.el.offsetHeight;
        const x0 = m.ancla === "left" ? p.x : p.x - w / 2;
        const y0 = m.ancla === "bottom" ? p.y - h : m.ancla === "top" ? p.y : p.y - h / 2;
        const caja = { x0: x0 - MARGEN_ETIQUETAS, y0: y0 - MARGEN_ETIQUETAS, x1: x0 + w + MARGEN_ETIQUETAS, y1: y0 + h + MARGEN_ETIQUETAS };
        const choca = puestas.some((b) => caja.x0 < b.x1 && caja.x1 > b.x0 && caja.y0 < b.y1 && caja.y1 > b.y0);
        m.el.classList.toggle("is-oculta", choca);
        if (!choca) puestas.push(caja);
      }
    };
    const pedirAcomodo = () => {
      if (acomodoPendiente) return;
      acomodoPendiente = true;
      requestAnimationFrame(acomodarEtiquetas);
    };

    encuadrar.current = (animar) => {
      if (!map.getLayer("parcela-seleccion")) return;
      const { estado: e, parcela: p } = actual.current;
      const duration = animar && !reducido ? 1400 : 0;
      map.setFilter("parcela-seleccion", ["==", ["get", "id"], p ?? ""]);
      map.setFilter("estado-seleccion", ["==", ["get", "nombre"], e ?? ""]);
      const par = p ? datos.porId.get(p) : undefined;
      if (par) {
        usuario = true;
        // La tarjeta tapa el lado derecho: la parcela se centra en el espacio libre de la izquierda.
        map.flyTo({ center: [par.lon, par.lat], zoom: ZOOM_PARCELA, duration, offset: [-anchoTapado(el) / 2, 0] });
      } else if (e && datos.cajas[e]) {
        usuario = true;
        map.fitBounds(datos.cajas[e], { padding: 90, duration, maxZoom: 11 });
      } else {
        usuario = false;
        map.flyTo({ center: VISTA.center, zoom: VISTA.zoom, duration });
      }
    };

    // Siempre encuadra el estado, incluso si hay una parcela abierta.
    // Sirve para recuperar el contexto territorial sin cambiar la selección ni la ruta.
    centrarRegion.current = (animar) => {
      const e = actual.current.estado;
      if (!e || !datos.cajas[e]) return;
      usuario = true;
      map.fitBounds(datos.cajas[e], {
        padding: { top: 90, bottom: 90, left: 90, right: 90 + anchoTapado(el) },
        duration: animar && !reducido ? 1000 : 0, maxZoom: 11,
      });
    };

    map.on("load", () => {
      try { map.setProjection({ type: "globe" }); } catch (e) { console.warn(e); }
      try {
        map.setSky(cielo(prefs.current.modoNoche));
      } catch (e) { console.warn("Sin atmósfera:", e); }

      const geojson = (d: unknown) => d as GeoJSONSourceSpecification["data"];
      map.addSource("estados", { type: "geojson", data: geojson(datos.estados), promoteId: "cve" });
      map.addSource("poligonos", { type: "geojson", data: geojson(datos.poligonos) });
      map.addSource("puntos", { type: "geojson", data: geojson(datos.puntos) });

      const hover: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
      map.addLayer({
        id: "estados-relleno", type: "fill", source: "estados",
        paint: {
          "fill-color": rampa("media", ...datos.rangoEstados),
          "fill-opacity": ["interpolate", ["linear"], ["zoom"],
            5, ["case", hover, 0.8, 0.6], 9, ["case", hover, 0.3, 0.1]],
        },
      });
      map.addLayer({
        id: "estados-borde", type: "line", source: "estados",
        paint: { "line-color": ["case", hover, AMBAR, "#9fb0b5"], "line-width": ["case", hover, 2.5, 1.4], "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "estado-seleccion", type: "line", source: "estados", filter: ["==", ["get", "nombre"], ""],
        paint: { "line-color": AMBAR, "line-width": 2.5 },
      });
      aplicarModoNoche(map, datos, prefs.current.modoNoche);
      map.addLayer({
        id: "parcelas-poligonos", type: "fill", source: "poligonos", minzoom: 8,
        paint: { "fill-color": rampa("pred", ...datos.rangoPred), "fill-opacity": 0.85 },
      });
      map.addLayer({
        id: "parcelas-borde", type: "line", source: "poligonos", minzoom: 8,
        paint: { "line-color": "#101a1d", "line-width": 0.6 },
      });
      map.addLayer({
        id: "parcelas-puntos", type: "circle", source: "puntos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5],
          "circle-color": rampa("pred", ...datos.rangoPred),
          // Anillo claro = parcela por predecir (las de entrenamiento llevan anillo oscuro).
          "circle-stroke-color": ["match", ["get", "conjunto"], "PREDICCION", "#edf0ee", "#0b0e11"],
          "circle-stroke-width": 0.9,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 1, 10, 0],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 8, 1, 10, 0],
        },
      });
      map.addLayer({
        id: "parcela-seleccion", type: "line", source: "poligonos", filter: ["==", ["get", "id"], ""],
        paint: { "line-color": AMBAR, "line-width": 3 },
      });
      aplicarCapas(map, prefs.current.fondo, prefs.current.verParcelas);

      datos.etiquetas.forEach(({ nombre, lngLat, ancla }) => {
        const d = document.createElement("div");
        d.className = "globe-label";
        d.textContent = nombre;
        const marcador = new maplibregl.Marker({ element: d, anchor: ancla, subpixelPositioning: true }).setLngLat(lngLat).addTo(map);
        marcadores.push({ marcador, el: d, lngLat, ancla });
      });
      map.on("move", pedirAcomodo);
      pedirAcomodo();

      const cerca = () => el.classList.toggle("is-cerca", map.getZoom() >= 8);
      map.on("zoom", cerca);
      cerca();

      map.on("mousemove", (e) => {
        const enNivel0 = !actual.current.estado;
        const capas = enNivel0 ? ["estados-relleno"] : ["parcelas-poligonos", "parcelas-puntos"];
        const f = map.queryRenderedFeatures(e.point, { layers: capas })[0];
        map.getCanvas().style.cursor = f ? "pointer" : "";
        hoverActivo = !!f;
        if (!f) { marcarEstado(null); setTip(null); return; }
        if (enNivel0) {
          const pr = f.properties as { cve: string; nombre: string; n: number; media: number | null };
          marcarEstado(pr.cve);
          setTip({ x: e.point.x, y: e.point.y, titulo: pr.nombre,
            detalle: `${pr.n} parcelas · ${num(pr.media)} t/ha` });
        } else {
          const pr = f.properties as { id: string; pred: number | null; conjunto: string | null };
          setTip({ x: e.point.x, y: e.point.y, titulo: pr.id,
            detalle: `${num(pr.pred, 2)} t/ha · ${pr.conjunto === "PREDICCION" ? "Predicción" : "Entrenamiento"}` });
        }
      });
      map.getCanvas().addEventListener("mouseleave", () => { hoverActivo = false; marcarEstado(null); setTip(null); });

      map.on("click", (e) => {
        setMenuCapas(false);
        const { estado: est, onEstado: irEstado, onParcela: irParcela } = actual.current;
        if (!est) {
          const f = map.queryRenderedFeatures(e.point, { layers: ["estados-relleno"] })[0];
          if (f) irEstado((f.properties as { nombre: string }).nombre);
        } else {
          const f = map.queryRenderedFeatures(e.point, { layers: ["parcelas-poligonos", "parcelas-puntos"] })[0];
          if (f) irParcela((f.properties as { id: string }).id);
        }
      });

      ["mousedown", "touchstart", "wheel"].forEach((ev) => map.on(ev as "mousedown", () => { usuario = true; }));

      encuadrar.current?.(false);   // enlaces directos: abre ya encuadrado, sin animación

      let ultimo = performance.now(), dir = 1;
      const girar = (t: number) => {
        const dt = (t - ultimo) / 1000; ultimo = t;
        if (!reducido && !actual.current.estado && !usuario && !hoverActivo && !map.isMoving()) {
          const c = map.getCenter();
          let lng = c.lng + dir * GIRO_GRADOS_POR_SEG * dt;
          if (lng > LIMITES_GIRO[1]) dir = -1;
          if (lng < LIMITES_GIRO[0]) dir = 1;
          map.jumpTo({ center: [lng, c.lat] });
        }
        raf = requestAnimationFrame(girar);
      };
      raf = requestAnimationFrame(girar);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      marcadores.forEach((m) => m.marcador.remove());
      encuadrar.current = null;
      centrarRegion.current = null;
      detenerGiro.current = null;
      mapa.current = null;
      map.remove();
    };
  }, [datos]);

  // La cámara sigue a la ruta.
  useEffect(() => { encuadrar.current?.(true); }, [estado, parcelaSeleccionada]);

  // Solo cambia la presentación del globo; no modifica capas, parcelas ni datos agrícolas.
  useEffect(() => {
    try {
      if (!mapa.current || !datos) return;
      mapa.current.setSky(cielo(modoNoche));
      aplicarModoNoche(mapa.current, datos, modoNoche);
    } catch { /* el mapa aún no terminó de cargar */ }
  }, [datos, modoNoche]);

  useEffect(() => {
    try { if (mapa.current) aplicarCapas(mapa.current, fondo, verParcelas); } catch { /* aún cargando */ }
  }, [fondo, verParcelas]);

  // Esc cierra el menú de capas.
  useEffect(() => {
    if (!menuCapas) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuCapas(false); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [menuCapas]);

  const zoom = (dentro: boolean) => {
    const m = mapa.current;
    if (!m) return;
    detenerGiro.current?.();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300;
    if (dentro) m.zoomIn({ duration }); else m.zoomOut({ duration });
  };

  const fallo = geoEstados.estado === "error" ? geoEstados : geoParcelas.estado === "error" ? geoParcelas : null;
  const cargando = !datos && !fallo;

  return (
    <div className={`globe-wrap${modoNoche ? " is-night" : ""}${verEtiquetas ? "" : " sin-etiquetas"}`}>
      <div className="globe-space" />
      {modoNoche && <div className="globe-night-lights" aria-hidden="true" />}
      <div ref={contenedor} className="globe-canvas" role="application" aria-label="Globo interactivo de la zona de estudio" />
      {tip && (
        <div className="globe-tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <strong>{tip.titulo}</strong><span>{tip.detalle}</span>
        </div>
      )}

      <div className="map-controls">
        <button type="button" aria-label="Acercar" title="Acercar" onClick={() => zoom(true)}>+</button>
        <button type="button" aria-label="Alejar" title="Alejar" onClick={() => zoom(false)}>−</button>
        <button type="button" aria-label="Capas del mapa" title="Capas" aria-expanded={menuCapas}
          className={menuCapas ? "is-activo" : ""} onClick={() => setMenuCapas((a) => !a)}>
          <Icon name="layers" size={17} />
        </button>
      </div>
      {menuCapas && (
        <div className="map-capas" role="dialog" aria-label="Capas del mapa">
          <fieldset>
            <legend>Mapa base</legend>
            <label><input type="radio" name="fondo" checked={fondo === "oscuro"} onChange={() => setFondo("oscuro")} /> Oscuro</label>
            <label><input type="radio" name="fondo" checked={fondo === "satelite"} onChange={() => setFondo("satelite")} /> Satélite</label>
          </fieldset>
          <fieldset>
            <legend>Capas</legend>
            <label><input type="checkbox" checked={verParcelas} onChange={(e) => setVerParcelas(e.target.checked)} /> Parcelas</label>
            <label><input type="checkbox" checked={verEtiquetas} onChange={(e) => setVerEtiquetas(e.target.checked)} /> Nombres de estados</label>
          </fieldset>
          <fieldset>
            <legend>Presentación</legend>
            <label><input type="checkbox" checked={modoNoche} onChange={(e) => setModoNoche(e.target.checked)} /> Modo noche <small>solo visual</small></label>
          </fieldset>
        </div>
      )}

      {onVolver && (estado || parcelaSeleccionada) && (
        <div className="globe-actions" aria-label="Controles de navegación del mapa">
          <button type="button" className="globe-action" onClick={() => centrarRegion.current?.(true)}>
            ⊙ Centrar región
          </button>
          <button type="button" className="globe-action globe-action--primary" onClick={onVolver}>
            ← Volver al inicio
          </button>
        </div>
      )}
      {cargando && <div className="globe-aviso">Cargando mapa…</div>}
      {fallo && (
        <div className="globe-aviso" role="alert">
          No se pudo cargar el mapa: {fallo.error?.message}
          <button type="button" onClick={fallo.reintentar}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
