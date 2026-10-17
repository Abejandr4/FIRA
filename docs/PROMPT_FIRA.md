# Prompt de diseño (vista de detalle de parcela y simulador)

Diseña la vista de detalle de una parcela para el dashboard del Reto AgroCebada FIRA 2026 (predicción de rendimiento de cebada en t/ha). Idioma: español. Tono sobrio y académico. Pensado para escritorio, con versión adaptable a tablet. Entrega un layout para Figma con componentes reutilizables y los estados descritos al final.

Estructura (de arriba hacia abajo):

1. ENCABEZADO DE IDENTIFICACIÓN
- ID de la parcela (ID_POLIGONO), Estado y Municipio, coordenadas (lat, lon) y superficie (area_ha_geom, en ha).
- Etiqueta de conjunto: "Entrenamiento (rendimiento conocido)" o "Predicción".
- Etiqueta de confianza: "Confianza baja" cuando el municipio tiene menos de 3 parcelas de entrenamiento (n_entren_municipio < 3); si no, "Confianza estándar". Tooltip: "Pocas parcelas conocidas en este municipio; la estimación inicial es menos fiable".

2. RENDIMIENTO
- Tarjeta principal: rendimiento estimado en t/ha (pred), con intervalo al 80 % (±0.56 t/ha) y al 90 % (±0.76 t/ha) leídos de meta.json (q80, q90).
- Si la parcela es de entrenamiento: rendimiento real (RENDIMIENTO_T_HA) y error de la predicción fuera de muestra, mostrados al lado de la estimación.
- Producción total estimada = pred × area_ha_geom, en toneladas, con su intervalo.
- Comparación: barra horizontal con la media del municipio, la media general (entrenamiento) y la parcela.
- "Cómo se obtuvo": gráfico de cascada con tres pasos: estimación por municipio, estimación por vecinos cercanos y corrección satelital (positiva o negativa, normalmente menor a 0.2 t/ha). Leyenda: "Casi toda la estimación proviene de la ubicación; la corrección satelital es pequeña". Requiere los campos prior_mun, prior_vec y corr por parcela.

3. FINANCIERO
- Ingreso bruto estimado = pred × area_ha_geom × precio por tonelada, con el rango asociado al intervalo del 80 %.
- El precio por tonelada es un campo editable con indicación de fuente y fecha; mientras no se capture, la tarjeta muestra "Captura un precio por tonelada para calcular el ingreso" y no ningún número. No incluir costos salvo que se aporten.
- Mini-sensibilidad: ingreso con rendimiento bajo, central y alto del intervalo.

4. DATOS RELEVANTES DE LA PARCELA
- Terreno: elevación media (elev_mean) y pendiente media (pend_mean), con su posición frente al municipio.
- Forma: compacidad y elongación, con una frase de lectura ("regular" / "alargada").
- Cultivo (Sentinel-2): serie temporal de NDVI de la parcela (serie_s2) superpuesta a la mediana del municipio; marcadores del NDVI máximo (ndvi_p95_s2) y de su fecha (ndvi_doy_pico_s2).
- Fenología: inicio de crecimiento (gu50_doy_s2), inicio de senescencia (sen50_doy_s2, si existe), duración (dur50_dias_s2) y días sobre NDVI 0.90 (dias_sobre90_s2). Si no hay senescencia detectada, indicar "Ciclo sin senescencia observada".
- Cada indicador va con su percentil respecto a las parcelas del mismo municipio.

5. VISTA GENERAL (recuadro)
- Mini-mapa con el polígono de la parcela y las parcelas vecinas coloreadas por rendimiento (estimado o real).
- Resumen de 2 a 3 frases generado con reglas, p. ej.: "Parcela de X ha en [Municipio], con rendimiento estimado de Y t/ha, [por encima / cerca / por debajo] de la media municipal (Z t/ha)."

6. DIAGNÓSTICO COMPARATIVO
- Lista de 2 a 4 señales calculadas por comparación con las parcelas del mismo municipio (NDVI máximo, inicio de crecimiento, pendiente, duración del ciclo), redactadas como observaciones a verificar en campo. Nunca como causa ni como promesa de mejora. Texto fijo al pie: "Estas señales describen diferencias con parcelas similares; no demuestran causalidad ni cuantifican una mejora." Si no hay diferencias relevantes: "Sin diferencias relevantes frente a parcelas del municipio". No mostrar percentiles de municipios con menos de 10 parcelas.

