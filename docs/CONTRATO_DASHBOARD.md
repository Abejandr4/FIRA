# Contrato de datos del dashboard

Todo lo que muestra el dashboard sale de `public/data/`, que genera `scripts/exportar_datos.py` a partir de los repos **RendimientoCebada** (RC) y **SimuladorBiofisico** (SB). Los tipos están en `src/data/tipos.ts`.

Verificaciones del exportador (se detiene si fallan):
- Reproduce las 59 predicciones de `RC/predicciones_59.csv` (diferencia máx. < 1e-6).
- El pipeline de SB reproduce `SB/data/processed/biofisicas_197_parcelas.csv` (diferencia máx. < 1e-6).

## `parcelas.json` (197 filas)

| Campo | Unidad | Origen |
| --- | --- | --- |
| `id` | | `ID_POLIGONO` |
| `conjunto` | | `CONJUNTO` de `RC/DataSet/.../ID_area_rendimiento_70_30_Reto_AgroCebada.csv` |
| `estado`, `municipio` | | `RC/geo_features.csv` |
| `lat`, `lon` | grados | `RC/geo_features.csv` |
| `area_ha` | ha | `area_ha_geom` de `RC/geo_features.csv` |
| `n_entren_municipio` | parcelas | conteo de ENTRENAMIENTO por municipio |
| `confianza` | | `"baja"` si `n_entren_municipio < 3` |
| `pred` | t/ha | `predecir()` de `RC/modelo_lib.py`. En ENTRENAMIENTO se ajusta sin la propia parcela (137 restantes) |
| `prior_mun` | t/ha | `prior_mun()`, media municipal suavizada (K = 5) |
| `prior_vec` | t/ha | `prior_vec()`, media de las 5 parcelas de entrenamiento más cercanas |
| `prior` | t/ha | `(prior_mun + prior_vec) / 2` |
| `corr` | t/ha | corrección ridge; `pred = prior + corr` |
| `real` | t/ha | `RENDIMIENTO_T_HA` (solo ENTRENAMIENTO) |
| `pred_cv` | t/ha | `oof_pred` de `RC/oof_train.csv`: la predicción de la validación cruzada que usan las métricas |
| `media_municipio_entren` | t/ha | media de `RENDIMIENTO_T_HA` del municipio en entrenamiento |
| `elev_mean` | m | `RC/geo_features.csv` |
| `pend_mean` | ° | `RC/geo_features.csv` |
| `compacidad`, `elong` | | `RC/geo_features.csv` |
| `ndvi_p95_s2` | NDVI | `RC/features_satelitales.csv` |
| `ndvi_doy_pico_s2` | día del año | `RC/features_satelitales.csv` |
| `gu50_doy_s2`, `sen50_doy_s2` | día del año | `RC/fenologia_features.csv` (`sen50` null = sin senescencia) |
| `dur50_dias_s2`, `dias_sobre90_s2` | días | `RC/fenologia_features.csv` |

> **Decisión del equipo de modelo:** para ENTRENAMIENTO el dashboard muestra `pred` (ajustado sin la propia parcela) porque la descomposición prior + corrección tiene que sumar al valor mostrado. Difiere de `pred_cv` en 0.03 t/ha de mediana. Si prefieren mostrar `pred_cv`, la cascada no podrá cuadrar exactamente.

## `meta.json`

`q80`, `q90` (± t/ha), `cv_aleatorio` (`rmse`, `rmse_prior`, `r2`, `mae`), `cv_espacial` (`rmse`, `rmse_prior`, `r2`), `rmse_media_global`, `media_general_entren` (t/ha), `n_train`, `n_pred`, `n_variables`, `config`, `generado`. Origen: `RC/app_data/meta.json`.

## `modelo/ridge.json` y `modelo/variables.json` ("¿qué pasaría si…?")

`ridge.json`: la corrección ridge final ajustada con las 138 parcelas (`ajustar()` de `RC/modelo_lib.py`) como coeficientes: `cols` (34), `medianas` (SimpleImputer), `medias` y `escalas` (StandardScaler), `coef`, `intercepto`, `alpha` (RidgeCV). El navegador calcula `corr = intercepto + Σ coef · (x − media) / escala`, con `x` faltante → mediana. El exportador verifica que la fórmula reproduce `predict()` de sklearn.

`variables.json`: `{ cols, valores: { "AGC_001": [34 valores] } }`, las variables del modelo por parcela (null = faltante), de `RC/features_satelitales.csv`, `RC/fenologia_features.csv` y `RC/geo_features.csv`.

Al mover una variable, la nueva predicción es `pred + corr(x modificada) − corr(x original)`, así que con los valores originales siempre da `pred`.

## `parcelas.geojson`

Polígonos simplificados (~3 m) de `RC/app_data/parcelas.geojson`; propiedad `id`.

## `ndvi.json`

`{ fechas: [...], serie: { "AGC_001": [ndvi, …] } }`, NDVI Sentinel-2 en malla de 5 días (abril–octubre 2025). Origen: `ndvi_promedio` de `RC/serie_s2.csv`.

## `simulador/variables.json` (197 filas, escenario base)

| Campo | Unidad | Origen |
| --- | --- | --- |
| `GDD_antesis`, `GDD_llenado` | °C·d | `SB/biofisicas_197_parcelas.csv` |
| `DAP_antesis_est` | días | ídem |
| `ETo_acum`, `ETa_acum`, `Deficit_Hidrico_Total` | mm | ídem |
| `KS_prom_antesis`, `KS_prom_llenado` | 0–1 | ídem |
| `fPAR_integrado` | fPAR·día | ídem |
| `Biomasa_Antesis_Sim`, `Biomasa_Total_Sim` | kg/ha | ídem |
| `HI_penalizado` | 0–1 | ídem |
| `Deficit_ETc` | mm | `SB/biofisicas_extras_197_parcelas.csv` |
| `ciclo_incompleto`, `caida_fpar_no_alcanzada` | bool | ídem |
| `fecha_siembra`, `fecha_siembra_A`, `fecha_siembra_B`, `doble_ciclo`, `fecha_sos`, `fecha_pico` | fecha | `SB/data/processed/parcelas_base.csv` |
| `fecha_antesis`, `fecha_madurez` | fecha | salida de M2 del pipeline de SB |

## `simulador/diario/<ID>.json` (entradas del motor del navegador)

`inicio` (15-mar-2025), `n_dias` (261), `suelo` (`FC_mm`, `PWP_mm`, `AWC_mm`) y series diarias `tmean` (°C), `pcp` (mm), `par` (MJ/m²), `eto` (mm), `fapar_final` (0–1). Son las salidas de M1 y las entradas de satélite y suelo del pipeline de SB; no dependen de la fecha de siembra.

## `simulador/params.json` y `simulador/sensibilidad.json`

Copia de `SB/configs/params.yaml` y de `SB/data/processed/sensibilidad_resumen.csv` (`escenario`, `grupo`, `etiqueta`, `variable`, `cambio_mediano_pct`, `rho_spearman`).
