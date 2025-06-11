import { Agent, AgentConfig } from './base/Agent';
import { SharedState, ValidationAgentResponse } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';

const ValidationResponseSchema = z.object({
  is_valid: z.boolean(),
  physics: z.object({
    stable: z.boolean(),
    max_load: z.number(),
    safety_factor: z.number(),
    critical_points: z.array(z.string())
  }),
  material_strength: z.object({
    adequate: z.boolean(),
    utilization: z.number().min(0).max(100),
    warnings: z.array(z.string())
  }),
  joinery_strength: z.object({
    sufficient: z.boolean(),
    weakest_point: z.string(),
    improvements: z.array(z.string())
  }),
  overall_score: z.number().min(0).max(100)
});

export class ValidationAgent extends Agent {
  constructor() {
    const config: AgentConfig = {
      name: 'ValidationAgent',
      description: 'Validates structural integrity and buildability',
      interestedEvents: ['design_complete', 'validation_request', 'major_change'],
      capabilities: ['structural_analysis', 'safety_validation', 'physics_check']
    };
    super(config);
  }

  async canHandle(input: string, state: SharedState): Promise<boolean> {
    const validationKeywords = /\b(validate|check|verify|safe|strong|stable|review|analyze)\b/i;
    const hasCompleteDesign = !!(state.design.furniture_type && 
                              state.design.dimensions && 
                              state.design.materials?.length);
    
    return validationKeywords.test(input) || hasCompleteDesign;
  }

  async process(input: string, state: SharedState) {
    this.logger.info('Performing design validation');

    if (!this.hasMinimumDesignData(state)) {
      return this.createResponse(false, null, {
        validation_issues: ['Design needs furniture type, dimensions, and materials before validation'],
        suggestions: ['Complete your design specifications first']
      });
    }

    try {
      const design = state.design;
      const designSummary = this.createDesignSummary(state);
      
      const prompt = `
You are a structural engineering expert for furniture. Validate this design.

Design Specifications:
${designSummary}

Perform these validations:
1. STABILITY CHECK
   - Center of gravity analysis
   - Tip-over risk assessment
   - Base to height ratio

2. LOAD CAPACITY
   - Material strength vs expected loads
   - Joint strength analysis
   - Safety factor calculation (must be >2)

3. DEFLECTION ANALYSIS
   - Maximum sag for shelves/spans
   - Use simplified uniformly distributed load
   - Max deflection = span/360 for furniture

4. FAILURE MODE PREDICTION
   - Identify weakest points
   - Predict likely failure sequence
   - Suggest reinforcements

5. PRACTICAL BUILDABILITY
   - Assembly feasibility
   - Tool requirements
   - Common mistakes to avoid

Material Properties Reference:
- Pine: Modulus of Rupture = 8,600 psi, Modulus of Elasticity = 1.2M psi
- Oak: MOR = 14,300 psi, MOE = 1.8M psi
- Plywood (3/4"): MOR = 5,000 psi, MOE = 1.5M psi

Standard Loads:
- Books: 15-25 lbs/ft on shelves
- Tabletop: 50 lbs/sq ft
- Seating: 300 lbs concentrated load

Respond with a JSON object matching the ValidationResponseSchema.`;

      const response = await openAIService.generateResponse(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const validationData = ValidationResponseSchema.parse(JSON.parse(jsonMatch[0]));
      
      // Update shared state with validation results
      const stateManager = (await import('@/services/state/SharedStateManager')).SharedStateManager.getInstance();
      stateManager.setValidationResult(this.config.name, validationData);
      stateManager.updateDesign(this.config.name, {
        validation_status: validationData.is_valid ? 'valid' : 'invalid'
      }, 'Validation completed');
      
      this.logger.info('Validation complete', { 
        valid: validationData.is_valid,
        score: validationData.overall_score 
      });

      const issues = [
        ...validationData.material_strength.warnings,
        ...validationData.physics.critical_points
      ];

      return this.createResponse(validationData.is_valid, validationData, {
        confidence: 0.9,
        validation_issues: issues,
        suggestions: this.generateImprovementSuggestions(validationData)
      });

    } catch (error) {
      this.logger.error('Validation failed', error);
      
      return this.createResponse(false, null, {
        validation_issues: ['Failed to complete validation'],
        suggestions: ['Please ensure all design parameters are specified']
      });
    }
  }

  async validate(state: SharedState) {
    // This agent IS the validator, so just check if we can validate
    if (!this.hasMinimumDesignData(state)) {
      return this.createResponse(false, { 
        valid: false, 
        reason: 'Insufficient design data for validation' 
      });
    }
    
    // Run full validation
    return this.process('validate design', state);
  }

  private hasMinimumDesignData(state: SharedState): boolean {
    const design = state.design;
    return !!(
      design.furniture_type &&
      design.dimensions &&
      design.materials && design.materials.length > 0
    );
  }

  private createDesignSummary(state: SharedState): string {
    const design = state.design;
    const parts = [];
    
    parts.push(`Furniture Type: ${design.furniture_type}`);
    
    if (design.dimensions) {
      parts.push(`Dimensions: ${design.dimensions.width}" W x ${design.dimensions.height}" H x ${design.dimensions.depth}" D`);
    }
    
    if (design.materials?.length) {
      parts.push(`Primary Material: ${design.materials[0].type}`);
    }
    
    if (design.joinery?.length) {
      parts.push(`Primary Joinery: ${design.joinery[0].type}`);
    }
    
    if (state.constraints.structural) {
      parts.push(`Min Load Capacity: ${state.constraints.structural.min_load_capacity} kg`);
      parts.push(`Safety Factor Required: ${state.constraints.structural.min_safety_factor}`);
    }
    
    return parts.join('\n');
  }

  private generateImprovementSuggestions(data: ValidationAgentResponse): string[] {
    const suggestions: string[] = [];
    
    if (!data.physics.stable) {
      suggestions.push('Add a wider base or lower the center of gravity for stability');
    }
    
    if (data.physics.safety_factor < 2) {
      suggestions.push('Reinforce the design to achieve a safety factor of at least 2');
    }
    
    if (data.material_strength.utilization > 80) {
      suggestions.push('Consider using thicker material or adding support structures');
    }
    
    if (!data.joinery_strength.sufficient) {
      suggestions.push(`Strengthen the ${data.joinery_strength.weakest_point}`);
      suggestions.push(...data.joinery_strength.improvements);
    }
    
    if (data.overall_score < 70) {
      suggestions.push('Consider consulting with an experienced woodworker for this design');
    }
    
    return suggestions;
  }
} 