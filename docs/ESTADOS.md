# Estados de diseño y reglas de interfaz

Lista de los estados que pide el prompt de diseño (`docs/PROMPT_FIRA.md`) y dónde están. ✅ hecho · 🟡 parcial · ⬜ pendiente.

| Estado | Dónde | |
| --- | --- | --- |
| Parcela de entrenamiento vs. predicción | `parcela/TarjetaParcela`, `PanelRendimiento` | 🟡 etiqueta hecha; falta real y error |
| Confianza baja (tooltip) | `parcela/TarjetaParcela` → `EtiquetaConfianza` | ✅ |
| Sin precio capturado | `parcela/Financiero` | ✅ |
| Sin senescencia detectada | `parcela/TarjetaParcela` | ⬜ |
| Carga y error de datos | `components/ui` → `Cargando`, `ErrorDatos` | ✅ en simulador; ⬜ en mapa y parcela |
| Parcela de doble ciclo | `simulador/VistaSimulador` (insignia con tooltip) | ✅ |
| Variable casi constante | `simulador/resultados/TarjetaMetrica` | ✅ |
| Fecha estimada vs. ingresada | `simulador/useEscenario`, encabezado y tarjetas | ✅ |
| Fecha ingresada igual a la estimada | `simulador/explorador/VistaExplorador` | ✅ |
| Fecha fuera de la ventana (error del campo) | ídem | ✅ |
| Aviso de fecha alejada del NDVI | ídem | ✅ (umbral provisional) |
| Planta antes de sembrar, reproduciendo y en pausa | `simulador/planta`, `explorador/LineaTiempo` | ✅ |
| Parcela inexistente (búsqueda o URL) | `layout/Topbar`, `territorio/VistaMapa` | ✅ |

## Reglas de interfaz (criterios del equipo, no umbrales publicados)

Cada regla vive en un solo lugar del código; cambiar el valor ahí la cambia en todo el dashboard.

| Regla | Valor actual | Dónde |
| --- | --- | --- |
| Confianza baja | `n_entren_municipio < 3` | `scripts/exportar_datos.py` |
| Variable casi constante | > 70 % de las parcelas con el mismo valor exacto | `lib/estadisticas.ts` → `UMBRAL_CASI_CONSTANTE` |
| Niveles de KS | ≥ 0.95 poco estrés · ≥ 0.80 moderado · < 0.80 alto | `simulador/resultados/lecturas.ts` → `CORTES_KS` |
| Lectura de fenología | percentil de `DAP_antesis_est` < 25 temprana · > 75 tardía | `lecturas.ts` |
| Lectura de luz | percentil de `fPAR_integrado` < 25 bajo · > 75 alto | `lecturas.ts` |
| Aviso NDVI | inicio de crecimiento observado > 45 días después de la siembra ingresada | `simulador/useEscenario.ts` → `UMBRAL_DIAS_AVISO_NDVI` |
| Percentiles en Dx | no mostrar si el municipio tiene < 10 parcelas | `parcela/PanelDx` (pendiente) |
| "Cerca de la media municipal" | por definir | `parcela/PanelRendimiento` (pendiente) |
| Separador decimal | coma, como en Figma (México usa punto) | `lib/formato.ts` → `SEPARADOR_DECIMAL` |

## Hallazgos al conectar datos reales

- La regla de "casi constante" también aplica a `KS_prom_antesis` (1.00 en 183 de 197) y `KS_prom_llenado` (1.00 en 149 de 197), no solo a `HI_penalizado` (0.45 en 149 de 197). Por eso esas tres tarjetas muestran "Valor casi igual en todas las parcelas" en lugar de la barra de percentil.
- En la sensibilidad, el mayor cambio de "Siembra fija el 5-may" es en `Biomasa_Antesis_Sim` (64 %), además del de `Biomasa_Total_Sim` (34 %) que reporta `SENSIBILIDAD.md`.

- `RidgeCV` eligió `alpha = 1000`, el valor más alto de su rejilla (`logspace(-1, 3)`). Con más regularización la corrección sería aún menor; es consistente con que la corrección satelital casi no aporta. En "¿qué pasaría si…?", llevar el NDVI mínimo y máximo a valores extremos mueve la predicción de AGC_011 solo +0,036 t/ha (6 % del intervalo al 80 %).

## Diferencias entre el prompt y Figma, ya resueltas en el código

- Botón: "Ver simulador (exploratorio)" (prompt) en lugar de "Simulador (planta)".
- Financiero: sin "Costo por hectárea" (el prompt pide no incluir costos); con fuente y fecha del precio, y sensibilidad baja/central/alta.
- Tooltips de las 12 tarjetas: texto completo del prompt.
- Se agregó la sección de sensibilidad y la insignia de doble ciclo, que no estaban en Figma.
