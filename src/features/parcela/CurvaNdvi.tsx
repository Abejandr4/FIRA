/**
 * Serie NDVI de la parcela contra la mediana del municipio.
 * TODO(parcela): dibujar con useNdvi() → serie[parcela.id] y la mediana de las parcelas del mismo municipio
 * (parcelas.json filtrado por municipio). Marcar el pico (ndvi_p95_s2, ndvi_doy_pico_s2).
 */
import type { Parcela } from "../../data/tipos";

export function CurvaNdvi(_: { parcela: Parcela }) {
  return (
    <>
      <svg className="line-chart" viewBox="0 0 320 90" preserveAspectRatio="none" aria-label="Serie de NDVI (relleno de diseño)">
        <path className="line-muted" d="M0 75 C40 73 58 65 82 42 S132 10 166 22 205 64 250 69 L320 74" />
        <path className="line-active" d="M0 77 C42 72 64 61 90 36 S138 14 172 17 211 61 256 67 L320 72" />
        <circle cx="153" cy="16" r="3.5" />
      </svg>
      <div className="axis"><span>Inicio</span><span>NDVI máx. XX,X · Día XX</span><span>Fin</span></div>
    </>
  );
}
