/**
 * Mapa de la zona de estudio: globo interactivo (MapLibre) con tres niveles de zoom.
 *   nivel 0  Tierra girando; hover y clic en un estado → onEstado(nombre)
 *   nivel 1  estado seleccionado: encuadra sus parcelas; clic en parcela → onParcela(id)
 *   nivel 2  parcela seleccionada: acerca la cámara y resalta el polígono con borde ámbar
 * La cámara sigue a las props `estado` y `parcelaSeleccionada` (que vienen de la ruta), así que el botón
 * "atrás" del navegador y los enlaces directos funcionan igual que un clic.
 *
 * Datos (solo por src/data/hooks.ts): parcelas.json (pred, lat, lon), parcelas.geojson y estados.geojson.
 * Los colores de MapLibre no leen variables CSS; los literales de abajo salen de src/styles/tokens.css.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { ExpressionSpecification, GeoJSONSourceSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEstadosGeo, useParcelasGeo } from "../../data/hooks";
import type { ColeccionGeo, Parcela, PropsEstado, PropsParcelaGeo } from "../../data/tipos";
import { num } from "../../lib/formato";

// ---- Constantes visuales
const AMBAR = "#dca93a";                       // --amber
const COLOR_BAJO = "#1d423d";                  // mismo degradado que .gradient-key en territorio.css
const COLOR_ALTO = "#65a998";
const COLOR_SIN_DATO = "#3a444b";              // --line-strong
/** Mapa base sin llave. Para imagen satelital cambia `Canvas/World_Dark_Gray_Base` por `World_Imagery`. */
const TESELAS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const VISTA = { center: [-98.3, 19.6] as [number, number], zoom: 3.4 };
const ZOOM_PARCELA = 14;
const GIRO_GRADOS_POR_SEG = 1.5;
const LIMITES_GIRO: [number, number] = [-108, -88];   // el globo oscila entre estas longitudes

const ESTILO: StyleSpecification = {
  version: 8,
  sources: { base: { type: "raster", tiles: [TESELAS], tileSize: 256, maxzoom: 16 } },
  layers: [
    { id: "fondo", type: "background", paint: { "background-color": "#0e1519" } },
    { id: "base", type: "raster", source: "base" },
  ],
};

// ---- Preparación de datos (se hace una vez por carga)
type Caja = [[number, number], [number, number]];

function primerVertice(c: unknown): number[] {
  let x = c as unknown[];
  while (Array.isArray(x[0])) x = x[0] as unknown[];
  return x as number[];
}

const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

