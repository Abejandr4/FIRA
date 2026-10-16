# Módulo de Animación 3D: Gemelo Digital de Cebada en EZ-Three.

Este módulo contiene la representación tridimensional interactiva (**Gemelo Digital**) para el dashboard del reto **AgroCebada 2026**. Su objetivo es traducir en tiempo real los cálculos del simulador biofísico en transformaciones visuales dinámicas de la planta de cebada.

Elevaremos la visualización del dashboard de gráficos $2D$ tradicionales a un **entorno 3D fotorrealista e interactivo**, permitiendo al usuario y al jurado de FIRA 2026:

1. Inspeccionar la planta en $360^\circ$ con zoom y rotación libre.

2. Observar la respuesta fisiológica y morfológica de la cebada ante distintos escenarios climáticos y de manejo.

3. Evaluar el impacto visual instantáneo del estrés hídrico, biomasa, y demás variables biofísicas obtenidas con los 4 módulos del simulador.

## Mapeo Biofísico a Propiedades 3D

El motor de Three.js recibe en tiempo real los valores de las **12 variables biofísicas** del simulador y modifica los nodos del modelo 3D según la siguiente matriz de traducción:

| Variable Biofísica | Significado Agronómico | Propiedad Modificada en Three.js | 
| ----- | ----- | ----- | 
| `GDD_antesis` / `GDD_llenado` | Tiempo térmico acumulado ($^\circ \mathrm{C} \cdot \mathrm{d}$) | Controla el despliegue fenológico y la etapa vegetativa/reproductiva. | 
| `DAP_antesis_est` | Días a floración (DAP) | Escala la tasa de aparición foliar en la línea de tiempo. | 
| `KS_prom_antesis` / `KS_prom_llenado` | Factor de estrés hídrico ($0 \le K_s \le 1$) | **Color del Material:** Transición suave de verde vivo (`#2D6A4F`) a amarillo/seco (`#D4A373`).   **Geometría:** Deformación en eje $Z$ (marchitamiento y doblado de hojas). | 
| `fPAR_integrado` | Radiación Fotosintéticamente Activa ($MJ \cdot m^{-2}$) | Ajusta la densidad y volumen del área foliar. | 
| `Biomasa_Total_Sim` | Biomasa acumulada ($\mathrm{kg} \cdot \mathrm{ha}^{-1}$) | **Escala de Geometría:** Modifica la altura total ($Y$) y el grosor del tallo ($X, Z$). | 
| `HI_penalizado` | Índice de Cosecha ($0 \le HI \le 0.6$) | **Geometría de la Espiga:** Ajusta el volumen de los granos e incrementa el ángulo de inclinación ($\theta$) por peso. | 
| `Deficit_Hidrico_Total` | Estrés hídrico acumulado ($\mathrm{mm}$) | **Textura del Suelo:** Transición de café oscuro (humedad) a tono beige agrietado (sequía). | 

## Estructura del Módulo dentro del Repositorio

```
simulador-3d/
├── README.md               # Esta documentación técnica
├── index.html              # Lienzo HTML5 y contenedor del Canvas WebGL
├── assets/
│   └── models/
│       └── barley_plant.glb # Modelo 3D de la planta (Mallas independientes)
└── src/
    ├── scene.js            # Configuración de escena, cámara orbital y luces
    ├── biophysics_bridge.js # Traductor de las 12 variables a propiedades 3D
    └── main.js             # Bucle de renderizado (60 FPS) e integración con el UI


```

##  Plan de Implementación (Fases)

### Fase 1: Escena Base y Renderizador (Completado / En curso)

* Configuración de `THREE.Scene`, `THREE.PerspectiveCamera` y `THREE.WebGLRenderer`.

* Iluminación ambiental y solar direccional con proyección de sombras (`castShadow = true`).

* Integración de `OrbitControls` para interacción $360^\circ$.

### Fase 2: Despiece y Carga del Modelo 3D

* Integración del cargador `GLTFLoader`.

* Separación jerárquica de mallas: `Suelo`, `Tallo`, `Hojas[]` y `Espiga`.

### Fase 3: Puente de Variables Biofísicas

* Creación de la función `actualizarPlanta3D(estadoSimulador)`.

* Aplicación de interpolación lineal (*lerp*) para garantizar animaciones fluidas sin saltos abruptos.

### Fase 4: Conexión con el Dashboard Principal

* Exposición de eventos para escuchar cambios en los sliders del dashboard global.

* Optimización de rendimiento para ejecución fluida en navegadores de escritorio y móviles.

*Módulo desarrollado para la competencia FIRA 2026 — Plataforma AgroCebada.*