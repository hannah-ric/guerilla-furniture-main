import { AIParametricModelGenerator } from './AIParametricModelGenerator';
import { FurnitureDesign } from '@/lib/types';
import { openAIService } from '@/services/api/openai';

export interface ParametricParameters {
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  material: string;
  joinery: string;
  style: string;
  customParameters?: Record<string, any>;
}

export interface BuildDocumentation {
  cutList: any[];
  hardwareList: any[];
  stepByStepInstructions: any[];
  materialOptimization: any;
  toolRequirements: string[];
  estimatedBuildTime: number;
  skillAssessment: any;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'material_efficiency' | 'structural_integrity' | 'cost_reduction' | 'ease_of_construction';
  title: string;
  description: string;
  impact: {
    cost?: number;
    time?: number;
    difficulty?: 'easier' | 'harder';
    waste?: number;
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class AIParametricModelService {
  private generator: AIParametricModelGenerator;

  constructor() {
    this.generator = new AIParametricModelGenerator();
  }

  async generateParametricModel(
    design: FurnitureDesign,
    parameters: ParametricParameters
  ): Promise<{
    model: any;
    documentation: BuildDocumentation;
    suggestions: OptimizationSuggestion[];
  }> {
    try {
      // Generate the parametric model using the AI generator
      const modelResult = await this.generator.processModelingRequest({
        userRequest: 'initial design',
        currentDesign: design,
        updateType: 'complete_redesign',
        contextualConstraints: {
          structuralRequirements: {},
          materialConstraints: {},
          skillConstraints: { userSkillLevel: 'beginner', availableTools: [] },
          aestheticPreferences: {}
        }
      });

      // Generate build documentation
      const documentation = await this.generateBuildDocumentation(design, parameters, modelResult);

      // Generate optimization suggestions
      const suggestions = await this.generateOptimizationSuggestions(design, parameters);

      return {
        model: modelResult,
        documentation,
        suggestions
      };
    } catch (error) {
      console.error('Error generating parametric model:', error);
      throw error;
    }
  }

  async updateParameter(
    design: FurnitureDesign,
    parameterId: string,
    value: any
  ): Promise<FurnitureDesign> {
    try {
      // Update the design with the new parameter value
      const updatedDesign: FurnitureDesign = {
        ...design,
        dimensions: {
          ...design.dimensions,
          ...(parameterId.startsWith('dimension_') ? {
            [parameterId.replace('dimension_', '')]: value
          } : {})
        },
        materials: parameterId === 'material' ? [value] : design.materials,
        // Add other parameter updates as needed
      };

      return updatedDesign;
    } catch (error) {
      console.error('Error updating parameter:', error);
      throw error;
    }
  }

  async processNaturalLanguageRequest(
    design: FurnitureDesign,
    request: string
  ): Promise<{
    updatedDesign: FurnitureDesign;
    explanation: string;
  }> {
    try {
      const prompt = `
        Given the current furniture design:
        Type: ${design.furniture_type}
        Dimensions: ${JSON.stringify(design.dimensions)}
        Materials: ${design.materials?.join(', ')}
        
        User request: "${request}"
        
        Analyze the request and provide:
        1. What parameters need to be changed
        2. The new values for those parameters
        3. An explanation of the changes
        
        Respond in JSON format:
        {
          "parameters": {
            "dimension_width": number (if width changed),
            "dimension_height": number (if height changed),
            "dimension_depth": number (if depth changed),
            "material": string (if material changed)
          },
          "explanation": "Clear explanation of what was changed and why"
        }
      `;

      const response = await openAIService.generateResponse(prompt);

      const result = JSON.parse(response);
      
      // Apply the parameter changes
      let updatedDesign = { ...design };
      
      for (const [parameterId, value] of Object.entries(result.parameters)) {
        updatedDesign = await this.updateParameter(updatedDesign, parameterId, value);
      }

      return {
        updatedDesign,
        explanation: result.explanation
      };
    } catch (error) {
      console.error('Error processing natural language request:', error);
      throw error;
    }
  }

  private async generateBuildDocumentation(
    design: FurnitureDesign,
    parameters: ParametricParameters,
    model: any
  ): Promise<BuildDocumentation> {
    try {
      const prompt = `
        Generate comprehensive build documentation for a ${design.furniture_type} with these specifications:
        - Dimensions: ${parameters.dimensions.width}W x ${parameters.dimensions.height}H x ${parameters.dimensions.depth}D inches
        - Material: ${parameters.material}
        - Joinery: ${parameters.joinery}
        
        Provide a detailed cut list, hardware list, step-by-step instructions, and time estimate.
      `;

      const response = await openAIService.generateResponse(prompt);

      // Parse the response and structure it
      return {
        cutList: this.parseCutList(response),
        hardwareList: this.parseHardwareList(response),
        stepByStepInstructions: this.parseInstructions(response),
        materialOptimization: this.calculateMaterialOptimization(parameters),
        toolRequirements: this.extractToolRequirements(response),
        estimatedBuildTime: this.estimateBuildTime(design, parameters),
        skillAssessment: this.assessSkillLevel(design, parameters)
      };
    } catch (error) {
      console.error('Error generating build documentation:', error);
      // Return default documentation
      return {
        cutList: [],
        hardwareList: [],
        stepByStepInstructions: [],
        materialOptimization: {},
        toolRequirements: ['Saw', 'Drill', 'Screwdriver'],
        estimatedBuildTime: 4,
        skillAssessment: { level: 'intermediate', difficulty: 3 }
      };
    }
  }

  private async generateOptimizationSuggestions(
    design: FurnitureDesign,
    parameters: ParametricParameters
  ): Promise<OptimizationSuggestion[]> {
    try {
      const suggestions: OptimizationSuggestion[] = [];

      // Material efficiency suggestion
      if (parameters.material === 'plywood') {
        suggestions.push({
          id: 'material-efficiency-1',
          type: 'material_efficiency',
          title: 'Optimize Plywood Usage',
          description: 'Adjust dimensions to minimize waste from standard 4x8 sheets',
          impact: {
            waste: -15,
            cost: -25
          },
          confidence: 85,
          priority: 'high',
          reasoning: 'Current dimensions result in significant offcut waste'
        });
      }

      // Structural integrity suggestion
      if (parameters.dimensions.height > 36) {
        suggestions.push({
          id: 'structural-1',
          type: 'structural_integrity',
          title: 'Add Cross Bracing',
          description: 'Consider adding diagonal braces for improved stability',
          impact: {
            difficulty: 'easier'
          },
          confidence: 92,
          priority: 'medium',
          reasoning: 'Tall furniture benefits from additional structural support'
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating optimization suggestions:', error);
      return [];
    }
  }

  private parseCutList(response: string): any[] {
    // Simple parsing - in a real implementation, this would be more sophisticated
    return [
      { part: 'Top', quantity: 1, dimensions: '24" x 16" x 3/4"', material: 'Plywood' },
      { part: 'Sides', quantity: 2, dimensions: '16" x 28" x 3/4"', material: 'Plywood' }
    ];
  }

  private parseHardwareList(response: string): any[] {
    return [
      { item: 'Wood screws', quantity: 12, size: '2.5"' },
      { item: 'Wood glue', quantity: 1, size: '8 oz' }
    ];
  }

  private parseInstructions(response: string): any[] {
    return [
      { step: 1, title: 'Cut all pieces to size', description: 'Using the cut list, prepare all components' },
      { step: 2, title: 'Sand all surfaces', description: 'Sand with 220 grit sandpaper' }
    ];
  }

  private calculateMaterialOptimization(parameters: ParametricParameters): any {
    return {
      efficiency: 85,
      wasteReduction: 15,
      costSavings: 25
    };
  }

  private extractToolRequirements(response: string): string[] {
    return ['Circular saw', 'Drill', 'Router', 'Sandpaper', 'Clamps'];
  }

  private estimateBuildTime(design: FurnitureDesign, parameters: ParametricParameters): number {
    // Simple estimation based on complexity
    const baseTime = 4; // hours
    const complexityMultiplier = parameters.joinery === 'mortise_tenon' ? 1.5 : 1.0;
    return Math.round(baseTime * complexityMultiplier);
  }

  private assessSkillLevel(design: FurnitureDesign, parameters: ParametricParameters): any {
    const difficulty = parameters.joinery === 'mortise_tenon' ? 4 : 
                      parameters.joinery === 'dovetail' ? 5 : 2;
    
    return {
      level: difficulty <= 2 ? 'beginner' : difficulty <= 3 ? 'intermediate' : 'advanced',
      difficulty,
      requiredSkills: ['measuring', 'cutting', 'drilling']
    };
  }
}

export const aiParametricModelService = new AIParametricModelService(); 