/**
 * 05 · Para qué sirve: uso en inclusión financiera (reporte, sección 6), ligado al mapa del dashboard.
 * Ilustración: las parcelas reales sobre un "terreno" en perspectiva, con un pin por estado que abre el mapa
 * en ese estado. Cada caso de uso resalta algo distinto: zonas, una parcela de ejemplo o la zona de menor rendimiento.
 * Datos: parcelas.json, meta.json y estados.geojson (opcional).
 */
import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Ruta } from "../../../app/ruta";
import { Icon, type IconName } from "../../../components/ui";
import type { ColeccionGeo, MetaModelo, Parcela, PropsEstado } from "../../../data/tipos";
import { fechaLarga, num } from "../../../lib/formato";
import { Revelar } from "../animacion";
import { Encabezado } from "../comunes";
import { colorRampa, prom, type Resumen } from "../datos";
import "./uso.css";

type Uso = "zona" | "ingreso" | "seguro";

const W = 640, H = 470;
const GIRO = (-24 * Math.PI) / 180, APLASTE = 0.52;   // perspectiva: giro del terreno y aplanado vertical

export function Cierre({ res, meta, parcelas, estadosGeo, navegar }: {
  res: Resumen; meta: MetaModelo; parcelas: Parcela[]; estadosGeo?: ColeccionGeo<PropsEstado>; navegar: (r: Ruta) => void;
}) {
  const [uso, setUso] = useState<Uso>("zona");
  const esc = useEscena(parcelas, res, estadosGeo);
  const ejemplo = esc.ejemplo;
  const ton = meta.q80 * res.areaMedia;
  const irEstado = (e: string) => navegar({ vista: "mapa", estado: e });
  const irParcela = (id: string) => navegar({ vista: "mapa", parcela: id });

  const usos: { id: Uso; icono: IconName; titulo: string; texto: string; accion: string; ir: () => void }[] = [
    { id: "zona", icono: "map", titulo: "Riesgo de crédito por zona",
      texto: `Ubica el nivel de rendimiento de cada zona con un error de ~${num(meta.cv_aleatorio.rmse, 1)} t/ha (${num((100 * meta.cv_aleatorio.rmse) / meta.media_general_entren, 0)} % de la media) para fijar montos y calendarios de pago.`,
      accion: "Explorar por estado", ir: () => navegar({ vista: "mapa" }) },
    { id: "ingreso", icono: "coins", titulo: "Ingreso estimado con rango",
      texto: `Rendimiento × superficie × precio, siempre con el intervalo al 80 %. En una parcela de ${num(res.areaMedia, 1)} ha (la media), ± ${num(meta.q80, 2)} t/ha equivalen a ± ${num(ton, 1)} toneladas.`,
      accion: ejemplo ? `Calcular el ingreso de ${ejemplo.p.id}` : "Abrir una parcela", ir: () => (ejemplo ? irParcela(ejemplo.p.id) : navegar({ vista: "mapa" })) },
    { id: "seguro", icono: "shield", titulo: "Seguros y visitas de campo",
      texto: "La estimación por zona y los intervalos ayudan a calibrar umbrales de pérdida y a priorizar qué parcelas verificar en campo.",
      accion: esc.estadoBajo ? `Revisar ${esc.estadoBajo.nombre}` : "Abrir el mapa", ir: () => (esc.estadoBajo ? irEstado(esc.estadoBajo.nombre) : navegar({ vista: "mapa" })) },
  ];
  const actual = usos.find((u) => u.id === uso)!;

  const teclaPin = (e: KeyboardEvent, estado: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); irEstado(estado); }
  };

  return (
    <section id="uso" className="seccion uso" aria-labelledby="uso-titulo">
      <div className="contenedor">
        <Encabezado numero="05" eyebrow="Para qué sirve" icono="bank" titulo={<span id="uso-titulo">Del satélite al crédito agrícola</span>}>
          Datos públicos convertidos en una estimación por parcela, antes de la cosecha y con su rango. Toca un estado en la
          ilustración para abrirlo en el mapa.
        </Encabezado>

        <div className="uso__grid">
          <Revelar efecto="izq" className="uso__escena-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className={`uso__escena uso__escena--${uso}`} role="group" aria-label="Mapa ilustrado de las parcelas con acceso a cada estado">
              <defs>
                <clipPath id="uso-terreno"><path d={esc.terreno} /></clipPath>
                <linearGradient id="uso-flujo" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--s1)" /><stop offset="1" stopColor="var(--amber)" />
                </linearGradient>
              </defs>

              {/* Flujo: satélite → terreno → institución */}
              <path d={`M92 70 Q ${esc.centro[0] - 120} 90 ${esc.centro[0] - 40} ${esc.centro[1] - 40}`} className="uso__flujo" />
              <path d={`M${esc.centro[0] + 60} ${esc.centro[1] - 50} Q ${W - 150} 80 ${W - 92} 70`} className="uso__flujo uso__flujo--2" />
              <g transform="translate(66 44)" className="uso__nodo"><circle cx="26" cy="26" r="26" /><g transform="translate(13 13)"><Icon name="satellite" size={26} /></g></g>
              <g transform={`translate(${W - 118} 44)`} className="uso__nodo uso__nodo--banco"><circle cx="26" cy="26" r="26" /><g transform="translate(13 13)"><Icon name="bank" size={26} /></g></g>
              <text x="92" y="120" textAnchor="middle" className="uso__nodo-texto">Sentinel-2</text>
              <text x={W - 92} y="120" textAnchor="middle" className="uso__nodo-texto">Crédito y seguro</text>

              {/* Terreno con grosor */}
              <path d={esc.terreno} transform="translate(0 16)" className="uso__terreno-lado" />
              <path d={esc.terreno} className="uso__terreno" />
              <g clipPath="url(#uso-terreno)">
                {esc.estados.map((e) => (
                  <path key={e.nombre} d={e.d} className="uso__estado" style={{ "--relleno": e.color } as CSSProperties} />
                ))}
                {esc.puntos.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r="2.6" style={{ fill: p.color }} className="uso__punto" />)}
              </g>

              {/* Seguro: zona de menor rendimiento */}
              {esc.estadoBajo && (
                <g className="uso__capa uso__capa--seguro" aria-hidden={uso !== "seguro"}>
                  <ellipse cx={esc.estadoBajo.x} cy={esc.estadoBajo.y} rx="78" ry="40" className="uso__alerta" />
                  <g transform={`translate(${esc.estadoBajo.x + 70} ${esc.estadoBajo.y - 34})`} className="uso__escudo">
                    <circle cx="16" cy="16" r="20" /><g transform="translate(4 4)"><Icon name="shield" size={24} /></g>
                  </g>
                </g>
              )}

              {/* Pines por estado: abren el mapa en ese estado */}
              {esc.pines.map((pin, i) => (
                <g key={pin.nombre} className="uso__pin" role="link" tabIndex={0}
                  aria-label={`Abrir ${pin.nombre} en el mapa: ${pin.n} parcelas, ${num(pin.media, 2)} t/ha en promedio`}
                  onClick={() => irEstado(pin.nombre)} onKeyDown={(e) => teclaPin(e, pin.nombre)}
                  style={{ "--i": i } as CSSProperties}>
                  <ellipse cx={pin.x} cy={pin.y} rx="14" ry="7" className="uso__pin-sombra" />
                  <ellipse cx={pin.x} cy={pin.y} rx="14" ry="7" className="uso__pin-onda" />
                  <line x1={pin.x} y1={pin.y} x2={pin.x} y2={pin.y - pin.alto} className="uso__pin-palo" />
                  <g transform={`translate(${pin.x} ${pin.y - pin.alto})`}>
                    <rect x="-66" y="-46" width="132" height="46" rx="12" className="uso__pin-caja" />
                    <text y="-27" textAnchor="middle" className="uso__pin-nombre">{pin.nombre}</text>
                    <text y="-10" textAnchor="middle" className="uso__pin-dato">{pin.n} parcelas · {num(pin.media, 2)} t/ha</text>
                  </g>
                </g>
              ))}
              {/* Ingreso: parcela de ejemplo */}
              {ejemplo && (
                <g className="uso__capa uso__capa--ingreso" aria-hidden={uso !== "ingreso"}>
                  <circle cx={ejemplo.x} cy={ejemplo.y} r="9" className="uso__anillo" />
                  <line x1={ejemplo.x} y1={ejemplo.y} x2={ejemplo.x + 60} y2={ejemplo.y + 40} className="uso__guia" />
                  <g transform={`translate(${Math.min(W - 210, ejemplo.x + 60)} ${Math.min(H - 70, ejemplo.y + 40)})`}>
                    <rect width="200" height="64" rx="12" className="uso__tarjeta" />
                    <text x="14" y="24" className="uso__tarjeta-t">{ejemplo.p.id} · {num(ejemplo.p.area_ha, 1)} ha</text>
                    <text x="14" y="46" className="uso__tarjeta-v">{num(ejemplo.p.pred * ejemplo.p.area_ha, 1)} t ± {num(meta.q80 * ejemplo.p.area_ha, 1)}</text>
                  </g>
                </g>
              )}

            </svg>
            <div className="uso__leyenda">
              <span>{num(esc.lo, 1)} t/ha</span><i style={{ background: `linear-gradient(90deg, ${colorRampa(0)}, ${colorRampa(1)})` }} /><span>{num(esc.hi, 1)} t/ha</span>
              <small>Cada punto es una parcela real, coloreada por su rendimiento estimado.</small>
            </div>
          </Revelar>

          <div className="uso__lado">
            <div className="uso__casos" role="tablist" aria-label="Casos de uso">
              {usos.map((u) => (
                <button key={u.id} type="button" role="tab" aria-selected={uso === u.id}
                  className={`uso__caso${uso === u.id ? " is-activo" : ""}`} onClick={() => setUso(u.id)} onMouseEnter={() => setUso(u.id)}>
                  <span className="uso__caso-icono"><Icon name={u.icono} size={20} /></span>
                  <span className="uso__caso-texto"><b>{u.titulo}</b><small>{u.texto}</small></span>
                </button>
              ))}
            </div>
            <button type="button" className="boton boton--primario uso__accion" onClick={actual.ir}>
              {actual.accion} <Icon name="chevron" size={17} />
            </button>
          </div>
        </div>

        <Revelar efecto="zoom" className="cta">
          <div className="cta__texto">
            <span className="cta__icono"><Icon name="location" size={26} /></span>
            <div>
              <h3>Explora las {res.n} parcelas</h3>
              <p>Abre el mapa, elige una parcela y mira su estimación, su intervalo, la cascada del modelo, su curva de NDVI y el simulador biofísico.</p>
            </div>
          </div>
          <div className="uso__cta-estados">
            {esc.pines.map((p) => <button key={p.nombre} type="button" className="boton boton--chico" onClick={() => irEstado(p.nombre)}>{p.nombre}</button>)}
            <button type="button" className="boton boton--primario boton--grande" onClick={() => navegar({ vista: "mapa" })}>
              Abrir el mapa <Icon name="chevron" size={18} />
            </button>
          </div>
        </Revelar>

        <footer className="pie">
          <span><Icon name="leaf" size={15} /> AgroCebada · Reto FIRA 2026</span>
          <span>Datos generados el {fechaLarga(meta.generado)} · {meta.fuente}</span>
          <span>Las cifras de comparación de variantes provienen del reporte técnico del equipo.</span>
        </footer>
      </div>
    </section>
  );
}

