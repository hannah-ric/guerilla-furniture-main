import { Logger } from '@/lib/logger';
import { SharedStateManager } from '@/services/state/SharedStateManager';
import { CohesionCoordinator } from '@/services/cohesion/CohesionCoordinator';
import { CommunicationBus } from '@/services/communication/CommunicationBus';
import { FurnitureKnowledgeGraph } from '@/services/knowledge/FurnitureKnowledgeGraph';
import {
  IntentClassifier,
  DimensionAgent,
  MaterialAgent,
  JoineryAgent,
  ValidationAgent,
  MaterialSourcingAgent
} from '@/services/agents';
import { IntentType, AgentResponse, SharedState, FurnitureDesign } from '@/lib/types';
import { PerformanceMonitor } from '@/lib/performance';
import { ErrorHandler, ErrorCode, BlueprintError, withErrorHandling } from '@/lib/errors';

interface OrchestratorResponse {
  success: boolean;
  response: string;
  suggestions?: string[];
  validationResults?: Map<string, any>;
  designProgress?: number;
}

export class FurnitureDesignOrchestrator {
  private logger = Logger.createScoped('Orchestrator');
  private stateManager: SharedStateManager;
  private cohesionCoordinator: CohesionCoordinator;
  private communicationBus: CommunicationBus;
  private agents: Map<string, any>;
  private isInitialized = false;

  constructor() {
    this.stateManager = SharedStateManager.getInstance();
    this.cohesionCoordinator = new CohesionCoordinator();
    this.communicationBus = CommunicationBus.getInstance();
    this.agents = new Map();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.info('Initializing orchestrator and agents');

    // Initialize all agents
    const intentClassifier = new IntentClassifier();
    const dimensionAgent = new DimensionAgent();
    const materialAgent = new MaterialAgent();
    const joineryAgent = new JoineryAgent();
    const validationAgent = new ValidationAgent();
    const materialSourcingAgent = new MaterialSourcingAgent();

    // Register agents
    this.agents.set('intent', intentClassifier);
    this.agents.set('dimension', dimensionAgent);
    this.agents.set('material', materialAgent);
    this.agents.set('joinery', joineryAgent);
    this.agents.set('validation', validationAgent);
    this.agents.set('materialSourcing', materialSourcingAgent);

    // Register with communication bus
    this.communicationBus.registerAgent(intentClassifier);
    this.communicationBus.registerAgent(dimensionAgent);
    this.communicationBus.registerAgent(materialAgent);
    this.communicationBus.registerAgent(joineryAgent);
    this.communicationBus.registerAgent(validationAgent);
    this.communicationBus.registerAgent(materialSourcingAgent);

    this.isInitialized = true;
    this.logger.info('Orchestrator initialized with all agents');
  }

