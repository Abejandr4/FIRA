# Planta (Gemelo Digital de cebada)

Migración del módulo **AnimacionCebada** (original en `legacy/AnimacionCebada/`). Se conserva la estructura `plantaGroup { suelo, tallo, hojas, espiga }` y la API `actualizarNodos3D(atributos)`.

| Archivo | Qué hace | Equivalente en el plan original |
| --- | --- | --- |
| `escena3d.ts` | Escena, cámara orbital, luces, planta modular y `actualizar()` | `scene.js` + Paso 1 de `index.html` |
| `puente.ts` | `EstadoPlanta` → atributos 3D (interpola entre las etapas de prueba) | `biophysics_bridge.js` (Fase 3) |
| `Planta.tsx` | Monta la escena en React; usa el esquema 2D si no hay WebGL | integración con el dashboard (Fase 4) |
| `PlantaEsquema.tsx` | Ilustración 2D del diseño de Figma con las mismas variantes | respaldo |
| `tipos.ts` | Contrato con el simulador | |

## Qué recibe

El simulador solo entrega un `EstadoPlanta` por día:

| Campo | Rango | Controla |
| --- | --- | --- |
| `etapa` | pre_siembra · vegetativo · antesis · llenado · madurez | qué partes se ven |
| `progresoTermico` | 0–1 | altura |
| `fpar` | 0–1 | densidad del follaje |
| `ks` | 0–1 | color y caída de hojas (estrés hídrico) |
| `biomasaRel` | 0–1 | tamaño de la espiga |

## Siguientes pasos (de la Fase 2 del plan original)

- Modelo `barley_plant.glb` con mallas separadas (`GLTFLoader`), en lugar de la geometría procedural.
- Interpolación suave (lerp por fotograma) entre estados consecutivos.
- Textura de suelo según `Deficit_Hidrico_Total` (está en el README original; no está en el prompt de diseño, así que hay que decidirlo con el equipo).

Para probarla: abre `#/simulador/AGC_011/explorador` y mueve el deslizador de la línea de tiempo o pulsa reproducir.
