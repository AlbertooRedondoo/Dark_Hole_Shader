# Simulación Interactiva de Agujero Negro Devorando la Tierra

## Descripción

Visualización 3D interactiva que simula el efecto gravitatorio de un agujero negro absorbiendo la Tierra mediante **shaders GLSL personalizados** y **Three.js**. El proyecto implementa efectos visuales avanzados con túneles de distorsión espacio-temporal, animaciones procedurales y transiciones fluidas.

**Autor:** Alberto Redondo Álvarez de Sotomayor

**Vídeo y Dirección del Proyecto:**

https://drive.google.com/file/d/1A6FzUFE6wDoDuUup_Fsj2hCwahxS5t_b/view?usp=sharing

https://codesandbox.io/p/sandbox/ig2526-s7-forked-m2y5j7

---

## Características Principales

### Texturas y Materiales

El proyecto combina materiales básicos para objetos estáticos con **shaders procedurales personalizados** para efectos físicos complejos:

#### **Esfera de Fondo Estelar**
- **Textura:** `2k_stars.jpg` (panorama equirectangular de estrellas)
- **Geometría:** `SphereGeometry` de radio 200 unidades (64×64 segmentos)
- **Material:** `MeshBasicMaterial` con `side: THREE.BackSide`
  - Renderizado invertido (desde dentro de la esfera)
  - Textura mapeada en el interior
  - No requiere iluminación (auto-iluminada)
- **Rotación:** 0.0005 rad/frame (movimiento ultra-lento para inmersión)
- **Propósito:** Simular el cosmos infinito que rodea la escena

**Características técnicas del fondo:**
- Radio 200× mayor que la Tierra (escala cósmica)
- BackSide rendering evita culling de caras internas
- Textura equirectangular para cobertura esférica 360°
- Sin seams visibles gracias a mapping UV automático

#### **La Tierra**
- **Textura:** `earthmap1k.jpg` (mapa de continentes y océanos 1K)
- **Geometría:** `SphereGeometry` de radio 1.8 unidades (64×64 segmentos)
- **Material:** `MeshBasicMaterial` con textura difusa
  - Color uniforme (no afectado por luces)
  - Mapeo UV esférico estándar
  - Opacidad 100% (modificable durante animación)
- **Rotación:** 0.003 rad/frame sobre eje Y
- **Radio:** `EARTH_RADIUS = 1.8` (constante configurable)

**Estados de la Tierra:**

**Estado Inicial/Normal:**
- Escala: (1, 1, 1)
- Posición: (0, 0, 0) centro de escena
- Visible: `true`
- Rotación continua activa

**Estado Durante Absorción:**
- Escala: Interpolada linealmente de 1.0 → 0.001 en 2 segundos
- Posición: Fija en origen (implosión hacia centro)
- Visible: `true` hasta completar animación
- Cálculo de escala: `s = 1.0 - (elapsedTime / BH_IN_DURATION)`

**Estado Post-Absorción:**
- Escala: (0.001, 0.001, 0.001) - casi inexistente
- Visible: `false` (ocultación tras completar animación)
- Propósito: Simular aniquilación total por singularidad

#### **Plano de Agujero Negro (Shader Personalizado)**

**Geometría:**
- `PlaneGeometry` de 400×400 unidades (1×1 segmentos)
- Posición Z: -100 (detrás de la Tierra, dentro de esfera estelar)
- Orientación: Perpendicular a cámara (billboard implícito)

**Material: ShaderMaterial Personalizado**
- Vertex Shader + Fragment Shader GLSL
- Transparencia activada (`transparent: true`)
- `depthWrite: false` - No bloquea objetos detrás
- Actualización en tiempo real via uniforms

**Propósito:** Crear efecto visual de horizonte de eventos con distorsión espacio-temporal

---

### Sistema de Shaders GLSL

El corazón visual del proyecto reside en los shaders personalizados que generan el efecto del agujero negro:

