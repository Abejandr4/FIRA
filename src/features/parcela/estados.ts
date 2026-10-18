/**
 * Criterio de interfaz para «por encima / cerca / por debajo» de la media municipal.
 * No es un criterio estadístico: el modelo casi no distingue entre parcelas del mismo municipio,
 * así que la mayoría de las parcelas caerá en «cerca».
 */
export const UMBRAL_CERCA_T_HA = 0.2;

export function posicionRespectoMunicipio(
  pred: number,
  mediaMunicipio: number | null,
): "por encima de" | "cerca de" | "por debajo de" | null {
  if (mediaMunicipio === null) return null;
  const d = pred - mediaMunicipio;
  if (d > UMBRAL_CERCA_T_HA) return "por encima de";
  if (d < -UMBRAL_CERCA_T_HA) return "por debajo de";
  return "cerca de";
}