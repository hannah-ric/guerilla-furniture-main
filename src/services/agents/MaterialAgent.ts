import { Agent, AgentConfig } from './base/Agent';
import { SharedState, MaterialAgentResponse } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';

const MaterialResponseSchema = z.object({
  primary_material: z.object({
    name: z.string(),
    type: z.string(),
    properties: z.object({
      cost_per_board_foot: z.number(),
      workability: z.enum(['easy', 'moderate', 'difficult']),
      durability: z.string(),
      hardness: z.number().optional(),
      indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).optional()
    }),
    cost_estimate: z.number()
  }),
  alternatives: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    cost_estimate: z.number()
  })),
  compatibility: z.object({
    with_dimensions: z.boolean(),
    with_environment: z.boolean(),
    with_budget: z.boolean()
  })
});

export class MaterialAgent extends Agent {
  constructor() {
    const config: AgentConfig = {
      name: 'MaterialAgent',
      description: 'Handles material selection and compatibility',
      interestedEvents: ['material_update', 'budget_change', 'environment_change'],
      capabilities: ['material_selection', 'cost_estimation', 'compatibility_check']
    };
    super(config);
  }

  async canHandle(input: string, state: SharedState): Promise<boolean> {
    const materialKeywords = /\b(wood|pine|oak|maple|walnut|plywood|mdf|material|lumber|board)\b/i;
    const qualityKeywords = /\b(cheap|expensive|budget|premium|quality|durable)\b/i;
    
    return materialKeywords.test(input) || qualityKeywords.test(input);
  }

  async process(input: string, state: SharedState) {
    this.logger.info('Processing material selection', { input: input.substring(0, 100) });

    try {
      const furnitureType = state.design.furniture_type || 'furniture';
      const dimensions = state.design.dimensions;
      const budget = state.constraints.budget?.max_total_cost;
      const skillLevel = 'intermediate'; // Default for now
      
      const prompt = `
You are a wood and material expert for furniture making. Help select appropriate materials.

Project Details:
- Furniture Type: ${furnitureType}
- Dimensions: ${dimensions ? `${dimensions.width}" x ${dimensions.height}" x ${dimensions.depth}"` : 'Not specified'}
- Budget: ${budget ? `$${budget}` : 'Not specified'}
- User Skill: ${skillLevel}

User Request: "${input}"

Consider:
1. Structural requirements (load, span, stress)
2. Workability for user's skill level
3. Cost and availability
4. Aesthetic match with intended style
5. Durability and maintenance needs
6. Sustainability (prefer FSC certified when possible)

Wood Properties Reference:
- Pine: Soft, affordable, easy to work, 420 Janka, $3-5/bf
- Oak: Hard, durable, moderate cost, 1290 Janka, $8-12/bf
- Maple: Very hard, smooth finish, higher cost, 1450 Janka, $10-15/bf
- Walnut: Premium, beautiful grain, expensive, 1010 Janka, $15-25/bf
- Plywood: Stable, various grades, good for panels, $30-80/sheet
- MDF: Smooth, paintable, avoid moisture, $25-40/sheet

Calculate estimated material cost based on dimensions if provided.

Respond with a JSON object matching the MaterialResponseSchema.`;

      const response = await openAIService.generateResponse(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const materialData = MaterialResponseSchema.parse(JSON.parse(jsonMatch[0]));
      
      // Update shared state with material selection
      const stateManager = (await import('@/services/state/SharedStateManager')).SharedStateManager.getInstance();
      stateManager.updateDesign(this.config.name, {
        materials: [{
          type: materialData.primary_material.type,
          properties: materialData.primary_material.properties
        }],
        estimated_cost: materialData.primary_material.cost_estimate
      }, 'Material selected based on requirements');
      
      this.logger.info('Material selected', { 
        material: materialData.primary_material.name,
        cost: materialData.primary_material.cost_estimate 
      });

      return this.createResponse(true, materialData, {
        confidence: 0.85,
        suggestions: this.generateSuggestions(materialData, furnitureType, budget)
      });

    } catch (error) {
      this.logger.error('Material selection failed', error);
      
      return this.createResponse(false, null, {
        validation_issues: ['Failed to select materials'],
        suggestions: ['Try specifying your preferred wood type or budget']
      });
    }
  }

  async validate(state: SharedState) {
    if (!state.design.materials?.length) {
      return this.createResponse(true, { valid: true }); // No materials to validate
    }

    const materials = state.design.materials;
    const dimensions = state.design.dimensions;
    const issues: string[] = [];
    
    // Check material suitability for dimensions
    if (dimensions && dimensions.width > 24) {
      const hasSheetGoods = materials.some(m => 
        m.type === 'plywood' || m.type === 'mdf'
      );
      if (!hasSheetGoods) {
        issues.push('Wide spans may require sheet goods or laminated boards');
      }
    }
    
    // Check outdoor compatibility
    const needsOutdoor = state.constraints.material?.indoor_outdoor === 'outdoor';
    if (needsOutdoor) {
      const hasOutdoorMaterial = materials.some(m => 
        m.properties.indoor_outdoor === 'outdoor' || 
        m.properties.indoor_outdoor === 'both'
      );
      if (!hasOutdoorMaterial) {
        issues.push('Selected materials may not be suitable for outdoor use');
      }
    }
    
    return this.createResponse(
      issues.length === 0,
      { valid: issues.length === 0, issues },
      { validation_issues: issues }
    );
  }

  private generateSuggestions(
    data: MaterialAgentResponse, 
    furnitureType: string,
    budget?: number
  ): string[] {
    const suggestions: string[] = [];
    
    if (!data.compatibility.with_budget && budget) {
      suggestions.push('Consider the alternative materials listed to stay within budget');
    }
    
    if (data.primary_material.properties.workability === 'difficult') {
      suggestions.push('This material requires advanced woodworking skills');
    }
    
    // Material-specific suggestions
    if (data.primary_material.type === 'solid_wood') {
      suggestions.push('Remember to account for wood movement in your joinery');
    } else if (data.primary_material.type === 'plywood') {
      suggestions.push('Consider edge banding for a finished look');
    }
    
    return suggestions;
  }
} 