  async processUserInput(input: string): Promise<OrchestratorResponse> {
    return PerformanceMonitor.measureAsync('processUserInput', async () => {
      if (!this.isInitialized) {
        await this.initialize();
      }

      this.logger.info('Processing user input', { input: input.substring(0, 100) });

      try {
        const state = this.stateManager.getState();
        
        // Step 1: Classify intent
        const intentClassifier = this.agents.get('intent');
        const intentResult = await withErrorHandling(
          () => intentClassifier.process(input, state),
          'Intent classification',
          { success: false, data: { primary_intent: IntentType.CLARIFICATION_NEEDED } }
        );
        
        if (!intentResult.success) {
          throw ErrorHandler.createError(
            ErrorCode.DESIGN_INTENT_UNCLEAR,
            'Failed to understand user intent',
            "I'm having trouble understanding what you'd like to build. Could you provide more details?",
            {
              recoveryStrategies: [
                {
                  action: 'guide',
                  description: 'Provide clearer description of your furniture project'
                }
              ]
            }
          );
        }

        const intent = intentResult.data.primary_intent;
        this.logger.info('Intent classified', { intent });

        // Step 2: Route to appropriate agent(s)
        const agentResponses = await this.routeToAgents(intent, input, state);
        
        // Step 3: Harmonize responses using CohesionCoordinator
        const harmonizationResult = await this.cohesionCoordinator.harmonizeResponses(
          agentResponses, 
          state
        );
        
        if (!harmonizationResult.harmonized && harmonizationResult.conflicts.length > 0) {
          this.logger.warn('Conflicts detected during harmonization', {
            conflicts: harmonizationResult.conflicts
          });
        }
        
        // Step 4: Synthesize responses
        const synthesis = this.synthesizeResponses(
          agentResponses, 
          intent,
          harmonizationResult.conflicts,
          intentResult.data
        );
        
        // Step 5: Run validation if design is complete enough
        if (this.shouldRunValidation(harmonizationResult.finalState)) {
          const validationAgent = this.agents.get('validation');
          const validationResult = await validationAgent.process('validate', harmonizationResult.finalState);
          
          if (validationResult.success) {
            this.stateManager.setValidationResult('ValidationAgent', validationResult.data);
          }
        }

        // Calculate design progress
        const designProgress = this.calculateDesignProgress(harmonizationResult.finalState);

        return {
          success: true,
          response: synthesis.response,
          suggestions: synthesis.suggestions,
          validationResults: this.stateManager.getState().validation_results,
          designProgress
        };

      } catch (error) {
        this.logger.error('Orchestration failed', error);
        
        // Use centralized error handling
        const handledError = ErrorHandler.handle(error, 'processUserInput');
        
        return {
          success: false,
          response: handledError.userMessage,
          suggestions: this.getRecoverySuggestions(handledError)
        };
      }
    });
  }

  private async routeToAgents(
    intent: IntentType,
    input: string,
    state: SharedState
  ): Promise<Map<string, AgentResponse>> {
    const responses = new Map<string, AgentResponse>();

    try {
      switch (intent) {
        case IntentType.DESIGN_INITIATION: {
          // When starting a new design, we mainly extract any initial specs
          const agents = ['dimension', 'material'];
          for (const agentName of agents) {
            const agent = this.agents.get(agentName);
            if (await agent.canHandle(input, state)) {
              const response = await withErrorHandling(
                () => agent.process(input, state),
                `Agent processing: ${agentName}`,
                { success: false, data: null, validation_issues: [`Unable to process ${agentName} information`] }
              );
              responses.set(agentName, response);
            }
          }
          break;
        }

        case IntentType.DIMENSION_SPECIFICATION: {
          const dimensionAgent = this.agents.get('dimension');
          const dimResponse = await withErrorHandling(
            () => dimensionAgent.process(input, state),
            'Dimension specification',
            { success: false, data: null, validation_issues: ['Invalid dimensions provided'] }
          );
          responses.set('dimension', dimResponse);
          break;
        }

        case IntentType.MATERIAL_SELECTION: {
          const materialAgent = this.agents.get('material');
          const matResponse = await withErrorHandling(
            () => materialAgent.process(input, state),
            'Material selection',
            { success: false, data: null, validation_issues: ['Unable to process material selection'] }
          );
          responses.set('material', matResponse);
          break;
        }

        case IntentType.MATERIAL_SOURCING: {
          const materialSourcingAgent = this.agents.get('materialSourcing');
          const sourcingResponse = await withErrorHandling(
            () => materialSourcingAgent.process(input, state),
            'Material sourcing',
            { success: false, data: null, validation_issues: ['Unable to source materials at this time'] }
          );
          responses.set('materialSourcing', sourcingResponse);
          break;
        }

        case IntentType.JOINERY_METHOD: {
          const joineryAgent = this.agents.get('joinery');
          const joinResponse = await withErrorHandling(
            () => joineryAgent.process(input, state),
            'Joinery method selection',
            { success: false, data: null, validation_issues: ['Unable to determine joinery methods'] }
          );
          responses.set('joinery', joinResponse);
          break;
        }

        case IntentType.VALIDATION_CHECK: {
          const validationAgent = this.agents.get('validation');
          const valResponse = await withErrorHandling(
            () => validationAgent.process(input, state),
            'Design validation',
            { success: false, data: null, validation_issues: ['Validation check failed'] }
          );
          responses.set('validation', valResponse);
          break;
        }

        default: {
          // For other intents, check which agents can handle
          for (const [name, agent] of this.agents.entries()) {
            if (name !== 'intent' && await agent.canHandle(input, state)) {
              const response = await withErrorHandling(
                () => agent.process(input, state),
                `Agent processing: ${name}`,
                { success: false, data: null, validation_issues: [`Unable to process ${name} information`] }
              );
              responses.set(name, response);
            }
          }
        }
      }
    } catch (error) {
      // Log but don't fail the entire routing
      this.logger.error('Error during agent routing', error);
      
      // Add error information to responses
      const errorInfo: AgentResponse = {
        success: false,
        data: null,
        validation_issues: [ErrorHandler.getUserMessage(error)]
      };
      responses.set('error', errorInfo);
    }

    return responses;
  }