#### **Vertex Shader (blackHoleVertexShader)**

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
```

**Función:**
- Pasa coordenadas UV al fragment shader via `varying`
- Transformación estándar modelo → vista → proyección
- Sin deformación geométrica (plano permanece plano)

**Propósito:** Shader de paso simple para permitir que fragment shader genere el efecto

#### **Fragment Shader (blackHoleFragmentShader)**

```glsl
uniform vec2 u_resolution;  // Resolución de pantalla
uniform float u_time;       // Tiempo acumulado
uniform float u_strength;   // Intensidad del efecto [0-1]
```

**Algoritmo Visual (paso a paso):**

1. **Normalización de Coordenadas:**
   ```glsl
   vec2 st = vUv * 2.0 - 1.0;  // Convierte [0,1] → [-1,1]
   ```
   Centro del plano en (0,0)

2. **Cálculo Polar:**
   ```glsl
   float r = length(st);           // Distancia desde centro
   float angle = atan(st.y, st.x); // Ángulo polar (no usado actualmente)
   ```

3. **Generación de Túnel Animado:**
   ```glsl
   float v = u_time * 4.0 + 8.0 / (r + 0.1);
   ```
   - `u_time * 4.0`: Velocidad de rotación temporal
   - `8.0 / (r + 0.1)`: Distorsión inversa (más bandas cerca del centro)
   - `+ 0.1`: Evita división por cero

4. **Patrón de Bandas:**
   ```glsl
   float bandas = abs(sin(v));
   ```
   - Produce franjas concéntricas que se mueven radialmente
   - `abs()` crea bandas simétricas

5. **Mezcla de Colores:**
   ```glsl
   vec3 purple = vec3(0.5, 0.0, 0.6);  // Morado característico
   vec3 baseColor = mix(vec3(0.0), purple, bandas);
   ```
   - Interpolación entre negro y morado según patrón
   - Efecto de "anillos de acreción"

6. **Atenuación Radial (Falloff):**
   ```glsl
   float falloff = 1.0 - smoothstep(0.0, 1.2, r);
   baseColor *= falloff;
   ```
   - `smoothstep()`: Transición suave de opacidad
   - Centro brillante → bordes oscuros
   - Simula intensidad luminosa del horizonte de eventos

7. **Control de Transparencia:**
   ```glsl
   float alpha = u_strength;
   gl_FragColor = vec4(baseColor, alpha);
   ```
   - Alpha controlado externamente por `u_strength`
   - Permite fade-in/fade-out del efecto

**Efecto Visual Resultante:**
- Túnel hipnótico de bandas concéntricas moradas/negras
- Movimiento radial continuo hacia el centro
- Intensidad decreciente hacia bordes
- Simula distorsión gravitatoria extrema

#### **Uniforms del Shader**

```javascript
const blackHoleUniforms = {
  u_resolution: { 
    value: new THREE.Vector2(windowWidth, windowHeight) 
  },
  u_time: { value: 0.0 },      // Actualizado cada frame
  u_strength: { value: 0.0 }   // Controlado por animación
};
```

**Actualización en Runtime:**
- `u_time`: Incrementa continuamente con `clock.getDelta()`
- `u_strength`: Interpolado de 0→1 durante animación de absorción
- `u_resolution`: Actualizado en evento `resize`

---

### Sistema de Iluminación

#### **Modelo Sin Iluminación Directa**

**Razones técnicas:**
- `MeshBasicMaterial` para todos los objetos estándar
- No hay fuentes de luz (`PointLight`, `DirectionalLight`, etc.)
- Shaders generan su propia luminosidad proceduralmente
- Máximo rendimiento sin cálculos de Phong/Lambert

**Iluminación Efectiva:**
- **Fondo estelar:** Textura auto-emitida (estrellas brillantes)
- **Tierra:** Textura difusa con color uniforme
- **Agujero negro:** Shader genera gradientes de luminosidad
- **Resultado:** Escena nítida sin sombras ni degradados de iluminación

**Ventajas en Contexto Espacial:**
- Realismo del vacío (no hay atmósfera que disperse luz)
- Colores puros sin contaminación de luz ambiente
- Enfoque artístico sobre físico
- Shader tiene control total sobre su apariencia

---

### Sistema de Animación

El proyecto implementa una **máquina de estados temporal** para controlar la secuencia de absorción:

#### **Estados de la Animación**

```
[IDLE] → [ABSORBING] → [HOLDING] → [COMPLETE]
  ↓                                      ↑
  └──────────── [RESET] ────────────────┘
```

**Variables de Control:**
```javascript
let blackHoleAnimating = false;  // Flag de animación activa
let blackHoleTime = 0;           // Tiempo acumulado de animación
let earthEaten = false;          // Flag de Tierra consumida

