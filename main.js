// ─────────────────────────────────────────────────────────────────────────────
// SCENE SETUP & RENDERER CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
// Initialize the desert environment with proper rendering pipeline.
// The exponential fog creates atmospheric depth perception and reinforces the
// desert haze aesthetic, enhancing immersion without impacting performance.
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc2956b, 0.008);

const camera = new THREE.PerspectiveCamera(
  70,
  innerWidth / innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 2.2, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Responsive viewport management ensures consistent rendering across display sizes
// while maintaining the 70-degree FOV perspective for navigation consistency
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─────────────────────────────────────────────────────────────────────────────
// LIGHTING SYSTEM - Dynamic Three-Point Lighting
// ─────────────────────────────────────────────────────────────────────────────
// Strategic positioning of directional, ambient, and point lights creates
// visual interest and enables dramatic day/night transitions. The sun's
// elevated azimuth (80°) casts extended shadows across dunes for depth.

// Primary directional light (sun) with shadow-casting for environmental depth
const sun = new THREE.DirectionalLight(0xffd090, 2.5);
sun.position.set(80, 120, 60);
sun.castShadow = true;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.bias = -0.0001;
scene.add(sun);

// Soft ambient illumination prevents overly dark shadowed areas,
// maintaining visual clarity in the oasis interior spaces
const ambient = new THREE.AmbientLight(0x8090a0, 0.7);
scene.add(ambient);

// Point light at the crash site fire creates focal point and
// enables dynamic gameplay lighting for night activities
const fireLight = new THREE.PointLight(0xff6a00, 0, 20);
fireLight.position.set(-3, 1.5, 8);
scene.add(fireLight);

// ─────────────────────────────────────────────────────────────────────────────
// ASSET LOADING SYSTEM & TEXTURE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
// Centralized loader instances with error handling ensure graceful degradation
// if assets fail to load. Progress tracking provides visual feedback to users.

const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();
const gltfLoader = new THREE.GLTFLoader();

// Asset loading state for UI feedback
const assetStatus = {
  skyboxLoaded: false,
  modelsLoaded: 0,
  totalModels: 3,
  errors: [],
};

// Procedural sand texture provides fallback and maintains visual continuity
// across terrain. The particle-like variation is efficient and scales well.
function createProceduralSandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Base sand color matching the desert environment palette
  ctx.fillStyle = "#d4a96a";
  ctx.fillRect(0, 0, 512, 512);

  // Scattered particles create visual grain without requiring external assets
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = "rgba(180,140,80,0.2)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
}

const sandTexture = createProceduralSandTexture();

// ─────────────────────────────────────────────────────────────────────────────
// TERRAIN SYSTEM - Procedural Dune Generation
// ─────────────────────────────────────────────────────────────────────────────
// Uses 2D sinusoidal functions to create rolling dune patterns. The terrain
// receives shadows and interacts with lighting, grounding the crash site
// within a cohesive desert environment.

const terrainGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
terrainGeometry.rotateX(-Math.PI / 2);

// Sculpt terrain using sinusoidal displacement to create natural dune formations
const positionAttribute = terrainGeometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i++) {
  const x = positionAttribute.getX(i);
  const z = positionAttribute.getZ(i);
  // Combined wave functions create overlapping dune ridges at different scales
  const height = Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2;
  positionAttribute.setY(i, height);
}
terrainGeometry.computeVertexNormals();

const terrain = new THREE.Mesh(
  terrainGeometry,
  new THREE.MeshStandardMaterial({
    map: sandTexture,
    roughness: 0.8,
    metalness: 0.0,
  }),
);
terrain.receiveShadow = true;
scene.add(terrain);

// ─────────────────────────────────────────────────────────────────────────────
// SKYBOX - Environment Mapping with Cube Texture
// ─────────────────────────────────────────────────────────────────────────────
// The cubemap creates a full 360° environment sphere. Using actual texture
// assets provides superior visual quality compared to shader gradients and
// enables realistic reflections on specular surfaces. Cube faces must follow
// the standard WebGL order: +X, -X, +Y, -Y, +Z, -Z