  private synthesizeResponses(
    responses: Map<string, AgentResponse>,
    intent: IntentType,
    conflicts: any[] = [],
    intentData: any
  ): { response: string; suggestions: string[] } {
    const parts: string[] = [];
    const allSuggestions: string[] = [];

    // Collect all suggestions
    responses.forEach((response, agentName) => {
      if (response.suggestions) {
        allSuggestions.push(...response.suggestions);
      }
    });

    // Add clarification prompts from intent classification
    if (intentData.clarification_prompts?.length > 0) {
      allSuggestions.push(...intentData.clarification_prompts);
    }

    // Build response based on intent and agent responses
    if (intent === IntentType.DESIGN_INITIATION) {
      parts.push("Great! Let's design your furniture together. 🛠️");
      
      const state = this.stateManager.getState();
      if (state.design.furniture_type) {
        parts.push(`I understand you want to build a ${state.design.furniture_type}.`);
      }
      
      // Check what info we already have
      if (!state.design.dimensions) {
        parts.push("What dimensions would you like? You can specify in inches or feet.");
      } else if (!state.design.materials?.length) {
        parts.push("What material would you prefer? Pine is affordable and easy to work with, while oak offers durability.");
      }
    } else if (intent === IntentType.CLARIFICATION_NEEDED) {
      parts.push("I'd love to help you design furniture! 🪑");
      parts.push("Could you tell me more about what you'd like to build?");
    } else {
      // Generic synthesis
      responses.forEach((response, agentName) => {
        if (response.success && response.data) {
          const agentSummary = this.summarizeAgentResponse(agentName, response);
          if (agentSummary) {
            parts.push(agentSummary);
          }
        } else if (!response.success && response.validation_issues?.length) {
          // Handle agent-specific errors gracefully
          parts.push(this.getAgentErrorMessage(agentName, response));
        }
      });
    }

    // Add conflict resolutions if any
    if (conflicts.length > 0) {
      parts.push("\n⚠️ I've made some adjustments for compatibility:");
      conflicts.forEach(conflict => {
        parts.push(`• ${conflict.resolution}`);
      });
    }

    // Add validation issues if any
    const validationIssues: string[] = [];
    responses.forEach(response => {
      if (response.validation_issues?.length) {
        validationIssues.push(...response.validation_issues);
      }
    });

    if (validationIssues.length > 0) {
      parts.push("\n⚠️ Please note:");
      validationIssues.forEach(issue => parts.push(`• ${issue}`));
    }

    // Add progress indicator
    const state = this.stateManager.getState();
    const progress = this.calculateDesignProgress(state);
    if (progress > 0 && progress < 100) {
      parts.push(`\n📊 Design Progress: ${progress}%`);
    }

    return {
      response: parts.join('\n\n') || 'I processed your request successfully.',
      suggestions: this.prioritizeSuggestions(allSuggestions, state)
    };
  }

