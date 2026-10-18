/**
 * Serie NDVI de la parcela (Sentinel-2, malla de 5 días) contra la mediana del municipio.
 * Datos: ndvi.json (useNdvi) y parcelas.json (useParcelas, para agrupar por municipio).
 * El marcador va sobre la curva, en el día del pico (ndvi_doy_pico_s2); la etiqueta usa el NDVI máximo
 * del resumen (ndvi_p95_s2), que puede diferir un poco del valor de la curva en ese día.
 */
import { useMemo } from "react";
import type { Parcela } from "../../data/tipos";
import { Cargando, ErrorDatos } from "../../components/ui";
import { useNdvi, useParcelas } from "../../data/hooks";
import { fecha, fechaDeDiaDelAnio, num } from "../../lib/formato";

const MIN_PARCELAS_MEDIANA = 3;
const W = 320, H = 90, PAD = 6;

const doy = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return (Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 0)) / 86_400_000;
};

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Trazo SVG que se interrumpe en los valores faltantes. */
function trazo(ys: (number | null)[], xs: number[], y: (v: number) => number) {
  let d = "", pluma = false;
  ys.forEach((v, i) => {
    if (v === null) { pluma = false; return; }
    d += `${pluma ? "L" : "M"}${xs[i].toFixed(1)} ${y(v).toFixed(1)} `;
    pluma = true;
  });
  return d.trim();
}

export function CurvaNdvi({ parcela: p }: { parcela: Parcela }) {
  const ndvi = useNdvi();
  const parcelas = useParcelas();

  const g = useMemo(() => {
    if (!ndvi.datos || !parcelas.datos) return null;
    const { fechas, serie } = ndvi.datos;
    const propia = serie[p.id];
    if (!propia) return "sin_serie" as const;

    const dias = fechas.map(doy);
    const xs = dias.map((d) => ((d - dias[0]) / (dias[dias.length - 1] - dias[0])) * W);

    const ids = parcelas.datos.filter((x) => x.municipio === p.municipio).map((x) => x.id);
    const muni = ids.length >= MIN_PARCELAS_MEDIANA
      ? fechas.map((_, i) => {
          const vs = ids.map((id) => serie[id]?.[i]).filter((v): v is number => v !== null && v !== undefined);
          return vs.length ? mediana(vs) : null;
        })
      : null;

    const todos = [...propia, ...(muni ?? [])].filter((v): v is number => v !== null);
    if (!todos.length) return "sin_serie" as const;
    const lo = Math.min(...todos) - 0.03, hi = Math.max(...todos) + 0.03;
    const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD);

    let pico: { cx: number; cy: number } | null = null;
    if (p.ndvi_doy_pico_s2 !== null) {
      let mejor = -1;
      propia.forEach((v, i) => {
        if (v !== null && (mejor < 0 || Math.abs(dias[i] - p.ndvi_doy_pico_s2!) < Math.abs(dias[mejor] - p.ndvi_doy_pico_s2!))) mejor = i;
      });
      if (mejor >= 0) pico = { cx: xs[mejor], cy: y(propia[mejor] as number) };
    }

    return {
      dParcela: trazo(propia, xs, y),
      dMuni: muni ? trazo(muni, xs, y) : null,
      pico, nMuni: ids.length, inicio: fechas[0], fin: fechas[fechas.length - 1],
    };
  }, [ndvi.datos, parcelas.datos, p]);

  if (ndvi.estado === "error") return <ErrorDatos error={ndvi.error} onReintentar={ndvi.reintentar} />;
  if (parcelas.estado === "error") return <ErrorDatos error={parcelas.error} onReintentar={parcelas.reintentar} />;
  if (g === null) return <Cargando lineas={3} />;
  if (g === "sin_serie") return <p className="caption">No hay serie de NDVI disponible para esta parcela.</p>;

  return (
    <>
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Serie de NDVI de la parcela ${p.id}${g.dMuni ? ` frente a la mediana de ${p.municipio}` : ""}`}>
        {g.dMuni && <path className="line-muted" d={g.dMuni} />}
        <path className="line-active" d={g.dParcela} />
        {g.pico && <circle cx={g.pico.cx} cy={g.pico.cy} r="3.5" />}
      </svg>
      <div className="axis">
        <span>{fecha(g.inicio)}</span>
        <span title={p.ndvi_doy_pico_s2 === null ? undefined : `Día ${num(p.ndvi_doy_pico_s2, 0)} = ${fechaDeDiaDelAnio(Math.round(p.ndvi_doy_pico_s2))}`}>
          NDVI máx. {num(p.ndvi_p95_s2, 2)}{p.ndvi_doy_pico_s2 !== null && ` · Día ${num(p.ndvi_doy_pico_s2, 0)}`}
        </span>
        <span>{fecha(g.fin)}</span>
      </div>
      <p className="caption">
        {g.dMuni
          ? `Línea marcada: parcela ${p.id}. Línea tenue: mediana de las ${g.nMuni} parcelas de ${p.municipio}.`
          : `Línea marcada: parcela ${p.id}. ${p.municipio} tiene solo ${g.nMuni} ${g.nMuni === 1 ? "parcela" : "parcelas"}; con menos de ${MIN_PARCELAS_MEDIANA} no se dibuja una mediana.`}
      </p>
    </>
  );
}