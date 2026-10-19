/**
 * 04 · Variables seleccionadas y su justificación: qué entró al modelo, cuánto pesa cada variable,
 * por qué Ridge, qué se descartó y qué no logra el modelo.
 * Datos: modelo/ridge.json (cols, coef, alpha), parcelas.json (correlaciones dentro del municipio, faltantes) y meta.json.
 * Pruebas estadísticas: reporte.ts (secciones 5.3 a 5.6).
 */
import { useMemo, useState, type CSSProperties } from "react";
import { Icon, type IconName } from "../../../components/ui";
import type { MetaModelo, Parcela } from "../../../data/tipos";
import type { ModeloRidge } from "../../parcela/modelo/ridge";
import { num, numSigno } from "../../../lib/formato";
import { Revelar, TipGrafico, useTip } from "../animacion";
import { Encabezado, Estatus, Figura, Leyenda, Pestanas } from "../comunes";
import { correlacionesMunicipio, fenologia, grupoDe, nombreVariable, type Grupo, type Resumen } from "../datos";
import { ALPHA, BOOTSTRAP, N_OBS, OLS_RIDGE, SIMULADOR } from "../reporte";

const GRUPOS: Record<Grupo, { nombre: string; icono: IconName; color: string; porque: string }> = {
  s2: { nombre: "Sentinel-2", icono: "satellite", color: "var(--s1)",
    porque: "NDVI y EVI miden vigor, LAI el área foliar, MSI y NDWI el agua de la vegetación. Se usan percentiles 95 y 5 en lugar de máximo y mínimo: un solo dato ruidoso no los mueve." },
  fen: { nombre: "Fenología", icono: "leaf", color: "var(--s2)",
    porque: "Inicio y velocidad del crecimiento, días cerca del pico y NDVI de mayo a septiembre. Buscan captar la fecha de siembra y emergencia, un dato que el reto no incluye." },
  geo: { nombre: "Forma y terreno", icono: "mountain", color: "var(--s3)",
    porque: "Superficie, compacidad, elongación, elevación y pendiente media. Se excluyeron sus desviaciones estándar: con ~10 píxeles de 120 m por parcela valían cero artificialmente." },
};

export function SeccionVariables({ parcelas, res, meta, ridge }: {
  parcelas: Parcela[]; res: Resumen; meta: MetaModelo; ridge?: ModeloRidge;
}) {
  return (
    <section id="variables" className="seccion seccion--alterna" aria-labelledby="variables-titulo">
      <div className="contenedor">
        <Encabezado numero="04" eyebrow="Variables y justificación" icono="filter"
          titulo={<span id="variables-titulo">Pocas variables, elegidas antes de ver los resultados</span>}>
          Con {meta.n_train} parcelas se eligieron {meta.n_variables} variables con sentido agronómico, sin repetir información
          (SAVI y FAPAR se dejaron fuera por su alta correlación con NDVI). Cada decisión se comparó contra una línea base
          con intervalos de confianza por bootstrap.
        </Encabezado>

        {ridge && <GruposVariables ridge={ridge} />}
        {ridge && <Revelar><Coeficientes ridge={ridge} /></Revelar>}

        <Revelar><Bootstrap /></Revelar>

        <div className="rejilla-2">
          <Revelar><OlsRidge /></Revelar>
          <Revelar retraso={120}><Penalizacion alphaFinal={ridge?.alpha} q80={meta.q80} /></Revelar>
        </div>

        <Descartadas parcelas={parcelas} meta={meta} />
        <Revelar><Limite parcelas={parcelas} res={res} /></Revelar>
      </div>
    </section>
  );
}

