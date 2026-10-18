import type { MetaModelo, Parcela } from "../../data/tipos";
import { num } from "../../lib/formato";

export interface Ctx { parcela: Parcela | null; delMunicipio: Parcela[]; todas: Parcela[]; meta: MetaModelo | null }
export interface MetricasCV { rmse: number; rmse_prior?: number; mae?: number; r2?: number }
export const cvAleatorio = (m: MetaModelo | null) => (m ? (m.cv_aleatorio as unknown as MetricasCV) : null);
export const cvEspacial = (m: MetaModelo | null) => (m ? (m.cv_espacial as unknown as MetricasCV) : null);

/** Minúsculas, sin acentos ni signos: "¿Qué es el R²?" → "que es el r2". */
export const normalizar = (s: string) =>
  s.toLowerCase().replace(/²/g, "2").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%\s]/g, " ").replace(/\s+/g, " ").trim();

export interface Termino { id: string; termino: string; alias: string[]; definicion: string | ((c: Ctx) => string) }
export const definicion = (t: Termino, c: Ctx) => (typeof t.definicion === "string" ? t.definicion : t.definicion(c));

export const GLOSARIO: Termino[] = [
  { id: "prior", termino: "Estimación inicial (prior)", alias: ["prior", "estimacion inicial", "referencia por ubicacion"],
    definicion: "Estimación inicial del rendimiento de una parcela, calculada antes de mirar sus imágenes: el promedio de la media de las parcelas de entrenamiento de su municipio (suavizada hacia la media general cuando hay pocas) y la media de las 5 parcelas de entrenamiento más cercanas. La propia parcela nunca participa en su cálculo. Casi todo el poder predictivo del modelo viene de aquí." },
  { id: "vecinos", termino: "Parcelas vecinas", alias: ["vecinos", "parcelas vecinas", "prior de vecinos"],
    definicion: "Las 5 parcelas de entrenamiento más cercanas geográficamente. Su rendimiento medio es una de las dos referencias de la estimación inicial." },
  { id: "correccion", termino: "Corrección satelital", alias: ["correccion satelital", "correccion"],
    definicion: "Ajuste que el modelo suma a la estimación inicial a partir del NDVI y otros índices de Sentinel-2, la fenología y el terreno de la parcela. Suele ser de unas pocas centésimas de t/ha, porque la ubicación ya explica casi todo el rendimiento esperado." },
  { id: "intervalo", termino: "Intervalo de predicción (80 % y 90 %)", alias: ["intervalo", "intervalos", "intervalo de prediccion", "rango de prediccion"],
    definicion: (c) => "Rango donde se espera que caiga el rendimiento real." +
      (c.meta ? ` Al 80 % es la estimación ± ${num(c.meta.q80, 2)} t/ha; al 90 %, ± ${num(c.meta.q90, 2)} t/ha.` : "") +
      " Sale de los errores de validación cruzada, así que es aproximado y no una garantía para cada parcela." },
  { id: "rmse", termino: "RMSE (error típico)", alias: ["rmse", "error tipico", "error cuadratico medio"],
    definicion: (c) => { const a = cvAleatorio(c.meta);
      return "Error típico de las predicciones, en t/ha: mientras más bajo, mejor." +
        (a && c.meta ? ` En la validación aleatoria es ${num(a.rmse, 2)} t/ha; predecir siempre la media general daría ${num(c.meta.rmse_media_global, 2)} t/ha.` : ""); } },
  { id: "mae", termino: "MAE (error absoluto promedio)", alias: ["mae", "error absoluto"],
    definicion: (c) => { const a = cvAleatorio(c.meta);
      return "Error absoluto promedio, en t/ha: se promedian las diferencias sin importar si el modelo se pasó o se quedó corto." +
        (a?.mae !== undefined ? ` En la validación aleatoria es ${num(a.mae, 2)} t/ha.` : ""); } },
  { id: "r2", termino: "R²", alias: ["r2", "r cuadrada", "r cuadrado", "coeficiente de determinacion"],
    definicion: (c) => { const a = cvAleatorio(c.meta);
      return "Proporción de la variación del rendimiento que explica el modelo: 1 sería perfecto y 0 equivale a predecir siempre la media." +
        (a?.r2 !== undefined ? ` En validación aleatoria es ${num(a.r2, 2)}, pero casi todo viene de separar municipios de rendimiento alto y bajo, no de distinguir parcelas vecinas.` : ""); } },
  { id: "validacion", termino: "Validación cruzada (aleatoria y espacial)", alias: ["validacion cruzada", "validacion", "validacion aleatoria", "validacion espacial"],
    definicion: (c) => { const a = cvAleatorio(c.meta), e = cvEspacial(c.meta);
      return "Forma de medir el modelo con parcelas que no vio al entrenar. La aleatoria reparte las parcelas al azar y replica el reto, donde las parcelas por predecir están entre parcelas conocidas. La espacial deja fuera zonas completas y mide qué pasa sin vecinos cercanos." +
        (a && e ? ` Error típico: ${num(a.rmse, 2)} t/ha (aleatoria) y ${num(e.rmse, 2)} t/ha (espacial).` : ""); } },
  { id: "ndvi", termino: "NDVI", alias: ["ndvi"],
    definicion: "Índice de vigor de la vegetación calculado con imágenes de Sentinel-2. Va de −1 a 1: valores altos indican cultivo verde y denso; valores bajos, suelo desnudo." },
  { id: "evi", termino: "EVI", alias: ["evi"],
    definicion: "Índice de vegetación mejorado: parecido al NDVI, pero se satura menos cuando hay mucha vegetación y corrige parte del efecto del suelo y la atmósfera." },
  { id: "lai", termino: "LAI (índice de área foliar)", alias: ["lai", "indice de area foliar"],
    definicion: "Metros cuadrados de hojas por metro cuadrado de suelo. Mide cuánta superficie de hojas tiene el cultivo." },
  { id: "msi", termino: "MSI", alias: ["msi"],
    definicion: "Índice de estrés hídrico en la vegetación (cociente entre dos bandas infrarrojas): valores más altos suelen asociarse con menos agua en las hojas." },
  { id: "ndwi", termino: "NDWI", alias: ["ndwi"],
    definicion: "Índice de agua en la vegetación: valores más altos indican más contenido de agua en las hojas." },
  { id: "percentiles", termino: "NDVI máximo y mínimo (percentiles 95 y 5)", alias: ["ndvi maximo", "ndvi minimo", "percentil 95", "percentil 5", "p95", "p05"],
    definicion: "NDVI máximo (percentil 95 de la temporada): qué tan verde llegó a estar la parcela. NDVI mínimo (percentil 5): el suelo más desnudo observado. Se usan percentiles y no el máximo y mínimo absolutos para que un dato ruidoso no los mueva." },
  { id: "fenologia", termino: "Fenología", alias: ["fenologia", "ciclo del cultivo"],
    definicion: "Calendario de crecimiento del cultivo, estimado de la curva de NDVI de abril a octubre de 2025: cuándo empieza a crecer, cuándo llega a la mitad de la subida, cuándo alcanza el pico y cuántos días se mantiene alto. Sirve como indicio de la fecha de siembra, que el reto no incluye." },
  { id: "crecimiento", termino: "Inicio de crecimiento, pico y días con NDVI alto", alias: ["inicio de crecimiento", "inicio crecimiento", "dia del pico", "pico de ndvi", "dias con ndvi alto"],
    definicion: "Inicio de crecimiento: día del año en que el NDVI alcanzó la mitad de su subida. Pico: día con el NDVI más alto. Días con NDVI alto: días cercanos al pico (por encima del 90 % de la distancia entre el mínimo y el pico)." },
  { id: "senescencia", termino: "Inicio de senescencia", alias: ["senescencia", "inicio de senescencia", "ciclo sin senescencia"],
    definicion: "Día en que el NDVI cae a la mitad de su amplitud, algo posterior al inicio real de la maduración y el secado. En cerca de dos de cada tres parcelas no ocurre antes del 31 de octubre; entonces se muestra «Ciclo sin senescencia observada»." },
  { id: "auc", termino: "Área bajo la curva del NDVI", alias: ["area bajo la curva", "auc"],
    definicion: "El verdor acumulado durante la temporada. Una curva alta y ancha da un valor mayor." },
  { id: "confianza", termino: "Confianza baja", alias: ["confianza baja", "confianza estandar"],
    definicion: (c) => { const p = c.parcela;
      const base = "Aviso para parcelas de municipios con menos de 3 parcelas de entrenamiento: su estimación inicial depende de muy pocos datos y de la cercanía a otras parcelas.";
      if (!p) return base;
      const n = p.n_entren_municipio, u = n === 1 ? "parcela" : "parcelas";
      return `${base} ${p.id} tiene confianza ${p.confianza === "baja" ? "baja" : "estándar"}: ${p.municipio} tiene ${n} ${u} de entrenamiento.`; } },
  { id: "conjuntos", termino: "Entrenamiento y predicción", alias: ["conjunto de entrenamiento", "conjunto de prediccion", "parcela de entrenamiento", "parcela de prediccion", "entrenamiento"],
    definicion: "Las parcelas de entrenamiento tienen rendimiento conocido y el modelo aprende de ellas. En las de predicción el rendimiento se estima. Para las de entrenamiento, el dashboard muestra una estimación hecha sin usar su propio rendimiento, para que la comparación sea honesta." },
  { id: "sentinel", termino: "Sentinel-2", alias: ["sentinel 2", "sentinel2", "sentinel"],
    definicion: "Satélite europeo con una revisita de unos 5 días y 10 m de resolución en las bandas visibles e infrarrojo cercano. De sus series se calculan los índices de vegetación del modelo." },
  { id: "simulador", termino: "Simulador biofísico", alias: ["simulador", "simulador biofisico", "biofisico", "biofisicas"],
    definicion: "Modelo de procesos del equipo (agua, temperatura y biomasa del cultivo). Es exploratorio: sus valores no forman parte de la predicción, porque en las pruebas no mejoraron el modelo de forma demostrable. Sirve para explicar, por ejemplo, el estrés hídrico a lo largo del ciclo." },
  { id: "estres", termino: "Estrés hídrico (Ks)", alias: ["estres hidrico", "ks", "coeficiente de estres"],
    definicion: "Coeficiente del simulador: 1 significa sin estrés, y valores menores indican que el agua limitó al cultivo. Pertenece a la vista exploratoria del simulador, no a la predicción." },
  { id: "gdd", termino: "Grados-día (GDD)", alias: ["gdd", "grados dia"],
    definicion: "Acumulación de calor sobre una temperatura base, usada para estimar en qué etapa del ciclo está el cultivo. Es una variable del simulador (exploratoria)." },
  { id: "eto", termino: "ETo y ETa", alias: ["eto", "eta", "evapotranspiracion"],
    definicion: "ETo es la evapotranspiración de referencia (la demanda de agua de la atmósfera); ETa es la evapotranspiración real del cultivo. Cuando la real queda por debajo de la demanda hay déficit hídrico. Son salidas del simulador (exploratorias)." },
  { id: "ingreso", termino: "Ingreso bruto estimado", alias: ["ingreso bruto", "ingreso", "precio por tonelada", "produccion estimada", "produccion"],
    definicion: "Rendimiento estimado × superficie × el precio por tonelada que captures. El rango usa el intervalo al 80 %. No incluye costos y no es una oferta de crédito ni una asesoría financiera." },
  { id: "quesi", termino: "¿Qué pasaría si…?", alias: ["que pasaria si", "exploracion del modelo"],
    definicion: "Al mover variables satelitales de la parcela se recalcula la corrección. No es un efecto causal, porque en la realidad esas variables se mueven juntas. El efecto es pequeño porque casi toda la predicción viene de la ubicación." },
  { id: "percentil", termino: "Percentil frente al municipio", alias: ["percentil frente al municipio", "diagnostico comparativo", "senales", "percentil"],
    definicion: "Posición de la parcela entre las parcelas de su municipio: 50 es un valor típico y 90 está entre el 10 % más alto. Solo se muestra con 10 o más parcelas en el municipio." },
  { id: "medias", termino: "Media municipal y media general", alias: ["media municipal", "media del municipio", "media general"],
    definicion: (c) => "Media municipal: rendimiento medio real de las parcelas de entrenamiento del municipio. Media general: promedio de las 138 parcelas de entrenamiento" +
      (c.meta ? ` (${num(c.meta.media_general_entren, 2)} t/ha).` : ".") },
  { id: "tha", termino: "t/ha", alias: ["t ha", "toneladas por hectarea"],
    definicion: "Toneladas por hectárea. 1 t/ha equivale a 1000 kg por hectárea." },
];