function prepararDatos(parcelas: Parcela[], est: ColeccionGeo<PropsEstado>, geo: ColeccionGeo<PropsParcelaGeo>) {
  // Comprobación de coordenadas: si salen en metros, el exportador olvidó pasar a EPSG:4326.
  const v = est.features[0] ? primerVertice(est.features[0].geometry.coordinates) : [0, 0];
  if (Math.abs(v[0]) > 180 || Math.abs(v[1]) > 90) {
    console.warn("estados.geojson no está en lon/lat (grados). Primer vértice:", v);
  }

  const porEstado = new Map<string, Parcela[]>();
  parcelas.forEach((p) => porEstado.set(p.estado, [...(porEstado.get(p.estado) ?? []), p]));

  const cajas: Record<string, Caja> = {};
  const etiquetas: { nombre: string; lngLat: [number, number] }[] = [];
  porEstado.forEach((l, nombre) => {
    const lons = l.map((p) => p.lon), lats = l.map((p) => p.lat);
    cajas[nombre] = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
    etiquetas.push({ nombre, lngLat: [media(lons), media(lats)] });
  });

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

// ---- Componente
interface Props {
  estado?: string;
  parcelaSeleccionada?: string;
  parcelas?: Parcela[];
  onEstado: (estado: string) => void;
  onParcela: (id: string) => void;
  /** Si se pasa, aparece el botón "Regresar" cuando hay un estado o una parcela seleccionados. */
  onVolver?: () => void;
}

interface Tip { x: number; y: number; titulo: string; detalle: string }

export function MapaEstudio({ estado, parcelaSeleccionada, parcelas, onEstado, onParcela, onVolver }: Props) {
  const geoEstados = useEstadosGeo();
  const geoParcelas = useParcelasGeo();
  const contenedor = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // `.datos` es estable entre renders; el objeto Recurso no lo es (se crea de nuevo en cada render).
  const dEstados = geoEstados.datos, dParcelas = geoParcelas.datos;
  const datos = useMemo<Datos | null>(
    () => (dEstados && dParcelas && parcelas ? prepararDatos(parcelas, dEstados, dParcelas) : null),
    [dEstados, dParcelas, parcelas],
  );

  // Las funciones del mapa viven en un efecto que solo corre al tener datos; leen las props actuales de aquí.
  const actual = useRef({ estado, parcela: parcelaSeleccionada, onEstado, onParcela });
  useEffect(() => { actual.current = { estado, parcela: parcelaSeleccionada, onEstado, onParcela }; });
  const encuadrar = useRef<((animar: boolean) => void) | null>(null);

  useEffect(() => {
    if (!datos || !contenedor.current) return;
    const el = contenedor.current;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = new maplibregl.Map({
      container: el, style: ESTILO, center: VISTA.center, zoom: VISTA.zoom, attributionControl: false, maxPitch: 60,
    });
    map.on("error", (e) => console.error("MapLibre:", e.error?.message ?? e));

    let usuario = false;          // el usuario tocó el mapa: se detiene el giro hasta que regrese al nivel 0
    let hoverActivo = false;
    let hoverCve: string | null = null;
    let raf = 0;
    const marcadores: maplibregl.Marker[] = [];

    const marcarEstado = (cve: string | null) => {
      if (cve === hoverCve) return;
      if (hoverCve !== null) map.setFeatureState({ source: "estados", id: hoverCve }, { hover: false });
      hoverCve = cve;
      if (cve !== null) map.setFeatureState({ source: "estados", id: cve }, { hover: true });
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
        map.flyTo({ center: [par.lon, par.lat], zoom: ZOOM_PARCELA, duration });
      } else if (e && datos.cajas[e]) {
        usuario = true;
        map.fitBounds(datos.cajas[e], { padding: 90, duration, maxZoom: 11 });
      } else {
        usuario = false;
        map.flyTo({ center: VISTA.center, zoom: VISTA.zoom, duration });
      }
    };

    map.on("load", () => {
      try { map.setProjection({ type: "globe" }); } catch (e) { console.warn(e); }
      try {
        map.setSky({
          "sky-color": "#1b3a73", "horizon-color": "#7fb3d9", "fog-color": "#0b0e11",
          "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.5, "fog-ground-blend": 0.2,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
        });
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

      datos.etiquetas.forEach(({ nombre, lngLat }) => {
        const d = document.createElement("div");
        d.className = "globe-label";
        d.textContent = nombre;
        marcadores.push(new maplibregl.Marker({ element: d }).setLngLat(lngLat).addTo(map));
      });

      map.on("zoom", () => el.classList.toggle("is-cerca", map.getZoom() >= 8));

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
      marcadores.forEach((m) => m.remove());
      encuadrar.current = null;
      map.remove();
    };
  }, [datos]);

  // La cámara sigue a la ruta.
  useEffect(() => { encuadrar.current?.(true); }, [estado, parcelaSeleccionada]);

  const fallo = geoEstados.estado === "error" ? geoEstados : geoParcelas.estado === "error" ? geoParcelas : null;
  const cargando = !datos && !fallo;

  return (
    <div className="globe-wrap">
      <div className="globe-space" />
      <div ref={contenedor} className="globe-canvas" role="application" aria-label="Globo interactivo de la zona de estudio" />
      {tip && (
        <div className="globe-tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <strong>{tip.titulo}</strong><span>{tip.detalle}</span>
        </div>
      )}
      {onVolver && (estado || parcelaSeleccionada) && (
        <button type="button" className="globe-back" onClick={onVolver}>← Regresar</button>
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
