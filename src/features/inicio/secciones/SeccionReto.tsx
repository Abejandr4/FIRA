/**
 * 01 · El reto: el problema, la temporada (fenología media observada con NDVI) y qué parcelas hay que predecir.
 * Datos: parcelas.json. Textos: reporte técnico, secciones 1 y 2.
 */
import type { CSSProperties } from "react";
import { Icon } from "../../../components/ui";
import type { Parcela } from "../../../data/tipos";
import { fechaDeDiaDelAnio, num } from "../../../lib/formato";
import { Revelar, useTip, TipGrafico } from "../animacion";
import { Encabezado, Figura, Leyenda } from "../comunes";
import { fenologia, type Resumen } from "../datos";

const INICIO = 91, FIN = 304; // 1 de abril y 31 de octubre de 2025 (día del año)
const MESES = [["Abr", 91], ["May", 121], ["Jun", 152], ["Jul", 182], ["Ago", 213], ["Sep", 244], ["Oct", 274]] as const;
const pos = (doy: number) => `${(100 * (doy - INICIO)) / (FIN - INICIO)}%`;

export function SeccionReto({ parcelas, res }: { parcelas: Parcela[]; res: Resumen }) {
  const fen = fenologia(parcelas);
  return (
    <section id="reto" className="seccion" aria-labelledby="reto-titulo">
      <div className="contenedor">
        <Encabezado numero="01" eyebrow="El reto" icono="target" titulo={<span id="reto-titulo">Un cultivo estratégico, una pregunta financiera</span>}>
          La cebada maltera abastece a la industria cervecera y se concentra en el altiplano central. Saber cuánto
          rendirá antes de la cosecha define el ingreso con el que se paga un crédito.
        </Encabezado>

        <div className="tarjetas-3">
          {([
            ["wheat", "El cultivo", "Cebada maltera de temporal en Hidalgo, Puebla y Tlaxcala. Su rendimiento depende de cuándo se siembra, del agua en el espigado y llenado del grano, del suelo y del manejo."],
            ["target", "Lo que se pide", <>Pronosticar <code>RENDIMIENTO_T_HA</code> (toneladas por hectárea) del ciclo abril–octubre de 2025 y entregar una herramienta para consultarlo.</>],
            ["bank", "Por qué importa", "Para productores, agroindustria e instituciones que financian el cultivo: el rendimiento esperado define el ingreso, el riesgo de crédito y el seguro."],
          ] as const).map(([icono, titulo, texto], i) => (
            <Revelar key={titulo} retraso={i * 110} className="tarjeta tarjeta--icono">
              <span className="tarjeta__icono"><Icon name={icono} size={22} /></span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </Revelar>
          ))}
        </div>

        <Revelar>
          <Figura titulo="La temporada vista desde el satélite"
            sub={`Calendario medio de las ${res.n} parcelas, a partir de su curva de NDVI de Sentinel-2`}
            fuente="parcelas.json (gu50_doy_s2, ndvi_doy_pico_s2, sen50_doy_s2)">
            <div className="temporada">
              <div className="temporada__pista">
                <div className="temporada__relleno" />
                {MESES.map(([m, d]) => <span key={m} className="temporada__mes" style={{ left: pos(d) }}>{m}</span>)}
                <Hito doy={fen.gu50} icono="leaf" titulo="Crecimiento a media subida" detalle={`día ${num(fen.gu50, 0)} · ${fechaDeDiaDelAnio(Math.round(fen.gu50)).slice(0, 5)}`} retraso={500} />
                <Hito doy={fen.pico} icono="sun" titulo="Pico de verdor" detalle={`día ${num(fen.pico, 0)} · ${fechaDeDiaDelAnio(Math.round(fen.pico)).slice(0, 5)}`} retraso={900} />
                <Hito doy={FIN - 1} icono="clock" titulo="Cierre de la ventana" detalle={`${num(100 * fen.fraccionSinSenescencia, 0)} % aún verde`} retraso={1300} alinear="fin" />
              </div>
              <p className="temporada__nota">
                <Icon name="info" size={15} />
                Un ciclo de temporal con siembra hacia mayo o junio. El {num(100 * fen.fraccionSinSenescencia, 0)} % de las parcelas no
                muestra senescencia antes del 31 de octubre; por eso la fecha de senescencia y la duración del ciclo no entraron al modelo.
              </p>
            </div>
          </Figura>
        </Revelar>

        <Revelar>
          <Waffle parcelas={parcelas} res={res} />
        </Revelar>
      </div>
    </section>
  );
}

function Hito({ doy, icono, titulo, detalle, retraso, alinear }: {
  doy: number; icono: "leaf" | "sun" | "clock"; titulo: string; detalle: string; retraso: number; alinear?: "fin";
}) {
  return (
    <div className={`hito${alinear ? " hito--fin" : ""}`} style={{ left: pos(doy), "--retraso-hito": `${retraso}ms` } as CSSProperties}>
      <span className="hito__punto"><Icon name={icono} size={14} /></span>
      <div className="hito__texto"><b>{titulo}</b><small>{detalle}</small></div>
    </div>
  );
}

function Waffle({ parcelas, res }: { parcelas: Parcela[]; res: Resumen }) {
  const { contRef, tip, mostrar, ocultar } = useTip();
  return (
    <Figura titulo={`${res.n} parcelas: ${res.entren.length} para aprender, ${res.pred.length} para predecir`}
      sub="Cada cuadro es una parcela. Las de entrenamiento traen su rendimiento medido; las demás son las que el reto pide estimar."
      fuente="parcelas.json (conjunto, estado)">
      <Leyenda items={[
        { color: "var(--s1)", texto: `Entrenamiento · ${res.entren.length}` },
        { color: "var(--amber)", texto: `Por predecir · ${res.pred.length}` },
      ]} />
      <div className="waffles" ref={contRef} onPointerLeave={ocultar}>
        {res.estados.map((e) => {
          const del = parcelas.filter((p) => p.estado === e)
            .sort((a, b) => (a.conjunto === b.conjunto ? a.id.localeCompare(b.id) : a.conjunto === "ENTRENAMIENTO" ? -1 : 1));
          const nE = del.filter((p) => p.conjunto === "ENTRENAMIENTO").length;
          return (
            <div key={e} className="waffle">
              <div className="waffle__titulo"><b>{e}</b><span>{nE} + {del.length - nE}</span></div>
              <div className="waffle__celdas" role="img" aria-label={`${e}: ${nE} parcelas de entrenamiento y ${del.length - nE} por predecir`}>
                {del.map((p, i) => (
                  <i key={p.id} className={p.conjunto === "PREDICCION" ? "es-pred" : ""} style={{ "--i": i } as CSSProperties}
                    onPointerMove={(ev) => mostrar(ev, <><b>{p.id}</b><span>{p.municipio}</span><span>{p.conjunto === "PREDICCION" ? `Estimado: ${num(p.pred, 2)} t/ha` : `Real: ${num(p.real, 2)} t/ha`}</span></>)} />
                ))}
              </div>
            </div>
          );
        })}
        <TipGrafico tip={tip} />
      </div>
    </Figura>
  );
}
