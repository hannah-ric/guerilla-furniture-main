import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useParametricDesign } from '@/hooks/useParametricDesign';
import { EnhancedDesignChatInterface } from '@/components/chat/EnhancedDesignChatInterface';
import { ParametricControlPanel } from '@/components/chat/ParametricControlPanel';
import { BuildPlanViewer } from '@/components/chat/BuildPlanViewer';
import { OptimizationSuggestions } from '@/components/chat/OptimizationSuggestions';
import { AIParametricModelGenerator } from '@/services/3d/AIParametricModelGenerator';
import { ValidationStatus } from '@/components/shared/ValidationStatus';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Save, AlertCircle, Zap, Settings, FileText, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PerformanceMonitor } from '@/lib/performance';

// Lazy load heavy components
const ParametricFurnitureViewer = lazy(() => 
  import('@/components/viewer/ParametricFurnitureViewer').then(module => ({ 
    default: module.ParametricFurnitureViewer 
  }))
);

// Loading fallback component
const TabLoading = React.memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));

TabLoading.displayName = 'TabLoading';

// Header component
const ParametricDesignerHeader = React.memo(({ 
  designName, 
  designType,
  canExport,
  isExporting,
  isGeneratingModel,
  onBack,
  onSave,
  onDownload,
  onOptimize
}: {
  designName?: string;
  designType?: string;
  canExport: boolean;
  isExporting: boolean;
  isGeneratingModel: boolean;
  onBack: () => void;
  onSave: () => void;
  onDownload: () => void;
  onOptimize: () => void;
}) => (
  <header className="border-b p-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-xl font-bold">AI Parametric Designer</h1>
        <p className="text-sm text-muted-foreground">
          {designName || designType || 'New Parametric Design'}
        </p>
      </div>
    </div>
    
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onOptimize}
        disabled={isGeneratingModel}
      >
        <Zap className="h-4 w-4 mr-2" />
        {isGeneratingModel ? 'Optimizing...' : 'AI Optimize'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={!canExport || isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={!canExport}
      >
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
    </div>
  </header>
));

ParametricDesignerHeader.displayName = 'ParametricDesignerHeader';

export function ParametricDesigner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    // Base functionality
    messages,
    design,
    isLoading,
    sendMessage,
    reset,
    validationResults,
    error,
    suggestions,
    designProgress,
    
    // Parametric functionality
    parameters,
    buildDocumentation,
    optimizationSuggestions,
    isGeneratingModel,
    isUpdatingParameter,
    
    // Actions
    updateParameter,
    processNaturalLanguageRequest,
    generateOptimizedModel,
    applyOptimization,
    exportModel
  } = useParametricDesign();
  
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('3d');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const aiGenerator = useMemo(() => new AIParametricModelGenerator(), []);
  
  // Check backend health on mount
  React.useEffect(() => {
    const checkBackend = async () => {
      const { openAIService } = await import('@/services/api/openai');
      const healthy = await openAIService.checkBackendHealth();
      setBackendHealthy(healthy);
      
      if (!healthy) {
        toast({
          title: 'Backend Not Running',
          description: 'Please start the backend server. Run "npm run backend" in a separate terminal.',
          variant: 'destructive'
        });
      }
    };
    
    checkBackend();
  }, [toast]);
  
  // Memoize expensive calculations
  const canExport = useMemo(() => {
    return !!(design?.dimensions && design?.furniture_type && parameters);
  }, [design?.dimensions, design?.furniture_type, parameters]);

  const defaultSuggestions = useMemo(() => [
    "Build a modern bookshelf with adjustable shelves",
    "I need a coffee table that's 20% smaller",
    "Make this table 6 inches wider",
    "Switch to oak wood and dovetail joints",
    "Optimize this design for material efficiency"
  ], []);

  const handleSave = useCallback(async () => {
    PerformanceMonitor.mark('save-start');
    
    try {
      // TODO: Implement save functionality with Supabase
      console.log('Saving parametric design:', { design, parameters, buildDocumentation });
      toast({
        title: 'Save feature coming soon',
        description: 'Parametric designs will be saved with full parameter history.'
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'There was an error saving your parametric design.',
        variant: 'destructive'
      });
    } finally {
      PerformanceMonitor.measure('save-complete', 'save-start');
    }
  }, [design, parameters, buildDocumentation, toast]);
  
  const handleDownload = useCallback(async () => {
    if (!canExport) {
      toast({
        title: 'Design incomplete',
        description: 'Please complete your parametric design before exporting.',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    PerformanceMonitor.mark('export-start');
    
    try {
      await exportModel('pdf');
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating the export.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      PerformanceMonitor.measure('export-complete', 'export-start');
    }
  }, [canExport, exportModel, toast]);

  const handleOptimize = useCallback(async () => {
    if (!parameters) {
      toast({
        title: 'No parameters',
        description: 'Please start a design to enable optimization.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await generateOptimizedModel();
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization failed',
        description: 'There was an error optimizing your design.',
        variant: 'destructive'
      });
    }
  }, [parameters, generateOptimizedModel, toast]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleParameterUpdate = useCallback(async (parameterId: string, value: any) => {
    try {
      await updateParameter(parameterId, value);
    } catch (error) {
      console.error('Parameter update error:', error);
    }
  }, [updateParameter]);

  const handleNaturalLanguageRequest = useCallback(async (request: string) => {
    try {
      await processNaturalLanguageRequest(request);
    } catch (error) {
      console.error('Natural language processing error:', error);
    }
  }, [processNaturalLanguageRequest]);

  const handleApplyOptimization = useCallback(async (suggestionId: string) => {
    try {
      await applyOptimization(suggestionId);
    } catch (error) {
      console.error('Apply optimization error:', error);
    }
  }, [applyOptimization]);

  const handleExportPDF = useCallback(async () => {
    await handleDownload();
  }, [handleDownload]);

  // Show error state if there's a critical error
  if (error && !messages.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ParametricDesignerHeader
        designName={design?.name}
        designType={design?.furniture_type}
        canExport={canExport}
        isExporting={isExporting}
        isGeneratingModel={isGeneratingModel}
        onBack={handleBack}
        onSave={handleSave}
        onDownload={handleDownload}
        onOptimize={handleOptimize}
      />
      
      {/* Backend warning banner */}
      {backendHealthy === false && (
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm">Backend server is not running. AI features won't work.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div className="w-1/3 border-r flex flex-col">
          <EnhancedDesignChatInterface
            initialDesign={design || undefined}
            onDesignUpdate={() => {}}
            className="flex-1"
          />
        </div>
        
        {/* 3D Preview and Controls */}
        <div className="w-1/3 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">3D Preview</h3>
          </div>
          <div className="flex-1">
            <Suspense fallback={<TabLoading />}>
              {design && (
                <ParametricFurnitureViewer
                  design={design}
                  aiGenerator={aiGenerator}
                  showControls
                />
              )}
            </Suspense>
          </div>
          
          {/* Parameter Controls */}
          {design && (
            <div className="border-t">
              <ParametricControlPanel
                design={design}
                onParameterChange={handleParameterUpdate}
                realTimeMode={false}
                isGenerating={isUpdatingParameter}
              />
            </div>
          )}
        </div>
        
        {/* Details Section */}
        <div className="w-1/3 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="build">
                <FileText className="h-4 w-4 mr-1" />
                Build
              </TabsTrigger>
              <TabsTrigger value="optimize">
                <TrendingUp className="h-4 w-4 mr-1" />
                Optimize
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="validate">
                <AlertCircle className="h-4 w-4 mr-1" />
                Validate
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="build" className="flex-1 overflow-auto">
              {design && (
                <BuildPlanViewer
                  documentation={buildDocumentation}
                  design={design}
                  onExport={handleExportPDF}
                />
              )}
            </TabsContent>
            
            <TabsContent value="optimize" className="flex-1 overflow-auto p-4">
              {design && (
                <OptimizationSuggestions
                  optimizations={optimizationSuggestions}
                  design={design}
                  onApplyOptimization={(opt) => handleApplyOptimization(opt.id)}
                />
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 overflow-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Design Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Skill Level</label>
                      <p className="text-sm text-muted-foreground">
                        {buildDocumentation?.skillAssessment?.level || 'intermediate'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Build Time</label>
                      <p className="text-sm text-muted-foreground">
                        {buildDocumentation?.estimatedBuildTime || 4} hours
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Material Efficiency</label>
                      <p className="text-sm text-muted-foreground">
                        {buildDocumentation?.materialOptimization?.efficiency || 85}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="validate" className="flex-1 overflow-auto p-4">
              <ValidationStatus results={validationResults} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 