import { z } from 'zod';
import { config } from '@/lib/config';
import { Logger } from '@/lib/logger';
import { API } from '@/lib/constants';
import { PerformanceMonitor } from '@/lib/performance';
import { ErrorHandler, ErrorCode, BlueprintError } from '@/lib/errors';

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

export class OpenAIService {
  private logger = Logger.createScoped('OpenAIService');
  private sessionId: string;
  private backendUrl: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.backendUrl = config.api.backend.url;
    
    this.logger.info('OpenAI service initialized', { 
      model: config.api.openai.model,
      backend: this.backendUrl
    });

    const apiKey = config.api.openai.key;
    if (!apiKey) {
      this.logger.error('OpenAI API key not configured');
      throw ErrorHandler.createError(
        ErrorCode.API_KEY_MISSING,
        'OpenAI API key is not configured',
        'Please add your OpenAI API key to use Blueprint Buddy. Set VITE_OPENAI_API_KEY in your environment.',
        {
          recoveryStrategies: [
            {
              action: 'guide',
              description: 'Follow the setup guide to configure your API key'
            }
          ]
        }
      );
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Make a request to the backend API
   */
  private async makeBackendRequest(endpoint: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(data)
      });

      if (response.status === 429) {
        throw ErrorHandler.createError(
          ErrorCode.API_RATE_LIMIT,
          'Backend rate limit exceeded',
          'Too many requests. Please wait a moment and try again.',
          {
            recoveryStrategies: [
              {
                action: 'retry',
                description: 'Wait 30 seconds and try again',
                implementation: async () => {
                  await new Promise(resolve => setTimeout(resolve, 30000));
                }
              }
            ]
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error?.includes('Session cost limit exceeded')) {
          throw ErrorHandler.createError(
            ErrorCode.SESSION_COST_LIMIT,
            'Session cost limit exceeded',
            'You\'ve reached the cost limit for this session. Please start a new session to continue.',
            {
              technicalDetails: errorData,
              recoveryStrategies: [
                {
                  action: 'reset',
                  description: 'Start a new session',
                  implementation: async () => {
                    await this.resetSession();
                  }
                }
              ]
            }
          );
        }

        throw ErrorHandler.createError(
          ErrorCode.API_CONNECTION_ERROR,
          `Backend request failed: ${response.status}`,
          'Failed to connect to backend service. Please ensure the backend server is running.',
          {
            technicalDetails: { status: response.status, errorData },
            isRecoverable: false
          }
        );
      }

      return await response.json();
    } catch (error) {
      // Handle connection refused errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw ErrorHandler.createError(
          ErrorCode.API_CONNECTION_ERROR,
          'Backend server not available',
          'Unable to connect to backend server. Please ensure the backend is running on port 3001.',
          {
            cause: error as Error,
            recoveryStrategies: [
              {
                action: 'guide',
                description: 'Start the backend server with: npm run backend'
              }
            ]
          }
        );
      }
      
      // Re-throw if already a BlueprintError
      if (error instanceof BlueprintError) {
        throw error;
      }
      
      // Handle other errors
      throw ErrorHandler.handle(error, 'Backend API request');
    }
  }

  /**
   * Generate conversational response
   */
  async generateResponse(userMessage: string, context?: string): Promise<string> {
    return PerformanceMonitor.measureAsync('generateResponse', async () => {
      try {
        const response = await this.makeBackendRequest('/api/chat', {
          message: userMessage,
          context,
          systemPrompt: 'You are Blueprint Buddy, a helpful AI assistant for furniture design. Help users create buildable furniture plans.'
        });

        this.logger.debug('Response generated', { 
          cost: response.usage?.cost, 
          tokens: response.usage?.totalTokens 
        });

        return response.response || 'I apologize, but I could not generate a response.';

      } catch (error) {
        this.logger.error('Failed to generate response', error);
        
        // Use centralized error handling
        const handledError = ErrorHandler.handle(error, 'generateResponse');
        
        // Return user-friendly message
        return handledError.userMessage;
      }
    });
  }

  /**
   * Agent-specific request with structured output
   */
  async generateAgentResponse(agentName: string, prompt: string): Promise<any> {
    return PerformanceMonitor.measureAsync('generateAgentResponse', async () => {
      try {
        const response = await this.makeBackendRequest(`/api/agent/${agentName}`, {
          prompt
        });

        this.logger.debug('Agent response generated', { 
          agent: agentName,
          usage: response.usage
        });

        return response.data;

      } catch (error) {
        this.logger.error('Failed to get agent response', error);
        
        // Use centralized error handling
        const handledError = ErrorHandler.handle(error, `getAgentResponse:${agentName}`);
        
        // For agent responses, we need to throw to maintain the contract
        throw handledError;
      }
    });
  }

  /**
   * Generate furniture design from natural language description
   * (Keeping for backward compatibility, but using backend)
   */
  async generateFurnitureDesign(request: FurnitureDesignRequest): Promise<LLMResponse<FurnitureDesignResponse>> {
    return PerformanceMonitor.measureAsync('generateFurnitureDesign', async () => {
      const prompt = this.buildDesignPrompt(request);

      try {
        const response = await this.makeBackendRequest('/api/agent/designer', {
          prompt,
          schema: FurnitureDesignSchema
        });

        // Validate with Zod
        const validatedData = FurnitureDesignSchema.parse(response.data);

        this.logger.info('Design generated', {
          type: validatedData.furniture_type,
          cost: response.usage?.cost
        });

        return {
          data: validatedData as FurnitureDesignResponse,
          usage: {
            promptTokens: response.usage?.promptTokens || 0,
            completionTokens: response.usage?.completionTokens || 0,
            totalTokens: response.usage?.totalTokens || 0,
            estimatedCost: response.usage?.cost || 0
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
   * Get usage statistics
   */
  async getUsageStats() {
    try {
      const response = await fetch(`${this.backendUrl}/api/session/stats`, {
        headers: {
          'X-Session-ID': this.sessionId
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      this.logger.error('Failed to get usage stats', error);
    }

    return {
      totalCost: 0,
      sessionCost: 0,
      requestCount: 0,
      averageCostPerRequest: 0
    };
  }

  /**
   * Reset session
   */
  async resetSession() {
    try {
      await this.makeBackendRequest('/api/session/reset', {});
      this.sessionId = this.generateSessionId();
      this.logger.info('Session reset');
    } catch (error) {
      this.logger.error('Failed to reset session', error);
    }
  }

  /**
   * Check if backend is healthy
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      return response.ok;
    } catch (error) {
      this.logger.error('Backend health check failed', error);
      return false;
    }
  }
}

// Singleton instance
export const openAIService = new OpenAIService();
