/**
 * Central configuration for Blueprint Buddy
 * All environment variables and settings should be accessed through this module
 */

export const config = {
  // API Configuration
  api: {
    openai: {
      // Note: API key is handled by backend for security
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.7,
    },
    anthropic: {
      // Note: API key is handled by backend for security
      model: 'claude-3-haiku-20240307',
      maxTokens: 1000,
      temperature: 0.7,
    },
    backend: {
      url: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    },
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
  },

  // App Configuration
  app: {
    name: 'Blueprint Buddy',
    version: '0.1.0',
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  },

  // Feature Flags
  features: {
    supabaseIntegration: !!import.meta.env.VITE_SUPABASE_URL,
    advancedValidation: true,
    costEstimation: true,
    pdfExport: true,
    userAuthentication: false, // Coming soon
    backend: true, // Use backend API for OpenAI calls
    anthropicIntegration: true, // Enable Anthropic provider
    providerComparison: true, // Enable A/B testing
  },

  // Design Constraints
  constraints: {
    maxDimensions: {
      width: 120, // inches
      height: 96, // inches
      depth: 48, // inches
    },
    minDimensions: {
      width: 6, // inches
      height: 6, // inches
      depth: 6, // inches
    },
    maxCost: 10000, // USD
    defaultSafetyFactor: 2.5,
  },

  // UI Configuration
  ui: {
    toastDuration: 5000, // ms
    animationDuration: 200, // ms
    maxSuggestions: 3,
    maxMessageLength: 1000,
  },

  // Development Settings
  development: {
    enableLogging: import.meta.env.DEV,
    enableDebugPanel: import.meta.env.DEV,
    mockApiResponses: false,
  },
} as const;

// Validation to ensure required environment variables are set
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.features.backend && !config.api.backend.url) {
    errors.push('Backend URL is not configured (VITE_BACKEND_URL)');
  }

  if (config.features.supabaseIntegration && (!config.api.supabase.url || !config.api.supabase.anonKey)) {
    errors.push('Supabase configuration is incomplete');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}  