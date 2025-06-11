import { Logger } from '@/lib/logger';
import { SharedState, AgentResponse, ValidationResult } from '@/lib/types';
import { SharedStateManager } from '@/services/state/SharedStateManager';

interface ConflictResolution {
  conflictType: string;
  resolution: string;
  affectedAgents: string[];
  changes: Record<string, any>;
}

export class CohesionCoordinator {
  private logger = Logger.createScoped('CohesionCoordinator');
  private stateManager: SharedStateManager;

  constructor() {
    this.stateManager = SharedStateManager.getInstance();
  }

  /**
   * Ensures all agent outputs work together harmoniously
   */
  async harmonizeResponses(
    agentResponses: Map<string, AgentResponse>,
    state: SharedState
  ): Promise<{
    harmonized: boolean;
    conflicts: ConflictResolution[];
    finalState: SharedState;
  }> {
    this.logger.info('Harmonizing agent responses', { 
      agents: Array.from(agentResponses.keys()) 
    });

    const conflicts: ConflictResolution[] = [];
    
    // Check for conflicts between agent recommendations
    const materialConflicts = this.checkMaterialJoineryConflicts(agentResponses, state);
    const dimensionConflicts = this.checkDimensionStabilityConflicts(agentResponses, state);
    const costConflicts = this.checkBudgetConflicts(agentResponses, state);
    
    conflicts.push(...materialConflicts, ...dimensionConflicts, ...costConflicts);

    // Apply conflict resolutions
    for (const conflict of conflicts) {
      await this.applyResolution(conflict);
    }

    // Propagate constraints
    await this.propagateConstraints(agentResponses, state);

    // Ensure design coherence
    const coherenceCheck = await this.validateCoherence(state);
    if (!coherenceCheck.isValid) {
      this.logger.warn('Design coherence issues detected', coherenceCheck.issues);
    }

    return {
      harmonized: conflicts.length === 0 && coherenceCheck.isValid,
      conflicts,
      finalState: this.stateManager.getState()
    };
  }

  /**
   * Check for conflicts between material selection and joinery methods
   */
  private checkMaterialJoineryConflicts(
    responses: Map<string, AgentResponse>,
    state: SharedState
  ): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    
    const materialResponse = responses.get('material');
    const joineryResponse = responses.get('joinery');
    
