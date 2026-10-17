/**
 * Escena 3D del Gemelo Digital de cebada (Hordeum vulgare).
 * Migrada desde legacy/AnimacionCebada/index.html (Paso 1 del módulo AnimacionCebada), conservando la
 * estructura plantaGroup { suelo, tallo, hojas, espiga } y la API actualizarNodos3D(atributos).
 *
 * Cambios respecto al prototipo, para integrarla al dashboard:
 *  - Se monta en un contenedor (no en <body>) y se ajusta a su tamaño con ResizeObserver.
 *  - Fondo transparente y suelo circular, para el tema oscuro del dashboard; sin niebla.
 *  - Se agrega `visiblePlanta` (suelo desnudo antes de sembrar) y `destruir()` para liberar WebGL.
 *  - Se quitan el panel de botones de prueba y los objetos globales de window.
 * Se carga de forma diferida (import dinámico) para no pesar en el resto del dashboard.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { AtributosPlanta } from "./tipos";

// 1. Constantes de la planta (unidades arbitrarias ≈ metros)
const ALTURA_TALLO_BASE = 2.2;
const RADIO_TALLO_BASE = 0.045;
const COLORES_INICIALES = { suelo: 0x6b4a2b, tallo: 0x5a9a2f, hojas: 0x4c9a2a, espiga: 0xd8b13a };

export interface Escena3D {
  actualizar: (a: AtributosPlanta) => void;
  destruir: () => void;
}

export function soportaWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export function crearEscena(contenedor: HTMLElement): Escena3D {
  // 2. Escena, cámara y renderizador
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3.2, 2.4, 4.2);
  const OBJETIVO_CAMARA = new THREE.Vector3(0, 1.2, 0);
  camera.lookAt(OBJETIVO_CAMARA);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  contenedor.appendChild(renderer.domElement);

  // 3. Controles orbitales
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.copy(OBJETIVO_CAMARA);
  controls.minDistance = 1.5;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.update();

  // 4. Iluminación
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6b4a2b, 0.35));
  const sol = new THREE.DirectionalLight(0xfff3d6, 2.2);
  sol.position.set(4, 8, 5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { near: 1, far: 25, left: -5, right: 5, top: 5, bottom: -5 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  scene.add(sol);

  // 5. Planta modular
  const plantaGroup = new THREE.Group();
  plantaGroup.name = "plantaGroup";
  scene.add(plantaGroup);

  // 5.1 Suelo (circular en el dashboard)
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48),
    new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.suelo, roughness: 1 }));
  suelo.name = "suelo";
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  plantaGroup.add(suelo);

  // 5.2 Tallo: base en y = 0 para que al escalar en Y crezca desde el suelo
  const geoTallo = new THREE.CylinderGeometry(RADIO_TALLO_BASE * 0.7, RADIO_TALLO_BASE, ALTURA_TALLO_BASE, 12);
  geoTallo.translate(0, ALTURA_TALLO_BASE / 2, 0);
  const tallo = new THREE.Mesh(geoTallo, new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.tallo, roughness: 0.7 }));
  tallo.name = "tallo";
  tallo.castShadow = tallo.receiveShadow = true;
  plantaGroup.add(tallo);

  // 5.3 Hojas: plano lanceolado deformado (largo, ancho, curvatura = caída de la punta)
  function crearGeometriaHoja(largo: number, ancho: number, curvatura: number) {
    const geo = new THREE.PlaneGeometry(ancho, largo, 4, 12);
    geo.translate(0, largo / 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / largo;
      pos.setX(i, pos.getX(i) * Math.pow(1 - t, 0.55));
      pos.setZ(i, curvatura * t * t * largo);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }
  const materialHojas = new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.hojas, roughness: 0.65, side: THREE.DoubleSide });
  const hojas = new THREE.Group();
  hojas.name = "hojas";
  plantaGroup.add(hojas);
  const DEFINICION_HOJAS = [
    { fraccion: 0.28, giro: 0.0, inclinacion: 1.05, largo: 1.25, ancho: 0.16, curvatura: 0.45 },
    { fraccion: 0.45, giro: Math.PI * 0.75, inclinacion: 0.95, largo: 1.10, ancho: 0.15, curvatura: 0.40 },
    { fraccion: 0.62, giro: Math.PI * 1.45, inclinacion: 0.85, largo: 0.95, ancho: 0.13, curvatura: 0.35 },
  ];
  DEFINICION_HOJAS.forEach((def, i) => {
    const pivote = new THREE.Group();
    pivote.name = `hoja_pivote_${i}`;
    pivote.rotation.y = def.giro;
    pivote.position.y = def.fraccion * ALTURA_TALLO_BASE;
    const malla = new THREE.Mesh(crearGeometriaHoja(def.largo, def.ancho, def.curvatura), materialHojas);
    malla.name = `hoja_${i}`;
    malla.rotation.x = def.inclinacion;
    malla.castShadow = malla.receiveShadow = true;
    pivote.userData = { fraccion: def.fraccion, giroBase: def.giro };
    malla.userData = { inclinacionBase: def.inclinacion };
    pivote.add(malla);
    hojas.add(pivote);
  });

  // 5.4 Espiga: cuerpo dorado + aristas (cebada barbada)
  const espiga = new THREE.Group();
  espiga.name = "espiga";
  espiga.position.y = ALTURA_TALLO_BASE;
  plantaGroup.add(espiga);
  const materialEspiga = new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.espiga, roughness: 0.55 });
  const materialAristas = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLORES_INICIALES.espiga).offsetHSL(0, -0.05, 0.1), roughness: 0.6 });
  const LARGO_ESPIGA = 0.45;
  const cuerpoEspiga = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, LARGO_ESPIGA, 6, 12), materialEspiga);
  cuerpoEspiga.position.y = LARGO_ESPIGA / 2 + 0.07;
  cuerpoEspiga.castShadow = true;
  espiga.add(cuerpoEspiga);
  const geoArista = new THREE.ConeGeometry(0.007, 0.6, 5);
  geoArista.translate(0, 0.3, 0);
  for (let i = 0; i < 18; i++) {
    const arista = new THREE.Mesh(geoArista, materialAristas);
    const pivoteArista = new THREE.Group();
    pivoteArista.position.y = 0.12 + (i / 18) * (LARGO_ESPIGA - 0.05);
    pivoteArista.rotation.y = i * 2.4;
    arista.rotation.x = 0.16;
    arista.position.z = 0.05;
    arista.castShadow = true;
    pivoteArista.add(arista);
    espiga.add(pivoteArista);
  }

  // 7. Actualización reactiva (actualizarNodos3D del prototipo). Todos los campos son opcionales.
  function actualizar(a: AtributosPlanta) {
    if (typeof a.visiblePlanta === "boolean") tallo.visible = hojas.visible = a.visiblePlanta;
    if (typeof a.escalaTallo === "number") tallo.scale.y = Math.max(a.escalaTallo, 0.01);
    if (typeof a.escalaGrosorTallo === "number") tallo.scale.x = tallo.scale.z = Math.max(a.escalaGrosorTallo, 0.01);
    const alturaActual = ALTURA_TALLO_BASE * tallo.scale.y;
    hojas.children.forEach((pivote) => {
      const malla = pivote.children[0];
      pivote.position.y = pivote.userData.fraccion * alturaActual;
      if (typeof a.escalaHojas === "number") pivote.scale.setScalar(Math.max(a.escalaHojas, 0.01));
      if (typeof a.rotacionHojas === "number") malla.rotation.x = malla.userData.inclinacionBase + a.rotacionHojas;
      if (typeof a.giroHojas === "number") pivote.rotation.y = pivote.userData.giroBase + a.giroHojas;
    });
    espiga.position.y = alturaActual;
    if (typeof a.escalaEspiga === "number") espiga.scale.setScalar(Math.max(a.escalaEspiga, 0.01));
    if (typeof a.inclinacionEspiga === "number") espiga.rotation.z = a.inclinacionEspiga;
    const espigaVisible = a.visibleEspiga ?? espiga.visible;
    espiga.visible = espigaVisible && a.visiblePlanta !== false;
    if (a.colorSuelo !== undefined) suelo.material.color.set(a.colorSuelo);
    if (a.colorTallo !== undefined) tallo.material.color.set(a.colorTallo);
    if (a.colorHojas !== undefined) materialHojas.color.set(a.colorHojas);
    if (a.colorEspiga !== undefined) {
      materialEspiga.color.set(a.colorEspiga);
      materialAristas.color.set(a.colorEspiga).offsetHSL(0, -0.05, 0.1);
    }
  }

  // 9. Redimensionamiento al contenedor
  const ajustar = () => {
    const { clientWidth: w, clientHeight: h } = contenedor;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(contenedor);
  ajustar();

  // 10. Bucle de renderizado
  let raf = 0;
  const animar = () => {
    raf = requestAnimationFrame(animar);
    controls.update();
    renderer.render(scene, camera);
  };
  animar();

  return {
    actualizar,
    destruir() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
