# Cómo trabajamos

## Responsables por carpeta

| Área | Carpeta | Responsable |
| --- | --- | --- |
| Territorio (mapa, panel general) | `src/features/territorio/`, `src/components/layout/` | Diana y Yare |
| Parcela (tarjeta, rendimiento, Dx, financiero) | `src/features/parcela/` | Diana y Yare |
| Asistente | `src/features/asistente/` | Ale |
| Simulador (resultados, explorador, motor) | `src/features/simulador/` excepto `planta/` | Mimi y Ren |
| Planta 3D | `src/features/simulador/planta/` | Mimi y Ren |
| Datos (exportador y contrato) | `scripts/`, `src/data/`, `docs/CONTRATO_DASHBOARD.md` | Ale |

**Zonas compartidas** (cambios solo por PR con revisión de otra persona): `src/components/ui/`, `src/styles/`, `src/lib/`, `src/data/tipos.ts`, `package.json`.

## Reglas

1. **Una rama por tarea**, PR a `main` con revisión cruzada (igual que en SimuladorBiofisico).
2. **Datos solo por `src/data/hooks.ts`.** Ningún componente hace `fetch` directo ni escribe números a mano.
3. **Contrato primero.** Si necesitas un campo nuevo: agrégalo a `scripts/exportar_datos.py`, a `src/data/tipos.ts` y a `docs/CONTRATO_DASHBOARD.md` en el mismo PR, y vuelve a correr `npm run datos`.
4. **Relleno marcado.** Mientras un dato no esté conectado, usa `XX,X` y un comentario `TODO(área): campo`. Nunca valores de ejemplo que parezcan reales.
5. **Unidades en todo número** y formato con `src/lib/formato.ts` (`num`, `fecha`, `pct`).
6. **Estilos por feature.** Cada carpeta tiene su `.css`; los colores salen de `src/styles/tokens.css`. Clases nuevas al final de tu archivo, bajo el comentario "Añadidos".
7. **El simulador no toca la predicción.** Nada en `features/simulador/` lee ni modifica `pred` ni lo financiero.
8. **Si cambia el simulador de Python** (módulos o `params.yaml`): `npm run datos`, `npm run verificar:motor`, y si falla, actualizar `features/simulador/motor/`.
   **Si cambia el modelo** (variables, priors o tipo de modelo): `npm run datos` y `npm run verificar:modelo`. Si el modelo deja de ser lineal (p. ej. random forest), "¿qué pasaría si…?" ya no se puede calcular en el navegador y necesitará una API en Python.
9. Antes de abrir PR: `npm run typecheck`.

## Contratos internos

- **Simulador → planta:** `EstadoPlanta` en `planta/tipos.ts` (etapa, progresoTermico, fpar, ks, biomasaRel). La planta solo recibe eso.
- **Escena 3D:** `crearEscena(contenedor)` → `{ actualizar(atributos), destruir() }`, con los mismos atributos de `actualizarNodos3D` del prototipo.
- **Motor:** `simular(entrada, params, fechaPico, fechaSiembra)` → fechas, serie diaria y las 12 variables con los nombres de columna del CSV.