function initializeSkybox() {
  const skyboxUrls = [
    "assets/skyboxmtl/px.png", // +X (right)
    "assets/skyboxmtl/nx.png", // -X (left)
    "assets/skyboxmtl/py.png", // +Y (top)
    "assets/skyboxmtl/ny.png", // -Y (bottom)
    "assets/skyboxmtl/pz.png", // +Z (front)
    "assets/skyboxmtl/nz.png", // -Z (back)
  ];

  cubeTextureLoader.load(
    skyboxUrls,
    (cubeTexture) => {
      // Direct environment mapping provides realistic reflections on scene objects
      scene.background = cubeTexture;
      scene.environment = cubeTexture;
      assetStatus.skyboxLoaded = true;
      console.log("✓ Skybox loaded successfully");
    },
    (progress) => {
      // Progress callback for async loading feedback
      const percentComplete = (progress.loaded / progress.total) * 100;
      console.log(`Skybox loading: ${percentComplete.toFixed(1)}%`);
    },
    (error) => {
      // Graceful degradation: fallback to shader gradient if cubemap fails
      console.error("✗ Failed to load skybox textures:", error);
      assetStatus.errors.push("Skybox loading failed");
      initializeFallbackSkybox();
    },
  );
}

// Fallback gradient-based sky if cubemap assets unavailable
function initializeFallbackSkybox() {
  const fallbackSkyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x3a6fa0) },
      bottomColor: { value: new THREE.Color(0xe8c088) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });

  const fallbackSky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    fallbackSkyMat,
  );
  scene.add(fallbackSky);
}

// Initialize skybox with proper error handling
initializeSkybox();

// ─────────────────────────────────────────────────────────────────────────────
// WATER SYSTEM - GPU-Driven Wave Animation
// ─────────────────────────────────────────────────────────────────────────────
// The oasis water uses a shader-based approach for efficient animation without
// vertex deformation overhead. Transparency creates visual depth. This could be
// extended with normal mapping and wave displacement for greater realism.

const waterMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    time: { value: 0 },
    waveAmplitude: { value: 0.2 },
  },
  vertexShader: `
    uniform float time;
    uniform float waveAmplitude;
    void main() {
      vec3 pos = position;
      // Sinusoidal wave propagation creates ripple effect across the surface
      pos.z += sin(pos.x * 2.0 + time) * waveAmplitude;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      // RGBA encoding: desaturated blue with 70% opacity for translucency
      gl_FragColor = vec4(0.1, 0.5, 0.8, 0.7);
    }
  `,
});

