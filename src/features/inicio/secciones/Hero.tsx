/**
 * Portada: presenta el reto, con una ilustración animada (campo de cebada, parcelas coloreadas con las
 * predicciones reales, satélite que barre el terreno) y cifras clave que cuentan al aparecer.
 * Datos: parcelas.json y meta.json (pueden llegar después: la portada se pinta igual con "…").
 */
import type { CSSProperties } from "react";
import { Icon } from "../../../components/ui";
import type { MetaModelo, Parcela } from "../../../data/tipos";
import { num } from "../../../lib/formato";
import { Contador, useEnVista } from "../animacion";
import { colorRampa, type Resumen } from "../datos";

export function Hero({ res, parcelas, meta, irA, irMapa }: {
  res?: Resumen; parcelas?: Parcela[]; meta?: MetaModelo; irA: (id: string) => void; irMapa: () => void;
}) {
  const [refStats, visto] = useEnVista<HTMLDivElement>(0.3);
  const mejora = meta ? 100 * (1 - meta.cv_aleatorio.rmse / meta.rmse_media_global) : 0;

  return (
    <section className="hero" id="inicio" aria-labelledby="hero-titulo">
      <div className="hero__fondo" aria-hidden="true" />
      <div className="contenedor hero__grid">
        <div className="hero__texto">
          <span className="pildora entra" style={{ "--d": "0ms" } as CSSProperties}>
            <span className="pildora__punto" /> Reto AgroCebada 2026 · FIRA Innovación
          </span>
          <h1 id="hero-titulo" className="hero__titulo entra" style={{ "--d": "90ms" } as CSSProperties}>
            ¿Cuánta cebada dará <em>cada parcela</em> antes de la cosecha?
          </h1>
          <p className="hero__lead entra" style={{ "--d": "180ms" } as CSSProperties}>
            Pronosticamos el rendimiento de cebada maltera, en <b>toneladas por hectárea</b>, del ciclo abril–octubre
            de 2025 en {res ? <b>{res.n} parcelas</b> : "las parcelas"} de {res ? res.estados.join(", ").replace(/, ([^,]*)$/, " y $1") : "Hidalgo, Puebla y Tlaxcala"}.
            El modelo parte de lo que rinden las parcelas vecinas y lo corrige con imágenes de Sentinel-2.
          </p>
          <div className="hero__acciones entra" style={{ "--d": "270ms" } as CSSProperties}>
            <button type="button" className="boton boton--primario" onClick={() => irA("reto")}>
              Conocer el reto <Icon name="down" size={17} />
            </button>
            <button type="button" className="boton" onClick={irMapa}>
              <Icon name="map" size={17} /> Ir al mapa
            </button>
          </div>
        </div>

        <div className="hero__ilustracion entra" style={{ "--d": "120ms" } as CSSProperties}>
          <IlustracionCampo parcelas={parcelas} />
          {res && (
            <>
              <div className="chip-flotante chip-flotante--1"><Icon name="satellite" size={15} /> NDVI máx. mediano <b>{num(res.ndviMaxMediano, 2)}</b></div>
              <div className="chip-flotante chip-flotante--2"><Icon name="polygon" size={15} /> <b>{res.municipios}</b> municipios · <b>{num(res.areaTotal, 0)}</b> ha</div>
              <div className="chip-flotante chip-flotante--3"><Icon name="calendar" size={15} /> Ciclo <b>abr → oct 2025</b></div>
            </>
          )}
        </div>
      </div>

      <div ref={refStats} className="contenedor hero__stats" aria-live="polite">
        <div className="stat">
          <Icon name="grid" size={20} />
          <strong>{res ? <Contador valor={res.n} activo={visto} /> : "…"}</strong>
          <span>parcelas en el reto</span>
          {res && (
            <div className="stat__split" aria-label={`${res.entren.length} de entrenamiento y ${res.pred.length} por predecir`}>
              <i style={{ flexGrow: res.entren.length }} /><i style={{ flexGrow: res.pred.length }} />
            </div>
          )}
          {res && <small><b className="t-entren">{res.entren.length}</b> con rendimiento · <b className="t-pred">{res.pred.length}</b> por predecir</small>}
        </div>
        <div className="stat">
          <Icon name="layers" size={20} />
          <strong>{meta ? <Contador valor={meta.n_variables} activo={visto} /> : "…"}</strong>
          <span>variables en el modelo</span>
          <small>Sentinel-2, fenología, forma y terreno</small>
        </div>
        <div className="stat">
          <Icon name="target" size={20} />
          <strong>{meta ? <Contador valor={meta.cv_aleatorio.rmse} decimales={2} activo={visto} /> : "…"}<em> t/ha</em></strong>
          <span>error típico (RMSE)</span>
          <small>validación cruzada aleatoria</small>
        </div>
        <div className="stat stat--acento">
          <Icon name="chart" size={20} />
          <strong>{meta ? <Contador valor={mejora} activo={visto} sufijo=" %" /> : "…"}</strong>
          <span>menos error que la media</span>
          <small>{meta ? `predecir siempre ${num(meta.media_general_entren, 2)} t/ha da ${num(meta.rmse_media_global, 2)}` : ""}</small>
        </div>
      </div>

      <button type="button" className="hero__scroll" onClick={() => irA("reto")} aria-label="Bajar a la siguiente sección">
        <span>Desliza para explorar</span>
        <Icon name="down" size={20} />
      </button>
    </section>
  );
}

