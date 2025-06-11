import { Logger } from '@/lib/logger';
import { SharedStateManager } from '@/services/state/SharedStateManager';
import { CohesionCoordinator } from '@/services/cohesion/CohesionCoordinator';
import { CommunicationBus } from '@/services/communication/CommunicationBus';
import {
  IntentClassifier,
  DimensionAgent,
  MaterialAgent,
  JoineryAgent,
  ValidationAgent
} from '@/services/agents';
import { IntentType, AgentResponse, SharedState } from '@/lib/types';

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

    // Register agents
    this.agents.set('intent', intentClassifier);
    this.agents.set('dimension', dimensionAgent);
    this.agents.set('material', materialAgent);
    this.agents.set('joinery', joineryAgent);
    this.agents.set('validation', validationAgent);

    // Register with communication bus
    this.communicationBus.registerAgent(intentClassifier);
    this.communicationBus.registerAgent(dimensionAgent);
    this.communicationBus.registerAgent(materialAgent);
    this.communicationBus.registerAgent(joineryAgent);
    this.communicationBus.registerAgent(validationAgent);

    this.isInitialized = true;
    this.logger.info('Orchestrator initialized with all agents');
  }

  async processUserInput(input: string): Promise<{
    success: boolean;
    response: string;
    suggestions?: string[];
    validationResults?: Map<string, any>;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logger.info('Processing user input', { input: input.substring(0, 100) });

    try {
      const state = this.stateManager.getState();
      
      // Step 1: Classify intent
      const intentClassifier = this.agents.get('intent');
      const intentResult = await intentClassifier.process(input, state);
      
      if (!intentResult.success) {
        return {
          success: false,
          response: 'I had trouble understanding your request. Could you please rephrase it?',
          suggestions: intentResult.suggestions
        };
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
        harmonizationResult.conflicts
      );
      
      // Step 5: Run validation if design is complete enough
      if (this.shouldRunValidation(harmonizationResult.finalState)) {
        const validationAgent = this.agents.get('validation');
        const validationResult = await validationAgent.process('validate', harmonizationResult.finalState);
        
        if (validationResult.success) {
          this.stateManager.setValidationResult('ValidationAgent', validationResult.data);
        }
      }

      return {
        success: true,
        response: synthesis.response,
        suggestions: synthesis.suggestions,
        validationResults: this.stateManager.getState().validation_results
      };

    } catch (error) {
      this.logger.error('Orchestration failed', error);
      return {
        success: false,
        response: 'I encountered an error processing your request. Please try again.',
        suggestions: ['Try rephrasing your request', 'Make sure all required information is provided']
      };
    }
  }

  private async routeToAgents(
    intent: IntentType,
    input: string,
    state: SharedState
  ): Promise<Map<string, AgentResponse>> {
    const responses = new Map<string, AgentResponse>();

    switch (intent) {
      case IntentType.DESIGN_INITIATION: {
        // When starting a new design, we mainly extract any initial specs
        const agents = ['dimension', 'material'];
        for (const agentName of agents) {
          const agent = this.agents.get(agentName);
          if (await agent.canHandle(input, state)) {
            const response = await agent.process(input, state);
            responses.set(agentName, response);
          }
        }
        break;
      }

      case IntentType.DIMENSION_SPECIFICATION: {
        const dimensionAgent = this.agents.get('dimension');
        const dimResponse = await dimensionAgent.process(input, state);
        responses.set('dimension', dimResponse);
        break;
      }

      case IntentType.MATERIAL_SELECTION: {
        const materialAgent = this.agents.get('material');
        const matResponse = await materialAgent.process(input, state);
        responses.set('material', matResponse);
        break;
      }

      case IntentType.JOINERY_METHOD: {
        const joineryAgent = this.agents.get('joinery');
        const joinResponse = await joineryAgent.process(input, state);
        responses.set('joinery', joinResponse);
        break;
      }

      case IntentType.VALIDATION_CHECK: {
        const validationAgent = this.agents.get('validation');
        const valResponse = await validationAgent.process(input, state);
        responses.set('validation', valResponse);
        break;
      }

      default: {
        // For other intents, check which agents can handle
        for (const [name, agent] of this.agents.entries()) {
          if (name !== 'intent' && await agent.canHandle(input, state)) {
            const response = await agent.process(input, state);
            responses.set(name, response);
          }
        }
      }
    }

    return responses;
  }

  private synthesizeResponses(
    responses: Map<string, AgentResponse>,
    intent: IntentType,
    conflicts: any[] = []
  ): { response: string; suggestions: string[] } {
    const parts: string[] = [];
    const allSuggestions: string[] = [];

    // Collect all suggestions
    responses.forEach((response, agentName) => {
      if (response.suggestions) {
        allSuggestions.push(...response.suggestions);
      }
    });

    // Build response based on intent and agent responses
    if (intent === IntentType.DESIGN_INITIATION) {
      parts.push("Great! Let's design your furniture together.");
      
      const state = this.stateManager.getState();
      if (state.design.furniture_type) {
        parts.push(`I understand you want to build a ${state.design.furniture_type}.`);
      }
      
      parts.push("What dimensions would you like?");
    } else {
      // Generic synthesis
      responses.forEach((response, agentName) => {
        if (response.success && response.data) {
          const agentSummary = this.summarizeAgentResponse(agentName, response);
          if (agentSummary) {
            parts.push(agentSummary);
          }
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

    return {
      response: parts.join('\n\n') || 'I processed your request successfully.',
      suggestions: [...new Set(allSuggestions)].slice(0, 3) // Dedupe and limit
    };
  }

  private summarizeAgentResponse(agentName: string, response: AgentResponse): string {
    if (!response.data) return '';

    switch (agentName) {
      case 'dimension': {
        const dimData = response.data;
        if (dimData.total_dimensions) {
          const dims = dimData.total_dimensions;
          return `✅ Dimensions set: ${dims.width}" W × ${dims.height}" H × ${dims.depth}" D`;
        }
        break;
      }

      case 'material': {
        const matData = response.data;
        if (matData.primary_material) {
          return `✅ Material selected: ${matData.primary_material.name} (estimated cost: $${matData.primary_material.cost_estimate})`;
        }
        break;
      }

      case 'joinery': {
        const joinData = response.data;
        if (joinData.primary_method) {
          return `✅ Joinery method: ${joinData.primary_method.name} (strength: ${joinData.primary_method.strength}/10)`;
        }
        break;
      }

      case 'validation': {
        const valData = response.data;
        if (valData.is_valid) {
          return `✅ Design validated! Overall score: ${valData.overall_score}/100`;
        } else {
          return `❌ Design has issues that need addressing. Score: ${valData.overall_score}/100`;
        }
      }
    }

    return '';
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

  async reset(): Promise<void> {
    this.stateManager.reset();
    this.communicationBus.reset();
    this.logger.info('Orchestrator and state reset');
  }

  getState(): SharedState {
    return this.stateManager.getState();
  }
} 