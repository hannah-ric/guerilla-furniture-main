import { useState, useCallback, useEffect, useMemo } from 'react';
import { FurnitureDesign } from '@/lib/types';
import { useFurnitureDesign } from './useFurnitureDesign';
import {
  aiParametricModelService,
  ParametricParameters,
  BuildDocumentation,
  OptimizationSuggestion
} from '@/services/3d/AIParametricModelService';
import { Logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';

interface UseParametricDesignReturn {
  // Base design functionality
  messages: any[];
  design: FurnitureDesign | null;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  reset: () => Promise<void>;
  validationResults: Map<string, any>;
  error: Error | null;
  suggestions: string[];
  designProgress: number;
  
  // Parametric functionality
  parameters: ParametricParameters | null;
  buildDocumentation: BuildDocumentation | null;
  optimizationSuggestions: OptimizationSuggestion[];
  isGeneratingModel: boolean;
  isUpdatingParameter: boolean;
  
  // Actions
  updateParameter: (parameterId: string, value: any) => Promise<void>;
  processNaturalLanguageRequest: (request: string) => Promise<void>;
  generateOptimizedModel: () => Promise<void>;
  applyOptimization: (suggestionId: string) => Promise<void>;
  exportModel: (format: 'gltf' | 'stl' | 'pdf') => Promise<void>;
}

const logger = Logger.createScoped('useParametricDesign');

export function useParametricDesign(): UseParametricDesignReturn {
  const baseDesign = useFurnitureDesign();
  const { toast } = useToast();
  
  // Parametric-specific state
  const [parameters, setParameters] = useState<ParametricParameters | null>(null);
  const [buildDocumentation, setBuildDocumentation] = useState<BuildDocumentation | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [isUpdatingParameter, setIsUpdatingParameter] = useState(false);
  const [modelCache, setModelCache] = useState<Map<string, any>>(new Map());
  
  // Initialize parameters when design changes
  useEffect(() => {
    if (baseDesign.design && !parameters) {
      const initialParameters: ParametricParameters = {
        dimensions: {
          width: baseDesign.design.dimensions?.width || 24,
          height: baseDesign.design.dimensions?.height || 30,
          depth: baseDesign.design.dimensions?.depth || 16
        },
        material:
          baseDesign.design.materials?.[0]?.type ||
          baseDesign.design.materials?.[0]?.name ||
          'plywood',
        joinery: 'pocket_screw',
        style: 'modern',
        customParameters: {}
      };
      setParameters(initialParameters);
      
      // Generate initial model and documentation
      generateModel(initialParameters);
    }
  }, [baseDesign.design]);

  // Generate parametric model
  const generateModel = useCallback(async (params: ParametricParameters) => {
    if (!baseDesign.design) return;
    
    setIsGeneratingModel(true);
    
    try {
      const cacheKey = JSON.stringify(params);
      
      // Check cache first
      if (modelCache.has(cacheKey)) {
        const cached = modelCache.get(cacheKey);
        setBuildDocumentation(cached.documentation);
        setOptimizationSuggestions(cached.suggestions);
        return;
      }
      
      const result = await aiParametricModelService.generateParametricModel(
        baseDesign.design,
        params
      );
      
      // Cache the result
      setModelCache(prev => new Map(prev.set(cacheKey, result)));
      
      setBuildDocumentation(result.documentation);
      setOptimizationSuggestions(result.suggestions);
      
      toast({
        title: 'Model Generated',
        description: 'Parametric model and build plans updated successfully.'
      });
      
    } catch (error) {
      logger.error('Error generating parametric model:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate parametric model. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingModel(false);
    }
  }, [baseDesign.design, modelCache, toast]);

  // Update a single parameter
  const updateParameter = useCallback(async (parameterId: string, value: any) => {
    if (!parameters || !baseDesign.design) return;
    
    setIsUpdatingParameter(true);
    
    try {
      // Update parameters
      const updatedParameters = { ...parameters };
      
      if (parameterId.startsWith('dimension_')) {
        const dimension = parameterId.replace('dimension_', '') as keyof typeof parameters.dimensions;
        updatedParameters.dimensions[dimension] = value;
      } else if (parameterId === 'material') {
        updatedParameters.material = value;
      } else if (parameterId === 'joinery') {
        updatedParameters.joinery = value;
      } else if (parameterId === 'style') {
        updatedParameters.style = value;
      } else {
        updatedParameters.customParameters = {
          ...updatedParameters.customParameters,
          [parameterId]: value
        };
      }
      
      setParameters(updatedParameters);
      
      // Update the design
      const updatedDesign = await aiParametricModelService.updateParameter(
        baseDesign.design,
        parameterId,
        value
      );
      
      // Regenerate model with new parameters
      await generateModel(updatedParameters);
      
      toast({
        title: 'Parameter Updated',
        description: `${parameterId} updated successfully.`
      });
      
    } catch (error) {
      logger.error('Error updating parameter:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update parameter. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingParameter(false);
    }
  }, [parameters, baseDesign.design, generateModel, toast]);

  // Process natural language requests
  const processNaturalLanguageRequest = useCallback(async (request: string) => {
    if (!baseDesign.design) return;
    
    try {
      const result = await aiParametricModelService.processNaturalLanguageRequest(
        baseDesign.design,
        request
      );
      
      // Update parameters based on the AI's interpretation
      if (parameters) {
        const updatedParameters = { ...parameters };
        
        // Apply the changes suggested by the AI
        // This would need to be expanded based on the actual response format
        setParameters(updatedParameters);
        await generateModel(updatedParameters);
      }
      
      toast({
        title: 'Request Processed',
        description: result.explanation
      });
      
    } catch (error) {
      logger.error('Error processing natural language request:', error);
      toast({
        title: 'Processing Failed',
        description: 'Failed to process your request. Please try again.',
        variant: 'destructive'
      });
    }
  }, [baseDesign.design, parameters, generateModel, toast]);

  // Generate optimized model
  const generateOptimizedModel = useCallback(async () => {
    if (!parameters) return;
    
    await generateModel(parameters);
  }, [parameters, generateModel]);

  // Apply an optimization suggestion
  const applyOptimization = useCallback(async (suggestionId: string) => {
    const suggestion = optimizationSuggestions.find(s => s.id === suggestionId);
    if (!suggestion || !parameters) return;
    
    try {
      // Apply the optimization based on its type
      const updatedParameters = { ...parameters };
      
      switch (suggestion.type) {
        case 'material_efficiency':
          // Adjust dimensions for better material usage
          if (suggestion.impact.waste && suggestion.impact.waste < 0) {
            // Optimize for standard sheet sizes
            updatedParameters.dimensions.width = Math.round(updatedParameters.dimensions.width / 12) * 12;
            updatedParameters.dimensions.depth = Math.round(updatedParameters.dimensions.depth / 12) * 12;
          }
          break;
        
        case 'structural_integrity':
          // Add structural improvements
          updatedParameters.customParameters = {
            ...updatedParameters.customParameters,
            reinforcement: true
          };
          break;
        
        case 'cost_reduction':
          // Apply cost-saving measures
          if (updatedParameters.material === 'hardwood') {
            updatedParameters.material = 'plywood';
          }
          break;
        
        case 'ease_of_construction':
          // Simplify joinery methods
          if (updatedParameters.joinery === 'mortise_tenon') {
            updatedParameters.joinery = 'pocket_screw';
          }
          break;
      }
      
      setParameters(updatedParameters);
      await generateModel(updatedParameters);
      
      // Remove the applied suggestion
      setOptimizationSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      
      toast({
        title: 'Optimization Applied',
        description: suggestion.title
      });
      
    } catch (error) {
      logger.error('Error applying optimization:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Failed to apply optimization. Please try again.',
        variant: 'destructive'
      });
    }
  }, [optimizationSuggestions, parameters, generateModel, toast]);

  // Export model in various formats
  const exportModel = useCallback(async (format: 'gltf' | 'stl' | 'pdf') => {
    if (!baseDesign.design || !buildDocumentation) return;
    
    try {
      switch (format) {
        case 'pdf': {
          // Use existing PDF export functionality
          const { PDFExporter } = await import('@/services/export/PDFExporter');
          const exporter = new PDFExporter();
          const pdfBlob = await exporter.exportDesign(baseDesign.design);

          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${baseDesign.design.name || 'parametric-design'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          break;
        }
        
        case 'gltf':
        case 'stl':
          // TODO: Implement 3D model export
          throw new Error(`${format.toUpperCase()} export not yet implemented`);
      }
      
      toast({
        title: 'Export Successful',
        description: `Model exported as ${format.toUpperCase()}`
      });
      
    } catch (error) {
      logger.error('Error exporting model:', error);
      toast({
        title: 'Export Failed',
        description: `Failed to export as ${format.toUpperCase()}`,
        variant: 'destructive'
      });
    }
  }, [baseDesign.design, buildDocumentation, toast]);

  return {
    // Base functionality
    ...baseDesign,
    
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
  };
} 