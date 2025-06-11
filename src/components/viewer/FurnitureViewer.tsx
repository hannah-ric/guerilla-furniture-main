import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PresentationControls, Html } from '@react-three/drei';
import { FurnitureDesign } from '@/lib/types';
import { ModelGenerator } from '@/services/3d/modelGenerator';
import * as THREE from 'three';
import { useIntersectionObserver, useThrottle } from '@/lib/performance';
import { DIMENSIONS } from '@/lib/constants';

interface Props {
  design: FurnitureDesign | null;
  showDimensions?: boolean;
  enableAnimation?: boolean;
}

// Memoized furniture model component
const FurnitureModel = React.memo(({ design }: { design: FurnitureDesign }) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const generator = useMemo(() => new ModelGenerator(), []);
  
  useEffect(() => {
    let cancelled = false;
    
    generator.generateModel(design).then(generatedModel => {
      if (!cancelled) {
        setModel(generatedModel);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [design, generator]);
  
  if (!model) return null;
  
  return <primitive object={model} />;
});

FurnitureModel.displayName = 'FurnitureModel';

// Loading component
const LoadingBox = React.memo(() => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#cccccc" wireframe />
    </mesh>
  );
});

LoadingBox.displayName = 'LoadingBox';

// Empty state component
const EmptyState = React.memo(() => (
  <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
    <div className="text-center">
      <svg
        className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <p className="text-sm">No design to preview yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Start by describing what you'd like to build
      </p>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Dimension labels component
const DimensionLabels = React.memo(({ dimensions }: { dimensions: any }) => {
  const scale = 1 / DIMENSIONS.INCH_TO_FEET;
  
  return (
    <group>
      <Html position={[dimensions.width * scale / 2 + 0.5, 0, 0]}>
        <div className="text-xs bg-background/80 px-1 rounded">
          {dimensions.width}"
        </div>
      </Html>
      <Html position={[0, dimensions.height * scale / 2 + 0.5, 0]}>
        <div className="text-xs bg-background/80 px-1 rounded">
          {dimensions.height}"
        </div>
      </Html>
      <Html position={[0, 0, dimensions.depth * scale / 2 + 0.5]}>
        <div className="text-xs bg-background/80 px-1 rounded">
          {dimensions.depth}"
        </div>
      </Html>
    </group>
  );
});

DimensionLabels.displayName = 'DimensionLabels';

export function FurnitureViewer({ design, showDimensions, enableAnimation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  // Track if component has ever been visible
  useEffect(() => {
    if (isVisible && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isVisible, hasBeenVisible]);

  // Calculate camera position based on furniture dimensions
  const cameraConfig = useMemo(() => {
    if (!design?.dimensions) {
      return { position: [5, 5, 5] as [number, number, number], fov: 50 };
    }

    const maxDimension = Math.max(
      design.dimensions.width,
      design.dimensions.height,
      design.dimensions.depth
    ) / DIMENSIONS.INCH_TO_FEET;

    const distance = maxDimension * 2.5;
    
    return {
      position: [distance, distance, distance] as [number, number, number],
      fov: 50
    };
  }, [design?.dimensions]);

  // Throttle orbit controls updates
  const handleOrbitChange = useThrottle(() => {
    // Handle orbit control changes if needed
  }, 100);

  if (!design?.dimensions) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
      {hasBeenVisible && (
        <Canvas 
          camera={{ 
            position: cameraConfig.position,
            fov: cameraConfig.fov,
            near: 0.1,
            far: 1000
          }}
          shadows
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          dpr={[1, 2]} // Limit pixel ratio for performance
        >
          <Suspense fallback={<LoadingBox />}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={1}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-10}
              shadow-camera-right={10}
              shadow-camera-top={10}
              shadow-camera-bottom={-10}
            />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />
            
            {/* Environment for reflections */}
            <Environment preset="apartment" />
            
            {/* Grid floor */}
            <Grid 
              args={[20, 20]} 
              cellSize={1}
              cellThickness={0.5}
              cellColor="#6b7280"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#374151"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
            />
            
            {/* Furniture Model */}
            <FurnitureModel design={design} />
            
            {/* Dimension labels */}
            {showDimensions && (
              <DimensionLabels dimensions={design.dimensions} />
            )}
            
            {/* Controls */}
            {enableAnimation ? (
              <PresentationControls
                global
                zoom={0.8}
                rotation={[0, -Math.PI / 4, 0]}
                polar={[-Math.PI / 2, Math.PI / 2]}
                azimuth={[-Math.PI / 2, Math.PI / 2]}
              >
                <OrbitControls 
                  enablePan={false}
                  onChange={handleOrbitChange}
                />
              </PresentationControls>
            ) : (
              <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true}
                minDistance={cameraConfig.position[0] * 0.5}
                maxDistance={cameraConfig.position[0] * 3}
                onChange={handleOrbitChange}
              />
            )}
          </Suspense>
        </Canvas>
      )}
      
      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 text-sm">
        <div className="font-semibold">{design.name || design.furniture_type}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {design.dimensions.width}" × {design.dimensions.height}" × {design.dimensions.depth}"
        </div>
        {design.materials?.[0] && (
          <div className="text-xs text-muted-foreground">
            {design.materials[0].type}
          </div>
        )}
      </div>
    </div>
  );
}