const BH_IN_DURATION = 2.0;      // Duración de absorción (seg)
const BH_HOLD_DURATION = 0.5;    // Duración de retención (seg)
```

#### **Fase 1: Absorción (0 → 2 segundos)**

```javascript
if (blackHoleTime <= BH_IN_DURATION) {
  const p = blackHoleTime / BH_IN_DURATION;  // Progreso [0-1]
  const s = 1.0 - p;                         // Escala inversa
  
  earth.scale.setScalar(Math.max(s, 0.001)); // Shrink progresivo
  blackHoleUniforms.u_strength.value = p;     // Fade-in del shader
}
```

**Efectos simultáneos:**
- **Tierra:** Reduce escala linealmente de 1.0 → 0.001
- **Shader:** Aumenta opacidad de 0.0 → 1.0
- **Sincronización:** Ambos procesos duran exactamente 2 segundos
- **Clamp:** `Math.max(s, 0.001)` evita escala cero (problemas de rendering)

**Interpolación:** Lineal (sin easing) para efecto dramático constante

#### **Fase 2: Retención (2 → 2.5 segundos)**

```javascript
else if (blackHoleTime <= BH_IN_DURATION + BH_HOLD_DURATION) {
  blackHoleUniforms.u_strength.value = 1.0;
  if (!earthEaten) {
    earth.visible = false;
    earthEaten = true;
  }
}
```

**Propósito:**
- Mantener shader a máxima intensidad
- Ocultar completamente la Tierra (`visible = false`)
- Pausar antes de finalizar (efecto dramático)
- Flag `earthEaten` evita múltiples ocultaciones

#### **Fase 3: Completo (> 2.5 segundos)**

```javascript
else {
  blackHoleAnimating = false;
  blackHoleUniforms.u_strength.value = 1.0;
}
```

**Estado final:**
- Animación detenida
- Shader permanece visible a máxima intensidad
- Tierra invisible
- Sistema listo para reset manual

#### **Función Reset**

```javascript
function resetEarth() {
  earth.visible = true;
  earth.scale.set(1, 1, 1);
  earth.position.set(0, 0, 0);
  
  blackHoleAnimating = false;
  blackHoleTime = 0;
  earthEaten = false;
  blackHoleUniforms.u_strength.value = 0.0;
  blackHoleMesh.visible = false;
}
```

**Restauración completa:**
- Resetea todas las variables de estado
- Restaura escala y posición original de la Tierra
- Oculta shader del agujero negro
- Sistema vuelve a estado inicial

---

### Interactividad

#### **Controles de Cámara (OrbitControls)**
- **Rotación orbital:** Click + arrastrar
- **Zoom:** Rueda del ratón
- **Pan:** Click derecho + arrastrar
- **Rango de visión:** 0.1 → 1000 unidades
- **FOV:** 40° (campo de visión moderado)
- **Posición inicial:** (0, 0, 20) - vista frontal alejada

**Configuración de controles:**
```javascript
camcontrols1 = new OrbitControls(camera, renderer.domElement);
// Sin damping (respuesta inmediata)
// Sin restricciones de ángulo
```

#### **Interfaz de Usuario**

**Título Superior:**
- Posición: Fija en top center
- Texto: "Agujero negro Alberto Redondo"
- Estilo: Monospace, blanco, semi-transparente
- Z-index: 2 (sobre canvas, bajo botones)

**Panel de Botones (inferior centrado):**

**Botón "Agujero negro":**
```javascript
onClick → startBlackHole()
→ Activa animación de absorción
→ Hace visible el shader
→ Resetea temporizadores
```

**Botón "Reset":**
```javascript
onClick → resetEarth()
→ Restaura escena a estado inicial
→ Detiene animaciones
→ Oculta efectos del agujero negro
```

**Diseño de botones:**
- Fondo: `#222` (gris oscuro)
- Texto: Blanco, Monospace
- Padding: 8px 14px
- Border-radius: 6px
- Hover: Aumento de opacidad (0.9 → 1.0)
- Gap: 10px entre botones

---

### Loop de Animación

```javascript
function animationLoop() {
  requestAnimationFrame(animationLoop);
  
  const delta = clock.getDelta();  // Delta time (seg)
  time += delta;                    // Tiempo acumulado global
  
  // Actualizar uniforms del shader
  blackHoleUniforms.u_time.value = time;
  
  // Lógica de máquina de estados
  updateBlackHole(delta);
  
  // Rotaciones continuas
  for (let object of objetos) {
    object.rotation.y += 0.003;  // Tierra
  }
  backgroundMesh.rotation.y += 0.0005;  // Estrellas
  
  renderer.render(scene, camera);
}
```

