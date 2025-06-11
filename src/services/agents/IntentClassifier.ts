import { Agent, AgentConfig } from './base/Agent';
import { SharedState, IntentType, IntentClassification } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';

const IntentClassificationSchema = z.object({
  primary_intent: z.enum([
    'DESIGN_INITIATION',
    'DIMENSION_SPECIFICATION',
    'MATERIAL_SELECTION',
    'JOINERY_METHOD',
    'VALIDATION_CHECK',
    'EXPORT_REQUEST',
    'MODIFICATION_REQUEST',
    'STYLE_AESTHETIC',
    'CONSTRAINT_SPECIFICATION',
    'CLARIFICATION_NEEDED'
  ]),
  secondary_intents: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  entities: z.object({
    furniture_type: z.string().optional(),
    dimensions: z.array(z.object({
      type: z.string(),
      value: z.number(),
      unit: z.string()
    })).optional(),
    materials: z.array(z.string()).optional(),
    style: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    features: z.array(z.string()).optional()
  }),
  requires_clarification: z.boolean(),
  clarification_prompts: z.array(z.string()).optional(),
  suggested_next_intents: z.array(z.string())
});

export class IntentClassifier extends Agent {
  constructor() {
    const config: AgentConfig = {
      name: 'IntentClassifier',
      description: 'Classifies user intent and routes to appropriate agents',
      interestedEvents: ['user_input', 'context_change'],
      capabilities: ['intent_classification', 'entity_extraction', 'routing']
    };
    super(config);
  }

  async canHandle(input: string, state: SharedState): Promise<boolean> {
    // Intent classifier handles all initial user inputs
    return true;
  }

  async process(input: string, state: SharedState) {
    this.logger.info('Classifying intent', { input: input.substring(0, 100) });

    try {
      const contextSummary = this.getContextSummary(state);
      
      const prompt = `
You are an intent classifier for a furniture design application. Analyze the user input and classify their intent.

Current Design Context:
${contextSummary}

User Input: "${input}"

Classify this input according to these furniture design intents:
- DESIGN_INITIATION: Starting a new furniture design (table, chair, shelf, etc.)
- DIMENSION_SPECIFICATION: Specifying size, measurements, or spatial requirements
- MATERIAL_SELECTION: Choosing wood types, materials, or discussing material properties
- JOINERY_METHOD: Selecting connection methods, joints, or assembly techniques
- STYLE_AESTHETIC: Defining visual style, appearance, or design aesthetic
- MODIFICATION_REQUEST: Changing existing design elements
- CONSTRAINT_SPECIFICATION: Budget, tools, space, or time limitations
- VALIDATION_CHECK: Checking feasibility, strength, or safety
- EXPORT_REQUEST: Generating outputs like cut lists, plans, or 3D models
- CLARIFICATION_NEEDED: Input is unclear and needs clarification

Extract any entities mentioned (furniture type, dimensions, materials, etc.).
Determine if clarification is needed and suggest follow-up questions if so.
Suggest logical next intents based on the current design state.

Respond with a JSON object matching the IntentClassificationSchema.`;

      const response = await openAIService.generateResponse(prompt);
      
      // Parse the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const classification = IntentClassificationSchema.parse(JSON.parse(jsonMatch[0]));
      
      this.logger.info('Intent classified', { 
        primary: classification.primary_intent,
        confidence: classification.confidence 
      });

      return this.createResponse(true, classification, {
        confidence: classification.confidence === 'high' ? 0.9 : 
                   classification.confidence === 'medium' ? 0.7 : 0.5,
        next_steps: classification.suggested_next_intents,
        suggestions: classification.clarification_prompts || []
      });

    } catch (error) {
      this.logger.error('Intent classification failed', error);
      
      // Fallback classification
      return this.createResponse(true, {
        primary_intent: IntentType.CLARIFICATION_NEEDED,
        secondary_intents: [],
        confidence: 'low',
        entities: {},
        requires_clarification: true,
        clarification_prompts: [
          "What type of furniture would you like to build?",
          "Could you describe your project in more detail?",
          "What are your main requirements?"
        ],
        suggested_next_intents: [IntentType.DESIGN_INITIATION]
      }, {
        confidence: 0.3,
        validation_issues: ['Failed to classify intent clearly']
      });
    }
  }

  async validate(state: SharedState) {
    // Intent classifier doesn't validate state
    return this.createResponse(true, { valid: true });
  }

  private getContextSummary(state: SharedState): string {
    const design = state.design;
    const parts = [];

    if (design.furniture_type) {
      parts.push(`Furniture Type: ${design.furniture_type}`);
    }
    if (design.dimensions) {
      parts.push(`Dimensions: ${design.dimensions.width}" x ${design.dimensions.height}" x ${design.dimensions.depth}"`);
    }
    if (design.materials?.length) {
      parts.push(`Materials: ${design.materials.map(m => m.type).join(', ')}`);
    }
    if (state.constraints.budget?.max_total_cost) {
      parts.push(`Budget: $${state.constraints.budget.max_total_cost}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No design started yet';
  }
} 