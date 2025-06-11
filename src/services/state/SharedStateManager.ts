import { SharedState, StateChange, FurnitureDesign, DesignConstraints } from '@/lib/types';
import { Logger } from '@/lib/logger';

export class SharedStateManager {
  private static instance: SharedStateManager;
  private state: SharedState;
  private subscribers: Map<string, (state: SharedState) => void> = new Map();
  private logger = Logger.createScoped('SharedStateManager');

  private constructor() {
    this.state = this.createInitialState();
  }

  static getInstance(): SharedStateManager {
    if (!SharedStateManager.instance) {
      SharedStateManager.instance = new SharedStateManager();
    }
    return SharedStateManager.instance;
  }

  private createInitialState(): SharedState {
    return {
      version: 0,
      design: {},
      constraints: {
        dimensional: {},
        material: {},
        structural: {
          min_load_capacity: 50,
          min_safety_factor: 2,
          stability_requirement: 'standard'
        },
        aesthetic: {},
        budget: {}
      },
      validation_results: new Map(),
      agent_decisions: new Map(),
      locked_properties: new Set(),
      history: [],
      lastUpdated: new Date()
    };
  }

  getState(): SharedState {
    return { ...this.state };
  }

  updateDesign(
    agentName: string,
    updates: Partial<FurnitureDesign>,
    reason?: string
  ): boolean {
    try {
      const previousDesign = { ...this.state.design };
      
      // Apply updates
      this.state.design = {
        ...this.state.design,
        ...updates,
        updated_at: new Date()
      };
      
      // Record change
      const change: StateChange = {
        agent: agentName,
        timestamp: new Date(),
        previous_value: previousDesign,
        new_value: this.state.design,
        property_path: 'design',
        reason
      };
      
      this.state.history.push(change);
      this.state.version++;
      this.state.lastUpdated = new Date();
      
      this.logger.info('Design updated', { agent: agentName, updates });
      this.notifySubscribers();
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update design', error);
      return false;
    }
  }

  updateConstraints(
    agentName: string,
    constraints: Partial<DesignConstraints>,
    reason?: string
  ): boolean {
    try {
      const previousConstraints = { ...this.state.constraints };
      
      // Deep merge constraints
      this.state.constraints = this.deepMerge(this.state.constraints, constraints);
      
      // Record change
      const change: StateChange = {
        agent: agentName,
        timestamp: new Date(),
        previous_value: previousConstraints,
        new_value: this.state.constraints,
        property_path: 'constraints',
        reason
      };
      
      this.state.history.push(change);
      this.state.version++;
      this.state.lastUpdated = new Date();
      
      this.logger.info('Constraints updated', { agent: agentName, constraints });
      this.notifySubscribers();
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update constraints', error);
      return false;
    }
  }

  setValidationResult(agentName: string, result: any): void {
    this.state.validation_results.set(agentName, result);
    this.state.version++;
    this.state.lastUpdated = new Date();
    this.notifySubscribers();
  }

  recordDecision(
    agentName: string,
    decisionType: string,
    value: any,
    reasoning: string,
    confidence: number
  ): void {
    const decision = {
      agent_name: agentName,
      decision_type: decisionType,
      value,
      reasoning,
      confidence,
      timestamp: new Date(),
      alternatives_considered: []
    };
    
    this.state.agent_decisions.set(`${agentName}_${decisionType}`, decision);
    this.state.version++;
    this.notifySubscribers();
  }

  lockProperty(property: string): void {
    this.state.locked_properties.add(property);
  }

  unlockProperty(property: string): void {
    this.state.locked_properties.delete(property);
  }

  isPropertyLocked(property: string): boolean {
    return this.state.locked_properties.has(property);
  }

  subscribe(id: string, callback: (state: SharedState) => void): void {
    this.subscribers.set(id, callback);
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  reset(): void {
    this.state = this.createInitialState();
    this.notifySubscribers();
    this.logger.info('State reset');
  }

  private notifySubscribers(): void {
    const currentState = this.getState();
    this.subscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        this.logger.error('Subscriber notification error', error);
      }
    });
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          output[key] = this.deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    });
    
    return output;
  }

  getHistory(): StateChange[] {
    return [...this.state.history];
  }

  getVersion(): number {
    return this.state.version;
  }
} 