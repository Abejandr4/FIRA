import { cvAleatorio, cvEspacial, definicion, GLOSARIO, type Ctx } from "./glosario";

const DESCRIPCION_MODELO =
  "El modelo estima el rendimiento de cebada (t/ha) del ciclo abril-octubre 2025 en 197 parcelas de Hidalgo, Puebla y Tlaxcala (138 de entrenamiento con rendimiento conocido y 59 por predecir). Predicción = estimación inicial + corrección satelital. La estimación inicial es el promedio de la media del municipio (suavizada) y la media de las 5 parcelas de entrenamiento más cercanas. La corrección es una regresión Ridge con 34 variables de Sentinel-2 (índices de vegetación y fenología), geometría y topografía. El modelo ubica bien el nivel de rendimiento de cada zona, pero no distingue entre parcelas del mismo municipio. El simulador biofísico es exploratorio y no forma parte de la predicción. Landsat no se usa.";

const r2 = (x: number | null | undefined) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);

export function construirContexto(c: Ctx): string {
  const partes = [DESCRIPCION_MODELO];
  const a = cvAleatorio(c.meta), e = cvEspacial(c.meta);
  if (c.meta && a && e) {
    partes.push("METRICAS: " + JSON.stringify({
      rmse_validacion_aleatoria: r2(a.rmse), mae_validacion_aleatoria: r2(a.mae), r2_validacion_aleatoria: r2(a.r2),
      rmse_validacion_espacial: r2(e.rmse), rmse_predecir_la_media_general: r2(c.meta.rmse_media_global),
      intervalo_80_pct_semiancho_t_ha: r2(c.meta.q80), intervalo_90_pct_semiancho_t_ha: r2(c.meta.q90),
      media_general_entrenamiento_t_ha: r2(c.meta.media_general_entren),
    }));
  }
  const p = c.parcela;
  if (p) {
    partes.push("PARCELA SELECCIONADA: " + JSON.stringify({
      id: p.id, conjunto: p.conjunto, estado: p.estado, municipio: p.municipio, area_ha: r2(p.area_ha),
      rendimiento_estimado_t_ha: r2(p.pred), prior_municipio: r2(p.prior_mun), prior_vecinos: r2(p.prior_vec),
      estimacion_inicial: r2(p.prior), correccion_satelital: r2(p.corr), rendimiento_real_solo_entrenamiento: r2(p.real),
      media_municipal_entrenamiento: r2(p.media_municipio_entren), parcelas_entrenamiento_en_municipio: p.n_entren_municipio,
      confianza: p.confianza, elevacion_m: r2(p.elev_mean), pendiente_grados: r2(p.pend_mean),
      ndvi_maximo_p95: r2(p.ndvi_p95_s2), dia_pico_ndvi: r2(p.ndvi_doy_pico_s2), dia_inicio_crecimiento: r2(p.gu50_doy_s2),
      dia_senescencia: r2(p.sen50_doy_s2), dias_con_ndvi_alto: r2(p.dias_sobre90_s2),
    }));
    if (c.delMunicipio.length)
      partes.push(`MUNICIPIO ${p.municipio}: ${c.delMunicipio.length} parcelas en el dashboard; estimación media ${r2(c.delMunicipio.reduce((s, x) => s + x.pred, 0) / c.delMunicipio.length)} t/ha.`);
  } else partes.push("No hay parcela seleccionada.");
  partes.push("TERMINOS:\n" + GLOSARIO.map((t) => `${t.termino}: ${definicion(t, c).split(". ")[0]}`).join("\n"));
  return partes.join("\n\n").slice(0, 9000);
}