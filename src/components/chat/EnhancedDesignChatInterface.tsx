import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Download, Settings, Zap, Eye, Package, RotateCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { FurnitureDesign, Message, SharedState } from '@/lib/types';
import { FurnitureDesignOrchestrator } from '@/services/orchestrator/FurnitureDesignOrchestrator';
import { AIParametricModelGenerator } from '@/services/3d/AIParametricModelGenerator';
import { ParametricControlPanel } from './ParametricControlPanel';
import { BuildPlanViewer } from './BuildPlanViewer';
import { OptimizationSuggestions } from './OptimizationSuggestions';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { FurnitureViewer } from '@/components/viewer/FurnitureViewer';
import { Logger } from '@/lib/logger';
import { PerformanceMonitor } from '@/lib/performance';
import * as THREE from 'three';

interface EnhancedDesignChatProps {
  onDesignUpdate: (design: FurnitureDesign) => void;
  initialDesign?: FurnitureDesign;
  className?: string;
}

interface ModelState {
  current3DModel: THREE.Group | null;
  isGenerating: boolean;
  lastUpdate: Date | null;
  parametricVariables: Map<string, any>;
}

interface BuildDocumentation {
  cutList: any[];
  hardwareList: any[];
  stepByStepInstructions: any[];
  materialOptimization: any;
  toolRequirements: string[];
  estimatedBuildTime: number;
  skillAssessment: any;
}

