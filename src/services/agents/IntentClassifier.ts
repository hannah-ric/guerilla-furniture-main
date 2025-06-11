import { Agent, AgentConfig } from './base/Agent';
import { SharedState, IntentType, IntentClassification, IntentEntities, FurnitureType } from '@/lib/types';
import { openAIService } from '@/services/api/openai';
import { z } from 'zod';
import { AGENT_PROMPTS } from '@/lib/prompts';
import { Logger } from '@/lib/logger';

const IntentClassificationSchema = z.object({
  primary_intent: z.enum([
    'DESIGN_INITIATION',
    'DIMENSION_SPECIFICATION',
    'MATERIAL_SELECTION',
    'MATERIAL_SOURCING',
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
  private readonly furnitureKeywords = [
    'table', 'chair', 'desk', 'bookshelf', 'shelf', 'cabinet', 
    'dresser', 'nightstand', 'bench', 'stool', 'ottoman', 'bed',
    'furniture', 'build', 'make', 'create', 'design'
  ];

  private readonly dimensionKeywords = [
    'inch', 'inches', 'feet', 'foot', 'ft', 'cm', 'centimeter', 
    'mm', 'millimeter', 'wide', 'tall', 'high', 'deep', 'long', 
    'size', 'dimension', 'width', 'height', 'depth', 'measure'
  ];

  private readonly materialKeywords = [
    'wood', 'pine', 'oak', 'maple', 'walnut', 'plywood', 'mdf',
    'material', 'lumber', 'board', 'hardwood', 'softwood',
    'cheap', 'expensive', 'budget', 'premium', 'quality'
  ];
  
  private readonly sourcingKeywords = [
    'source', 'find', 'where', 'buy', 'purchase', 'cost', 'price',
    'available', 'availability', 'store', 'supplier', 'tool',
    'rent', 'rental', 'track', 'monitor', 'alternative', 'substitute',
    'home depot', 'lowes', 'hardware store', 'lumber yard'
  ];

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
      // First try rule-based classification for faster response
      const quickClassification = this.quickClassify(input, state);
      if (quickClassification && quickClassification.confidence === 'high') {
        this.logger.info('Quick classification successful', { 
          intent: quickClassification.primary_intent 
        });
        return this.createResponse(true, quickClassification, {
          confidence: 0.9,
          next_steps: quickClassification.suggested_next_intents,
          suggestions: quickClassification.clarification_prompts || []
        });
      }

      // Fall back to AI classification for complex inputs
      const aiClassification = await this.aiClassify(input, state);
      
      return this.createResponse(true, aiClassification, {
        confidence: aiClassification.confidence === 'high' ? 0.9 : 
                   aiClassification.confidence === 'medium' ? 0.7 : 0.5,
        next_steps: aiClassification.suggested_next_intents,
        suggestions: aiClassification.clarification_prompts || []
      });

    } catch (error) {
      this.logger.error('Intent classification failed', error);
      
      // Robust fallback
      return this.createResponse(true, this.getFallbackClassification(input), {
        confidence: 0.3,
        validation_issues: ['Failed to classify intent clearly']
      });
    }
  }

  private quickClassify(input: string, state: SharedState): IntentClassification | null {
    const lowerInput = input.toLowerCase();
    const hasDesign = !!state.design.furniture_type;

    // Design initiation patterns
    if (!hasDesign && this.furnitureKeywords.some(kw => lowerInput.includes(kw))) {
      return {
        primary_intent: IntentType.DESIGN_INITIATION,
        secondary_intents: [],
        confidence: 'high',
        entities: this.extractEntities(input),
        requires_clarification: false,
        suggested_next_intents: [
          IntentType.DIMENSION_SPECIFICATION,
          IntentType.MATERIAL_SELECTION
        ]
      };
    }

    // Material sourcing patterns - check before material selection
    if (this.sourcingKeywords.some(kw => lowerInput.includes(kw))) {
      // Check if it's about finding/buying materials or tools
      if (lowerInput.match(/\b(source|find|where|buy|purchase|cost|price)\b.*\b(material|lumber|wood|hardware|tool)/)) {
        return {
          primary_intent: IntentType.MATERIAL_SOURCING,
          secondary_intents: [],
          confidence: 'high',
          entities: this.extractEntities(input),
          requires_clarification: false,
          suggested_next_intents: [
            IntentType.EXPORT_REQUEST,
            IntentType.VALIDATION_CHECK
          ]
        };
      }
      
      // Tool rental patterns
      if (lowerInput.match(/\b(tool|rent|rental)\b/)) {
        return {
          primary_intent: IntentType.MATERIAL_SOURCING,
          secondary_intents: [],
          confidence: 'high',
          entities: this.extractEntities(input),
          requires_clarification: false,
          suggested_next_intents: [
            IntentType.EXPORT_REQUEST
          ]
        };
      }
      
      // Price tracking patterns
      if (lowerInput.match(/\b(track|monitor|alert|notify).*\b(price|cost)/)) {
        return {
          primary_intent: IntentType.MATERIAL_SOURCING,
          secondary_intents: [],
          confidence: 'high',
          entities: this.extractEntities(input),
          requires_clarification: false,
          suggested_next_intents: []
        };
      }
    }

    // Dimension specification patterns
    if (this.dimensionKeywords.some(kw => lowerInput.includes(kw))) {
      return {
        primary_intent: IntentType.DIMENSION_SPECIFICATION,
        secondary_intents: [],
        confidence: 'high',
        entities: this.extractEntities(input),
        requires_clarification: false,
        suggested_next_intents: [
          IntentType.MATERIAL_SELECTION,
          IntentType.JOINERY_METHOD
        ]
      };
    }

    // Material selection patterns
    if (this.materialKeywords.some(kw => lowerInput.includes(kw))) {
      return {
        primary_intent: IntentType.MATERIAL_SELECTION,
        secondary_intents: [],
        confidence: 'high',
        entities: this.extractEntities(input),
        requires_clarification: false,
        suggested_next_intents: [
          IntentType.JOINERY_METHOD,
          IntentType.MATERIAL_SOURCING,
          IntentType.VALIDATION_CHECK
        ]
      };
    }

    // Validation request patterns
    if (lowerInput.match(/\b(check|validate|verify|is it safe|will it work|strong enough)\b/)) {
      return {
        primary_intent: IntentType.VALIDATION_CHECK,
        secondary_intents: [],
        confidence: 'high',
        entities: {},
        requires_clarification: false,
        suggested_next_intents: [
          IntentType.MATERIAL_SOURCING,
          IntentType.EXPORT_REQUEST
        ]
      };
    }

    return null;
  }

  private async aiClassify(input: string, state: SharedState): Promise<IntentClassification> {
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
- MATERIAL_SOURCING: Finding where to buy materials, checking prices, tool rental, tracking prices
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
    
    const parsedData = IntentClassificationSchema.parse(JSON.parse(jsonMatch[0]));
    
    // Convert entities to proper types
    const entities: IntentEntities = {
      dimensions: parsedData.entities.dimensions,
      materials: parsedData.entities.materials,
      style: parsedData.entities.style,
      constraints: parsedData.entities.constraints,
      features: parsedData.entities.features
    };
    
    // Convert furniture_type to proper enum if present
    if (parsedData.entities.furniture_type) {
      // Check if the furniture type is valid
      const validFurnitureTypes = ['table', 'chair', 'bookshelf', 'cabinet', 'desk', 'bed', 'nightstand', 'dresser', 'bench', 'shelf', 'storage', 'other'];
      const furnitureType = parsedData.entities.furniture_type.toLowerCase();
      if (validFurnitureTypes.includes(furnitureType)) {
        entities.furniture_type = furnitureType as FurnitureType;
      }
    }
    
    // Convert string to IntentType enum
    const classification: IntentClassification = {
      primary_intent: IntentType[parsedData.primary_intent as keyof typeof IntentType],
      secondary_intents: parsedData.secondary_intents.map(intent => 
        IntentType[intent as keyof typeof IntentType]
      ),
      confidence: parsedData.confidence,
      entities,
      requires_clarification: parsedData.requires_clarification,
      clarification_prompts: parsedData.clarification_prompts,
      suggested_next_intents: parsedData.suggested_next_intents.map(intent => 
        IntentType[intent as keyof typeof IntentType]
      )
    };
    
    this.logger.info('AI intent classified', { 
      primary: classification.primary_intent,
      confidence: classification.confidence 
    });

    return classification;
  }

  private getFallbackClassification(input: string): IntentClassification {
    const suggestions = [
      "What type of furniture would you like to build?",
      "Could you describe your project in more detail?",
      "What are your main requirements?"
    ];

    // Try to extract any furniture type mentioned
    const entities = this.extractEntities(input);
    
    if (entities.furniture_type) {
      return {
        primary_intent: IntentType.DESIGN_INITIATION,
        secondary_intents: [],
        confidence: 'low',
        entities,
        requires_clarification: true,
        clarification_prompts: [
          `I see you want to build a ${entities.furniture_type}. What dimensions do you have in mind?`,
          "What material would you prefer?",
          "Do you have any specific features in mind?"
        ],
        suggested_next_intents: [IntentType.DIMENSION_SPECIFICATION]
      };
    }

    return {
      primary_intent: IntentType.CLARIFICATION_NEEDED,
      secondary_intents: [],
      confidence: 'low',
      entities: {},
      requires_clarification: true,
      clarification_prompts: suggestions,
      suggested_next_intents: [IntentType.DESIGN_INITIATION]
    };
  }

  private extractEntities(input: string): IntentEntities {
    const entities: IntentEntities = {};
    const lowerInput = input.toLowerCase();

    // Extract furniture type
    for (const furniture of this.furnitureKeywords) {
      if (lowerInput.includes(furniture) && furniture !== 'furniture' && furniture !== 'build' && furniture !== 'make' && furniture !== 'create' && furniture !== 'design') {
        // Check if it's a valid FurnitureType
        const validFurnitureTypes = ['table', 'chair', 'bookshelf', 'cabinet', 'desk', 'bed', 'nightstand', 'dresser', 'bench', 'shelf', 'storage', 'other'];
        if (validFurnitureTypes.includes(furniture)) {
          entities.furniture_type = furniture as FurnitureType;
          break;
        }
      }
    }

    // Extract dimensions (simplified)
    const dimensionPattern = /(\d+(?:\.\d+)?)\s*(inch|inches|"|in|feet|foot|ft|'|cm|mm)/gi;
    const matches = Array.from(input.matchAll(dimensionPattern));
    if (matches.length > 0) {
      entities.dimensions = matches.map(match => ({
        type: 'dimension',
        value: parseFloat(match[1]),
        unit: match[2]
      }));
    }

    // Extract materials
    const materialMatches = this.materialKeywords.filter(mat => 
      lowerInput.includes(mat) && !['material', 'lumber', 'board', 'cheap', 'expensive', 'budget', 'premium', 'quality'].includes(mat)
    );
    if (materialMatches.length > 0) {
      entities.materials = materialMatches;
    }

    return entities;
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

  async validate(state: SharedState) {
    // Intent classifier doesn't validate state
    return this.createResponse(true, { valid: true });
  }
} 