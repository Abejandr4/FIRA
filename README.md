# AgroCebada · Dashboard del Reto FIRA 2026

Dashboard de la predicción de rendimiento de cebada (t/ha) en 197 parcelas de Hidalgo, Puebla y Tlaxcala, y del simulador biofísico exploratorio. 

Este repo es solo la interfaz. Los datos vienen de los otros dos repos del equipo:

| Repo | Qué aporta | Cómo llega aquí |
| --- | --- | --- |
| **RendimientoCebada** | Predicción, priors, corrección satelital, métricas, polígonos, NDVI | `scripts/exportar_datos.py` → `public/data/*.json` |
| **SimuladorBiofisico** | 12 variables, fechas, sensibilidad, entradas diarias del motor | `scripts/exportar_datos.py` → `public/data/simulador/` |

## Arrancar

Requisitos: Node 20+ y, para regenerar datos, Python 3.10+ con `pandas numpy scipy scikit-learn pyyaml`.

```bash
npm install
npm run dev            # http://localhost:5173
```

npm install lucide-react
npm install framer-motion

Los datos ya vienen generados en `public/data/`, así que no hace falta Python para trabajar en la interfaz.

### Regenerar los datos

Con los tres repos clonados uno al lado del otro (`FIRA/`, `RendimientoCebada/`, `SimuladorBiofisico/`):

```bash
npm run datos              # = python scripts/exportar_datos.py --modelo ../RendimientoCebada --simulador ../SimuladorBiofisico
npm run verificar:motor    # el motor TypeScript debe reproducir el simulador de Python
npm run verificar:modelo   # la corrección ridge en TypeScript debe reproducir la predicción
```

El exportador se detiene si no reproduce `predicciones_59.csv`, la corrección ridge de sklearn o `biofisicas_197_parcelas.csv`. Ningún número del dashboard se escribe a mano.

## Estructura

```
public/data/                  datos generados (no editar a mano)
scripts/
  exportar_datos.py           repos fuente → JSON
  verificar_motor.ts          paridad motor TS ↔ simulador Python (197 parcelas)
  verificar_modelo.ts         paridad corrección ridge TS ↔ predicción (59 parcelas)
src/
  app/ruta.ts                 navegación por hash (#/parcela/AGC_011, #/simulador/AGC_011/explorador)
  data/                       contrato (tipos.ts), carga y hooks — única puerta a los datos
  lib/                        formato de números y fechas, percentiles
  styles/                     tokens de color y base
  components/ui/              Icon, Button, Tooltip, SegmentedControl, Cargando, ErrorDatos
  components/layout/          barra superior y buscador
  features/
    territorio/               mapa y panel territorial
    parcela/                  tarjeta, rendimiento, financiero, NDVI, Dx comparativo
      QueSiModelo.tsx         Sensibilidad de la predición del modelo, en vivo
      modelo/ridge.ts         corrección ridge evaluada en el navegador
    asistente/                glosario
    simulador/
      resultados/             12 tarjetas, lecturas, sensibilidad, advertencias
      explorador/             fecha de siembra observada, línea de tiempo
      escenarios/             escenarios hipotéticos (lluvia, periodo seco, riego, variedad, siembra)
      planta/                 planta 3D (Three.js) + esquema 2D, con un contrato propio
      motor/                  M2–M4 + 12 variables en TypeScript (port del simulador)
      useEscenario.ts         escenario base vs. fecha ingresada
legacy/
  streamlit/                  app anterior (Streamlit), solo de consulta
  AnimacionCebada/            prototipo original de la planta 3D, solo de consulta
docs/
  CONTRATO_DASHBOARD.md       cada dato: archivo, columna de origen, unidad
  ESTADOS.md                  estados de diseño, reglas de interfaz y qué está hecho
```

## Cómo trabajamos

Ver [CONTRIBUTING.md](CONTRIBUTING.md): quién es responsable de cada carpeta, ramas y revisión.

## Estado

| Vista | Estado |
| --- | --- |
| Simulador · Resultados | Conectado a datos reales |
| Simulador · Explorador | Conectado; recalcula en el navegador con el motor TS |
| Simulador · Escenarios hipotéticos | Conectado; precipitación, periodo sin lluvia, riego, ciclo de variedad y fecha de siembra |
| Planta | 3D migrada; esquema 2D como respaldo sin WebGL |
| Parcela · Sensibilidad de la predición | Conectado; recalcula la predicción en vivo con los coeficientes del ridge |
| Parcela | Identificación, confianza y financiero conectados; resto con relleno `XX,X` y `TODO(parcela)` |
| Territorio | Relleno del diseño; mapa real pendiente (`TODO(territorio)`) |
| Asistente | Interacción de ejemplo (`TODO(asistente)`) |

Busca `TODO(` para ver el trabajo pendiente de cada área.