// ---- Ilustración
const PF = { vx: 260, vy: 165, k: 0.31, filas: [252, 268, 290, 322, 366, 430], cols: 8 };

/** Punto del suelo en perspectiva: u = columna (0–8), y = línea de fila. */
const suelo = (u: number, y: number) => [PF.vx + (u - PF.cols / 2) * PF.k * (y - PF.vy), y] as const;

function IlustracionCampo({ parcelas }: { parcelas?: Parcela[] }) {
  const preds = parcelas?.map((p) => p.pred) ?? [];
  const lo = preds.length ? Math.min(...preds) : 0, hi = preds.length ? Math.max(...preds) : 1;
  const cuadros: { d: string; color: string; i: number }[] = [];
  for (let f = 0; f < PF.filas.length - 1; f++) {
    for (let c = 0; c < PF.cols; c++) {
      const i = f * PF.cols + c;
      const v = preds.length ? preds[(i * 5) % preds.length] : NaN;
      const y0 = PF.filas[f] + 1.5, y1 = PF.filas[f + 1] - 1.5;
      const pts = [suelo(c + 0.06, y0), suelo(c + 0.94, y0), suelo(c + 0.94, y1), suelo(c + 0.06, y1)];
      cuadros.push({
        i, d: `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`,
        color: Number.isNaN(v) ? "var(--surface-3)" : colorRampa((v - lo) / (hi - lo || 1)),
      });
    }
  }
  const tallos = Array.from({ length: 17 }, (_, i) => ({ x: 14 + i * 30 + ((i * 37) % 11), h: 92 + ((i * 53) % 60), i }));

  return (
    <svg className="ilu" viewBox="0 0 520 440" role="img"
      aria-label="Ilustración: campo de cebada dividido en parcelas coloreadas según su rendimiento estimado, observado por un satélite">
      <defs>
        <linearGradient id="ilu-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ilu-cielo-1" /><stop offset="1" className="ilu-cielo-2" />
        </linearGradient>
        <linearGradient id="ilu-haz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--amber)" stopOpacity=".55" /><stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ilu-brillo"><stop offset="0" stopColor="var(--amber)" stopOpacity=".45" /><stop offset="1" stopColor="var(--amber)" stopOpacity="0" /></radialGradient>
        <clipPath id="ilu-marco"><rect width="520" height="440" rx="28" /></clipPath>
      </defs>
      <g clipPath="url(#ilu-marco)">
        <rect width="520" height="440" fill="url(#ilu-cielo)" />
        <g className="ilu-estrellas">
          {[[40, 40], [120, 70], [210, 30], [300, 80], [480, 30], [460, 160], [90, 150], [250, 120]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.6} style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
        <g className="ilu-astro">
          <circle cx="420" cy="92" r="70" fill="url(#ilu-brillo)" />
          <g className="ilu-rayos">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="420" y1="44" x2="420" y2="34" transform={`rotate(${i * 30} 420 92)`} />
            ))}
          </g>
          <circle cx="420" cy="92" r="30" className="ilu-sol" />
          <circle cx="436" cy="80" r="27" className="ilu-sombra-luna" />
        </g>
        <path className="ilu-cerro ilu-cerro--lejos" d="M0 238 C70 196 120 214 190 200 C260 186 300 222 370 206 C430 192 480 204 520 196 V260 H0Z" />
        <path className="ilu-cerro" d="M0 256 C90 232 160 246 250 236 C330 228 420 250 520 236 V270 H0Z" />
        <g className="ilu-parcelas">
          {cuadros.map((q) => (
            <path key={q.i} d={q.d} fill={q.color} style={{ animationDelay: `${300 + q.i * 22}ms` }} />
          ))}
        </g>
        <g className="ilu-satelite">
          <polygon className="ilu-haz" points="0,14 -70,215 70,215" fill="url(#ilu-haz)" />
          <g className="ilu-satelite__cuerpo">
            <rect x="-26" y="-6" width="16" height="12" rx="1.5" className="ilu-panel" />
            <rect x="10" y="-6" width="16" height="12" rx="1.5" className="ilu-panel" />
            <path d="M-10 0H-6M6 0h4" className="ilu-linea" />
            <rect x="-6" y="-8" width="12" height="16" rx="3" className="ilu-sat-caja" />
            <circle cx="0" cy="11" r="2.4" className="ilu-sat-lente" />
          </g>
        </g>
        <g className="ilu-tallos">
          {tallos.map(({ x, h, i }) => {
            const base = 446, top = base - h;
            return (
              <g key={i} className="ilu-tallo" style={{ transformOrigin: `${x}px ${base}px`, animationDelay: `${-i * 0.37}s` }}>
                <path d={`M${x} ${base} Q ${x + 2} ${base - h / 2} ${x + 7} ${top}`} className="ilu-tallo__caña" />
                <path d={`M${x + 1} ${base - h * 0.35} q -16 -10 -22 -30`} className="ilu-tallo__hoja" />
                {Array.from({ length: 6 }, (_, k) => {
                  const gy = top - k * 7, gx = x + 7 + k * 0.6, lado = k % 2 ? 1 : -1;
                  return (
                    <g key={k}>
                      <ellipse cx={gx + lado * 3} cy={gy} rx="3" ry="5.5" transform={`rotate(${lado * 24} ${gx + lado * 3} ${gy})`} className="ilu-grano" />
                      <path d={`M${gx + lado * 4} ${gy - 4} l ${lado * 6} -16`} className="ilu-arista" />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