// ---- Los tres grupos
function GruposVariables({ ridge }: { ridge: ModeloRidge }) {
  const por = (g: Grupo) => ridge.cols.filter((c) => grupoDe(c) === g);
  return (
    <div className="grupos">
      {(Object.keys(GRUPOS) as Grupo[]).map((g, i) => {
        const cols = por(g);
        return (
          <Revelar key={g} retraso={i * 110} className={`grupo grupo--${g}`}>
            <div className="grupo__cabeza">
              <span className="grupo__icono" style={{ color: GRUPOS[g].color }}><Icon name={GRUPOS[g].icono} size={24} /></span>
              <div className="grupo__numero" style={{ color: GRUPOS[g].color }}>{cols.length}</div>
            </div>
            <h3>{GRUPOS[g].nombre}</h3>
            <p>{GRUPOS[g].porque}</p>
            <div className="grupo__chips">
              {cols.slice(0, 6).map((c) => <span key={c} title={c}>{nombreVariable(c)}</span>)}
              {cols.length > 6 && <span className="mas">+{cols.length - 6}</span>}
            </div>
            <div className="grupo__barra"><i style={{ "--w": cols.length / ridge.cols.length, background: GRUPOS[g].color } as CSSProperties} /></div>
          </Revelar>
        );
      })}
    </div>
  );
}

// ---- Coeficientes del Ridge
function Coeficientes({ ridge }: { ridge: ModeloRidge }) {
  const [todas, setTodas] = useState(false);
  const filas = useMemo(() => ridge.cols
    .map((c, j) => ({ col: c, coef: ridge.coef[j], grupo: grupoDe(c) }))
    .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef)), [ridge]);
  const max = Math.max(...filas.map((f) => Math.abs(f.coef)));
  const vis = todas ? filas : filas.slice(0, 12);

  return (
    <Figura titulo="¿Qué variable pesa más?"
      sub="Coeficiente del Ridge: t/ha que suma o resta a la corrección cuando la variable sube una desviación estándar."
      fuente="modelo/ridge.json (cols, coef, alpha)"
      acciones={<Pestanas etiqueta="Variables mostradas" valor={todas ? "todas" : "top"} onCambio={(v) => setTodas(v === "todas")}
        opciones={[{ valor: "top", texto: "Top 12" }, { valor: "todas", texto: `Las ${filas.length}` }]} />}>
      <Leyenda items={(Object.keys(GRUPOS) as Grupo[]).map((g) => ({ color: GRUPOS[g].color, texto: GRUPOS[g].nombre }))} />
      <div className="coefs" role="list">
        <div className="coefs__eje" aria-hidden="true"><span /><span className="coefs__lados"><em>← resta a la corrección</em><em>suma →</em></span><span /></div>
        {vis.map((f, i) => (
          <div key={f.col} className="coef" role="listitem" style={{ "--i": i } as CSSProperties} title={f.col}>
            <span className="coef__nombre">{nombreVariable(f.col)}<small>{f.col}</small></span>
            <div className="coef__pista">
              <i className={f.coef < 0 ? "neg" : "pos"} style={{ "--w": Math.abs(f.coef) / max, background: GRUPOS[f.grupo].color } as CSSProperties} />
            </div>
            <b>{numSigno(f.coef, 4)}</b>
          </div>
        ))}
      </div>
      <p className="nota-grafica">
        <Icon name="info" size={15} /> Con penalización alpha = {num(ridge.alpha, 0)}, el mayor coeficiente mueve apenas {num(max, 4)} t/ha
        por desviación estándar. La información útil está en la familia NDVI/EVI/LAI: la cobertura en la parte baja de la temporada
        y el calendario del pico, más que el valor máximo. Es coherente con que la fecha de siembra sea el dato que falta.
      </p>
    </Figura>
  );
}

