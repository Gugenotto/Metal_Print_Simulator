
import { PrintConfig } from '../types';

/**
 * Helper to convert an image URL (Blob or Data URL) to a Base64 string.
 */
const urlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Generates a complete HTML string containing a Three.js scene.
 */
export const generateStandaloneHtml = async (
  cmykUrl: string,
  metalnessMapUrl: string | null,
  roughnessMapUrl: string | null,
  clearcoatMapUrl: string | null, // New Argument
  config: PrintConfig,
  aspectRatio: number,
  isPaperPreview: boolean
): Promise<string> => {
  // 1. Prepare Textures
  const cmykBase64 = await urlToBase64(cmykUrl);
  
  // Logic matches PrintSimulator:
  // If Varnish exists (clearcoatMapUrl), we load maps even in Paper Mode.
  // If no Varnish, and Paper Mode -> don't load maps.
  const hasVarnish = !!clearcoatMapUrl;
  const shouldLoadMaps = !isPaperPreview || hasVarnish;

  const metalBase64 = (shouldLoadMaps && metalnessMapUrl) ? await urlToBase64(metalnessMapUrl) : null;
  const roughBase64 = (shouldLoadMaps && roughnessMapUrl) ? await urlToBase64(roughnessMapUrl) : null;
  const coatBase64 = (hasVarnish && clearcoatMapUrl) ? await urlToBase64(clearcoatMapUrl) : null;

  // Determine Clearcoat Value logic for string interpolation
  // Logic: 
  // If hasVarnish -> 1.0. 
  // Else if PaperMode -> 0.0. 
  // Else -> config.inkGlossiness.
  let clearcoatValStr = '0.0';
  if (hasVarnish) {
      clearcoatValStr = '1.0';
  } else if (!isPaperPreview) {
      clearcoatValStr = `${config.inkGlossiness}`;
  }

  // 2. Construct the HTML
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetalPrint 3D Экспорт</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: ${config.backgroundColor}; font-family: sans-serif; }
        #info {
            position: absolute; top: 10px; left: 10px;
            color: white; background: rgba(0,0,0,0.5);
            padding: 10px; border-radius: 4px; pointer-events: none;
        }
        canvas { display: block; }
    </style>
    <!-- Import Maps for Three.js -->
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>
</head>
<body>
    <div id="info">
        <strong>MetalPrint Просмотр</strong><br>
        ЛКМ: Вращение<br>
        ПКМ: Панорама<br>
        Скролл: Масштаб
        ${isPaperPreview ? '<br><span style="color:#aaa; font-size:0.8em">(Режим: Бумага)</span>' : ''}
    </div>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

        // --- Configuration ---
        const config = ${JSON.stringify(config)};
        const aspectRatio = ${aspectRatio};
        const isPaperPreview = ${isPaperPreview};
        
        // --- Scene Setup ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(config.backgroundColor);
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 15, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = ${config.toneMappingExposure || 0.9};
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = false; 
        document.body.appendChild(renderer.domElement);

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI / 2.2;

        // --- Lighting & Environment ---
        new RGBELoader()
            .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
            .load('empty_warehouse_01_1k.hdr', function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture;
                // Standard intensity 1.0, material controls local reflection intensity
                scene.environmentIntensity = 1.0;
            });

        // Ambient Light to maintain base brightness
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        // --- Materials & Textures ---
        const textureLoader = new THREE.TextureLoader();
        
        const cmykTex = textureLoader.load('${cmykBase64}');
        cmykTex.colorSpace = THREE.SRGBColorSpace;
        cmykTex.anisotropy = 16;

        const metalTex = ${metalBase64 ? `textureLoader.load('${metalBase64}')` : 'null'};
        const roughTex = ${roughBase64 ? `textureLoader.load('${roughBase64}')` : 'null'};
        const coatTex = ${coatBase64 ? `textureLoader.load('${coatBase64}')` : 'null'};

        if(metalTex) metalTex.colorSpace = THREE.NoColorSpace;
        if(roughTex) roughTex.colorSpace = THREE.NoColorSpace;
        if(coatTex) coatTex.colorSpace = THREE.NoColorSpace;

        const geometry = new THREE.PlaneGeometry(10, 10 / aspectRatio);
        const material = new THREE.MeshPhysicalMaterial({
            map: cmykTex,
            metalnessMap: metalTex || null,
            roughnessMap: roughTex || null,
            clearcoatMap: coatTex || null,

            // Bump Map for Varnish Volume
            bumpMap: coatTex || null,
            bumpScale: (coatTex && config.varnishBump) ? config.varnishBump : 0,
            
            // Logic: 
            // If Paper Mode: metalness must be 0 (multiplying with map if map exists).
            // If Metal Mode: metalness 1.0 (if map exists).
            // Note: If Varnish exists in paper mode, we loaded metalTex, but we want 0 metalness.
            metalness: ${(!isPaperPreview && metalnessMapUrl) ? '1.0' : '0.0'},
            
            // Logic: 
            // - If Map: Use 1.0 (Map controls it).
            // - If No Map (Std Paper): Use config.paperRoughness directly.
            roughness: ${(shouldLoadMaps && roughnessMapUrl) ? '1.0' : config.paperRoughness},
            
            // Logic: Calculated string above
            clearcoat: ${clearcoatValStr},
            
            clearcoatRoughness: 0.1,
            reflectivity: 0.5,
            
            // Ensure material env intensity matches scene logic
            envMapIntensity: ${isPaperPreview ? config.exposure * 0.2 : config.exposure},
            
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.castShadow = false; 
        mesh.receiveShadow = false; 
        scene.add(mesh);

        // --- Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);

        animate();
    </script>
</body>
</html>`;
};
