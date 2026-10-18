/**
 * Escena 3D del Gemelo Digital de cebada (Hordeum vulgare).
 * Migrada desde legacy/AnimacionCebada/index.html (Paso 1, rediseño visual), conservando la
 * estructura plantaGroup { suelo, tallo, hojas, espiga } y la API actualizarNodos3D(atributos).
 *
 * Del rediseño se trae tal cual: tallo con nudos y curvatura, cuatro hojas lanceoladas con torsión,
 * espiga de espiguillas en 6 hileras con aristas largas, texturas procedurales e iluminación
 * con RoomEnvironment y tone mapping ACES.
 *
 * Cambios respecto al prototipo, para integrarla al dashboard:
 *  - Se monta en un contenedor (no en <body>) y se ajusta a su tamaño con ResizeObserver.
 *  - Fondo transparente y suelo circular, para el tema oscuro del dashboard; sin niebla.
 *  - El crecimiento lo marca el simulador día por día (puente.ts), así que no se usa la animación
 *    automática semilla → planta del prototipo; se aplica siempre su estado final (g = 1).
 *  - Se agrega `visiblePlanta` (suelo desnudo antes de sembrar) y `destruir()` para liberar WebGL.
 *  - Se quitan el panel de botones de prueba y los objetos globales de window.
 * Se carga de forma diferida (import dinámico) para no pesar en el resto del dashboard.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { AtributosPlanta } from "./tipos";

// 1. Constantes de la planta (unidades arbitrarias ≈ metros)
const ALTURA_TALLO_BASE = 2.2;
const RADIO_TALLO_BASE = 0.03;
export const COLORES_INICIALES = {
  suelo: 0x5e4128, // tierra húmeda
  tallo: 0x8dbb48, // caña verde-lima
  hojas: 0x5db033, // verde vegetal vivo
  espiga: 0xe2b441, // dorado cálido
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rngDe = (s: number) => {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** Curvatura natural del tallo (desplazamiento en X según la altura relativa t). */
const swayX = (t: number) => -0.14 * t * t;
/** Posición relativa de los nudos del tallo. */
const NUDOS = [0.2, 0.4, 0.58, 0.74];
/** La espiga continúa la curva del tallo. */
const PENDIENTE_PUNTA = 0.125;

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
  const OBJETIVO_CAMARA = new THREE.Vector3(0, 1.3, 0);
  camera.lookAt(OBJETIVO_CAMARA);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // color más natural, sin saturar
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  contenedor.appendChild(renderer.domElement);

  // Iluminación basada en imagen: reflejos suaves y volumen natural
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = new RoomEnvironment();
  const texEntorno = pmrem.fromScene(entorno, 0.04).texture;
  scene.environment = texEntorno;

  // 3. Controles orbitales
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.copy(OBJETIVO_CAMARA);
  controls.minDistance = 1.0;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.update();

  // 4. Iluminación
  scene.add(new THREE.AmbientLight(0xffffff, 0.15)); // baja: deja que las sombras den volumen
  scene.add(new THREE.HemisphereLight(0xd6ebff, 0x7a5a36, 0.6)); // cielo frío arriba, tierra cálida abajo
  const sol = new THREE.DirectionalLight(0xfff0d0, 2.0);
  sol.position.set(4, 8, 5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { near: 1, far: 25, left: -4, right: 4, top: 4, bottom: -4 });
  sol.shadow.bias = -0.0003;
  sol.shadow.normalBias = 0.015;
  sol.shadow.radius = 3;
  scene.add(sol);
  const relleno = new THREE.DirectionalLight(0xbcd8ff, 0.55); // relleno frío, sin sombra
  relleno.position.set(-5, 3, -4);
  scene.add(relleno);

  // 4b. Texturas procedurales (escala de grises: el color lo da el material)
  const texturas: THREE.Texture[] = [];
  function texturaCanvas(w: number, h: number, dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    dibujar(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texturas.push(t);
    return t;
  }
  // Fibras longitudinales; con vena = true añade nervadura central clara
  function fibras(seed: number, n: number, base: string, vena: boolean) {
    return texturaCanvas(64, 256, (ctx, w, h) => {
      const r = rngDe(seed);
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const x = r() * w;
        ctx.strokeStyle = `rgba(40,50,30,${0.06 + r() * 0.14})`;
        ctx.lineWidth = 0.5 + r() * 1.3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (r() - 0.5) * 2, h); ctx.stroke();
      }
      if (vena) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(w / 2 - 1.8, 0, 3.6, h); }
    });
  }
  const texHoja = fibras(11, 34, "#e6e6e6", true);
  const texTallo = fibras(23, 50, "#f0f0f0", false);
  const texSuelo = texturaCanvas(256, 256, (ctx, w, h) => {
    const r = rngDe(47);
    ctx.fillStyle = "#d8d8d8"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = r() < 0.5 ? 0 : 255;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.2})`;
      const s = 0.6 + r() * 2.4;
      ctx.fillRect(r() * w, r() * h, s, s);
    }
  });
  texSuelo.repeat.set(4, 4); // misma densidad que el plano de 12 × 12 del prototipo (repeat 14)

  // 5. Planta modular
  const plantaGroup = new THREE.Group();
  plantaGroup.name = "plantaGroup";
  scene.add(plantaGroup);

  // 5.1 Suelo (circular en el dashboard)
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 64),
    new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.suelo, map: texSuelo, bumpMap: texSuelo, bumpScale: 2, roughness: 1 }),
  );
  suelo.name = "suelo";
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  plantaGroup.add(suelo);

  // 5.2 Tallo: caña con nudos, base en y = 0 para que al escalar en Y crezca desde el suelo
  function crearGeometriaTallo() {
    const nv = 120, nr = 16;
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nv; j++) {
      const t = j / nv;
      let nudo = 0;
      for (const n of NUDOS) nudo += Math.exp(-Math.pow((t - n) / 0.013, 2));
      nudo = clamp(nudo);
      const base = 1 + 0.9 * Math.exp(-t / 0.025); // base ensanchada
      const r = RADIO_TALLO_BASE * (1 - 0.4 * t) * (1 + 0.55 * nudo) * base;
      const sombra = 1 - 0.42 * nudo - 0.1 * t; // nudos más oscuros
      for (let k = 0; k <= nr; k++) {
        const a = (k / nr) * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
        pos.push(cx * r + swayX(t), t * ALTURA_TALLO_BASE, sz * r);
        nor.push(cx, 0.1, sz);
        uv.push(k / nr, t * 8);
        col.push(sombra, sombra, sombra);
      }
    }
    for (let j = 0; j < nv; j++) for (let k = 0; k < nr; k++) {
      const a = j * (nr + 1) + k, b = a + 1, c = a + nr + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }
  const tallo = new THREE.Mesh(
    crearGeometriaTallo(),
    new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.tallo, map: texTallo, bumpMap: texTallo, bumpScale: 0.8, vertexColors: true, roughness: 0.5 }),
  );
  tallo.name = "tallo";
  tallo.castShadow = tallo.receiveShadow = true;
  plantaGroup.add(tallo);

  // 5.3 Hojas: cinta lanceolada con arqueo parabólico, pliegue en V, torsión y margen ondulado
  function crearGeometriaHoja(largo: number, ancho: number, curvatura: number, torsion = 0.5, semilla = 1) {
    const nu = 10, nv = 48;
    const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    const r = rngDe(semilla), fase = r() * 6.28;
    for (let j = 0; j <= nv; j++) {
      const t = j / nv, y = t * largo, zc = curvatura * t * t * largo;
      const perfil = (0.4 + 0.6 * sstep(0, 0.25, t)) * (1 - Math.pow(Math.max(0, (t - 0.4) / 0.6), 1.9));
      const hw = Math.max(ancho * 0.5 * perfil, 0.0004);
      const psi = torsion * Math.pow(t, 1.4), cp = Math.cos(psi), sp = Math.sin(psi);
      for (let i = 0; i <= nu; i++) {
        const u = (i / nu) * 2 - 1, x = u * hw;
        const pliegue = 0.5 * u * u * hw * (1 - 0.6 * t); // canal suave, sin arista
        const onda = 0.006 * Math.sin(t * 20 + fase + u) * u * u * Math.min(1, t * 3);
        pos.push(x * cp, y, zc + pliegue + onda - x * sp);
        uv.push((u + 1) / 2, t);
        const s = (0.84 + 0.16 * (1 - Math.abs(u))) * (1 - 0.1 * t); // sombreado suave
        col.push(s, s, s);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // Hoja mate y con nervaduras; doble cara
  const materialHojas = new THREE.MeshPhysicalMaterial({
    color: COLORES_INICIALES.hojas, map: texHoja, bumpMap: texHoja, bumpScale: 1.2,
    vertexColors: true, roughness: 0.5, metalness: 0, side: THREE.DoubleSide,
    sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc8e6a0),
  });
  const hojas = new THREE.Group();
  hojas.name = "hojas";
  plantaGroup.add(hojas);
  // fraccion: altura donde nace · giro: alrededor del tallo (hojas alternas) · inclinacion: respecto a la vertical
  const DEFINICION_HOJAS = [
    { fraccion: 0.20, giro: 0.0, inclinacion: 0.95, largo: 1.35, ancho: 0.11, curvatura: 0.55, torsion: 0.6 },
    { fraccion: 0.40, giro: Math.PI * 1.0, inclinacion: 0.85, largo: 1.30, ancho: 0.11, curvatura: 0.50, torsion: -0.5 },
    { fraccion: 0.58, giro: Math.PI * 0.12, inclinacion: 0.72, largo: 1.10, ancho: 0.10, curvatura: 0.42, torsion: 0.5 },
    { fraccion: 0.74, giro: Math.PI * 1.1, inclinacion: 0.55, largo: 0.80, ancho: 0.085, curvatura: 0.34, torsion: -0.4 }, // hoja bandera
  ];
  DEFINICION_HOJAS.forEach((def, i) => {
    const pivote = new THREE.Group();
    pivote.name = `hoja_pivote_${i}`;
    pivote.rotation.y = def.giro;
    pivote.position.set(swayX(def.fraccion), def.fraccion * ALTURA_TALLO_BASE, 0);
    const malla = new THREE.Mesh(crearGeometriaHoja(def.largo, def.ancho, def.curvatura, def.torsion, 5 + i * 7), materialHojas);
    malla.name = `hoja_${i}`;
    malla.rotation.x = def.inclinacion;
    malla.position.z = RADIO_TALLO_BASE * 0.6; // nace pegada a la superficie del tallo
    malla.castShadow = malla.receiveShadow = true;
    pivote.userData = { fraccion: def.fraccion, giroBase: def.giro };
    malla.userData = { inclinacionBase: def.inclinacion };
    pivote.add(malla);
    hojas.add(pivote);
  });

  // 5.4 Espiga: raquis + espiguillas en 6 hileras (tríadas alternas a cada lado) + aristas largas
  const espiga = new THREE.Group();
  espiga.name = "espiga";
  espiga.position.set(swayX(1), ALTURA_TALLO_BASE, 0);
  espiga.rotation.z = PENDIENTE_PUNTA;
  plantaGroup.add(espiga);
  const materialEspiga = new THREE.MeshStandardMaterial({ color: COLORES_INICIALES.espiga, roughness: 0.5 });
  const materialAristas = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLORES_INICIALES.espiga).offsetHSL(0, -0.05, 0.1), roughness: 0.55,
  });
  const materialRaquis = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLORES_INICIALES.espiga).offsetHSL(0, -0.1, -0.06), roughness: 0.6,
  });
  const LARGO_ESPIGA = 0.45;
  const NODOS_ESPIGA = 20;

  const raquis = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, LARGO_ESPIGA + 0.03, 8), materialRaquis);
  raquis.name = "espiga_raquis";
  raquis.position.y = (LARGO_ESPIGA + 0.03) / 2 - 0.02;
  raquis.castShadow = true;
  espiga.add(raquis);

  // Espiguilla: elipsoide puntiagudo (eje Y, longitud 2)
  const geoEspiguilla = new THREE.SphereGeometry(1, 24, 16);
  {
    const p = geoEspiguilla.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), f = 1 - 0.4 * Math.pow(Math.abs(y), 2.2);
      p.setX(i, p.getX(i) * f);
      p.setZ(i, p.getZ(i) * f);
    }
    geoEspiguilla.computeVertexNormals();
  }
  // Arista: cono muy fino, base en el origen, punta en +Y (longitud 1)
  const geoArista = new THREE.ConeGeometry(0.0026, 1, 4, 1, true);
  geoArista.translate(0, 0.5, 0);

  const nEsp = NODOS_ESPIGA * 3;
  const espiguillas = new THREE.InstancedMesh(geoEspiguilla, materialEspiga, nEsp);
  const aristas = new THREE.InstancedMesh(geoArista, materialAristas, nEsp);
  espiguillas.name = "espiga_espiguillas";
  aristas.name = "espiga_aristas";
  {
    const r = rngDe(900), d = new THREE.Object3D(), c = new THREE.Color();
    let n = 0;
    for (let i = 0; i < NODOS_ESPIGA; i++) {
      const lado = i % 2 ? 1 : -1, a0 = lado > 0 ? 0 : Math.PI;
      const y = 0.03 + (i * (LARGO_ESPIGA - 0.07)) / NODOS_ESPIGA;
      for (let m = -1; m <= 1; m++) {
        const a = a0 + m * 0.62, out = V(Math.cos(a), 0, Math.sin(a)), tan = V(-Math.sin(a), 0, Math.cos(a));
        const dir = V(0, 1, 0).addScaledVector(out, 0.28).normalize();
        const centro = V(0, y, 0).addScaledVector(out, 0.025).addScaledVector(dir, 0.034);
        // espiguilla
        d.position.copy(centro);
        d.quaternion.setFromUnitVectors(UP, dir);
        d.scale.set(0.0125, 0.034, 0.0095);
        d.updateMatrix();
        espiguillas.setMatrixAt(n, d.matrix);
        const s = 0.88 + r() * 0.2;
        espiguillas.setColorAt(n, c.setRGB(s, s, s));
        // arista: asciende hacia arriba y afuera, con ligera divergencia lateral
        const da = V(0, 1, 0).addScaledVector(out, 0.2 + r() * 0.08).addScaledVector(tan, m * 0.1).normalize();
        d.position.copy(centro).addScaledVector(dir, 0.032);
        d.quaternion.setFromUnitVectors(UP, da);
        d.scale.set(1, 0.5 + r() * 0.14, 1);
        d.updateMatrix();
        aristas.setMatrixAt(n, d.matrix);
        const s2 = 0.9 + r() * 0.15;
        aristas.setColorAt(n, c.setRGB(s2, s2, s2));
        n++;
      }
    }
  }
  espiguillas.castShadow = aristas.castShadow = true;
  espiguillas.receiveShadow = true;
  espiga.add(espiguillas, aristas);

  plantaGroup.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== suelo) (o.material as THREE.MeshStandardMaterial).envMapIntensity = 0.45;
  });
  suelo.material.envMapIntensity = 0.25;

  // 7. Actualización reactiva (actualizarNodos3D del prototipo, con su estado final de crecimiento g = 1).
  // Todos los campos son opcionales: solo se aplican los que se envíen.
  function actualizar(a: AtributosPlanta) {
    if (typeof a.visiblePlanta === "boolean") tallo.visible = hojas.visible = a.visiblePlanta;
    if (typeof a.escalaTallo === "number") tallo.scale.y = Math.max(a.escalaTallo, 0.01);
    if (typeof a.escalaGrosorTallo === "number") tallo.scale.x = tallo.scale.z = Math.max(a.escalaGrosorTallo, 0.01);
    const alturaActual = ALTURA_TALLO_BASE * tallo.scale.y;
    hojas.children.forEach((pivote) => {
      const malla = pivote.children[0];
      const f = pivote.userData.fraccion as number;
      pivote.position.set(swayX(f) * tallo.scale.x, f * alturaActual, 0); // siguen la curva del tallo
      if (typeof a.escalaHojas === "number") pivote.scale.setScalar(Math.max(a.escalaHojas, 0.01));
      if (typeof a.rotacionHojas === "number") malla.rotation.x = malla.userData.inclinacionBase + a.rotacionHojas;
      if (typeof a.giroHojas === "number") pivote.rotation.y = pivote.userData.giroBase + a.giroHojas;
    });
    // Espiga: siempre en la cúspide del tallo, continuando su curva
    espiga.position.set(swayX(1) * tallo.scale.x, alturaActual, 0);
    if (typeof a.escalaEspiga === "number") espiga.scale.setScalar(Math.max(a.escalaEspiga, 0.01));
    if (typeof a.inclinacionEspiga === "number") espiga.rotation.z = PENDIENTE_PUNTA + a.inclinacionEspiga;
    const espigaVisible = a.visibleEspiga ?? espiga.visible;
    espiga.visible = espigaVisible && a.visiblePlanta !== false;
    // Colores (aceptan hex numérico o cadena CSS)
    if (a.colorSuelo !== undefined) suelo.material.color.set(a.colorSuelo);
    if (a.colorTallo !== undefined) tallo.material.color.set(a.colorTallo);
    if (a.colorHojas !== undefined) materialHojas.color.set(a.colorHojas);
    if (a.colorEspiga !== undefined) {
      materialEspiga.color.set(a.colorEspiga);
      materialAristas.color.set(a.colorEspiga).offsetHSL(0, -0.05, 0.1);
      materialRaquis.color.set(a.colorEspiga).offsetHSL(0, -0.1, -0.06);
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
      const liberar = (o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      };
      scene.traverse(liberar);
      entorno.traverse(liberar);
      texturas.forEach((t) => t.dispose());
      texEntorno.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
