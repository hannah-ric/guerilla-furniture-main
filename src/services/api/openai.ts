import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '@/lib/config';
import { Logger } from '@/lib/logger';
import { API } from '@/lib/constants';
import { PerformanceMonitor } from '@/lib/performance';

// Core types for furniture design
export interface FurnitureDesignRequest {
  description: string;
  furnitureType?: string;
  dimensions?: string;
  materials?: string;
  style?: string;
}

export interface FurnitureDesignResponse {
  name: string;
  description: string;
  furniture_type: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  materials: string[];
  estimated_cost: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  build_time: string;
  features: string[];
}

// Zod schema for structured outputs
export const FurnitureDesignSchema = z.object({
  name: z.string().describe('Name of the furniture piece'),
  description: z.string().describe('Detailed description'),
  furniture_type: z.enum(['table', 'chair', 'bookshelf', 'cabinet', 'desk', 'bed', 'nightstand', 'dresser', 'bench', 'shelf']),
  dimensions: z.object({
    width: z.number().describe('Width in inches'),
    height: z.number().describe('Height in inches'),
    depth: z.number().describe('Depth in inches'),
    unit: z.literal('inches')
  }),
  materials: z.array(z.string()).describe('List of materials needed'),
  estimated_cost: z.number().describe('Estimated cost in USD'),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  build_time: z.string().describe('Estimated build time'),
  features: z.array(z.string()).describe('Key features of the design')
});

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

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.requests.push(now);
    return true;
  }
}

export class OpenAIService {
  private client: OpenAI;
  private totalCost = 0;
  private requestCount = 0;
  private logger = Logger.createScoped('OpenAIService');
  private rateLimiter = new RateLimiter(20, 60000); // 20 requests per minute
  private sessionCost = 0;

