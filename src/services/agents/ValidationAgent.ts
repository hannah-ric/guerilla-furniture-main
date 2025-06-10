import { Agent, AgentContext } from './base/Agent';
import { 
  IntentType,
  BaseAgentResponse as AgentResponse,
  ValidationAgentResponse 
} from '@/lib/types';
import { FurnitureKnowledgeGraph } from '@/services/knowledge/FurnitureKnowledgeGraph';

export class ValidationAgent extends Agent {
  name = 'validation_agent';

  constructor(knowledgeGraph: FurnitureKnowledgeGraph) {
    super(knowledgeGraph);
    this.interestedEvents = ['design_updated', 'dimension_changed', 'material_changed'];
  }

  canHandle(intent: IntentType): boolean {
    return intent === IntentType.VALIDATION_CHECK;
  }

  async process(input: string, context: AgentContext): Promise<AgentResponse> {
    const currentDesign = context.getCurrentDesign();
    
    try {
      // Validate physics
      const physics = this.validatePhysics(currentDesign);
      
      // Validate material strength
      const material = this.validateMaterialStrength(currentDesign);
      
      // Validate joinery strength
      const joinery = this.validateJoineryStrength(currentDesign);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(physics, material, joinery);
      
      const response: ValidationAgentResponse = {
        is_valid: physics.stable && material.adequate && joinery.sufficient,
        physics,
        material_strength: material,
        joinery_strength: joinery,
        overall_score: overallScore
      };
      
      const issues = this.collectIssues(physics, material, joinery);
      const improvements = this.generateImprovements(response, currentDesign);
      
      return this.createSuccessResponse(response, {
        suggestions: improvements,
        validation_issues: issues,
        next_steps: response.is_valid ? ['Generate final plans'] : ['Address validation issues']
      });
      
    } catch (error) {
      console.error('Validation failed:', error);
      
      return this.createErrorResponse(
        'Could not validate design',
        ['Please ensure all design parameters are specified']
      );
    }
  }

  private validatePhysics(design: any): any {
    const physics = {
      stable: true,
      max_load: 0,
      safety_factor: 2.0,
      critical_points: [] as string[]
    };
    
    if (!design.dimensions) {
      physics.stable = false;
      physics.critical_points.push('Missing dimensions');
      return physics;
    }
    
    const { width, height, depth } = design.dimensions;
    
    // Stability check
    const baseArea = Math.min(width || 0, depth || 0);
    const heightToBaseRatio = (height || 0) / baseArea;
    
    if (heightToBaseRatio > 3) {
      physics.stable = false;
      physics.critical_points.push('High center of gravity - may tip over');
    }
    
    // Load calculation
    physics.max_load = this.calculateMaxLoad(design);
    
    // Safety factor
    const expectedLoad = this.estimateLoad(design);
    physics.safety_factor = physics.max_load / Math.max(expectedLoad, 1);
    
    if (physics.safety_factor < 2.0) {
      physics.stable = false;
      physics.critical_points.push('Insufficient safety factor');
    }
    
    return physics;
  }

  private validateMaterialStrength(design: any): any {
    const material = {
      adequate: true,
      utilization: 0,
      warnings: [] as string[]
    };
    
    if (!design.materials || design.materials.length === 0) {
      material.adequate = false;
      material.warnings.push('No materials specified');
      return material;
    }
    
    const primaryMaterial = design.materials[0];
    const materialName = typeof primaryMaterial === 'string' ? primaryMaterial : primaryMaterial.type;
    const materialProps = this.knowledgeGraph.getMaterialProperties(materialName);
    
    if (!materialProps) {
      material.adequate = false;
      material.warnings.push(`Unknown material: ${materialName}`);
      return material;
    }
    
    // Check span vs material strength
    if (design.dimensions?.width) {
      const maxSpan = this.knowledgeGraph.getMaxSpan(materialName, 0.75); // Assume 3/4" thickness
      material.utilization = design.dimensions.width / maxSpan;
      
      if (material.utilization > 1.0) {
        material.adequate = false;
        material.warnings.push(`Span exceeds material capacity (${design.dimensions.width}" > ${maxSpan}")`);
      } else if (material.utilization > 0.8) {
        material.warnings.push('High material utilization - consider thicker stock');
      }
    }
    
    return material;
  }

  private validateJoineryStrength(design: any): any {
    const joinery = {
      sufficient: true,
      weakest_point: '',
      improvements: [] as string[]
    };
    
    if (!design.joinery || design.joinery.length === 0) {
      joinery.sufficient = false;
      joinery.weakest_point = 'No joinery specified';
      joinery.improvements.push('Add appropriate joinery methods');
      return joinery;
    }
    
    const primaryJoint = design.joinery[0];
    const jointName = typeof primaryJoint === 'string' ? primaryJoint : primaryJoint.type;
    
    // Basic joint strength assessment
    const jointStrengths: Record<string, number> = {
      'screw': 300,
      'dowel': 400,
      'mortise_tenon': 800,
      'dovetail': 700,
      'pocket_hole': 350
    };
    
    const strength = jointStrengths[jointName] || 200;
    const requiredStrength = this.estimateLoad(design) * 2; // 2x safety factor
    
    if (strength < requiredStrength) {
      joinery.sufficient = false;
      joinery.weakest_point = jointName;
      joinery.improvements.push(`Consider stronger joinery (current: ${strength}lbs, required: ${requiredStrength}lbs)`);
    }
    
    return joinery;
  }

  private calculateMaxLoad(design: any): number {
    // Simplified load calculation
    const baseLoad = 100; // pounds
    const materialFactor = design.materials?.length > 0 ? 1.5 : 1.0;
    const sizeFactor = design.dimensions ? 
      Math.sqrt((design.dimensions.width || 12) * (design.dimensions.depth || 12)) / 12 : 1.0;
    
    return Math.floor(baseLoad * materialFactor * sizeFactor);
  }

  private estimateLoad(design: any): number {
    // Estimate expected load based on furniture type
    const typeLoads: Record<string, number> = {
      'bookshelf': 150,
      'table': 100,
      'chair': 250,
      'desk': 75
    };
    
    return typeLoads[design.furniture_type] || 50;
  }

  private calculateOverallScore(physics: any, material: any, joinery: any): number {
    let score = 0;
    
    if (physics.stable) score += 40;
    if (material.adequate) score += 30;
    if (joinery.sufficient) score += 30;
    
    // Bonus for good safety factors
    if (physics.safety_factor > 3) score += 10;
    if (material.utilization < 0.5) score += 5;
    
    return Math.min(score, 100);
  }

  private collectIssues(physics: any, material: any, joinery: any): string[] {
    const issues: string[] = [];
    
    if (!physics.stable) issues.push(...physics.critical_points);
    if (!material.adequate) issues.push(...material.warnings);
    if (!joinery.sufficient) issues.push(...joinery.improvements);
    
    return issues;
  }

  private generateImprovements(validation: any, design: any): string[] {
    const improvements: string[] = [];
    
    if (!validation.is_valid) {
      improvements.push('Address structural issues before proceeding');
    }
    
    if (validation.physics.safety_factor < 3) {
      improvements.push('Consider adding reinforcements for better safety');
    }
    
    if (validation.material_strength.utilization > 0.7) {
      improvements.push('Use thicker material for better strength margin');
    }
    
    return improvements;
  }
}