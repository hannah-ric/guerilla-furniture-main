import React, { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html, PerspectiveCamera } from '@react-three/drei';
import { FurnitureDesign } from '@/lib/types';
import { ModelGenerator } from '@/services/3d/modelGenerator';
import * as THREE from 'three';
import { useIntersectionObserver, useThrottle } from '@/lib/performance';
import { DIMENSIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Eye, Package, Play } from 'lucide-react';

interface Props {
  design: FurnitureDesign | null;
  showDimensions?: boolean;
  enableAnimation?: boolean;
}

// View modes for the 3D viewer
type ViewMode = 'assembled' | 'exploded' | 'animation';

// Animated model component
const AnimatedModel = React.memo(({ 
  model, 
  isPlaying 
}: { 
  model: THREE.Group; 
  isPlaying: boolean 
}) => {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
  useEffect(() => {
    if (model.userData.animations && model.userData.animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(model);
      const action = mixerRef.current.clipAction(model.userData.animations[0]);
      
      if (isPlaying) {
        action.play();
      } else {
        action.stop();
      }
      
      return () => {
        action.stop();
      };
    }
  }, [model, isPlaying]);
  
  useFrame(() => {
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(clockRef.current.getDelta());
    }
  });
  
  return <primitive object={model} />;
});

AnimatedModel.displayName = 'AnimatedModel';