// ---- Bootstrap pareado (forest plot)
function Bootstrap() {
  const [esq, setEsq] = useState<"aleatoria" | "espacial">("espacial");
  const { referencia, filas } = BOOTSTRAP[esq];
  const lo = Math.min(-0.03, ...filas.map((f) => f.lo)) - 0.005, hi = Math.max(0.03, ...filas.map((f) => f.hi)) + 0.005;
  const pos = (v: number) => `${(100 * (v - lo)) / (hi - lo)}%`;

  return (
    <Figura titulo="¿Mejora real o ruido?"
      sub={`Diferencia de RMSE contra la estimación solo por ubicación (${num(referencia, 3)} t/ha), con intervalo de confianza del 95 % por bootstrap pareado (${num(2000, 0)} remuestreos). A la derecha del cero = mejor.`}
      fuente="Reporte técnico, sección 5.3"
      acciones={<Pestanas etiqueta="Esquema de validación" valor={esq} onCambio={setEsq}
        opciones={[{ valor: "aleatoria", texto: "Aleatoria" }, { valor: "espacial", texto: "Espacial" }]} />}>
      <div className="bosque" key={esq}>
        <div className="bosque__escala">
          <span style={{ left: pos(0) }} className="bosque__cero">0</span>
          <span style={{ left: pos(lo) }}>peor</span>
          <span style={{ left: pos(hi) }} className="bosque__mejor">mejor</span>
        </div>
        {filas.map((f, i) => (
          <div key={f.variante} className={`bosque__fila${f.final ? " es-final" : ""}`} style={{ "--i": i } as CSSProperties}>
            <span className="bosque__nombre">{f.variante}<small>RMSE {num(f.rmse, 3)}</small></span>
            <div className="bosque__pista">
              <i className="bosque__linea-cero" style={{ left: pos(0) }} />
              <i className="bosque__ic" style={{ left: pos(f.lo), width: `calc(${pos(f.hi)} - ${pos(f.lo)})` }} />
              <i className={`bosque__punto bosque__punto--${f.etiqueta}`} style={{ left: pos(f.dif) }} />
            </div>
            <span className="bosque__dif">{numSigno(f.dif, 3)}</span>
            <Estatus valor={f.etiqueta} />
          </div>
        ))}
      </div>
      <p className="nota-grafica">
        <Icon name="shield" size={15} />
        {esq === "espacial"
          ? "Sin vecinos cercanos, Sentinel-2 + fenología sí aportan una mejora pequeña y consistente (≈ 2,5 %): es la única con el intervalo claramente sobre cero. Se reporta con cautela porque se compararon varias variantes con los mismos datos."
          : "Con vecinos conocidos, como las parcelas del reto, ninguna variable satelital mejora de forma detectable a la estimación por ubicación. El componente de vecinos sí aporta: el prior por municipio solo es peor."}
      </p>
    </Figura>
  );
}

// ---- OLS contra Ridge
function OlsRidge() {
  const max = Math.max(...OLS_RIDGE.map((f) => f.rmse));
  return (
    <Figura titulo="Por qué Ridge y no mínimos cuadrados"
      sub="RMSE (t/ha), validación aleatoria. Con ~4 observaciones por variable y variables casi redundantes, OLS sobreajusta."
      fuente="Reporte técnico, sección 5.5">
      <div className="camino">
        {OLS_RIDGE.map((f, i) => (
          <div key={f.modelo} className={`barra-h ${f.final ? "barra-h--final" : f.modelo.startsWith("OLS") ? "barra-h--base" : "barra-h--prior"}`} style={{ "--i": i } as CSSProperties}>
            <span>{f.modelo}</span>
            <div className="barra-h__pista"><i style={{ "--w": f.rmse / max } as CSSProperties} /></div>
            <b>{num(f.rmse, 3)}</b>
          </div>
        ))}
      </div>
      <ul className="razones">
        <li><Icon name="check" size={15} /> Estable con variables muy parecidas entre sí (p95, media y área bajo la curva del mismo índice).</li>
        <li><Icon name="check" size={15} /> Interpretable: cada coeficiente tiene un significado.</li>
        <li><Icon name="check" size={15} /> Portable: la corrección se calcula en el navegador con una lista de coeficientes, verificada contra scikit-learn.</li>
      </ul>
    </Figura>
  );
}