7. SIMULADOR BIOFÍSICO (vista aparte, accesible con el botón "Ver simulador (exploratorio)"; nota junto al botón: "Los valores del simulador no forman parte de la predicción")

Encabezado de la vista: ID de la parcela, Estado y Municipio, y tres fechas clave (siembra, floración, madurez), cada una con etiqueta de origen: "estimada con satélite" o "ingresada". Si la parcela es de doble ciclo (31 de 197), insignia discreta con tooltip: "El NDVI muestra un primer ciclo de vegetación que cae en julio; la fecha de siembra tiene dos lecturas posibles". Un control segmentado alterna entre Resultados y Explorador.

Vista A, Resultados
- Doce tarjetas en tres grupos, cada uno con una pregunta como título:
  · Fenología, "¿cuándo?" (3): GDD_antesis, GDD_llenado, DAP_antesis_est.
  · Agua, "¿cuánta tuvo?" (5): ETo_acum, ETa_acum, Deficit_Hidrico_Total, KS_prom_antesis, KS_prom_llenado.
  · Luz y biomasa, "¿cuánto creció?" (4): fPAR_integrado, Biomasa_Antesis_Sim, Biomasa_Total_Sim, HI_penalizado.
- Cada tarjeta: nombre en lenguaje sencillo (grande) y nombre técnico de la columna (pequeño); valor con unidad; barra de posición entre las 197 parcelas (percentil, con la parcela marcada); ícono (i) con tooltip accesible por hover y por teclado (textos al final).
- Color semántico solo en KS_prom_antesis y KS_prom_llenado (más alto = mejor). El resto en tonos neutros; el déficit hídrico no se pinta como bueno o malo. El color nunca es el único portador de información.
- Variable casi constante: si más del 70 % de las parcelas comparten el mismo valor (p. ej. HI_penalizado, 0.45 en 149 de 197), no mostrar la barra de percentil; mostrar "Valor casi igual en todas las parcelas".
- Una frase de lectura por grupo, generada con reglas (p. ej. en Agua: "Poco estrés en la floración, estrés moderado en el llenado"). Los cortes son criterios de interfaz, no umbrales publicados.
- Sección plegada "Otras salidas del simulador" con las 3 columnas extra del escenario base (nombres por confirmar).
- Gráfico global de sensibilidad (supuestos más influyentes; fecha de siembra primero).
- Advertencias visibles: "La biomasa total es un criterio de ordenamiento entre parcelas, no un valor absoluto, y no es rendimiento de grano." y "El índice de cosecha vale 0.45 en 149 de 197 parcelas."

Vista B, Explorador
- Izquierda, "Cebada de esta parcela": ilustración esquemática de la planta, con variantes por etapa (suelo desnudo antes de sembrar, vegetativa, floración, llenado de grano, madurez dorada) y por estrés de agua (verde firme / amarillo con hojas caídas). Qué controla cada elemento: densidad del follaje = fPAR; color = KS; tamaño de la espiga = biomasa acumulada. Debajo: línea de tiempo con la fecha, botón de reproducir y pausar, y dos barras de progreso: "Tiempo térmico" (porcentaje del objetivo de madurez) y "Agua en el suelo" (entre punto de marchitez y capacidad de campo). Leyenda: "Representación esquemática; no es una fotografía ni un pronóstico."
- Derecha, tarjeta "Retroalimentación: así va el cultivo":
  · Campo "Fecha de siembra real (opcional)". Por defecto muestra "Estimada con satélite: [fecha]". Selector "Usar: estimada / ingresada" que deja claro cuál se usa. Chip opcional "Referencia FIRA: principios de mayo (aproximada)".
  · Con una fecha ingresada se actualizan las fechas de floración y madurez y las tarjetas de resultados, cada una con su diferencia frente a la estimada: en días para las fechas y en variación relativa (%) frente al escenario base para el resto (nunca en t/ha). Nota: "El fPAR sigue siendo el observado por el satélite."
  · Avisos que no bloquean: si la fecha ingresada difiere mucho del inicio de crecimiento observado, mostrar "El NDVI de esta parcela no muestra crecimiento hasta [fecha]. Puede deberse a siembra en seco o a una fecha aproximada." (umbral por definir).
  · Botón "Restablecer a estimada".
  · Nota fija: "La predicción de rendimiento del modelo no cambia con esta fecha." No enlazar con la sección financiera.