// ---- Geometría de la escena
function useEscena(parcelas: Parcela[], res: Resumen, estadosGeo?: ColeccionGeo<PropsEstado>) {
  return useMemo(() => {
    const lons = parcelas.map((p) => p.lon), lats = parcelas.map((p) => p.lat);
    const pad = 0.12;
    const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
    const dx = (x1 - x0) * pad, dy = (y1 - y0) * pad;
    const [a0, a1, b0, b1] = [x0 - dx, x1 + dx, y0 - dy, y1 + dy];
    const kx = Math.cos(((b0 + b1) / 2) * (Math.PI / 180));
    const ancho = (a1 - a0) * kx, alto = b1 - b0;
    const s = Math.min(380 / ancho, 380 / alto);
    const cx = W / 2, cy = H / 2 + 50;

    // lon/lat → plano → girado y aplanado (perspectiva)
    const xy = (lon: number, lat: number): [number, number] => {
      const px = ((lon - (a0 + a1) / 2) * kx) * s, py = ((b0 + b1) / 2 - lat) * s;
      return [cx + px * Math.cos(GIRO) - py * Math.sin(GIRO), cy + (px * Math.sin(GIRO) + py * Math.cos(GIRO)) * APLASTE];
    };
    const camino = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
    const terreno = camino([xy(a0, b1), xy(a1, b1), xy(a1, b0), xy(a0, b0)]);

    const preds = parcelas.map((p) => p.pred);
    const lo = Math.min(...preds), hi = Math.max(...preds);
    const t = (v: number) => (v - lo) / (hi - lo || 1);

    const pines = res.estados.map((nombre) => {
      const ps = parcelas.filter((p) => p.estado === nombre);
      const [x, y] = xy(prom(ps.map((p) => p.lon)), prom(ps.map((p) => p.lat)));
      return { nombre, x, y, n: ps.length, media: prom(ps.map((p) => p.pred)) };
    }).sort((a, b) => a.y - b.y)   // los de atrás se dibujan primero
      .map((p) => ({ ...p, alto: 58 }));
    // Etiquetas sin encimarse: si dos cajas chocan, se sube el palo de la de atrás.
    for (let i = pines.length - 1; i >= 0; i--) {
      for (let j = i + 1; j < pines.length; j++) {
        const a = pines[i], b = pines[j];
        const choca = Math.abs(a.x - b.x) < 140 && Math.abs((a.y - a.alto) - (b.y - b.alto)) < 60;
        if (choca) a.alto = a.y - (b.y - b.alto - 62);
      }
    }

    const estados = (estadosGeo?.features ?? []).map((f) => {
      const c = f.geometry.coordinates as number[][][] | number[][][][];
      const pols = f.geometry.type === "MultiPolygon" ? (c as number[][][][]) : [c as number[][][]];
      const pin = pines.find((p) => p.nombre === f.properties.nombre);
      return {
        nombre: f.properties.nombre,
        d: pols.flatMap((pol) => pol.map((anillo) => camino(anillo.map(([lo2, la]) => xy(lo2, la))))).join(""),
        color: pin ? colorRampa(t(pin.media)) : "var(--surface-3)",
      };
    });

    const puntos = parcelas.map((p) => {
      const [x, y] = xy(p.lon, p.lat);
      return { id: p.id, x, y, color: colorRampa(t(p.pred)) };
    });

    // Parcela de ejemplo para el ingreso: por predecir y con superficie cercana a la media.
    const cand = parcelas.filter((p) => p.conjunto === "PREDICCION");
    const pe = (cand.length ? cand : parcelas).reduce((m, p) => (Math.abs(p.area_ha - res.areaMedia) < Math.abs(m.area_ha - res.areaMedia) ? p : m));
    const [ex, ey] = xy(pe.lon, pe.lat);
    const bajo = [...pines].sort((a, b) => a.media - b.media)[0];

    return {
      terreno, estados, puntos, pines, lo, hi, centro: [cx, cy] as const,
      ejemplo: { p: pe, x: ex, y: ey },
      estadoBajo: bajo ?? null,
    };
  }, [parcelas, res, estadosGeo]);
}
