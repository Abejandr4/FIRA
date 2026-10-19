/**
 * 03 · El modelo: cómo se arma una predicción (prior por ubicación + corrección satelital), cuánto error quita
 * cada paso y qué tan bien acierta en validación cruzada.
 * Datos: parcelas.json y meta.json. Comparación de variantes: reporte.ts (sección 5.2).
 */
import { useMemo, useState, type CSSProperties } from "react";
import { Icon, type IconName } from "../../../components/ui";
import type { MetaModelo, Parcela } from "../../../data/tipos";
import { num, numSigno } from "../../../lib/formato";
import { Contador, Revelar, TipGrafico, useEnVista, useTip } from "../animacion";
import { Encabezado, Figura, Leyenda } from "../comunes";
import { colorEstado, type Resumen } from "../datos";
import { VARIANTES } from "../reporte";

export function SeccionModelo({ parcelas, res, meta, irMapa }: {
  parcelas: Parcela[]; res: Resumen; meta: MetaModelo; irMapa: (id?: string) => void;
}) {
  return (
    <section id="modelo" className="seccion" aria-labelledby="modelo-titulo">
      <div className="contenedor">
        <Encabezado numero="03" eyebrow="El modelo" icono="cpu" titulo={<span id="modelo-titulo">Primero el lugar, después el satélite</span>}>
          Cada predicción se arma en dos pasos: una estimación inicial por ubicación (el <b>prior</b>, promedio del municipio
          y de las 5 parcelas vecinas) y una corrección aprendida con Sentinel-2, fenología y terreno mediante una regresión Ridge.
        </Encabezado>

        <Revelar><ComoPredice parcelas={parcelas} meta={meta} irMapa={irMapa} /></Revelar>

        <div className="rejilla-2">
          <Revelar><CaminoError meta={meta} /></Revelar>
          <Revelar retraso={120}><Variantes meta={meta} /></Revelar>
        </div>

        <div className="rejilla-2 rejilla-2--ancha">
          <Revelar><Dispersion parcelas={parcelas} res={res} meta={meta} /></Revelar>
          <Revelar retraso={120}><Calidad meta={meta} /></Revelar>
        </div>
      </div>
    </section>
  );
}

