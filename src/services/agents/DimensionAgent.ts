import { Agent, AgentConfig } from './base/Agent';
import { SharedState, IntentType, DimensionAgentResponse, Dimensions } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';
import { DIMENSIONS, FURNITURE_STANDARDS, VALIDATION_MESSAGES, ENGINEERING } from '@/lib/constants';
import { memoize } from '@/lib/performance';

const DimensionResponseSchema = z.object({
  measurements: z.array(z.object({
    component: z.string(),
    dimension_type: z.enum(['height', 'width', 'depth', 'thickness', 'diameter']),
    value: z.number(),
    unit: z.string(),
    converted_to_inches: z.number()
  })),
  total_dimensions: z.object({
    height: z.number().optional(),
    width: z.number().optional(),
    depth: z.number().optional(),
    thickness: z.number().optional(),
    diameter: z.number().optional()
  }),
  material_requirements: z.object({
    board_feet: z.number(),
    sheet_goods_area: z.number().optional()
  }),
  ergonomic_validation: z.object({
    is_valid: z.boolean(),
    issues: z.array(z.string())
  })
});

export class DimensionAgent extends Agent {
  private dimensionRegex = /\b(\d+(?:\.\d+)?)\s*(inch|inches|"|in|feet|foot|ft|'|cm|centimeter|mm|millimeter|meter|m)\b/gi;
  private calculateBoardFeet = memoize(this._calculateBoardFeet.bind(this));

  constructor() {
    const config: AgentConfig = {
      name: 'DimensionAgent',
      description: 'Handles furniture dimensions and ergonomic validation',
      interestedEvents: ['dimension_update', 'furniture_type_change'],
      capabilities: ['dimension_extraction', 'ergonomic_validation', 'material_calculation']
    };
    super(config);
  }

  async canHandle(input: string, state: SharedState): Promise<boolean> {
    const dimensionKeywords = /\b(inch|inches|feet|foot|ft|cm|centimeter|mm|millimeter|wide|tall|high|deep|long|size|dimension|width|height|depth)\b/i;
    return dimensionKeywords.test(input) && this.dimensionRegex.test(input);
  }

  async process(input: string, state: SharedState): Promise<any> {
    this.logger.info('Processing dimensions', { input: input.substring(0, 100) });

    try {
      const furnitureType = state.design.furniture_type || 'furniture';
      const currentDimensions = state.design.dimensions;
      
      const prompt = this.buildDimensionPrompt(furnitureType, currentDimensions, input);
      const response = await openAIService.generateResponse(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const dimensionData = DimensionResponseSchema.parse(JSON.parse(jsonMatch[0]));
      
      // Validate dimensions against constraints
      const validatedData = this.validateDimensionData(dimensionData, furnitureType);
      
      // Update shared state with dimensions
      if (this.shouldUpdateState(validatedData)) {
        await this.updateState(validatedData);
      }
      
      this.logger.info('Dimensions extracted', validatedData.total_dimensions);

      return this.createResponse(true, validatedData, {
        confidence: validatedData.ergonomic_validation.is_valid ? 0.9 : 0.7,
        validation_issues: validatedData.ergonomic_validation.issues,
        suggestions: this.generateSuggestions(validatedData, furnitureType)
      });

    } catch (error) {
      this.logger.error('Dimension processing failed', error);
      
      return this.createResponse(false, null, {
        validation_issues: ['Failed to process dimensions'],
        suggestions: ['Please specify dimensions like "4 feet wide by 2 feet deep"']
      });
    }
  }

  async validate(state: SharedState): Promise<any> {
    if (!state.design.dimensions || !state.design.furniture_type) {
      return this.createResponse(true, { valid: true }); // Nothing to validate yet
    }

    const dimensions = state.design.dimensions;
    const furnitureType = state.design.furniture_type;
    
    const issues: string[] = [];
    
    // Check dimension limits
    if (dimensions.width < DIMENSIONS.MIN.WIDTH || 
        dimensions.height < DIMENSIONS.MIN.HEIGHT || 
        dimensions.depth < DIMENSIONS.MIN.DEPTH) {
      issues.push(VALIDATION_MESSAGES.DIMENSIONS.TOO_SMALL);
    }
    
    if (dimensions.width > DIMENSIONS.MAX.WIDTH || 
        dimensions.height > DIMENSIONS.MAX.HEIGHT || 
        dimensions.depth > DIMENSIONS.MAX.DEPTH) {
      issues.push(VALIDATION_MESSAGES.DIMENSIONS.TOO_LARGE);
    }
    
    // Check stability
    const heightToWidthRatio = dimensions.height / dimensions.width;
    if (heightToWidthRatio > ENGINEERING.HEIGHT_TO_BASE_RATIO_MAX) {
      issues.push(VALIDATION_MESSAGES.DIMENSIONS.UNSTABLE);
    }
    
    // Furniture-specific validation
    const standards = this.getFurnitureStandards(furnitureType);
    if (standards) {
      const specificIssues = this.validateAgainstStandards(dimensions, standards);
      issues.push(...specificIssues);
    }
    
    return this.createResponse(
      issues.length === 0,
      { valid: issues.length === 0, issues },
      { validation_issues: issues }
    );
  }

  private buildDimensionPrompt(
    furnitureType: string,
    currentDimensions: Dimensions | undefined,
    input: string
  ): string {
    const standards = this.getFurnitureStandards(furnitureType);
    const standardsText = standards ? this.formatStandards(standards) : '';
    
    return `
You are a furniture dimension specialist. Extract and validate dimensions from user input.

Furniture Type: ${furnitureType}
Current Dimensions: ${currentDimensions ? JSON.stringify(currentDimensions) : 'None'}
User Input: "${input}"

Tasks:
1. Extract all dimensional specifications (height, width, depth, thickness)
2. Convert to inches for standardization
3. Apply ergonomic standards for the furniture type
4. Calculate material requirements (board feet, sheet goods area)
5. Validate proportions for stability

${standardsText}

Material Calculation:
- Board feet = (thickness × width × length) / ${DIMENSIONS.BOARD_FEET_DIVISOR}
- Add ${(DIMENSIONS.WASTE_FACTOR.SOLID_WOOD - 1) * 100}% waste factor for solid wood
- Add ${(DIMENSIONS.WASTE_FACTOR.SHEET_GOODS - 1) * 100}% waste factor for sheet goods

Respond with a JSON object matching the DimensionResponseSchema.`;
  }

  private getFurnitureStandards(type: string): any {
    const upperType = type.toUpperCase() as keyof typeof FURNITURE_STANDARDS;
    return FURNITURE_STANDARDS[upperType] || null;
  }

  private formatStandards(standards: any): string {
    let text = 'Ergonomic Guidelines:\n';
    
    for (const [key, value] of Object.entries(standards)) {
      if (value !== null && typeof value === 'object' && 'MIN' in value && 'MAX' in value) {
        text += `- ${key}: ${value.MIN}-${value.MAX}" range\n`;
      } else if (value !== null && typeof value === 'object' && 'TYPICAL' in value) {
        text += `- ${key}: ${value.TYPICAL}" typical\n`;
      } else if (value !== null) {
        text += `- ${key}: ${value}"\n`;
      }
    }
    
    return text;
  }

  private validateDimensionData(
    data: z.infer<typeof DimensionResponseSchema>,
    furnitureType: string
  ): z.infer<typeof DimensionResponseSchema> {
    const dims = data.total_dimensions;
    const issues = [...data.ergonomic_validation.issues];
    
    // Add our own validation
    if (dims.width && dims.height) {
      const ratio = dims.height / dims.width;
      if (ratio > ENGINEERING.HEIGHT_TO_BASE_RATIO_MAX) {
        issues.push(`Height to width ratio of ${ratio.toFixed(1)} exceeds safe limit of ${ENGINEERING.HEIGHT_TO_BASE_RATIO_MAX}`);
      }
    }
    
    return {
      ...data,
      ergonomic_validation: {
        is_valid: issues.length === 0,
        issues
      }
    };
  }

  private shouldUpdateState(data: z.infer<typeof DimensionResponseSchema>): boolean {
    const dims = data.total_dimensions;
    return !!(dims.width || dims.height || dims.depth);
  }

  private async updateState(data: z.infer<typeof DimensionResponseSchema>): Promise<void> {
    const stateManager = (await import('@/services/state/SharedStateManager')).SharedStateManager.getInstance();
    
    stateManager.updateDesign(this.config.name, {
      dimensions: {
        width: data.total_dimensions.width || 0,
        height: data.total_dimensions.height || 0,
        depth: data.total_dimensions.depth || 0,
        unit: 'inches'
      }
    }, 'User specified dimensions');
  }

  private validateAgainstStandards(dimensions: Dimensions, standards: any): string[] {
    const issues: string[] = [];
    
    if (standards.HEIGHT && dimensions.height) {
      if (dimensions.height < standards.HEIGHT.MIN || dimensions.height > standards.HEIGHT.MAX) {
        issues.push(`${standards.HEIGHT.MIN}-${standards.HEIGHT.MAX} inches recommended for comfort`);
      }
    }
    
    if (standards.DEPTH && dimensions.depth) {
      if (dimensions.depth < standards.DEPTH.MIN || dimensions.depth > standards.DEPTH.MAX) {
        issues.push(`Depth should be ${standards.DEPTH.MIN}-${standards.DEPTH.MAX} inches`);
      }
    }
    
    return issues;
  }

  private generateSuggestions(data: z.infer<typeof DimensionResponseSchema>, furnitureType: string): string[] {
    const suggestions: string[] = [];
    
    if (!data.ergonomic_validation.is_valid) {
      suggestions.push('Consider adjusting dimensions for better ergonomics');
    }
    
    if (data.material_requirements.board_feet > 50) {
      suggestions.push(`This design requires ${data.material_requirements.board_feet.toFixed(1)} board feet - consider if this fits your budget`);
    }
    
    // Add furniture-specific suggestions
    const specificSuggestions = this.getFurnitureSpecificSuggestions(furnitureType);
    suggestions.push(...specificSuggestions);
    
    return suggestions.slice(0, 3); // Limit suggestions
  }

  private getFurnitureSpecificSuggestions(furnitureType: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      table: ['Remember to account for leg room and chair clearance'],
      bookshelf: ['Consider adjustable shelves for flexibility'],
      chair: ['Ensure seat height allows feet to rest flat on floor'],
      desk: ['Include space for cable management if needed']
    };
    
    return suggestions[furnitureType] || [];
  }

  private _calculateBoardFeet(width: number, height: number, depth: number, thickness = 0.75): number {
    return (width * height * thickness) / DIMENSIONS.BOARD_FEET_DIVISOR;
  }
} 