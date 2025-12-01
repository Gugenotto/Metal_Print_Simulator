
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, useTexture, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { PrintConfig } from '../types';

interface SceneProps {
  cmykUrl: string;
  metalnessMapUrl: string | null;
  roughnessMapUrl: string | null;
  clearcoatMapUrl: string | null;
  config: PrintConfig;
  aspectRatio: number;
  exposure: number;
  isPaperPreview: boolean;
}

// Separate component to reactively update scene globals
const SceneUpdater: React.FC<{ exposure: number }> = ({ exposure }) => {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [exposure, gl]);
  return null;
};

const PrintMesh: React.FC<SceneProps> = ({ 
  cmykUrl, 
  metalnessMapUrl, 
  roughnessMapUrl, 
  clearcoatMapUrl,
  config, 
  aspectRatio, 
  exposure,
  isPaperPreview
}) => {
  // Load main color texture
  const colorMap = useTexture(cmykUrl);
  
  // Load generated maps if available
  const metalMap = useTexture(metalnessMapUrl || cmykUrl); 
  const roughMap = useTexture(roughnessMapUrl || cmykUrl);
  const coatMap = useTexture(clearcoatMapUrl || cmykUrl);

  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useMemo(() => {
    // Texture encoding updates
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.anisotropy = 16;
    
    // Ensure generated data maps are treated as linear data (no gamma)
    metalMap.colorSpace = THREE.NoColorSpace;
    roughMap.colorSpace = THREE.NoColorSpace;
    coatMap.colorSpace = THREE.NoColorSpace;
  }, [colorMap, metalMap, roughMap, coatMap]);

  useFrame(() => {
    if (materialRef.current) {
        // Dynamic updates for environment intensity
        // Paper mode: reduced env intensity. Metal mode: full intensity.
        materialRef.current.envMapIntensity = isPaperPreview ? config.exposure * 0.2 : config.exposure;
    }
  });

  // Logic: 
  // If Varnish Map (clearcoatMapUrl) exists, we MUST use maps to display it correctly,
  // even in Paper Preview mode (Varnish on Paper).
  const hasVarnish = !!clearcoatMapUrl;
  
  // In Paper Preview:
  // If Varnish exists -> Use Maps (Varnish Map overrides Roughness Map locally).
  // If No Varnish -> Don't use Maps (Force uniform paper roughness).
  const useMaps = !isPaperPreview || hasVarnish;

  // Clearcoat Logic:
  // If Varnish exists -> 1.0 (The map controls WHERE it is).
  // Else if Paper Mode -> 0.0.
  // Else (Metal Mode) -> config.inkGlossiness.
  let clearcoatValue = 0.0;
  if (hasVarnish) {
      clearcoatValue = 1.0;
  } else if (!isPaperPreview) {
      clearcoatValue = config.inkGlossiness;
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow={false} receiveShadow>
      {/* Width fixed to 10, Height derived from aspect ratio */}
      <planeGeometry args={[10, 10 / aspectRatio]} /> 
      <meshPhysicalMaterial
        key={`${isPaperPreview}-${hasVarnish}`} // Force recreation when modes/varnish change
        ref={materialRef}
        map={colorMap}
        
        // Maps
        metalnessMap={useMaps ? metalMap : null}
        roughnessMap={useMaps ? roughMap : null}
        clearcoatMap={hasVarnish ? coatMap : null}
        
        // Bump Map for Varnish Volume
        // Reuse clearcoat map because it is white (high) where varnish is.
        bumpMap={hasVarnish ? coatMap : null}
        bumpScale={hasVarnish ? (config.varnishBump || 0.02) : 0}

        // Factors
        // Metalness: 
        // If Paper Mode (and no varnish logic requiring metal): 0.
        // *Correction*: Even if Varnish exists, if we are in Paper Mode, we want the background to be Paper (Metalness 0).
        // Since useMaps is TRUE if Varnish exists, we need to rely on the generated metalnessMap.
        // The processTextureMaps function sets metalness to 0 where Ink/Paper is.
        // However, if we are in Paper Preview, we want EVERYTHING to be Metalness 0.
        // But if we use the map, the "Metal" parts will be Metalness 1.
        // TRICK: If isPaperPreview is true, we force metalness prop to 0, which Multiplies with the map (0 * Map = 0).
        metalness={(!isPaperPreview && useMaps) ? 1.0 : 0.0} 
        
        // Roughness: 
        // If useMaps -> 1.0 (Map controls it).
        // If not using maps (Standard Paper) -> config.paperRoughness.
        roughness={useMaps ? 1.0 : config.paperRoughness}
        
        // Clearcoat:
        clearcoat={clearcoatValue}
        
        clearcoatRoughness={0.1} // Sharper coating for more gloss
        reflectivity={0.5} // Lower reflectivity (0.5) improves black depth on paper parts
        // EnvMap intensity handled in useFrame
      />
    </mesh>
  );
};

interface SimulatorProps {
  cmykUrl: string | null;
  metalnessMapUrl: string | null;
  roughnessMapUrl: string | null;
  clearcoatMapUrl: string | null;
  config: PrintConfig;
  aspectRatio: number;
  exposure: number;
  isPaperPreview: boolean;
}

const PrintSimulator: React.FC<SimulatorProps> = ({ 
    cmykUrl, 
    metalnessMapUrl, 
    roughnessMapUrl, 
    clearcoatMapUrl,
    config, 
    aspectRatio,
    exposure,
    isPaperPreview
}) => {
  if (!cmykUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-950">
        <p>Загрузите макет CMYK, чтобы начать 3D симуляцию</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: config.backgroundColor }}>
      {/* Tone mapping enabled for better contrast */}
      <Canvas 
        shadows 
        camera={{ position: [0, 15, 10], fov: 45 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure }}
      >
        <SceneUpdater exposure={config.toneMappingExposure || 0.9} />
        <color attach="background" args={[config.backgroundColor]} />
        
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />
        
        <Stage environment={null} intensity={0.5} adjustCamera={false}>
          <PrintMesh 
            cmykUrl={cmykUrl} 
            metalnessMapUrl={metalnessMapUrl} 
            roughnessMapUrl={roughnessMapUrl}
            clearcoatMapUrl={clearcoatMapUrl}
            config={config}
            aspectRatio={aspectRatio}
            exposure={exposure}
            isPaperPreview={isPaperPreview}
          />
        </Stage>
        
        {/* Environment provides reflections and light */}
        <Environment preset="warehouse" background={false} blur={0.6} />
      </Canvas>
      
      {/* HUD overlay for material status */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md p-2 rounded text-xs text-white pointer-events-none">
        <div>Разрешение: 4K</div>
        <div>Материал: {isPaperPreview ? 'Стандартная бумага' : 'Металл + Белила (Композит)'}</div>
        {clearcoatMapUrl && <div className="text-indigo-300">Вкл: Выборочный лак</div>}
        <div>Пропорции: {aspectRatio.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default PrintSimulator;