// ---- Cómo se arma una predicción (interactivo)
function ComoPredice({ parcelas, meta, irMapa }: { parcelas: Parcela[]; meta: MetaModelo; irMapa: (id?: string) => void }) {
  const ordenadas = useMemo(() => [...parcelas].sort((a, b) => a.id.localeCompare(b.id)), [parcelas]);
  const atajos = useMemo(() => ({
    corr: [...parcelas].sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))[0],
    baja: parcelas.find((p) => p.confianza === "baja"),
    alta: [...parcelas].sort((a, b) => b.pred - a.pred)[0],
    bajaPred: [...parcelas].sort((a, b) => a.pred - b.pred)[0],
  }), [parcelas]);
  const [id, setId] = useState(() => (parcelas.find((p) => p.conjunto === "PREDICCION") ?? parcelas[0]).id);
  const p = parcelas.find((x) => x.id === id) ?? parcelas[0];

  const [lo, hi] = useMemo(() => {
    const v = parcelas.flatMap((x) => [x.prior_mun, x.prior_vec, x.pred, x.real ?? x.pred]);
    return [Math.floor((Math.min(...v) - meta.q80) * 2) / 2, Math.ceil((Math.max(...v) + meta.q80) * 2) / 2];
  }, [parcelas, meta.q80]);
  const pos = (v: number) => `${(100 * (v - lo)) / (hi - lo)}%`;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.5) ticks.push(t);

  const pasos: { icono: IconName; nombre: string; detalle: string; valor: number; texto: string; clase: string }[] = [
    { icono: "location", nombre: "Prior por municipio", detalle: `Media de ${p.municipio}, suavizada hacia la general`, valor: p.prior_mun, texto: num(p.prior_mun, 2), clase: "mun" },
    { icono: "neighbors", nombre: "Prior de vecinos", detalle: "Media de las 5 parcelas conocidas más cercanas", valor: p.prior_vec, texto: num(p.prior_vec, 2), clase: "vec" },
    { icono: "equal", nombre: "Promedio de ambos", detalle: "Estimación por ubicación", valor: p.prior, texto: num(p.prior, 2), clase: "prior" },
    { icono: "satellite", nombre: "Corrección satelital", detalle: `Ridge con ${meta.n_variables} variables`, valor: p.pred, texto: `${numSigno(p.corr, 3)}`, clase: "corr" },
    { icono: "target", nombre: "Estimación final", detalle: `Intervalo al 80 %: ± ${num(meta.q80, 2)} t/ha`, valor: p.pred, texto: num(p.pred, 2), clase: "final" },
  ];
  const elegir = (x?: Parcela) => x && setId(x.id);

  return (
    <Figura titulo="Así se arma una predicción" className="figura--destacada"
      sub="Elige una parcela: cada fila mueve la estimación sobre la misma escala de t/ha."
      fuente="parcelas.json (prior_mun, prior_vec, prior, corr, pred, real) y meta.json (q80)">
      <div className="selector">
        <label className="selector__campo">
          <Icon name="search" size={16} />
          <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Parcela">
            {ordenadas.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.municipio}{x.conjunto === "PREDICCION" ? " · por predecir" : ""}</option>)}
          </select>
        </label>
        <div className="selector__atajos">
          <button type="button" onClick={() => elegir(ordenadas[Math.floor(Math.random() * ordenadas.length)])}><Icon name="shuffle" size={14} /> Al azar</button>
          <button type="button" onClick={() => elegir(atajos.alta)}>Rendimiento más alto</button>
          <button type="button" onClick={() => elegir(atajos.bajaPred)}>Más bajo</button>
          <button type="button" onClick={() => elegir(atajos.corr)}>Mayor corrección</button>
          {atajos.baja && <button type="button" onClick={() => elegir(atajos.baja)}><Icon name="warning" size={14} /> Confianza baja</button>}
        </div>
      </div>

      <div className="escalera" aria-live="polite">
        <div className="escalera__eje">
          {ticks.map((t) => <span key={t} style={{ left: pos(t) }}>{num(t, 1)}</span>)}
        </div>
        {pasos.map((s, i) => (
          <div key={s.clase} className={`escalon escalon--${s.clase}`} style={{ "--i": i } as CSSProperties}>
            <div className="escalon__etiqueta">
              <span className="escalon__icono"><Icon name={s.icono} size={17} /></span>
              <div><b>{s.nombre}</b><small>{s.detalle}</small></div>
            </div>
            <div className="escalon__pista">
              {ticks.map((t) => <i key={t} className="escalon__rejilla" style={{ left: pos(t) }} />)}
              {s.clase === "corr" && (
                <span className="escalon__flecha" style={{
                  left: pos(Math.min(p.prior, p.pred)), width: `calc(${pos(Math.max(p.prior, p.pred))} - ${pos(Math.min(p.prior, p.pred))})`,
                }} />
              )}
              {s.clase === "final" && (
                <>
                  <span className="escalon__intervalo escalon__intervalo--90" style={{ left: pos(p.pred - meta.q90), width: `calc(${pos(p.pred + meta.q90)} - ${pos(p.pred - meta.q90)})` }} />
                  <span className="escalon__intervalo" style={{ left: pos(p.pred - meta.q80), width: `calc(${pos(p.pred + meta.q80)} - ${pos(p.pred - meta.q80)})` }} />
                  {p.real !== null && <span className="escalon__real" style={{ left: pos(p.real) }} title={`Real: ${num(p.real, 2)} t/ha`} />}
                </>
              )}
              <span className="escalon__marca" style={{ left: pos(s.valor) }}><b>{s.texto}</b></span>
            </div>
          </div>
        ))}
      </div>

      <div className="escalera__pie">
        <Leyenda items={[
          { color: "var(--amber)", texto: "Estimación final", forma: "punto" },
          { color: "color-mix(in srgb, var(--amber) 35%, transparent)", texto: "Intervalo 80 % / 90 %", forma: "banda" },
          ...(p.real !== null ? [{ color: "var(--text)", texto: `Real medido: ${num(p.real, 2)} t/ha`, forma: "punto" as const }] : []),
        ]} />
        <p>
          {p.conjunto === "ENTRENAMIENTO"
            ? <>Parcela de entrenamiento: la estimación se hizo <b>sin usar su propio rendimiento</b>.</>
            : <>Parcela por predecir del reto.</>}{" "}
          La corrección satelital mueve {num(Math.abs(p.corr), 3)} t/ha, el {num((100 * Math.abs(p.corr)) / meta.q80, 1)} % del intervalo al 80 %.
          {p.confianza === "baja" && <> <b className="t-aviso">Confianza baja:</b> su municipio tiene {p.n_entren_municipio} {p.n_entren_municipio === 1 ? "parcela" : "parcelas"} de entrenamiento.</>}
        </p>
        <button type="button" className="boton boton--chico" onClick={() => irMapa(p.id)}><Icon name="map" size={15} /> Ver {p.id} en el mapa</button>
      </div>
    </Figura>
  );
}