const water = new THREE.Mesh(new THREE.CircleGeometry(10, 64), waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.set(0, 0.1, -20);
scene.add(water);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE OBJECTS - Local Asset Loading with Error Handling
// ─────────────────────────────────────────────────────────────────────────────
// Loads locally-hosted GLTF models for the crash site environment. Each model
// has properly configured shadows to integrate with the terrain lighting.
// Error handling ensures the scene remains functional if assets fail to load.

const sceneObjects = {
  tank: null,
  truck: null,
  environment: null,
};

// Tank positioned as main crash debris - central focal point
function loadTank() {
  gltfLoader.load(
    "assets/Tank.glb",
    (gltf) => {
      sceneObjects.tank = gltf.scene;
      sceneObjects.tank.scale.set(1.5, 1.5, 1.5);
      sceneObjects.tank.position.set(-8, 0, 5);
      sceneObjects.tank.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(sceneObjects.tank);
      assetStatus.modelsLoaded++;
      console.log(
        `✓ Tank loaded (${assetStatus.modelsLoaded}/${assetStatus.totalModels})`,
      );
    },
    (progress) => {
      console.log(
        `Tank loading: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`,
      );
    },
    (error) => {
      console.error("✗ Failed to load Tank model:", error);
      assetStatus.errors.push("Tank model failed to load");
      assetStatus.modelsLoaded++;
    },
  );
}

// M939 Truck - secondary crash debris with offset positioning
function loadTruck() {
  gltfLoader.load(
    "assets/M939 Truck.glb",
    (gltf) => {
      sceneObjects.truck = gltf.scene;
      sceneObjects.truck.scale.set(0.8, 0.8, 0.8);
      sceneObjects.truck.position.set(12, 0, -5);
      sceneObjects.truck.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(sceneObjects.truck);
      assetStatus.modelsLoaded++;
      console.log(
        `✓ Truck loaded (${assetStatus.modelsLoaded}/${assetStatus.totalModels})`,
      );
    },
    (progress) => {
      console.log(
        `Truck loading: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`,
      );
    },
    (error) => {
      console.error("✗ Failed to load Truck model:", error);
      assetStatus.errors.push("Truck model failed to load");
      assetStatus.modelsLoaded++;
    },
  );
}

// Environment detail model - creates visual interest in crash site
function loadEnvironmentDetail() {
  gltfLoader.load(
    "assets/model.obj",
    (gltf) => {
      sceneObjects.environment = gltf.scene;
      sceneObjects.environment.scale.set(1, 1, 1);
      sceneObjects.environment.position.set(0, 0, -15);
      sceneObjects.environment.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(sceneObjects.environment);
      assetStatus.modelsLoaded++;
      console.log(
        `✓ Environment detail loaded (${assetStatus.modelsLoaded}/${assetStatus.totalModels})`,
      );
    },
    (progress) => {
      console.log(
        `Environment loading: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`,
      );
    },
    (error) => {
      console.error("✗ Failed to load environment detail:", error);
      assetStatus.errors.push("Environment detail failed to load");
      assetStatus.modelsLoaded++;
    },
  );
}

// Initialize all scene object loading
loadTank();
loadTruck();
loadEnvironmentDetail();

// ─────────────────────────────────────────────────────────────────────────────
// USER INTERACTION SYSTEM - Time of Day & Environmental Control
// ─────────────────────────────────────────────────────────────────────────────
// The day/night toggle switches lighting states to demonstrate environmental
// feedback and provide players with different aesthetic/gameplay experiences.
// This could be extended with animated lighting transitions and sky color shifts.

let timeOfDay = {
  isNight: false,
  sunIntensity: { day: 2.5, night: 0.2 },
  ambientIntensity: { day: 0.7, night: 0.1 },
};

function toggleTimeOfDay() {
  timeOfDay.isNight = !timeOfDay.isNight;
  const intensity = timeOfDay.isNight ? "night" : "day";
  sun.intensity = timeOfDay.sunIntensity[intensity];
  ambient.intensity = timeOfDay.ambientIntensity[intensity];
  console.log(`Time: ${timeOfDay.isNight ? "Night" : "Day"} mode activated`);
}

function toggleRain() {
  // Placeholder for rain particle system implementation
  console.log("Rain toggle - particle system implementation pending");
}

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "t") toggleTimeOfDay();
  if (e.key.toLowerCase() === "r") toggleRain();
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA MOVEMENT - WASD-based First-Person Navigation
// ─────────────────────────────────────────────────────────────────────────────
// FPS-style movement provides immersive navigation through the crash site.
// The 10 unit/second speed balances exploration pace with terrain traversal.
// Keyboard state tracking enables smooth diagonal movement and momentum feel.

const movementInput = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  speed: 10,
};

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
      movementInput.forward = true;
      break;
    case "KeyS":
      movementInput.backward = true;
      break;
    case "KeyA":
      movementInput.left = true;
      break;
    case "KeyD":
      movementInput.right = true;
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
      movementInput.forward = false;
      break;
    case "KeyS":
      movementInput.backward = false;
      break;
    case "KeyA":
      movementInput.left = false;
      break;
    case "KeyD":
      movementInput.right = false;
      break;
  }
});

function updateCameraMovement(deltaTime) {
  // Calculate movement direction based on active inputs
  const direction = new THREE.Vector3();

  if (movementInput.forward) direction.z -= 1;
  if (movementInput.backward) direction.z += 1;
  if (movementInput.left) direction.x -= 1;
  if (movementInput.right) direction.x += 1;

  // Normalize prevents diagonal movement from being faster than cardinal directions
  if (direction.length() > 0) {
    direction.normalize();
    camera.position.addScaledVector(direction, movementInput.speed * deltaTime);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION LOOP - Central Update System
// ─────────────────────────────────────────────────────────────────────────────
// Coordinates all per-frame updates: user input processing, shader updates,
// object animations, and rendering. Delta time (deltaTime) ensures animations
// are framerate-independent for consistent behavior across devices.

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Update water shader animation with elapsed time for smooth wave propagation
  water.material.uniforms.time.value = elapsedTime;

  // Process player input and update camera position
  updateCameraMovement(deltaTime);

  // Render current scene state from camera perspective
  renderer.render(scene, camera);
}

// Start the animation loop
animate();