- Debajo, tarjeta deshabilitada "¿Y si...? (próximamente)": controles previstos (fecha de siembra hipotética, periodo seco, lluvia del ciclo, riego de auxilio, ciclo de la variedad), sin números. Nota: "Requiere reproyectar el fPAR; aún no disponible."

Textos de ayuda (tooltips) de las 12 tarjetas; cada uno termina con "Columna: [nombre]" en letra pequeña:
- Calor acumulado hasta la floración (GDD_antesis, °C·d): "La cebada no cuenta días, cuenta calor. Es el calor que juntó desde la siembra hasta florecer."
- Calor acumulado en el llenado (GDD_llenado, °C·d): "Calor que juntó mientras el grano se llenaba, de la floración a la madurez."
- Días de siembra a floración (DAP_antesis_est, días): "Días transcurridos hasta florecer. La floración suele ser una etapa sensible a la sequía y a las heladas."
- Agua que pidió el clima (ETo_acum, mm): "La 'sed' de la atmósfera durante el ciclo: con más calor y sol, más sed."
- Agua que usó el cultivo (ETa_acum, mm): "Agua que la cebada tomó del suelo. Es menor que la anterior cuando la planta aún es chica o cuando faltó agua."
- Brecha de agua (Deficit_Hidrico_Total, mm): "Lo que pidió el clima menos lo que usó el cultivo. Incluye que una planta pequeña usa menos agua, así que por sí sola no indica sequía; sirve para comparar con otras parcelas."
- Estrés de agua en la floración (KS_prom_antesis, 0 a 1): "1 es toda el agua que necesitaba; 0, casi ninguna. Promedio de unas tres semanas alrededor de la floración."
- Estrés de agua en el llenado (KS_prom_llenado, 0 a 1): "Lo mismo, durante el llenado del grano. Faltar agua en esta etapa puede reducir el tamaño del grano."
- Luz aprovechada (fPAR_integrado, fPAR·día): "Qué tanto cubrió y aprovechó la luz el cultivo, sumado día a día. Viene del satélite: más verde y cerrado, más luz aprovechada."
- Materia seca a la floración (Biomasa_Antesis_Sim, kg/ha): "Peso seco de la planta cuando florece. Sirve para comparar parcelas, no como valor absoluto."
- Materia seca total (Biomasa_Total_Sim, kg/ha): "Peso seco de toda la planta al final (paja y grano). No es el rendimiento de grano; úsalo solo para comparar parcelas."
- Proporción que se vuelve grano (HI_penalizado, 0 a 1): "De cada kilo de planta seca, cuánto sería grano. Baja si hubo estrés de agua durante el llenado. En esta versión casi no varía entre parcelas."

Estados a diseñar: parcela de entrenamiento vs. de predicción; confianza baja; sin precio capturado; sin senescencia detectada; carga y error de datos; parcela de doble ciclo; variable casi constante (sin barra de percentil); fecha de siembra estimada vs. ingresada; fecha ingresada igual a la estimada; fecha ingresada fuera de la ventana de simulación (15 de marzo a 30 de noviembre de 2025), como error del campo; aviso de fecha ingresada alejada del NDVI; planta antes de sembrar, en reproducción y en pausa.

Reglas: no inventar datos ni usar valores de ejemplo en la versión final; en el diseño, usa contenido de relleno claramente marcado (p. ej. "XX,X") para que no parezcan cifras reales; cada cifra debe provenir de una columna indicada; incluir unidades en todo número. La planta es una ilustración con variantes (Figma no prototipa 3D); la implementación podrá ser 2D o 3D con los mismos estados. Tooltips accesibles por teclado. Estilo: neutro, alta legibilidad, paleta con un acento (verde o ámbar de cultivo) y grises, tipografía sans-serif, tarjetas con jerarquía clara.