// ---- Camino del error
function CaminoError({ meta }: { meta: MetaModelo }) {
  const max = meta.rmse_media_global;
  const grupos = [
    { esquema: "Validación aleatoria", nota: "parcelas rodeadas de vecinas conocidas, como en el reto", filas: [
      { t: "Predecir siempre la media", v: meta.rmse_media_global, c: "base" },
      { t: "Solo ubicación (prior)", v: meta.cv_aleatorio.rmse_prior, c: "prior" },
      { t: "Modelo final", v: meta.cv_aleatorio.rmse, c: "final" },
    ] },
    { esquema: "Validación espacial", nota: "zonas completas fuera, sin vecinos cercanos", filas: [
      { t: "Solo ubicación (prior)", v: meta.cv_espacial.rmse_prior, c: "prior" },
      { t: "Modelo final", v: meta.cv_espacial.rmse, c: "final" },
    ] },
  ];
  return (
    <Figura titulo="Cuánto error quita cada paso" sub="Error típico (RMSE, t/ha) en validación cruzada. Más corto es mejor."
      fuente="meta.json (rmse_media_global, cv_aleatorio, cv_espacial)">
      <div className="camino">
        {grupos.map((g) => (
          <div key={g.esquema} className="camino__grupo">
            <div className="camino__titulo"><b>{g.esquema}</b><small>{g.nota}</small></div>
            {g.filas.map((f, i) => (
              <div key={f.t} className={`barra-h barra-h--${f.c}`} style={{ "--i": i } as CSSProperties}>
                <span>{f.t}</span>
                <div className="barra-h__pista"><i style={{ "--w": f.v / max } as CSSProperties} /></div>
                <b>{num(f.v, 3)}</b>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="nota-grafica">
        <Icon name="info" size={15} /> La ubicación hace casi todo el trabajo ({numSigno(-100 * (1 - meta.cv_aleatorio.rmse_prior / meta.rmse_media_global), 0)} % de error).
        El satélite solo ayuda de forma medible cuando no hay vecinos cercanos: de {num(meta.cv_espacial.rmse_prior, 3)} a {num(meta.cv_espacial.rmse, 3)} t/ha.
      </p>
    </Figura>
  );
}

// ---- Variantes con y sin prior (reporte 5.2)
function Variantes({ meta }: { meta: MetaModelo }) {
  const max = Math.max(...VARIANTES.map((v) => v.rmse));
  return (
    <Figura titulo="La ubicación pesa más que las imágenes"
      sub="Primera comparación: RMSE (t/ha) de variantes con Ridge, validación aleatoria. Más corto es mejor."
      fuente="Reporte técnico, sección 5.2 (promedio por partición)">
      <Leyenda items={[{ color: "var(--faint)", texto: "Sin prior geográfico" }, { color: "var(--s1)", texto: "Con prior geográfico" }]} />
      <div className="camino">
        {VARIANTES.map((v, i) => (
          <div key={v.nombre} className={`barra-h ${v.conPrior ? "barra-h--prior" : "barra-h--base"}`} style={{ "--i": i } as CSSProperties}>
            <span>{v.nombre}</span>
            <div className="barra-h__pista"><i style={{ "--w": v.rmse / max } as CSSProperties} /></div>
            <b>{num(v.rmse, 3)}</b>
          </div>
        ))}
      </div>
      <p className="nota-grafica"><Icon name="neighbors" size={15} /> Ninguna variante sin prior baja de {num(Math.min(...VARIANTES.filter((v) => !v.conPrior).map((v) => v.rmse)), 2)} t/ha; con prior, todas rondan {num(meta.cv_aleatorio.rmse_prior, 2)}.</p>
    </Figura>
  );
}

// ---- Real contra predicho
function Dispersion({ parcelas, res, meta }: { parcelas: Parcela[]; res: Resumen; meta: MetaModelo }) {
  const { contRef, tip, mostrar, ocultar } = useTip();
  const pts = parcelas.filter((p) => p.conjunto === "ENTRENAMIENTO" && p.real !== null && p.pred_cv !== null);
  const vals = pts.flatMap((p) => [p.real as number, p.pred_cv as number]);
  const lo = Math.floor(Math.min(...vals) * 2) / 2, hi = Math.ceil(Math.max(...vals) * 2) / 2;
  const S = 460, m = { t: 14, r: 14, b: 40, l: 44 };
  const sx = (v: number) => m.l + ((v - lo) / (hi - lo)) * (S - m.l - m.r);
  const sy = (v: number) => S - m.b - ((v - lo) / (hi - lo)) * (S - m.t - m.b);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.5) ticks.push(t);
  const q = meta.q80;
  const banda = `M${sx(lo)} ${sy(lo + q)}L${sx(hi - q)} ${sy(hi)}L${sx(hi)} ${sy(hi)}L${sx(hi)} ${sy(hi - q)}L${sx(lo + q)} ${sy(lo)}L${sx(lo)} ${sy(lo)}Z`;

  return (
    <Figura titulo="Real contra estimado" sub={`${pts.length} parcelas de entrenamiento, cada una estimada sin su propio rendimiento (validación cruzada)`}
      fuente="parcelas.json (real, pred_cv) y meta.json (r2, rmse, q80)">
      <Leyenda items={[
        ...res.estados.map((e) => ({ color: colorEstado(res.estados, e), texto: e })),
        { color: "color-mix(in srgb, var(--s1) 22%, transparent)", texto: `± ${num(q, 2)} t/ha (80 %)`, forma: "banda" as const },
      ]} />
      <div className="grafico" ref={contRef} onPointerLeave={ocultar}>
        <svg viewBox={`0 0 ${S} ${S}`} className="dispersion" role="img"
          aria-label={`Dispersión del rendimiento real contra el estimado, R² ${num(meta.cv_aleatorio.r2, 2)}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={S - m.b} className="eje-rejilla" />
              <line x1={m.l} x2={S - m.r} y1={sy(t)} y2={sy(t)} className="eje-rejilla" />
              <text x={sx(t)} y={S - m.b + 18} textAnchor="middle" className="eje-texto">{num(t, 1)}</text>
              <text x={m.l - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" className="eje-texto">{num(t, 1)}</text>
            </g>
          ))}
          <path d={banda} className="dispersion__banda" />
          <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} className="dispersion__diagonal" />
          <text x={sx(hi) - 6} y={sy(hi) + 16} textAnchor="end" className="eje-texto">estimado = real</text>
          {pts.map((p, i) => (
            <circle key={p.id} cx={sx(p.real as number)} cy={sy(p.pred_cv as number)} r="5" className="dispersion__punto"
              style={{ fill: colorEstado(res.estados, p.estado), "--i": i } as CSSProperties}
              onPointerMove={(ev) => mostrar(ev, <><b>{p.id} · {p.municipio}</b><span>Real {num(p.real, 2)} · estimado {num(p.pred_cv, 2)}</span><span>Error {numSigno((p.pred_cv as number) - (p.real as number), 2)} t/ha</span></>)} />
          ))}
          <text x={(m.l + S - m.r) / 2} y={S - 4} textAnchor="middle" className="eje-texto eje-texto--fuerte">Rendimiento real, t/ha</text>
          <text transform={`translate(12 ${(m.t + S - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="eje-texto eje-texto--fuerte">Estimado, t/ha</text>
        </svg>
        <TipGrafico tip={tip} />
      </div>
    </Figura>
  );
}

// ---- Calidad: R² y error
function Anillo({ valor, etiqueta, sub, activo }: { valor: number; etiqueta: string; sub: string; activo: boolean }) {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <div className="anillo">
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle cx="55" cy="55" r={r} className="anillo__fondo" />
        <circle cx="55" cy="55" r={r} className="anillo__valor" strokeDasharray={c}
          style={{ strokeDashoffset: activo ? c * (1 - Math.max(0, valor)) : c } as CSSProperties} transform="rotate(-90 55 55)" />
      </svg>
      <div className="anillo__centro"><strong><Contador valor={valor} decimales={2} activo={activo} /></strong><span>R²</span></div>
      <b>{etiqueta}</b><small>{sub}</small>
    </div>
  );
}

function Calidad({ meta }: { meta: MetaModelo }) {
  const [ref, visto] = useEnVista<HTMLDivElement>(0.3);
  const relativo = (100 * meta.cv_aleatorio.rmse) / meta.media_general_entren;
  return (
    <div ref={ref} className="calidad">
      <Figura titulo="¿Qué tan bien acierta?" sub="Proporción de la variación del rendimiento que explica el modelo" fuente="meta.json">
        <div className="anillos">
          <Anillo valor={meta.cv_aleatorio.r2} etiqueta="Aleatoria" sub={`RMSE ${num(meta.cv_aleatorio.rmse, 3)} · MAE ${num(meta.cv_aleatorio.mae, 3)}`} activo={visto} />
          <Anillo valor={meta.cv_espacial.r2} etiqueta="Espacial" sub={`RMSE ${num(meta.cv_espacial.rmse, 3)} t/ha`} activo={visto} />
        </div>
        <div className="intervalo-vis">
          <div className="intervalo-vis__pista">
            <span className="intervalo-vis__banda intervalo-vis__banda--90" style={{ "--w": (2 * meta.q90) / 3 } as CSSProperties} />
            <span className="intervalo-vis__banda" style={{ "--w": (2 * meta.q80) / 3 } as CSSProperties} />
            <span className="intervalo-vis__centro" />
          </div>
          <div className="intervalo-vis__textos">
            <span><b>± {num(meta.q80, 2)}</b> t/ha al 80 %</span>
            <span><b>± {num(meta.q90, 2)}</b> t/ha al 90 %</span>
          </div>
        </div>
        <p className="nota-grafica">
          <Icon name="info" size={15} /> Error relativo de {num(relativo, 1)} % de la media. Los intervalos salen de los errores de
          validación cruzada: el modelo ubica bien el nivel de cada zona y afina poco dentro de ella.
        </p>
      </Figura>
    </div>
  );
}
