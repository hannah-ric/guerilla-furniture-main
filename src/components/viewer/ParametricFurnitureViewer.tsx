import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html, PerspectiveCamera } from '@react-three/drei';
import { FurnitureDesign } from '@/lib/types';
import { ModelGenerator } from '@/services/3d/modelGenerator';
import { AIParametricModelGenerator } from '@/services/3d/AIParametricModelGenerator';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCw, 
  Eye, 
  Package, 
  Zap, 
  Settings,
  Download,
  Fullscreen
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Logger } from '@/lib/logger';

interface ParametricFurnitureViewerProps {
  design: FurnitureDesign;
  aiGenerator: AIParametricModelGenerator;
  onModelUpdate?: (model: THREE.Group) => void;
  showControls?: boolean;
  enableRealTimeUpdates?: boolean;
  className?: string;
}

interface ViewerState {
  currentModel: THREE.Group | null;
  explodedModel: THREE.Group | null;
  isExploded: boolean;
  isAnimating: boolean;
  animationProgress: number;
  cameraPosition: THREE.Vector3;
  renderMode: 'realistic' | 'wireframe' | 'blueprint';
}

const ModelComponent: React.FC<{
  model: THREE.Group | null;
  isExploded: boolean;
  animationProgress: number;
  renderMode: string;
}> = ({ model, isExploded, animationProgress, renderMode }) => {
  const meshRef = useRef<THREE.Group | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current && model) {
      // Update model display based on viewer state
      meshRef.current.rotation.y += delta * 0.1; // Slow rotation
    }
  });

  if (!model) return null;

  return (
    <group ref={meshRef}>
      <primitive object={model} />
    </group>
  );
};

const CameraController: React.FC<{
  cameraPosition: THREE.Vector3;
  target: THREE.Vector3;
}> = ({ cameraPosition, target }) => {
  const { camera, gl } = useThree();
  
  useEffect(() => {
    camera.position.copy(cameraPosition);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, cameraPosition, target]);

  return <OrbitControls args={[camera, gl.domElement]} enablePan={true} enableZoom={true} />;
};

