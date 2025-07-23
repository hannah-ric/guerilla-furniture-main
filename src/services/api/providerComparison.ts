import { config } from '@/lib/config';

export interface ProviderComparisonResult {
  results: {
    [provider: string]: {
      response?: string;
      responseTime: number;
      usage?: any;
      cost?: number;
      error?: string;
      provider: string;
    };
  };
  totalTime: number;
  comparison: {
    fastest: string | null;
    cheapest: string | null;
    recommendations: string[];
  };
}

export class ProviderComparisonService {
  private backendUrl: string;

  constructor() {
    this.backendUrl = config.api.backend.url;
  }

  async compareProviders(
    message: string,
    context?: string,
    systemPrompt?: string
  ): Promise<ProviderComparisonResult> {
    try {
      const response = await fetch(`${this.backendUrl}/api/chat/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Provider comparison failed: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('Provider comparison completed', {
        totalTime: result.totalTime,
        providers: Object.keys(result.results),
        fastest: result.comparison.fastest,
        cheapest: result.comparison.cheapest
      });

      return result;

    } catch (error) {
      console.error('Provider comparison failed', error);
      throw error;
    }
  }

  async getBestProvider(
    message: string,
    criteria: 'speed' | 'cost' | 'balanced' = 'balanced'
  ): Promise<string> {
    const comparison = await this.compareProviders(message);
    
    switch (criteria) {
      case 'speed':
        return comparison.comparison.fastest || 'openai';
      case 'cost':
        return comparison.comparison.cheapest || 'openai';
      case 'balanced':
        if (comparison.comparison.fastest === comparison.comparison.cheapest) {
          return comparison.comparison.fastest || 'openai';
        }
        return comparison.comparison.fastest || 'openai';
      default:
        return 'openai';
    }
  }
}

export const providerComparisonService = new ProviderComparisonService();