  private summarizeAgentResponse(agentName: string, response: AgentResponse): string {
    if (!response.data) return '';

    switch (agentName) {
      case 'dimension': {
        const dimData = response.data;
        if (dimData.total_dimensions) {
          const dims = dimData.total_dimensions;
          const boardFeet = dimData.material_requirements?.board_feet;
          let summary = `✅ Dimensions set: ${dims.width}" W × ${dims.height}" H × ${dims.depth}" D`;
          if (boardFeet) {
            summary += `\n   📏 Estimated material needed: ${boardFeet.toFixed(1)} board feet`;
          }
          return summary;
        }
        break;
      }

      case 'material': {
        const matData = response.data;
        if (matData.primary_material) {
          const mat = matData.primary_material;
          let summary = `✅ Material selected: ${mat.name}`;
          if (mat.properties?.workability) {
            summary += ` (${mat.properties.workability} to work with)`;
          }
          if (mat.cost_estimate) {
            summary += `\n   💰 Estimated material cost: $${mat.cost_estimate}`;
          }
          return summary;
        }
        break;
      }

      case 'joinery': {
        const joinData = response.data;
        if (joinData.primary_method) {
          const method = joinData.primary_method;
          let summary = `✅ Joinery method: ${method.name}`;
          summary += ` (strength: ${method.strength}/10, ${method.difficulty} level)`;
          if (method.tools?.length) {
            summary += `\n   🔧 Tools needed: ${method.tools.slice(0, 3).join(', ')}`;
          }
          return summary;
        }
        break;
      }

      case 'validation': {
        const valData = response.data;
        if (valData.is_valid) {
          return `✅ Design validated! Overall score: ${valData.overall_score}/100\n   ✨ Your design is structurally sound and ready to build!`;
        } else {
          return `❌ Design needs adjustments. Score: ${valData.overall_score}/100\n   Let's work on improving the structural integrity.`;
        }
      }
      
      case 'materialSourcing': {
        const sourcingData = response.data;
        if (sourcingData.sourcedMaterials?.length > 0) {
          let summary = `✅ Materials sourced from local suppliers!`;
          if (sourcingData.totalCost > 0) {
            summary += `\n   💰 Total material cost: $${sourcingData.totalCost.toFixed(2)}`;
          }
          if (sourcingData.availability) {
            const availIcons: Record<string, string> = {
              'available': '✅',
              'partial': '⚠️',
              'unavailable': '❌'
            };
            summary += `\n   ${availIcons[sourcingData.availability]} Availability: ${sourcingData.availability}`;
          }
          return summary;
        } else if (sourcingData.requiredTools?.length > 0) {
          let summary = `🔧 Tool availability checked!`;
          if (sourcingData.allAvailable) {
            summary += '\n   ✅ All required tools are available for rental';
          }
          if (sourcingData.totalRentalCost > 0) {
            summary += `\n   💰 Daily rental cost: $${sourcingData.totalRentalCost.toFixed(2)}`;
          }
          return summary;
        }
        break;
      }
    }

    return '';
  }

  private getAgentErrorMessage(agentName: string, response: AgentResponse): string {
    const agentLabels: Record<string, string> = {
      dimension: 'dimensions',
      material: 'materials',
      joinery: 'joinery methods',
      validation: 'design validation',
      materialSourcing: 'material sourcing'
    };

    const label = agentLabels[agentName] || agentName;
    return `I had trouble processing the ${label}. ${response.validation_issues?.[0] || 'Please try again with more specific information.'}`;
  }

  private shouldRunValidation(state: SharedState): boolean {
    const design = state.design;
    return !!(
      design.furniture_type &&
      design.dimensions &&
      design.materials && design.materials.length > 0 &&
      design.joinery && design.joinery.length > 0
    );
  }