**Flujo de actualización:**
1. Solicitar siguiente frame (VSync)
2. Calcular delta time (independencia de framerate)
3. Actualizar tiempo global del shader
4. Ejecutar lógica de absorción si activa
5. Aplicar rotaciones continuas
6. Renderizar escena

**Uso de THREE.Clock:**
- Medición precisa de tiempo transcurrido
- Manejo automático de pausas del navegador
- Delta time para animaciones frame-independent

---

## Tecnologías

- **Three.js (r128):** Renderizado WebGL
- **OrbitControls:** Controles de cámara
- **GLSL (OpenGL Shading Language):** Shaders personalizados
- **ShaderMaterial:** Integración de shaders en Three.js
- **THREE.Clock:** Gestión de tiempo
- **JavaScript ES6+:** Módulos, async loading

---

## Características Técnicas Destacadas

### Shaders Procedurales

**Ventajas sobre texturas:**
- Resolución infinita (generación matemática)
- Tamaño de archivo mínimo (solo código)
- Animación integrada sin frames adicionales
- Control paramétrico completo
- Sin carga asíncrona (instantáneo)

**Complejidad computacional:**
- Cálculo por pixel cada frame
- ~160,000 pixels en 1080p (400×400 plano)
- GPU ejecuta en paralelo (altamente eficiente)
- Sin impacto notable en framerate

### Gestión de Transparencia

```javascript
transparent: true,    // Habilita alpha blending
depthWrite: false,    // No escribe en depth buffer
```

**Implicaciones:**
- Shader no bloquea objetos detrás
- Permite ver estrellas de fondo
- Ordenamiento correcto de profundidad
- Composición aditiva con escena

### Optimizaciones de Rendimiento

**Geometría minimalista:**
- Plano de shader: 1×1 segmentos (2 triángulos)
- Sin subdivisiones innecesarias
- Detalle visual en fragment shader, no en geometría

**Actualizaciones selectivas:**
- Shader solo actualiza cuando `blackHoleMesh.visible === true`
- Rotaciones aplicadas solo a objetos en `objetos` array
- Sin operaciones matemáticas superfluas

**Texturas eficientes:**
- 1K resolution para Tierra (suficiente para la escala)
- 2K para estrellas (visible como fondo)
- Compresión JPEG para tamaño reducido

### Responsive Design

```javascript
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Actualizar uniform de resolución para shader
  blackHoleUniforms.u_resolution.value.set(
    window.innerWidth,
    window.innerHeight
  );
}
```

**Adaptación completa:**
- Proyección de cámara ajustada
- Renderer reescalado sin pérdida de calidad
- Shader recibe nueva resolución (aunque no la usa actualmente)

---

## Funciones Principales

### `startBlackHole()`
Inicia la secuencia de absorción del agujero negro.
- Activa flags de animación
- Resetea temporizador
- Hace visible el plano de shader

### `resetEarth()`
Restaura la escena a su estado inicial.
- Resetea escala, posición y visibilidad de la Tierra
- Oculta shader del agujero negro
- Limpia flags de estado

### `updateBlackHole(delta)`
Máquina de estados que controla las fases de la animación.
- Fase absorción: Reduce Tierra y aumenta shader
- Fase retención: Mantiene efecto máximo
- Fase completo: Finaliza animación

### `animationLoop()`
Loop principal de renderizado (60 FPS target).
- Actualiza tiempo global
- Ejecuta lógica de animación
- Aplica rotaciones continuas
- Renderiza escena

---

## Física Conceptual vs Artística

### Realismo Físico (NO implementado)

Un agujero negro real causaría:
- **Lensing gravitacional:** Distorsión de luz de fondo
- **Disco de acreción:** Materia orbital a alta temperatura
- **Spaghettification:** Estiramiento de objetos por fuerzas de marea
- **Redshift gravitacional:** Cambio de frecuencia de luz
- **Horizonte de eventos:** Superficie de no retorno

### Implementación Artística (SÍ implementado)

El proyecto prioriza **impacto visual** sobre precisión:
- Túnel de bandas moradas (estética sobre física)
- Escala uniforme (simplificado vs spaghettification)
- Absorción rápida (2 seg vs millones de años reales)
- Sin efectos de luz curvada
- Propósito: Experiencia dramática e intuitiva

---
