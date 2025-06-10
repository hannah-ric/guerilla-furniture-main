import { CohesionCoordinator } from '../cohesion/cohesionCoordinator';
import { IntentClassifier, DesignContext, OrchestrationResult } from '../agents/IntentClassifier';

export class FurnitureDesignOrchestrator {
  private coordinator: CohesionCoordinator;
  private classifier: IntentClassifier;
  private context: DesignContext;
  private agents: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    this.coordinator = new CohesionCoordinator();
    this.classifier = new IntentClassifier();
    this.context = this.classifier.getContext();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize agents and register them
    this.isInitialized = true;
  }

  async processUserInput(input: string): Promise<OrchestrationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Classify intent
    const intent = await this.classifier.classifyIntent(input);
    
    // Find appropriate agent
    const agent = this.findAgentForIntent(intent.primary_intent);
    
    // Process with agent
    const result = agent ? 
      await agent.process(input, { getCurrentDesign: () => this.context.getContext().currentDesign }) :
      { success: false, data: null };

    return {
      intent,
      primaryData: result.data,
      suggestions: result.suggestions || [],
      validationIssues: result.validation_issues || [],
      nextSteps: result.next_steps || [],
      requiresClarification: intent.requires_clarification,
      clarificationPrompts: intent.clarification_prompts,
      context: this.context.getContext()
    };
  }

  private findAgentForIntent(intent: any): any {
    // Simple agent routing - would be more sophisticated in full implementation
    return null;
  }

  private generateResponseText(
    intent: any,
    result: any,
    previousDesign: any
  ): string {
    return "I'm processing your request...";
  }

  async reset(): Promise<void> {
    this.classifier.resetContext();
  }

  getSystemStatus(): any {
    return {
      isInitialized: this.isInitialized,
      context: this.context.getContext(),
      agents: Array.from(this.agents.keys())
    };
  }
}