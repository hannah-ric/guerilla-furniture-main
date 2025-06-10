import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// Schemas for structured outputs
export const IntentClassificationSchema = z.object({
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
  secondary_intents: z.array(z.enum([
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
  ])),
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
  suggested_next_intents: z.array(z.enum([
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
  ]))
});

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface LLMResponse<T = any> {
  data: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  duration: number;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: any) => void;
  onError?: (error: Error) => void;
}

/**
 * OpenAI API service with streaming, structured outputs, and cost tracking
 */
export class OpenAIService {
  private client: OpenAI;
  private defaultConfig: LLMConfig = {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    streaming: false
  };
  
  // Cost per 1K tokens (as of 2024)
  private costPerThousand = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 }
  };

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // For MVP - move to backend in production
    });
  }

  /**
   * Make a structured LLM call with Zod schema validation
   */
  async structuredCall<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    config: Partial<LLMConfig> = {}
  ): Promise<LLMResponse<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that responds with valid JSON matching the provided schema.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError}`);
      }

      const validatedData = schema.parse(parsedData);
      const duration = Date.now() - startTime;

      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const estimatedCost = this.calculateCost(
        finalConfig.model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      return {
        data: validatedData,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCost
        },
        duration
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Make a streaming LLM call
   */
  async streamingCall(
    prompt: string,
    callbacks: StreamCallbacks,
    config: Partial<LLMConfig> = {}
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      const stream = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        stream: true
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          callbacks.onToken?.(content);
        }
      }
      
      callbacks.onComplete?.(fullResponse);
    } catch (error) {
      console.error('Streaming error:', error);
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
    }
  }

  /**
   * Make a simple completion call
   */
  async complete(
    prompt: string,
    config: Partial<LLMConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      const response = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received');
      }

      return content;
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw error;
    }
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs = this.costPerThousand[model as keyof typeof this.costPerThousand];
    if (!costs) {
      console.warn(`Unknown model for cost calculation: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimals
  }

  /**
   * Count tokens in a string (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get total cost for the session
   */
  private totalCost = 0;
  
  getTotalCost(): number {
    return this.totalCost;
  }

  resetCost(): void {
    this.totalCost = 0;
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
