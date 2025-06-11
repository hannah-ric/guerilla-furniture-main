import { Agent, AgentConfig } from './base/Agent';
import { SharedState, JoineryAgentResponse } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';

const JoineryResponseSchema = z.object({
  primary_method: z.object({
    name: z.string(),
    strength: z.number().min(1).max(10),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    tools: z.array(z.string())
  }),
  alternatives: z.array(z.object({
    name: z.string(),
    strength: z.number().min(1).max(10),
    reason: z.string()
  })),
  joint_locations: z.array(z.object({
    location: z.string(),
    method: z.string(),
    quantity: z.number()
  })),
  hardware_needed: z.array(z.object({
    item: z.string(),
    quantity: z.number(),
    size: z.string()
  }))
});

export class JoineryAgent extends Agent {
  constructor() {
    const config: AgentConfig = {
      name: 'JoineryAgent',
      description: 'Handles joinery methods and structural connections',
      interestedEvents: ['joinery_update', 'material_change', 'dimension_change'],
      capabilities: ['joinery_selection', 'strength_analysis', 'tool_requirements']
    };
    super(config);
  }

  async canHandle(input: string, state: SharedState): Promise<boolean> {
    const joineryKeywords = /\b(joint|joinery|connection|screw|nail|dowel|mortise|tenon|dovetail|glue|fasten|attach|assemble)\b/i;
    const strengthKeywords = /\b(strong|strength|sturdy|stable|reinforce)\b/i;
    
    return joineryKeywords.test(input) || strengthKeywords.test(input);
  }

