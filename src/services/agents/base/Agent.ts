import { Logger } from '@/lib/logger';
import { AgentResponse, SharedState } from '@/lib/types';

export interface AgentConfig {
  name: string;
  description: string;
  interestedEvents: string[];
  capabilities: string[];
}

export abstract class Agent {
  protected logger: ReturnType<typeof Logger.createScoped>;
  public readonly config: AgentConfig;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = Logger.createScoped(config.name);
    this.logger.info('Agent initialized', { capabilities: config.capabilities });
  }
  
  /**
   * Check if this agent can handle the given input
   */
  abstract canHandle(input: string, state: SharedState): Promise<boolean>;
  
  /**
   * Process the input and return a response
   */
  abstract process(input: string, state: SharedState): Promise<AgentResponse>;
  
  /**
   * Validate the current state for this agent's domain
   */
  abstract validate(state: SharedState): Promise<AgentResponse>;
  
  /**
   * Get agent's current confidence in the design
   */
  getConfidence(state: SharedState): number {
    return 0.5; // Default medium confidence
  }
  
  /**
   * Check if agent is interested in a state change
   */
  isInterestedIn(event: string): boolean {
    return this.config.interestedEvents.includes(event);
  }
  
  /**
   * Helper to create standard response
   */
  protected createResponse(
    success: boolean, 
    data: any, 
    options: Partial<AgentResponse> = {}
  ): AgentResponse {
    return {
      success,
      data,
      suggestions: options.suggestions || [],
      validation_issues: options.validation_issues || [],
      next_steps: options.next_steps || [],
      confidence: options.confidence || this.getConfidence({} as SharedState)
    };
  }
} 