// ---- Sensibilidad a alpha
function Penalizacion({ alphaFinal, q80 }: { alphaFinal?: number; q80: number }) {
  const { contRef, tip, mostrar, ocultar } = useTip();
  const W = 520, H = 280, m = { t: 20, r: 92, b: 40, l: 46 };
  const xs = ALPHA.filas.map((f) => Math.log10(f.alpha));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = 0.50, y1 = 0.635;
  const x = (a: number) => m.l + ((Math.log10(a) - x0) / (x1 - x0)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const series = [
    { clave: "aleatoria" as const, nombre: "Aleatoria", color: "var(--s1)" },
    { clave: "espacial" as const, nombre: "Espacial", color: "var(--s2)" },
  ];
  const final = alphaFinal ?? 1000;

  return (
    <Figura titulo="Cuánto penalizar" sub="RMSE (t/ha) según la penalización alpha. Las líneas punteadas son la estimación solo por ubicación."
      fuente={`Reporte técnico, sección 5.5 · alpha del modelo: modelo/ridge.json`}>
      <Leyenda items={series.map((s) => ({ color: s.color, texto: s.nombre, forma: "linea" as const }))} />
      <div className="grafico" ref={contRef} onPointerLeave={ocultar}>
        <svg viewBox={`0 0 ${W} ${H}`} className="alpha" role="img" aria-label="Error según la penalización alpha en validación aleatoria y espacial">
          {[0.52, 0.56, 0.6].map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="eje-rejilla" />
              <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="eje-texto">{num(t, 2)}</text>
            </g>
          ))}
          {ALPHA.filas.map((f) => <text key={f.alpha} x={x(f.alpha)} y={H - m.b + 18} textAnchor="middle" className="eje-texto">{f.alpha >= 1000 ? `${f.alpha / 1000}k` : f.alpha}</text>)}
          <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle" className="eje-texto eje-texto--fuerte">alpha (escala logarítmica)</text>
          <line x1={x(final)} x2={x(final)} y1={m.t} y2={H - m.b} className="alpha__final" />
          <text x={x(final) + 6} y={H - m.b - 8} className="eje-texto eje-texto--fuerte">elegido: {num(final, 0)}</text>
          {series.map((s) => (
            <g key={s.clave}>
              <line x1={m.l} x2={W - m.r} y1={y(ALPHA.soloPrior[s.clave])} y2={y(ALPHA.soloPrior[s.clave])} className="alpha__ref" style={{ stroke: s.color }} />
              <path pathLength={1} className="alpha__linea" style={{ stroke: s.color }}
                d={`M${ALPHA.filas.map((f) => `${x(f.alpha)} ${y(f[s.clave])}`).join("L")}`} />
              {ALPHA.filas.map((f) => (
                <circle key={f.alpha} cx={x(f.alpha)} cy={y(f[s.clave])} r="5" className="alpha__punto" style={{ fill: s.color }}
                  onPointerMove={(ev) => mostrar(ev, <><b>alpha = {num(f.alpha, 0)} · {s.nombre}</b><span>RMSE {num(f[s.clave], 3)} t/ha</span><span>Corrección típica ± {num(f.correccion, 3)} t/ha</span></>)} />
              ))}
              <text x={W - m.r + 8} y={y(ALPHA.filas[ALPHA.filas.length - 1][s.clave])} dominantBaseline="middle" className="eje-texto eje-texto--fuerte">{s.nombre}</text>
            </g>
          ))}
        </svg>
        <TipGrafico tip={tip} />
      </div>
      <p className="nota-grafica"><Icon name="info" size={15} /> La validación aleatoria es plana; la espacial prefiere alpha de 100 a 300 (≈ 0,01 t/ha mejor). Se conservó el valor elegido por RidgeCV: la ganancia es pequeña frente a un intervalo de ± {num(q80, 2)} t/ha.</p>
    </Figura>
  );
}