export const ParametricFurnitureViewer: React.FC<ParametricFurnitureViewerProps> = ({
  design,
  aiGenerator,
  onModelUpdate,
  showControls = true,
  enableRealTimeUpdates = false,
  className = ''
}) => {
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentModel: null,
    explodedModel: null,
    isExploded: false,
    isAnimating: false,
    animationProgress: 0,
    cameraPosition: new THREE.Vector3(5, 5, 5),
    renderMode: 'realistic'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const logger = Logger.createScoped('ParametricViewer');
  const { toast } = useToast();

  // Generate or update model when design changes
  useEffect(() => {
    if (shouldRegenerateModel(design)) {
      generateModel(design);
    }
  }, [design]);

  const shouldRegenerateModel = (design: FurnitureDesign): boolean => {
    return !!(
      design.furniture_type &&
      design.dimensions &&
      design.materials?.length > 0
    );
  };

  const generateModel = useCallback(async (design: FurnitureDesign) => {
    if (!shouldRegenerateModel(design)) return;

    setIsLoading(true);
    
    try {
      const modelRequest = {
        userRequest: 'Generate 3D model for current design',
        currentDesign: design,
        updateType: 'complete_redesign' as const,
        contextualConstraints: {
          structuralRequirements: { stability: 'high' as const },
          materialConstraints: {},
          skillConstraints: {
            userSkillLevel: 'intermediate' as const,
            availableTools: ['saw', 'drill', 'router']
          },
          aestheticPreferences: { style: 'modern' as const }
        }
      };

      const result = await aiGenerator.processModelingRequest(modelRequest);
      
      if (result.updatedDesign) {
        // Generate the actual 3D model
        const modelGenerator = new ModelGenerator();
        const model = await modelGenerator.generateModel(result.updatedDesign);
        
        setViewerState(prev => ({
          ...prev,
          currentModel: model,
          explodedModel: model.userData.explodedModel || null
        }));

        setLastUpdateTime(new Date());
        
        if (onModelUpdate) {
          onModelUpdate(model);
        }

        toast({
          title: '3D Model Generated',
          description: `Successfully generated model for ${design.furniture_type}`,
          duration: 3000
        });
      }

    } catch (error) {
      logger.error('Failed to generate model', error);
      toast({
        title: 'Model Generation Failed',
        description: 'Unable to generate 3D model. Please check your design parameters.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [aiGenerator, onModelUpdate, toast]);

  const handleRealTimeParameterUpdate = useCallback(async (
    parameterName: string, 
    newValue: any
  ) => {
    if (!enableRealTimeUpdates || !viewerState.currentModel) return;

    try {
      const result = await aiGenerator.adjustParameterRealtime(
        parameterName,
        newValue,
        true
      );

      if (result.success && result.modelUpdate) {
        setViewerState(prev => ({
          ...prev,
          currentModel: result.modelUpdate!
        }));
      }

    } catch (error) {
      logger.error('Real-time parameter update failed', error);
    }
  }, [aiGenerator, enableRealTimeUpdates, viewerState.currentModel]);

  const toggleExplodedView = useCallback(() => {
    if (!viewerState.explodedModel) return;

    setViewerState(prev => ({
      ...prev,
      isExploded: !prev.isExploded,
      isAnimating: true
    }));

    // Animate transition
    setTimeout(() => {
      setViewerState(prev => ({ ...prev, isAnimating: false }));
    }, 2000);
  }, [viewerState.explodedModel]);

  const cycleRenderMode = useCallback(() => {
    const modes: Array<ViewerState['renderMode']> = ['realistic', 'wireframe', 'blueprint'];
    const currentIndex = modes.indexOf(viewerState.renderMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    setViewerState(prev => ({ ...prev, renderMode: nextMode }));
  }, [viewerState.renderMode]);

  const exportModel = useCallback(async () => {
    if (!viewerState.currentModel) return;

    try {
      const modelGenerator = new ModelGenerator();
      const gltfData = await modelGenerator.exportToGLTF(viewerState.currentModel);
      
      const blob = new Blob([gltfData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.name || 'furniture-model'}.gltf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);

      toast({
        title: 'Model Exported',
        description: 'GLTF file downloaded successfully',
        duration: 3000
      });

    } catch (error) {
      logger.error('Model export failed', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export 3D model',
        variant: 'destructive'
      });
    }
  }, [viewerState.currentModel, design.name, toast]);

  const resetCamera = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      cameraPosition: new THREE.Vector3(5, 5, 5)
    }));
  }, []);

  return (
    <div className={`relative w-full h-full bg-gray-100 ${className}`}>
      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 60 }}>
        <CameraController 
          cameraPosition={viewerState.cameraPosition}
          target={new THREE.Vector3(0, 0, 0)}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Environment */}
        <Environment preset="studio" />
        <Grid args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#c0c0c0" />

        {/* Model */}
        <ModelComponent
          model={viewerState.isExploded ? viewerState.explodedModel : viewerState.currentModel}
          isExploded={viewerState.isExploded}
          animationProgress={viewerState.animationProgress}
          renderMode={viewerState.renderMode}
        />

        {/* HTML Overlays */}
        {viewerState.currentModel && (
          <Html position={[0, 3, 0]} className="pointer-events-none">
            <Card className="bg-white/90 backdrop-blur-sm p-2">
              <div className="text-sm font-medium">{design.name}</div>
              <div className="text-xs text-gray-600">
                {design.furniture_type} • {design.dimensions?.width}"×{design.dimensions?.height}"×{design.dimensions?.depth}"
              </div>
            </Card>
          </Html>
        )}
      </Canvas>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
          <div className="text-center">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Generating 3D model...</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-4 left-4 space-y-2 z-20">
          <Card className="p-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleExplodedView}
                disabled={!viewerState.explodedModel || viewerState.isAnimating}
              >
                <Package className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={cycleRenderMode}
              >
                <Eye className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetCamera}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportModel}
                disabled={!viewerState.currentModel}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Status Badges */}
          <div className="space-y-1">
            <Badge variant={viewerState.isExploded ? "default" : "secondary"}>
              {viewerState.isExploded ? 'Exploded View' : 'Assembled View'}
            </Badge>
            
            <Badge variant="outline">
              {viewerState.renderMode.charAt(0).toUpperCase() + viewerState.renderMode.slice(1)}
            </Badge>

            {enableRealTimeUpdates && (
              <Badge variant="default" className="bg-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Model Info Panel */}
      {viewerState.currentModel && (
        <div className="absolute bottom-4 left-4 z-20">
          <Card className="p-3 bg-white/90 backdrop-blur-sm">
            <div className="space-y-1 text-sm">
              <div className="font-medium">Model Information</div>
              <div className="text-xs text-gray-600">
                Parts: {viewerState.currentModel.userData.parts?.length || 0}
              </div>
              {lastUpdateTime && (
                <div className="text-xs text-gray-600">
                  Updated: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!viewerState.currentModel && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No 3D Model Available
            </h3>
            <p className="text-gray-600 max-w-md mb-4">
              Complete your furniture design with dimensions and materials to generate a 3D model.
            </p>
            <Button
              onClick={() => generateModel(design)}
              disabled={!shouldRegenerateModel(design)}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Generate Model
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 