/**
 * 02 · Los datos: fuentes, dónde están las parcelas, cuánto rinden y cómo crecen.
 * Datos: parcelas.json, ndvi.json, estados.geojson y meta.json. Fuentes y su uso: reporte.ts (secciones 1.2 y 5.4).
 */
import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "../../../components/ui";
import type { ColeccionGeo, MetaModelo, Parcela, PropsEstado, SerieNdvi } from "../../../data/tipos";
import { fecha, num } from "../../../lib/formato";
import { Revelar, TipGrafico, useTip } from "../animacion";
import { Encabezado, Estatus, Figura, Leyenda, Pestanas } from "../comunes";
import {
  colorEstado, colorRampa, distanciasVecino, histograma, ndviPorEstado, porMunicipio, rmseMediaMunicipal, type BandaNdvi, type Resumen,
} from "../datos";
import { FUENTES, REGISTROS_SATELITALES } from "../reporte";

export function SeccionDatos({ parcelas, res, meta, ndvi, estadosGeo }: {
  parcelas: Parcela[]; res: Resumen; meta: MetaModelo; ndvi?: SerieNdvi; estadosGeo?: ColeccionGeo<PropsEstado>;
}) {
  const munis = useMemo(() => porMunicipio(parcelas), [parcelas]);
  const dist = useMemo(() => distanciasVecino(parcelas), [parcelas]);
  const rmseMuni = rmseMediaMunicipal(munis);

  return (
    <section id="datos" className="seccion seccion--alterna" aria-labelledby="datos-titulo">
      <div className="contenedor">
        <Encabezado numero="02" eyebrow="Los datos" icono="database" titulo={<span id="datos-titulo">Pocas parcelas, muchas imágenes</span>}>
          Más de {num(REGISTROS_SATELITALES, 0)} registros satelitales entre 2022 y 2025, pero solo {res.entren.length} parcelas
          con rendimiento conocido para aprender. Con tan pocas observaciones, cada variable extra aumenta el riesgo de
          sobreajuste, y la validación pesa más que la sofisticación del modelo.
        </Encabezado>

        <div className="fuentes">
          {FUENTES.map((f, i) => (
            <Revelar key={f.nombre} retraso={(i % 4) * 80} className={`fuente fuente--${f.uso}`}>
              <div className="fuente__cabeza"><span className="fuente__icono"><Icon name={f.icono} size={20} /></span><Estatus valor={f.uso} /></div>
              <h3>{f.nombre}</h3>
              <b className="fuente__dato">{f.dato}</b>
              <p>{f.detalle}</p>
            </Revelar>
          ))}
        </div>

        <div className="rejilla-mapa">
          <Revelar efecto="izq">
            <MapaPuntos parcelas={parcelas} res={res} estadosGeo={estadosGeo} />
          </Revelar>
          <div className="columna-datos">
            <Revelar efecto="der" className="dato-grande">
              <span className="dato-grande__icono"><Icon name="neighbors" size={22} /></span>
              <strong>{num(dist.pred, 1)} km</strong>
              <p>es la distancia mediana de una parcela por predecir a la parcela con rendimiento conocido más cercana
                (entre parcelas de entrenamiento: {num(dist.entren, 1)} km).</p>
            </Revelar>
            <Revelar efecto="der" retraso={120} className="dato-grande">
              <span className="dato-grande__icono"><Icon name="location" size={22} /></span>
              <strong>Interpolar, no extrapolar</strong>
              <p>Las {res.pred.length} parcelas del reto están intercaladas con las de entrenamiento. La cercanía entre parcelas
                resultó la señal más fuerte disponible.</p>
            </Revelar>
          </div>
        </div>

        <div className="rejilla-2">
          <Revelar><HistogramaReal res={res} /></Revelar>
          <Revelar retraso={120}>
            <div className="dato-comparado">
              <Icon name="scale" size={22} />
              <h3>El lugar explica la mayor parte</h3>
              <div className="dato-comparado__barras">
                <BarraDato texto="Predecir siempre la media general" valor={meta.rmse_media_global} max={meta.rmse_media_global} />
                <BarraDato texto="Predecir la media de su municipio" valor={rmseMuni} max={meta.rmse_media_global} acento />
              </div>
              <p>Error típico (RMSE, t/ha). Solo con saber el municipio, el error baja{" "}
                <b>{num(100 * (1 - rmseMuni / meta.rmse_media_global), 0)} %</b>. Este cálculo es dentro de la muestra; el modelo
                lo reproduce sin hacer trampa con validación cruzada.</p>
            </div>
          </Revelar>
        </div>

        <Revelar><FranjasMunicipio munis={munis} res={res} /></Revelar>
        {ndvi && <Revelar><CurvasNdvi ndvi={ndvi} parcelas={parcelas} res={res} /></Revelar>}
      </div>
    </section>
  );
}