// ---- Lo que se descartó
function Descartadas({ parcelas, meta }: { parcelas: Parcela[]; meta: MetaModelo }) {
  const fen = fenologia(parcelas);
  const items: { icono: IconName; titulo: string; dato: string; texto: string }[] = [
    { icono: "satellite", titulo: "Conteo de observaciones", dato: `${num(N_OBS.rmseMedia, 2)} → ${num(N_OBS.rmseSoloNobsL8Aleatoria, 2)}`,
      texto: "Solo con el número de pasadas de Landsat, Random Forest bajaba el error. Depende de la órbita, no del cultivo: un identificador de ubicación." },
    { icono: "thermometer", titulo: "Landsat", dato: "NDVI 100 % vacío",
      texto: "Solo trae temperatura de superficie. Sola no supera a la media; como corrección es neutra con Ridge y peor con Random Forest." },
    { icono: "cpu", titulo: "Simulador biofísico", dato: `r = ${num(SIMULADOR.correlacion, 3)}`,
      texto: `Promedia ${num(SIMULADOR.mediaSimulada, 2)} t/ha contra ${num(meta.media_general_entren, 2)} reales y su correlación con el rendimiento es indistinguible de cero. Queda para explicar, no para predecir.` },
    { icono: "clock", titulo: "Senescencia y duración", dato: `${num(100 * fen.fraccionSinSenescencia, 0)} % faltante`,
      texto: "El NDVI no cae a la mitad antes del 31 de octubre. Rellenar con la mediana habría inventado información." },
    { icono: "location", titulo: "Coordenadas, estado y municipio", dato: "Memorización",
      texto: "Con ellas el modelo memoriza ubicaciones y la validación luce mejor de lo que es. La ubicación entra de forma controlada por el prior." },
    { icono: "rain", titulo: "Clima de CHIRPS y CHIRTS", dato: "Celdas de ~5 km",
      texto: "La zona cabe en pocas celdas: casi no varía entre parcelas del mismo municipio. Entró de forma indirecta por el simulador." },
  ];
  return (
    <div className="descartadas">
      <Revelar className="descartadas__titulo">
        <h3><Icon name="x-circle" size={20} /> Lo que no entró, y por qué</h3>
        <p>Resultados negativos documentados: varias mejoras aparentes resultaron ser identificadores de ubicación disfrazados.</p>
      </Revelar>
      <div className="descartadas__rejilla">
        {items.map((it, i) => (
          <Revelar key={it.titulo} retraso={(i % 3) * 90} className="descartada">
            <div className="descartada__cabeza"><span><Icon name={it.icono} size={18} /></span><b>{it.dato}</b></div>
            <h4>{it.titulo}</h4>
            <p>{it.texto}</p>
          </Revelar>
        ))}
      </div>
    </div>
  );
}

// ---- El límite: dentro del municipio
function Limite({ parcelas, res }: { parcelas: Parcela[]; res: Resumen }) {
  const corrs = useMemo(() => correlacionesMunicipio(parcelas), [parcelas]);
  const pos = (r: number) => `${50 + r * 50}%`;
  return (
    <Figura titulo="Lo que el modelo no logra" className="figura--aviso"
      sub="Correlación entre lo estimado y lo real DENTRO de cada municipio (10 o más parcelas). La franja sombreada es lo que no se distingue del azar (p ≥ 0.05)."
      fuente="parcelas.json (pred_cv, real, municipio)">
      <div className="limite">
        <div className="limite__eje"><span style={{ left: "0%" }}>−1</span><span style={{ left: "50%" }}>0</span><span style={{ left: "100%" }}>+1</span></div>
        {corrs.map((c, i) => (
          <div key={c.municipio} className="limite__fila" style={{ "--i": i } as CSSProperties}>
            <span className="limite__nombre">{c.municipio}<small>n = {c.n}</small></span>
            <div className="limite__pista">
              <i className="limite__azar" style={{ left: pos(-c.rCrit), width: `${c.rCrit * 100}%` }} />
              <i className="limite__cero" />
              <i className="limite__punto" style={{ left: pos(c.r) }} />
            </div>
            <b>{numSigno(c.r, 2)}</b>
          </div>
        ))}
      </div>
      <div className="limite__conclusion">
        <Icon name="warning" size={20} />
        <p>
          <b>El modelo distingue zonas, no parcelas vecinas.</b> Su R² viene casi todo de separar municipios altos de bajos
          ({res.estados.length} estados, {res.municipios} municipios). La variación dentro del municipio probablemente depende de lo que no
          está en los datos: fecha de siembra real, variedad, fertilización y manejo del agua. Por eso no debe usarse para aprobar o
          negar un crédito a una parcela individual.
        </p>
      </div>
    </Figura>
  );
}