  async process(input: string, state: SharedState) {
    this.logger.info('Processing joinery selection', { input: input.substring(0, 100) });

    try {
      const furnitureType = state.design.furniture_type || 'furniture';
      const materials = state.design.materials || [];
      const dimensions = state.design.dimensions;
      const skillLevel = 'intermediate'; // Default for now
      
      const prompt = `
You are a joinery and woodworking technique expert. Select appropriate joining methods.

Project Context:
- Furniture Type: ${furnitureType}
- Materials: ${materials.map(m => m.type).join(', ') || 'Not specified'}
- Dimensions: ${dimensions ? `${dimensions.width}" x ${dimensions.height}" x ${dimensions.depth}"` : 'Not specified'}
- User Skill Level: ${skillLevel}

User Request: "${input}"

Joint Locations Needed based on furniture type:
${this.getJointLocations(furnitureType)}

Joinery Options (by difficulty):
BEGINNER:
- Screws: Quick, adjustable, visible unless plugged (strength: 5/10)
- Pocket holes: Strong, hidden, requires jig (strength: 7/10)
- Dowels: Invisible, moderate strength, needs precision (strength: 6/10)

INTERMEDIATE:
- Biscuits: Good for panels, requires biscuit joiner (strength: 6/10)
- Dados/Rabbets: Strong for shelves, needs router/table saw (strength: 7/10)
- Box joints: Decorative corners, requires jig (strength: 8/10)

ADVANCED:
- Mortise & tenon: Very strong, traditional, time-consuming (strength: 9/10)
- Dovetails: Beautiful, very strong, high skill required (strength: 9/10)
- Finger joints: Strong corners, requires precision (strength: 8/10)

Select joints balancing strength, aesthetics, and feasibility.
Include necessary hardware (screws, bolts, etc.) with sizes.

Respond with a JSON object matching the JoineryResponseSchema.`;

      const response = await openAIService.generateResponse(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const joineryData = JoineryResponseSchema.parse(JSON.parse(jsonMatch[0]));
      
      // Update shared state with joinery selection
      const stateManager = (await import('@/services/state/SharedStateManager')).SharedStateManager.getInstance();
      stateManager.updateDesign(this.config.name, {
        joinery: [{
          type: joineryData.primary_method.name,
          difficulty: joineryData.primary_method.difficulty,
          strength_rating: `${joineryData.primary_method.strength}/10`,
          materials_compatible: materials.map(m => m.type)
        }],
        hardware: joineryData.hardware_needed.map(h => ({
          type: 'screw', // Simplified for now
          size: h.size,
          quantity: h.quantity,
          material: 'steel',
          cost_per_unit: 0.10 // Default estimate
        }))
      }, 'Joinery method selected');
      
      this.logger.info('Joinery selected', { 
        method: joineryData.primary_method.name,
        strength: joineryData.primary_method.strength 
      });

      return this.createResponse(true, joineryData, {
        confidence: 0.8,
        suggestions: this.generateSuggestions(joineryData, skillLevel)
      });

    } catch (error) {
      this.logger.error('Joinery selection failed', error);
      
      return this.createResponse(false, null, {
        validation_issues: ['Failed to select joinery methods'],
        suggestions: ['Consider your skill level and available tools when choosing joinery']
      });
    }
  }

  async validate(state: SharedState) {
    if (!state.design.joinery?.length) {
      return this.createResponse(true, { valid: true }); // No joinery to validate
    }

    const joinery = state.design.joinery;
    const materials = state.design.materials || [];
    const issues: string[] = [];
    
    // Check material compatibility
    joinery.forEach(joint => {
      if (joint.type === 'dovetail' || joint.type === 'mortise_tenon') {
        const hasSolidWood = materials.some(m => m.type === 'solid_wood');
        if (!hasSolidWood) {
          issues.push(`${joint.type} joints work best with solid wood`);
        }
      }
    });
    
    // Check strength requirements
    const furnitureType = state.design.furniture_type;
    if (furnitureType === 'table' || furnitureType === 'chair') {
      const hasStrongJoints = joinery.some(j => 
        j.strength_rating && parseInt(j.strength_rating) >= 7
      );
      if (!hasStrongJoints) {
        issues.push('Consider stronger joinery for load-bearing furniture');
      }
    }
    
    return this.createResponse(
      issues.length === 0,
      { valid: issues.length === 0, issues },
      { validation_issues: issues }
    );
  }

  private getJointLocations(furnitureType: string): string {
    const locations: Record<string, string> = {
      table: '- Leg to apron connections\n- Tabletop attachment\n- Stretcher connections (if applicable)',
      chair: '- Leg to seat connections\n- Back support joints\n- Arm rest attachments (if applicable)',
      bookshelf: '- Shelf to side connections\n- Back panel attachment\n- Top/bottom fixed shelves',
      cabinet: '- Case construction\n- Door hinges\n- Drawer box joints\n- Face frame (if applicable)',
      desk: '- Leg connections\n- Drawer construction\n- Desktop attachment',
      default: '- Main structural connections\n- Panel attachments\n- Component joints'
    };
    
    return locations[furnitureType] || locations.default;
  }

  private generateSuggestions(data: JoineryAgentResponse, skillLevel: string): string[] {
    const suggestions: string[] = [];
    
    if (data.primary_method.difficulty === 'advanced' && skillLevel === 'beginner') {
      suggestions.push('This joinery method requires advanced skills - consider practicing on scrap wood first');
    }
    
    if (data.primary_method.tools.length > 3) {
      suggestions.push(`You'll need these tools: ${data.primary_method.tools.join(', ')}`);
    }
    
    if (data.hardware_needed.length > 0) {
      const totalHardware = data.hardware_needed.reduce((sum, h) => sum + h.quantity, 0);
      suggestions.push(`Don't forget to purchase ${totalHardware} pieces of hardware`);
    }
    
    // Add joint-specific tips
    if (data.primary_method.name.includes('pocket')) {
      suggestions.push('Use a pocket hole jig for consistent, hidden joints');
    } else if (data.primary_method.name.includes('dowel')) {
      suggestions.push('A doweling jig ensures perfect alignment');
    }
    
    return suggestions;
  }
} 