function BarraDato({ texto, valor, max, acento }: { texto: string; valor: number; max: number; acento?: boolean }) {
  return (
    <div className={`barra-dato${acento ? " barra-dato--acento" : ""}`}>
      <span>{texto}</span>
      <div className="barra-dato__pista"><i style={{ "--w": valor / max } as CSSProperties} /></div>
      <b>{num(valor, 2)}</b>
    </div>
  );
}

// ---- Mapa de puntos
// ---- Mapa de puntos
type Modo = "conjunto" | "rendimiento";

function MapaPuntos({ parcelas, res, estadosGeo }: { parcelas: Parcela[]; res: Resumen; estadosGeo?: ColeccionGeo<PropsEstado> }) {
  const [modo, setModo] = useState<Modo>("conjunto");
  const { contRef, tip, mostrar, ocultar } = useTip();
  const W = 640, H = 440;

  const g = useMemo(() => {
    const lons = parcelas.map((p) => p.lon), lats = parcelas.map((p) => p.lat);
    const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
    const kx = Math.cos(((y0 + y1) / 2) * (Math.PI / 180));
    const ancho = (x1 - x0) * kx, alto = y1 - y0;
    const s = Math.min((W * 0.86) / ancho, (H * 0.86) / alto);
    const ox = (W - ancho * s) / 2, oy = (H - alto * s) / 2;
    const xy = (lon: number, lat: number) => [ox + (lon - x0) * kx * s, oy + (y1 - lat) * s] as const;
    const anillo = (r: number[][]) => `M${r.map(([lo, la]) => xy(lo, la).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;
    const estados = (estadosGeo?.features ?? []).map((f) => {
      const c = f.geometry.coordinates as number[][][] | number[][][][];
      const pols = f.geometry.type === "MultiPolygon" ? (c as number[][][][]) : [c as number[][][]];
      return { nombre: f.properties.nombre, d: pols.flatMap((p) => p.map(anillo)).join("") };
    });
    // Escala de 1 km para la barra de escala
    const km = s * (1 / 111.32);
    const preds = parcelas.map((p) => p.pred);
    return { xy, estados, km, lo: Math.min(...preds), hi: Math.max(...preds) };
  }, [parcelas, estadosGeo]);

  const kmBarra = g.km * 10 > 140 ? 5 : 10;

  return (
    <Figura titulo="Dónde están las parcelas"
      sub="Centroides sobre los límites estatales. Las parcelas por predecir están rodeadas de parcelas conocidas."
      fuente="parcelas.json (lat, lon, conjunto, pred) y estados.geojson"
      acciones={<Pestanas etiqueta="Color de los puntos" valor={modo} onCambio={setModo}
        opciones={[{ valor: "conjunto", texto: "Conjunto" }, { valor: "rendimiento", texto: "Rendimiento" }]} />}>
      {modo === "conjunto"
        ? <Leyenda items={[{ color: "var(--s1)", texto: "Entrenamiento" }, { color: "var(--amber)", texto: "Por predecir" }]} />
        : (
          <div className="leyenda-rampa">
            <span>{num(g.lo, 1)} t/ha</span><i style={{ background: `linear-gradient(90deg, ${colorRampa(0)}, ${colorRampa(1)})` }} /><span>{num(g.hi, 1)} t/ha</span>
          </div>
        )}
      <div className="grafico" ref={contRef} onPointerLeave={ocultar}>
        <svg viewBox={`0 0 ${W} ${H}`} className="mapa-puntos" role="img" aria-label={`Mapa de ${parcelas.length} parcelas`}>
          <defs><clipPath id="mp-marco"><rect width={W} height={H} rx="14" /></clipPath></defs>
          <g clipPath="url(#mp-marco)">
            <rect width={W} height={H} className="mapa-puntos__fondo" />
            {g.estados.map((e) => <path key={e.nombre} d={e.d} className="mapa-puntos__estado" />)}
            {/* Un solo grupo que aparece con fundido, en lugar de animar ~200 puntos por separado */}
            <g className="mapa-puntos__puntos">
              {parcelas.map((p) => {
                const [x, y] = g.xy(p.lon, p.lat);
                const color = modo === "conjunto"
                  ? (p.conjunto === "PREDICCION" ? "var(--amber)" : "var(--s1)")
                  : colorRampa((p.pred - g.lo) / (g.hi - g.lo || 1));
                return (
                  <circle key={p.id} cx={x} cy={y} r={p.conjunto === "PREDICCION" ? 5.5 : 4.5} className="mapa-punto"
                    style={{ fill: color }}
                    onPointerMove={(ev) => mostrar(ev, <><b>{p.id} · {p.municipio}</b><span>{p.conjunto === "PREDICCION" ? "Por predecir" : `Real ${num(p.real, 2)} t/ha`}</span><span>Estimado {num(p.pred, 2)} t/ha</span></>)} />
                );
              })}
            </g>
            <g transform={`translate(${W - 24 - g.km * kmBarra} ${H - 26})`} className="mapa-puntos__escala">
              <rect width={g.km * kmBarra} height="4" rx="2" />
              <text y="-6">{kmBarra} km</text>
            </g>
          </g>
        </svg>
        <TipGrafico tip={tip} />
      </div>
      <p className="sr-only">{res.estados.map((e) => `${e}: ${parcelas.filter((p) => p.estado === e).length} parcelas`).join(". ")}</p>
    </Figura>
  );
}

// ---- Histograma del rendimiento real
function HistogramaReal({ res }: { res: Resumen }) {
  const { contRef, tip, mostrar, ocultar } = useTip();
  const h = histograma(res.reales, 0.25);
  const W = 560, H = 250, m = { t: 26, r: 10, b: 30, l: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = (v: number) => m.l + ((v - h.lo) / (h.hi - h.lo)) * iw;
  const y = (c: number) => m.t + ih - (c / h.tope) * ih;
  const bw = iw / h.cuentas.length;
  const ticks: number[] = [];
  for (let t = Math.ceil(h.lo * 2) / 2; t <= h.hi + 1e-9; t += 0.5) ticks.push(t);

  return (
    <Figura titulo="Rendimiento medido"
      sub={`${res.reales.length} parcelas de entrenamiento · media ${num(res.mediaReal, 2)} t/ha, desviación ${num(res.desvReal, 2)}`}
      fuente="parcelas.json (real, solo ENTRENAMIENTO)">
      <div className="grafico" ref={contRef} onPointerLeave={ocultar}>
        <svg viewBox={`0 0 ${W} ${H}`} className="histo" role="img"
          aria-label={`Histograma del rendimiento real: de ${num(res.minReal, 2)} a ${num(res.maxReal, 2)} t/ha`}>
          <rect x={x(res.mediaReal - res.desvReal)} y={m.t} width={x(res.mediaReal + res.desvReal) - x(res.mediaReal - res.desvReal)} height={ih} className="histo__banda" />
          {[0.5, 1].map((f) => <line key={f} x1={m.l} x2={W - m.r} y1={y(h.tope * f)} y2={y(h.tope * f)} className="eje-rejilla" />)}
          {h.cuentas.map((c, i) => {
            const v0 = h.lo + i * h.ancho;
            return (
              <g key={i} onPointerMove={(ev) => mostrar(ev, <><b>{num(v0, 2)}–{num(v0 + h.ancho, 2)} t/ha</b><span>{c} {c === 1 ? "parcela" : "parcelas"}</span></>)}>
                <rect x={m.l + i * bw} y={m.t} width={bw} height={ih} fill="transparent" />
                {c > 0 && <path className="histo__barra" style={{ "--i": i } as CSSProperties}
                  d={barraRedondeada(m.l + i * bw + 1, y(c), bw - 2, m.t + ih - y(c), 4)} />}
              </g>
            );
          })}
          <line x1={x(res.mediaReal)} x2={x(res.mediaReal)} y1={m.t - 8} y2={m.t + ih} className="histo__media" />
          <text x={x(res.mediaReal) + 6} y={m.t - 10} className="eje-texto eje-texto--fuerte">media {num(res.mediaReal, 2)}</text>
          <text x={x(res.mediaReal + res.desvReal) - 4} y={m.t + 12} textAnchor="end" className="eje-texto">± 1 desv.</text>
          <line x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} className="eje-linea" />
          {ticks.map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="eje-texto">{num(t, 1)}</text>)}
          <text x={m.l - 8} y={y(h.tope)} textAnchor="end" dominantBaseline="middle" className="eje-texto">{h.tope}</text>
        </svg>
        <TipGrafico tip={tip} />
      </div>
      <div className="eje-titulo">Rendimiento, t/ha</div>
    </Figura>
  );
}

/** Barra con esquinas superiores redondeadas y base recta. */
export function barraRedondeada(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

// ---- Franjas por municipio
const jitter = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 16;
};

function FranjasMunicipio({ munis, res }: { munis: ReturnType<typeof porMunicipio>; res: Resumen }) {
  const { contRef, tip, mostrar, ocultar } = useTip();
  const fila = 38, W = 760, m = { t: 22, r: 92, b: 30, l: 200 };
  const H = m.t + munis.length * fila + m.b;
  const lo = Math.floor((res.minReal - 0.1) * 2) / 2, hi = Math.ceil((res.maxReal + 0.1) * 2) / 2;
  const x = (v: number) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.5) ticks.push(t);

  return (
    <Figura titulo="Cada municipio tiene su propio nivel"
      sub="Cada punto es una parcela de entrenamiento; la marca vertical es la media del municipio. Ordenados de mayor a menor rendimiento."
      fuente="parcelas.json (real, municipio, estado)">
      <Leyenda items={res.estados.map((e) => ({ color: colorEstado(res.estados, e), texto: e }))} />
      <div className="grafico" ref={contRef} onPointerLeave={ocultar}>
        <svg viewBox={`0 0 ${W} ${H}`} className="franjas" role="img"
          aria-label={munis.map((mu) => `${mu.municipio}: media ${num(mu.media, 2)} t/ha con ${mu.reales.length} parcelas`).join(". ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t - 6} y2={H - m.b} className="eje-rejilla" />
              <text x={x(t)} y={H - 10} textAnchor="middle" className="eje-texto">{num(t, 1)}</text>
            </g>
          ))}
          <line x1={x(res.mediaReal)} x2={x(res.mediaReal)} y1={m.t - 14} y2={H - m.b} className="franjas__general" />
          <text x={x(res.mediaReal)} y={m.t - 16} textAnchor="middle" className="eje-texto">media general {num(res.mediaReal, 2)}</text>
          {munis.map((mu, i) => {
            const cy = m.t + i * fila + fila / 2;
            const color = colorEstado(res.estados, mu.estado);
            return (
              <g key={mu.municipio} className="franja" style={{ "--i": i } as CSSProperties}>
                <rect x={0} y={cy - fila / 2} width={W} height={fila} className="franja__fondo" />
                <text x={m.l - 14} y={cy - 6} textAnchor="end" dominantBaseline="middle" className="franja__nombre">{mu.municipio}</text>
                <text x={m.l - 14} y={cy + 11} textAnchor="end" dominantBaseline="middle" className="eje-texto">
                  n = {mu.reales.length}{mu.nPred ? ` · ${mu.nPred} por predecir` : ""}
                </text>
                {mu.reales.map((r) => (
                  <circle key={r.id} cx={x(r.v)} cy={cy + jitter(r.id) * (mu.reales.length > 1 ? 1 : 0)} r="4.5"
                    className="franja__punto" style={{ fill: color }}
                    onPointerMove={(ev) => mostrar(ev, <><b>{r.id}</b><span>{mu.municipio}</span><span>Real {num(r.v, 2)} t/ha</span></>)} />
                ))}
                <line x1={x(mu.media)} x2={x(mu.media)} y1={cy - 13} y2={cy + 13} className="franja__media" />
                <text x={W - m.r + 14} y={cy} dominantBaseline="middle" className="franja__valor">{num(mu.media, 2)}</text>
              </g>
            );
          })}
        </svg>
        <TipGrafico tip={tip} />
      </div>
      <div className="eje-titulo">Rendimiento real, t/ha</div>
    </Figura>
  );
}

// ---- Curvas de NDVI por estado
function etiquetasFinales(bandas: BandaNdvi[], x: (k: number) => number, y: (v: number) => number, sep = 16) {
  const es = bandas.flatMap((b) => {
    const k = [...b.p50.keys()].reverse().find((kk) => b.p50[kk] !== null);
    return k === undefined ? [] : [{ estado: b.estado, x: x(k), y: y(b.p50[k] as number) }];
  }).sort((a, b) => a.y - b.y);
  for (let j = 1; j < es.length; j++) if (es[j].y - es[j - 1].y < sep) es[j].y = es[j - 1].y + sep;
  return es;
}

function segmentos(ys: (number | null)[]) {
  const out: number[][] = [];
  let actual: number[] = [];
  ys.forEach((v, i) => {
    if (v === null) { if (actual.length) out.push(actual); actual = []; } else actual.push(i);
  });
  if (actual.length) out.push(actual);
  return out;
}

const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function CurvasNdvi({ ndvi, parcelas, res }: { ndvi: SerieNdvi; parcelas: Parcela[]; res: Resumen }) {
  const bandas = useMemo(() => ndviPorEstado(ndvi, parcelas, res.estados), [ndvi, parcelas, res.estados]);
  const [i, setI] = useState<number | null>(null);
  const n = ndvi.fechas.length;
  const W = 760, H = 300, m = { t: 18, r: 96, b: 32, l: 40 };
  const tope = Math.max(0.3, ...bandas.flatMap((b) => b.p75.filter((v): v is number => v !== null))) + 0.05;
  const x = (k: number) => m.l + (k / Math.max(1, n - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / tope) * (H - m.t - m.b);
  const meses = ndvi.fechas.map((f, k) => ({ f, k })).filter(({ f }) => Number(f.slice(8, 10)) <= 5);
  const ticksY = [0, 0.2, 0.4, 0.6, 0.8].filter((t) => t < tope);

    // Las curvas no dependen del puntero: se calculan una vez y el cursor solo mueve la cruz.
  const dibujo = useMemo(() => (
    <>
      {bandas.map((b, bi) => {
            const color = colorEstado(res.estados, b.estado);
            return (
              <g key={b.estado} className="ndvi__serie" style={{ "--i": bi } as CSSProperties}>
                {segmentos(b.p25).map((seg) => {
                  const ok = seg.filter((k) => b.p75[k] !== null);
                  if (ok.length < 2) return null;
                  const d = `M${ok.map((k) => `${x(k)} ${y(b.p75[k] as number)}`).join("L")}L${[...ok].reverse().map((k) => `${x(k)} ${y(b.p25[k] as number)}`).join("L")}Z`;
                  return <path key={seg[0]} d={d} className="ndvi__banda" style={{ fill: color }} />;
                })}
                {segmentos(b.p50).map((seg) => seg.length > 1 && (
                  <path key={seg[0]} pathLength={1} className="ndvi__linea" style={{ stroke: color }}
                    d={`M${seg.map((k) => `${x(k).toFixed(1)} ${y(b.p50[k] as number).toFixed(1)}`).join("L")}`} />
                ))}
              </g>
            );
          })}
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [bandas, res.estados, n, tope]);

  const mover = (ev: PointerEvent<SVGRectElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const k = Math.round(((ev.clientX - r.left) / r.width) * (n - 1));
    setI(Math.max(0, Math.min(n - 1, k)));
  };

  return (
    <Figura titulo="Así crece la cebada, mes a mes"
      sub="NDVI de Sentinel-2 (verdor de la vegetación): mediana por estado y rango intercuartil (50 % central de las parcelas)."
      fuente="ndvi.json (malla de 5 días) agrupado con parcelas.json (estado)">
      <Leyenda items={bandas.map((b) => ({ color: colorEstado(res.estados, b.estado), texto: `${b.estado} · ${b.n} parcelas`, forma: "linea" as const }))} />
      <div className="grafico">
        <svg viewBox={`0 0 ${W} ${H}`} className="ndvi" role="img" aria-label="Curvas de NDVI por estado de abril a octubre de 2025">
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="eje-rejilla" />
              <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="eje-texto">{num(t, 1)}</text>
            </g>
          ))}
          {meses.map(({ f, k }) => <text key={f} x={x(k)} y={H - 10} textAnchor="middle" className="eje-texto">{MES_CORTO[Number(f.slice(5, 7)) - 1]}</text>)}
          {dibujo}

          {/* Etiquetas directas al final de cada curva, separadas para que no se encimen */}
          {etiquetasFinales(bandas, x, y).map((e) => (
            <text key={e.estado} x={e.x + 8} y={e.y} dominantBaseline="middle" className="ndvi__etiqueta">{e.estado}</text>
          ))}
          {i !== null && (
            <g className="cruz">
              <line x1={x(i)} x2={x(i)} y1={m.t} y2={H - m.b} />
              {bandas.map((b) => b.p50[i] !== null && (
                <circle key={b.estado} cx={x(i)} cy={y(b.p50[i] as number)} r="5" style={{ fill: colorEstado(res.estados, b.estado) }} />
              ))}
            </g>
          )}
          <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="transparent"
            onPointerMove={mover} onPointerLeave={() => setI(null)} />
        </svg>
        {i !== null && (
          <div className="g-tip g-tip--fijo" style={{ left: `${(100 * x(i)) / W}%` }}>
            <b>{fecha(ndvi.fechas[i])}</b>
            {bandas.map((b) => (
              <span key={b.estado}><i style={{ background: colorEstado(res.estados, b.estado) }} />{b.estado}: {num(b.p50[i], 2)}</span>
            ))}
          </div>
        )}
      </div>
      <p className="nota-grafica"><Icon name="leaf" size={15} /> El verdor sube desde junio, toca su pico a finales de agosto y sigue alto al cierre de octubre: un cultivo de temporal que depende de las lluvias.</p>
    </Figura>
  );
}