// Furniture model component with view mode support
const FurnitureModel = React.memo(({ 
  design, 
  viewMode,
  onModelLoad 
}: { 
  design: FurnitureDesign;
  viewMode: ViewMode;
  onModelLoad: (model: THREE.Group) => void;
}) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [currentView, setCurrentView] = useState<THREE.Group | null>(null);
  const generator = useMemo(() => new ModelGenerator(), []);
  
  useEffect(() => {
    let cancelled = false;
    
    generator.generateModel(design).then(generatedModel => {
      if (!cancelled) {
        setModel(generatedModel);
        onModelLoad(generatedModel);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [design, generator, onModelLoad]);

  useEffect(() => {
    return () => {
      if (generator && typeof generator.dispose === 'function') {
        generator.dispose();
      }
    };
  }, [generator]);
  
  useEffect(() => {
    if (!model) return;
    
    switch (viewMode) {
      case 'assembled':
        setCurrentView(model);
        break;
      case 'exploded':
        if (model.userData.explodedModel) {
          setCurrentView(model.userData.explodedModel);
        }
        break;
      case 'animation':
        setCurrentView(model);
        break;
    }
  }, [model, viewMode]);
  
  if (!currentView) return null;
  
  if (viewMode === 'animation' && model?.userData.animations) {
    return <AnimatedModel model={currentView} isPlaying={true} />;
  }
  
  return <primitive object={currentView} />;
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
        <div className="text-xs bg-background/80 px-1 rounded whitespace-nowrap">
          {dimensions.width}"
        </div>
      </Html>
      <Html position={[0, dimensions.height * scale / 2 + 0.5, 0]}>
        <div className="text-xs bg-background/80 px-1 rounded whitespace-nowrap">
          {dimensions.height}"
        </div>
      </Html>
      <Html position={[0, 0, dimensions.depth * scale / 2 + 0.5]}>
        <div className="text-xs bg-background/80 px-1 rounded whitespace-nowrap">
          {dimensions.depth}"
        </div>
      </Html>
    </group>
  );
});

DimensionLabels.displayName = 'DimensionLabels';

// View controls component
const ViewControls = React.memo(({ 
  viewMode, 
  onViewModeChange,
  hasExploded,
  hasAnimation 
}: { 
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasExploded: boolean;
  hasAnimation: boolean;
}) => {
  return (
    <div className="absolute top-4 left-4 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
      <Button
        size="sm"
        variant={viewMode === 'assembled' ? 'default' : 'outline'}
        onClick={() => onViewModeChange('assembled')}
      >
        <Package className="h-4 w-4 mr-1" />
        Assembled
      </Button>
      {hasExploded && (
        <Button
          size="sm"
          variant={viewMode === 'exploded' ? 'default' : 'outline'}
          onClick={() => onViewModeChange('exploded')}
        >
          <Eye className="h-4 w-4 mr-1" />
          Exploded
        </Button>
      )}
      {hasAnimation && (
        <Button
          size="sm"
          variant={viewMode === 'animation' ? 'default' : 'outline'}
          onClick={() => onViewModeChange('animation')}
        >
          <Play className="h-4 w-4 mr-1" />
          Assembly
        </Button>
      )}
    </div>
  );
});

ViewControls.displayName = 'ViewControls';

export function FurnitureViewer({ design, showDimensions, enableAnimation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('assembled');
  const [loadedModel, setLoadedModel] = useState<THREE.Group | null>(null);

  // Track if component has ever been visible
  useEffect(() => {
    if (isVisible && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isVisible, hasBeenVisible]);

  // Calculate camera position based on furniture dimensions or model bounds
  const cameraConfig = useMemo(() => {
    if (loadedModel?.userData.cameraSettings) {
      return loadedModel.userData.cameraSettings;
    }
    
    if (!design?.dimensions) {
      return { 
        position: [5, 5, 5] as [number, number, number], 
        target: [0, 0, 0] as [number, number, number],
        fov: 50 
      };
    }

    const maxDimension = Math.max(
      design.dimensions.width,
      design.dimensions.height,
      design.dimensions.depth
    ) / DIMENSIONS.INCH_TO_FEET;

    const distance = maxDimension * 2.5;
    
    return {
      position: [distance, distance, distance] as [number, number, number],
      target: [0, maxDimension / 2, 0] as [number, number, number],
      fov: 50
    };
  }, [design?.dimensions, loadedModel]);

  // Throttle orbit controls updates
  const handleOrbitChange = useThrottle(() => {
    // Handle orbit control changes if needed
  }, 100);

  // Handle model load
  const handleModelLoad = useCallback((model: THREE.Group) => {
    setLoadedModel(model);
  }, []);

  // Check available view modes
  const hasExploded = !!loadedModel?.userData.explodedModel;
  const hasAnimation = !!loadedModel?.userData.animations?.length;

  if (!design?.dimensions) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-gradient-to-br from-wood-oak to-wood-walnut bg-blend-soft-light bg-muted/20 rounded-lg overflow-hidden relative shadow-inner">
      {/* View controls */}
      {hasBeenVisible && (hasExploded || hasAnimation) && (
        <ViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasExploded={hasExploded}
          hasAnimation={hasAnimation}
        />
      )}
      
      {hasBeenVisible && (
        <Canvas 
          shadows
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          dpr={[1, 2]} // Limit pixel ratio for performance
        >
          {/* Camera */}
          <PerspectiveCamera
            makeDefault
            position={cameraConfig.position}
            fov={cameraConfig.fov}
            near={0.1}
            far={1000}
          />
          
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
            <FurnitureModel 
              design={design} 
              viewMode={viewMode}
              onModelLoad={handleModelLoad}
            />
            
            {/* Dimension labels */}
            {showDimensions && viewMode === 'assembled' && (
              <DimensionLabels dimensions={design.dimensions} />
            )}
            
            {/* Controls */}
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              target={cameraConfig.target}
              minDistance={cameraConfig.position[0] * 0.5}
              maxDistance={cameraConfig.position[0] * 3}
              onChange={handleOrbitChange}
            />
          </Suspense>
        </Canvas>
      )}
      
      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-wood-pine bg-blend-overlay bg-background/80 backdrop-blur-sm rounded-lg p-3 text-sm border border-border shadow-md">
        <div className="font-heading font-semibold">{design.name || design.furniture_type}</div>
        <div className="text-xs text-muted-foreground mt-1 font-serif">
          {design.dimensions.width}" × {design.dimensions.height}" × {design.dimensions.depth}"
        </div>
        {design.materials?.[0] && (
          <div className="text-xs text-muted-foreground font-serif">
            {design.materials[0].type}
          </div>
        )}
        {loadedModel?.userData.parts && (
          <div className="text-xs text-muted-foreground font-serif">
            {loadedModel.userData.parts.length} parts
          </div>
        )}
      </div>
      
      {/* Parts list (when in exploded view) */}
      {viewMode === 'exploded' && loadedModel?.userData.parts && (
        <div className="absolute bottom-4 right-4 bg-wood-pine bg-blend-overlay bg-background/80 backdrop-blur-sm rounded-lg p-3 text-xs max-w-xs max-h-48 overflow-y-auto border border-border shadow-md">
          <div className="font-heading font-semibold mb-2">Parts List:</div>
          {loadedModel.userData.parts.map((part: any, index: number) => (
            <div key={part.id} className="py-0.5 font-serif">
              {index + 1}. {part.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