    if (materialResponse?.data && joineryResponse?.data) {
      const material = materialResponse.data.primary_material;
      const joinery = joineryResponse.data.primary_method;
      
      // Check if joinery is compatible with material
      if (material?.type === 'mdf' && joinery?.name.includes('dovetail')) {
        conflicts.push({
          conflictType: 'material_joinery_incompatibility',
          resolution: 'Switch to pocket holes or biscuit joints for MDF',
          affectedAgents: ['material', 'joinery'],
          changes: {
            joinery: { 
              primary_method: 'pocket_holes',
              reason: 'MDF not suitable for dovetails'
            }
          }
        });
      }
      
      if (material?.type === 'plywood' && joinery?.name.includes('mortise_tenon')) {
        conflicts.push({
          conflictType: 'material_joinery_incompatibility',
          resolution: 'Use dado joints or pocket screws for plywood',
          affectedAgents: ['material', 'joinery'],
          changes: {
            joinery: {
              primary_method: 'dado',
              reason: 'Plywood layers not ideal for mortise and tenon'
            }
          }
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Check for dimension and stability conflicts
   */
  private checkDimensionStabilityConflicts(
    responses: Map<string, AgentResponse>,
    state: SharedState
  ): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    
    const dimensionResponse = responses.get('dimension');
    const validationResponse = responses.get('validation');
    
    if (dimensionResponse?.data && validationResponse?.data) {
      const dimensions = dimensionResponse.data.total_dimensions;
      const validation = validationResponse.data;
      
      // Check height to base ratio
      if (dimensions && validation.physics && !validation.physics.stable) {
        const ratio = dimensions.height / Math.min(dimensions.width, dimensions.depth);
        if (ratio > 3) {
          conflicts.push({
            conflictType: 'stability_issue',
            resolution: 'Increase base dimensions or reduce height',
            affectedAgents: ['dimension', 'validation'],
            changes: {
              dimension: {
                suggestion: 'Increase base width to at least ' + 
                  Math.ceil(dimensions.height / 2.5) + ' inches'
              }
            }
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check for budget conflicts
   */
  private checkBudgetConflicts(
    responses: Map<string, AgentResponse>,
    state: SharedState
  ): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    
    const materialResponse = responses.get('material');
    const budget = state.constraints.budget?.max_total_cost;
    
    if (materialResponse?.data && budget) {
      const estimatedCost = materialResponse.data.primary_material?.cost_estimate;
      
      if (estimatedCost > budget) {
        conflicts.push({
          conflictType: 'budget_exceeded',
          resolution: 'Switch to more affordable materials',
          affectedAgents: ['material'],
          changes: {
            material: {
              suggestion: 'Consider ' + 
                materialResponse.data.alternatives?.[0]?.name || 'pine'
            }
          }
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Apply conflict resolution
   */
  private async applyResolution(resolution: ConflictResolution): Promise<void> {
    this.logger.info('Applying conflict resolution', { 
      type: resolution.conflictType,
      resolution: resolution.resolution 
    });
    
    // Update state based on resolution
    for (const [key, value] of Object.entries(resolution.changes)) {
      this.stateManager.recordDecision(
        'CohesionCoordinator',
        resolution.conflictType,
        value,
        resolution.resolution,
        0.9
      );
    }
  }

  /**
   * Propagate constraints through the design
   */
  private async propagateConstraints(
    responses: Map<string, AgentResponse>,
    state: SharedState
  ): Promise<void> {
    // If material changes, update joinery recommendations
    const materialChange = responses.get('material')?.data;
    if (materialChange) {
      const material = materialChange.primary_material;
      
      // Update constraints based on material properties
      if (material?.properties?.workability === 'difficult') {
        this.stateManager.updateConstraints('CohesionCoordinator', {
          material: {
            min_thickness: 1.0 // Thicker material for difficult woods
          }
        }, 'Adjusted for material workability');
      }
    }
    
    // If dimensions change, update material requirements
    const dimensionChange = responses.get('dimension')?.data;
    if (dimensionChange) {
      const boardFeet = dimensionChange.material_requirements?.board_feet;
      if (boardFeet > 50) {
        this.stateManager.updateConstraints('CohesionCoordinator', {
          budget: {
            max_material_cost: boardFeet * 10 // Rough estimate for material budget
          }
        }, 'Updated budget allocation for material needs');
      }
    }
  }

  /**
   * Validate overall design coherence
   */
  private async validateCoherence(state: SharedState): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Check style consistency
    if (state.design.style === 'modern' && 
        state.design.joinery?.some(j => j.type === 'dovetail')) {
      issues.push('Dovetail joints uncommon in modern style - consider hidden joinery');
    }
    
    // Check material-style match
    if (state.design.style === 'rustic' && 
        state.design.materials?.some(m => m.type === 'mdf')) {
      issues.push('MDF doesn\'t match rustic aesthetic - consider reclaimed wood');
    }
    
    // Check proportions
    const dims = state.design.dimensions;
    if (dims) {
      const goldenRatio = 1.618;
      const widthHeightRatio = dims.width / dims.height;
      const widthDepthRatio = dims.width / dims.depth;
      
      if (Math.abs(widthHeightRatio - goldenRatio) < 0.1 ||
          Math.abs(widthDepthRatio - goldenRatio) < 0.1) {
        // Good proportions, no issue
      } else if (state.design.style === 'modern' || state.design.style === 'scandinavian') {
        issues.push('Consider proportions closer to golden ratio for aesthetic appeal');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations: this.generateCoherenceRecommendations(state, issues)
    };
  }

  /**
   * Generate recommendations for improving coherence
   */
  private generateCoherenceRecommendations(
    state: SharedState, 
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.includes('style'))) {
      recommendations.push('Adjust design elements to better match your chosen style');
    }
    
    if (issues.some(i => i.includes('proportion'))) {
      recommendations.push('Fine-tune dimensions for better visual balance');
    }
    
    return recommendations;
  }
} 