  // Cost tracking (per 1K tokens)
  private readonly costs = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };

  constructor() {
    const apiKey = config.api.openai.key;
    
    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.'
      );
    }

    /**
     * Security Note: Using dangerouslyAllowBrowser is only acceptable for MVP/prototype.
     * In production, all OpenAI API calls should be proxied through a backend service to:
     * 1. Keep the API key secure on the server
     * 2. Implement rate limiting and usage controls
     * 3. Add request validation and sanitization
     * 4. Enable proper authentication and authorization
     * 
     * TODO: Move to backend API proxy before production deployment
     */
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // ONLY FOR MVP - See security note above
    });

    this.logger.info('OpenAI service initialized', { 
      model: config.api.openai.model 
    });
  }

  /**
   * Generate furniture design from natural language description
   */
  async generateFurnitureDesign(request: FurnitureDesignRequest): Promise<LLMResponse<FurnitureDesignResponse>> {
    return PerformanceMonitor.measureAsync('generateFurnitureDesign', async () => {
      await this.checkCostLimit();
      await this.rateLimiter.checkLimit();

      const prompt = this.buildDesignPrompt(request);

      try {
        const response = await this.retryWithBackoff(async () => {
          return await this.client.chat.completions.create({
            model: config.api.openai.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert furniture designer and woodworker. Create detailed, buildable furniture designs based on user descriptions. Focus on practical, safe designs suitable for DIY builders.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            functions: [{
              name: 'create_furniture_design',
              description: 'Create a detailed furniture design',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Name of the furniture piece' },
                  description: { type: 'string', description: 'Detailed description' },
                  furniture_type: { 
                    type: 'string', 
                    enum: ['table', 'chair', 'bookshelf', 'cabinet', 'desk', 'bed', 'nightstand', 'dresser', 'bench', 'shelf'] 
                  },
                  dimensions: {
                    type: 'object',
                    properties: {
                      width: { type: 'number', description: 'Width in inches' },
                      height: { type: 'number', description: 'Height in inches' },
                      depth: { type: 'number', description: 'Depth in inches' },
                      unit: { type: 'string', enum: ['inches'] }
                    },
                    required: ['width', 'height', 'depth', 'unit']
                  },
                  materials: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of materials needed'
                  },
                  estimated_cost: { type: 'number', description: 'Estimated cost in USD' },
                  difficulty_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                  build_time: { type: 'string', description: 'Estimated build time' },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key features of the design'
                  }
                },
                required: ['name', 'description', 'furniture_type', 'dimensions', 'materials', 'estimated_cost', 'difficulty_level', 'build_time', 'features']
              }
            }],
            function_call: { name: 'create_furniture_design' },
            temperature: config.api.openai.temperature,
            max_tokens: Math.min(config.api.openai.maxTokens, API.TOKEN_LIMITS.OUTPUT)
          });
        });

        const usage = response.usage!;
        const cost = this.calculateCost(config.api.openai.model, usage.prompt_tokens, usage.completion_tokens);

        this.updateCostTracking(cost);

        const functionCall = response.choices[0].message.function_call;
        if (!functionCall || !functionCall.arguments) {
          throw new Error('No function call response received');
        }

        const designData = JSON.parse(functionCall.arguments);
        
        // Validate with Zod
        const validatedData = FurnitureDesignSchema.parse(designData);

        this.logger.info('Design generated', {
          type: validatedData.furniture_type,
          cost,
          duration: 0 // Will be set by PerformanceMonitor
        });

        return {
          data: validatedData as FurnitureDesignResponse,
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            estimatedCost: cost
          },
          duration: 0 // Will be set by PerformanceMonitor
        };

      } catch (error) {
        this.logger.error('Failed to generate furniture design', error);
        throw new Error(`Failed to generate furniture design: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Generate conversational response
   */
  async generateResponse(userMessage: string, context?: string): Promise<string> {
    return PerformanceMonitor.measureAsync('generateResponse', async () => {
      await this.checkCostLimit();
      await this.rateLimiter.checkLimit();

      try {
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: 'You are Blueprint Buddy, a helpful AI assistant for furniture design. Help users create buildable furniture plans.'
          }
        ];

        if (context) {
          messages.push({
            role: 'system',
            content: `Current design context: ${context}`
          });
        }

        // Trim message if too long
        const trimmedMessage = userMessage.length > API.TOKEN_LIMITS.INPUT 
          ? userMessage.substring(0, API.TOKEN_LIMITS.INPUT) + '...'
          : userMessage;

        messages.push({
          role: 'user',
          content: trimmedMessage
        });

        const response = await this.retryWithBackoff(async () => {
          return await this.client.chat.completions.create({
            model: config.api.openai.model,
            messages,
            temperature: config.api.openai.temperature,
            max_tokens: Math.min(config.api.openai.maxTokens, API.TOKEN_LIMITS.OUTPUT)
          });
        });

        const usage = response.usage!;
        const cost = this.calculateCost(config.api.openai.model, usage.prompt_tokens, usage.completion_tokens);
        this.updateCostTracking(cost);

        this.logger.debug('Response generated', { cost, tokens: usage.total_tokens });

        return response.choices[0].message.content || 'I apologize, but I could not generate a response.';

      } catch (error) {
        this.logger.error('Failed to generate response', error);
        
        if (error instanceof Error && error.message.includes('Rate limit')) {
          return 'I\'m receiving too many requests. Please wait a moment and try again.';
        }
        
        return 'I apologize, but I encountered an error. Please try again.';
      }
    });
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = API.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries - 1) {
          throw error;
        }
        
        const delay = API.RETRY_DELAY * Math.pow(2, i);
        this.logger.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Check cost limit
   */
  private async checkCostLimit(): Promise<void> {
    if (this.sessionCost >= API.COST_LIMIT_PER_SESSION) {
      throw new Error(`Session cost limit of $${API.COST_LIMIT_PER_SESSION} exceeded. Please start a new session.`);
    }
  }

  /**
   * Update cost tracking
   */
  private updateCostTracking(cost: number): void {
    this.totalCost += cost;
    this.sessionCost += cost;
    this.requestCount++;
  }

  /**
   * Build furniture design prompt
   */
  private buildDesignPrompt(request: FurnitureDesignRequest): string {
    let prompt = `Create a detailed furniture design based on this description: "${request.description}"\n\n`;

    if (request.furnitureType) {
      prompt += `Furniture type: ${request.furnitureType}\n`;
    }

    if (request.dimensions) {
      prompt += `Dimensions: ${request.dimensions}\n`;
    }

    if (request.materials) {
      prompt += `Preferred materials: ${request.materials}\n`;
    }

    if (request.style) {
      prompt += `Style: ${request.style}\n`;
    }

    prompt += `
Requirements:
- Provide ergonomic dimensions appropriate for the furniture type
- Use common woodworking materials (pine, oak, plywood, etc.)
- Estimate realistic costs based on current lumber prices
- Ensure the design is structurally sound and buildable
- Include practical features that add value
- Match the difficulty level to the complexity of the design

Please create a complete furniture design with all required details.`;

    return prompt;
  }

  /**
   * Calculate API cost
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelCost = this.costs[model as keyof typeof this.costs] || this.costs['gpt-3.5-turbo'];
    return (inputTokens / 1000) * modelCost.input + (outputTokens / 1000) * modelCost.output;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      totalCost: this.totalCost,
      sessionCost: this.sessionCost,
      requestCount: this.requestCount,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0
    };
  }

  /**
   * Reset session usage
   */
  resetSession() {
    this.sessionCost = 0;
    this.logger.info('Session cost reset');
  }

  /**
   * Reset all usage
   */
  resetUsage() {
    this.totalCost = 0;
    this.sessionCost = 0;
    this.requestCount = 0;
    this.logger.info('Usage stats reset');
  }
}

// Singleton instance
export const openAIService = new OpenAIService();