  private calculateDesignProgress(state: SharedState): number {
    const design = state.design as FurnitureDesign;
    let progress = 0;
    const steps = 5;

    if (design.furniture_type) progress += 100 / steps;
    if (design.dimensions) progress += 100 / steps;
    if (design.materials?.length > 0) progress += 100 / steps;
    if (design.joinery?.length > 0) progress += 100 / steps;
    if (design.validation_status === 'valid') progress += 100 / steps;

    return Math.round(progress);
  }

  private prioritizeSuggestions(suggestions: string[], state: SharedState): string[] {
    // Remove duplicates
    const unique = [...new Set(suggestions)];
    
    // Prioritize based on design progress
    const design = state.design;
    const prioritized: string[] = [];

    if (!design.furniture_type) {
      prioritized.push(...unique.filter(s => s.toLowerCase().includes('furniture') || s.toLowerCase().includes('build')));
    } else if (!design.dimensions) {
      prioritized.push(...unique.filter(s => s.toLowerCase().includes('dimension') || s.toLowerCase().includes('size')));
    } else if (!design.materials?.length) {
      prioritized.push(...unique.filter(s => s.toLowerCase().includes('material') || s.toLowerCase().includes('wood')));
    } else if (!design.joinery?.length) {
      prioritized.push(...unique.filter(s => s.toLowerCase().includes('join') || s.toLowerCase().includes('connect')));
    }

    // Add remaining suggestions
    prioritized.push(...unique.filter(s => !prioritized.includes(s)));

    return prioritized.slice(0, 3);
  }

  private getFriendlyErrorMessage(errorType: string, error?: any): string {
    const messages: Record<string, string> = {
      intent_failed: "I'm having trouble understanding your request. Could you please rephrase it?",
      orchestration_failed: "I encountered an issue processing your request. Let's try again!",
      api_error: "I'm having trouble connecting to my AI services. Please check your API key is configured.",
      validation_error: "I couldn't validate your design. Let me help you fix any issues."
    };

    if (error?.message?.includes('API key')) {
      return messages.api_error;
    }

    return messages[errorType] || "Something went wrong. Let's try a different approach!";
  }

  private getContextualSuggestions(state: SharedState): string[] {
    const design = state.design;
    const suggestions: string[] = [];

    if (!design.furniture_type) {
      suggestions.push(
        "Tell me what type of furniture you'd like to build",
        "Try: 'I want to build a bookshelf'",
        "Say something like: 'Help me design a coffee table'"
      );
    } else if (!design.dimensions) {
      suggestions.push(
        `What size ${design.furniture_type} do you need?`,
        "Specify dimensions like: '4 feet wide by 2 feet deep'",
        "You can use inches or feet for measurements"
      );
    } else if (!design.materials?.length) {
      suggestions.push(
        "What material would you like to use?",
        "Pine is great for beginners and budget-friendly",
        "Oak or maple offer excellent durability"
      );
    }

    return suggestions;
  }

  private getRecoverySuggestions(error?: BlueprintError): string[] {
    // If we have specific recovery strategies, convert them to suggestions
    if (error?.recoveryStrategies) {
      const suggestions = error.recoveryStrategies
        .filter(s => s.action === 'guide')
        .map(s => s.description)
        .slice(0, 3);
      
      if (suggestions.length > 0) {
        return suggestions;
      }
    }
    
    // Default recovery suggestions
    return [
      "Try starting with the type of furniture you want to build",
      "Tell me about your project requirements",
      "Describe what you're trying to create"
    ];
  }

  async reset(): Promise<void> {
    this.stateManager.reset();
    this.communicationBus.reset();
    this.logger.info('Orchestrator and state reset');
  }

  getState(): SharedState {
    return this.stateManager.getState();
  }
} 