export const EnhancedDesignChatInterface: React.FC<EnhancedDesignChatProps> = ({
  onDesignUpdate,
  initialDesign,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<FurnitureDesign>(
    initialDesign ||
      ({
        id: 'new-design',
        name: 'New Furniture Project',
        furniture_type: 'table',
        description: '',
        dimensions: { width: 0, height: 0, depth: 0, unit: 'inches' },
        materials: [],
        joinery: [],
        hardware: [],
        features: [],
        validation_status: 'pending',
        estimated_cost: 0,
        estimated_build_time: '',
        difficulty_level: 'beginner',
        weight_estimate: 0,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as FurnitureDesign)
  );
  
  const [modelState, setModelState] = useState<ModelState>({
    current3DModel: null,
    isGenerating: false,
    lastUpdate: null,
    parametricVariables: new Map()
  });

  const [buildDocumentation, setBuildDocumentation] = useState<BuildDocumentation | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [optimizations, setOptimizations] = useState<any[]>([]);

  const orchestrator = useRef(new FurnitureDesignOrchestrator());
  const aiModelGenerator = useRef(new AIParametricModelGenerator());
  const logger = Logger.createScoped('EnhancedDesignChat');
  const { toast } = useToast();

  useEffect(() => {
    const initializeServices = async () => {
      try {
        await orchestrator.current.initialize();
        logger.info('Enhanced design chat initialized');
        
        // Add welcome message
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "🛠️ Welcome to Blueprint Buddy's Enhanced Design Studio! I can help you create detailed furniture designs with real-time 3D models and comprehensive build plans. What would you like to build today?",
          timestamp: new Date(),
          metadata: {
            isError: false
          }
        }]);
      } catch (error) {
        logger.error('Failed to initialize services', error);
        toast({
          title: 'Initialization Failed',
          description: 'Some features may not work properly. Please refresh the page.',
          variant: 'destructive'
        });
      }
    };

    initializeServices();
  }, []);

  const handleSendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Process the message through the orchestrator
      const response = await PerformanceMonitor.measureAsync('processUserInput', () =>
        orchestrator.current.processUserInput(input)
      );

      if (response.success) {
        // Update design state
        const updatedState = orchestrator.current.getState();
        if (updatedState.design) {
          const newDesign = updatedState.design as FurnitureDesign;
          setCurrentDesign(newDesign);
          onDesignUpdate(newDesign);

          // Check if we should generate/update the 3D model
          if (shouldUpdate3DModel(newDesign)) {
            await update3DModel(newDesign, 'User request processed');
          }
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          metadata: {
            suggestions: response.suggestions,
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Show progress notification
        if (response.designProgress !== undefined) {
          toast({
            title: `Design Progress: ${response.designProgress}%`,
            description: getProgressDescription(response.designProgress),
            duration: 3000
          });
        }

      } else {
        throw new Error(response.response || 'Failed to process request');
      }

    } catch (error) {
      logger.error('Message processing failed', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an issue processing your request. Could you try rephrasing or breaking it into smaller steps?',
        timestamp: new Date(),
        metadata: {
          isError: true,
          errorCode: 'PROCESSING_FAILED'
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Processing Error',
        description: 'Failed to process your request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onDesignUpdate]);

  const update3DModel = useCallback(async (design: FurnitureDesign, userRequest: string) => {
    if (!design.furniture_type || !design.dimensions) return;

    setModelState(prev => ({ ...prev, isGenerating: true }));

    try {
      const aiRequest = {
        userRequest,
        currentDesign: design,
        updateType: 'complete_redesign' as const,
        contextualConstraints: {
          structuralRequirements: { stability: 'high' as const },
          materialConstraints: {},
          skillConstraints: {
            userSkillLevel: 'intermediate' as const,
            availableTools: ['saw', 'drill', 'router', 'sander']
          },
          aestheticPreferences: { style: 'modern' as const }
        }
      };

      const aiUpdate = await aiModelGenerator.current.processModelingRequest(aiRequest);
      
      if (aiUpdate.updatedDesign) {
        setCurrentDesign(aiUpdate.updatedDesign);
        onDesignUpdate(aiUpdate.updatedDesign);
      }

      // Generate build documentation
      const buildDocs = await aiModelGenerator.current.exportBuildDocumentation(aiUpdate.updatedDesign);
      setBuildDocumentation(buildDocs);

      // Store optimizations
      setOptimizations(aiUpdate.optimizations);

      setModelState(prev => ({
        ...prev,
        isGenerating: false,
        lastUpdate: new Date()
      }));

      toast({
        title: '3D Model Updated',
        description: `Generated model with ${buildDocs.cutList.length} parts. Estimated build time: ${buildDocs.estimatedBuildTime} hours.`,
        duration: 4000
      });

    } catch (error) {
      logger.error('Failed to update 3D model', error);
      setModelState(prev => ({ ...prev, isGenerating: false }));
      
      toast({
        title: 'Model Generation Failed',
        description: 'Unable to generate 3D model. Please try simplifying your design.',
        variant: 'destructive'
      });
    }
  }, [onDesignUpdate]);

  const handleParameterChange = useCallback(async (parameterName: string, newValue: any) => {
    if (!realTimeMode) return;

    try {
      const result = await aiModelGenerator.current.adjustParameterRealtime(
        parameterName, 
        newValue, 
        true
      );

      if (result.success && result.updatedDesign) {
        setCurrentDesign(result.updatedDesign);
        onDesignUpdate(result.updatedDesign);

        if (result.warnings && result.warnings.length > 0) {
          toast({
            title: 'Parameter Warning',
            description: result.warnings[0],
            variant: 'destructive',
            duration: 3000
          });
        }
      }
    } catch (error) {
      logger.error('Real-time parameter adjustment failed', error);
    }
  }, [realTimeMode, onDesignUpdate]);

  const handleExportDocumentation = useCallback(async () => {
    if (!buildDocumentation) {
      toast({
        title: 'No Documentation Available',
        description: 'Generate a 3D model first to create build documentation.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create comprehensive documentation package
      const docPackage = {
        design: currentDesign,
        buildPlan: buildDocumentation,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(docPackage, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDesign.name || 'furniture-design'}-build-plan.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Documentation Exported',
        description: 'Build plan and documentation downloaded successfully.',
        duration: 3000
      });

    } catch (error) {
      logger.error('Export failed', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export documentation. Please try again.',
        variant: 'destructive'
      });
    }
  }, [buildDocumentation, currentDesign]);

  const shouldUpdate3DModel = (design: FurnitureDesign): boolean => {
    return !!(
      design.furniture_type && 
      design.dimensions && 
      design.materials?.length > 0
    );
  };

  const getProgressDescription = (progress: number): string => {
    if (progress < 25) return 'Getting started with your design';
    if (progress < 50) return 'Basic structure defined';
    if (progress < 75) return 'Adding details and materials';
    if (progress < 100) return 'Almost ready for 3D generation';
    return 'Design complete and ready to build!';
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-background to-muted/30 ${className}`}>
      {/* Header with controls */}
      <div className="bg-wood-pine bg-blend-overlay bg-card border-b border-border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              Master Craftsman's Workshop
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={realTimeMode ? "default" : "outline"}
                size="sm"
                onClick={() => setRealTimeMode(!realTimeMode)}
                className="text-xs border-border"
              >
                <Zap className="w-4 h-4 mr-1" />
                Live Updates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDocumentation}
                disabled={!buildDocumentation}
                className="border-border hover:bg-accent/10"
              >
                <Download className="w-4 h-4 mr-1" />
                Export Plans
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground font-serif">
            {modelState.isGenerating && (
              <div className="flex items-center">
                <RotateCw className="w-4 h-4 mr-1 animate-spin" />
                Crafting...
              </div>
            )}
            {modelState.lastUpdate && (
              <span>
                Updated: {modelState.lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left side - Chat and Controls */}
        <div className="w-1/2 flex flex-col border-r border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="build-plan">Build Plan</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              <div className="flex-1 mb-4">
                <MessageList messages={messages} isLoading={isLoading} />
              </div>
              <MessageInput onSend={handleSendMessage} disabled={isLoading} />
            </TabsContent>

            <TabsContent value="parameters" className="flex-1 p-4">
              <ParametricControlPanel
                design={currentDesign}
                onParameterChange={handleParameterChange}
                realTimeMode={realTimeMode}
                isGenerating={modelState.isGenerating}
              />
            </TabsContent>

            <TabsContent value="build-plan" className="flex-1 p-4">
              <BuildPlanViewer
                documentation={buildDocumentation}
                design={currentDesign}
                onExport={handleExportDocumentation}
              />
            </TabsContent>

            <TabsContent value="optimize" className="flex-1 p-4">
              <OptimizationSuggestions
                optimizations={optimizations}
                design={currentDesign}
                onApplyOptimization={(optimization) => {
                  // Apply optimization logic here
                  toast({
                    title: 'Optimization Applied',
                    description: optimization.description,
                    duration: 3000
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side - 3D Viewer */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">3D Model Preview</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update3DModel(currentDesign, 'Manual model refresh')}
                  disabled={modelState.isGenerating || !shouldUpdate3DModel(currentDesign)}
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('build-plan')}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Instructions
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 relative">
            {shouldUpdate3DModel(currentDesign) ? (
              <FurnitureViewer
                design={currentDesign}
                showDimensions
                enableAnimation
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Your Design
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Begin by describing what you'd like to build in the chat. 
                    Once you specify the type, dimensions, and materials, 
                    I'll generate a detailed 3D model here.
                  </p>
                </div>
              </div>
            )}

            {modelState.isGenerating && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="text-center">
                  <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Generating 3D model...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Design: {currentDesign.name}</span>
            {currentDesign.furniture_type && (
              <span>Type: {currentDesign.furniture_type}</span>
            )}
            {buildDocumentation && (
              <span>Build Time: {buildDocumentation.estimatedBuildTime}h</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {realTimeMode && (
              <span className="flex items-center text-green-600">
                <Zap className="w-4 h-4 mr-1" />
                Live mode active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};      