/**
 * Enterprise-grade error handling system for Blueprint Buddy
 * Provides consistent error codes, recovery strategies, and user-friendly messages
 */

import { Logger } from './logger';

const logger = Logger.createScoped('ErrorHandler');

/**
 * Standardized error codes for all Blueprint Buddy errors
 */
export enum ErrorCode {
  // API Errors (1xxx)
  API_KEY_MISSING = 1001,
  API_KEY_INVALID = 1002,
  API_RATE_LIMIT = 1003,
  API_QUOTA_EXCEEDED = 1004,
  API_CONNECTION_ERROR = 1005,
  API_TIMEOUT = 1006,
  API_INVALID_RESPONSE = 1007,
  
  // Validation Errors (2xxx)
  VALIDATION_DIMENSIONS = 2001,
  VALIDATION_MATERIALS = 2002,
  VALIDATION_STRUCTURE = 2003,
  VALIDATION_COST = 2004,
  VALIDATION_COMPLEXITY = 2005,
  
  // Design Errors (3xxx)
  DESIGN_INTENT_UNCLEAR = 3001,
  DESIGN_IMPOSSIBLE = 3002,
  DESIGN_UNSAFE = 3003,
  DESIGN_IMPRACTICAL = 3004,
  
  // 3D Model Errors (4xxx)
  MODEL_GENERATION_FAILED = 4001,
  MODEL_INVALID_GEOMETRY = 4002,
  MODEL_CSG_OPERATION_FAILED = 4003,
  MODEL_RENDERING_ERROR = 4004,
  
  // Session Errors (5xxx)
  SESSION_EXPIRED = 5001,
  SESSION_COST_LIMIT = 5002,
  SESSION_INVALID = 5003,
  
  // System Errors (9xxx)
  SYSTEM_UNKNOWN = 9001,
  SYSTEM_OUT_OF_MEMORY = 9002,
  SYSTEM_CONFIGURATION = 9003,
}

/**
 * Recovery strategies for different error scenarios
 */
export interface RecoveryStrategy {
  action: 'retry' | 'fallback' | 'notify' | 'reset' | 'guide';
  description: string;
  implementation?: () => void | Promise<void>;
}

/**
 * Extended error class with recovery strategies
 */
export class BlueprintError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly technicalDetails?: any;
  public readonly recoveryStrategies: RecoveryStrategy[];
  public readonly isRecoverable: boolean;
  public readonly timestamp: Date;
  
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    options?: {
      cause?: Error;
      technicalDetails?: any;
      recoveryStrategies?: RecoveryStrategy[];
      isRecoverable?: boolean;
    }
  ) {
    super(message);
    this.name = 'BlueprintError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalDetails = options?.technicalDetails;
    this.recoveryStrategies = options?.recoveryStrategies || this.getDefaultRecoveryStrategies(code);
    this.isRecoverable = options?.isRecoverable ?? true;
    this.timestamp = new Date();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BlueprintError);
    }
    
    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, BlueprintError.prototype);
  }
  
  private getDefaultRecoveryStrategies(code: ErrorCode): RecoveryStrategy[] {
    const strategies: Record<number, RecoveryStrategy[]> = {
      // API errors
      [ErrorCode.API_KEY_MISSING]: [
        {
          action: 'guide',
          description: 'Set up your OpenAI API key'
        }
      ],
      [ErrorCode.API_RATE_LIMIT]: [
        {
          action: 'retry',
          description: 'Wait a moment and try again'
        }
      ],
      [ErrorCode.API_QUOTA_EXCEEDED]: [
        {
          action: 'notify',
          description: 'Contact support or upgrade your plan'
        }
      ],
      
      // Validation errors
      [ErrorCode.VALIDATION_DIMENSIONS]: [
        {
          action: 'guide',
          description: 'Adjust dimensions to be within allowed limits'
        }
      ],
      [ErrorCode.VALIDATION_STRUCTURE]: [
        {
          action: 'fallback',
          description: 'Use recommended structural improvements'
        }
      ],
      
      // Design errors
      [ErrorCode.DESIGN_INTENT_UNCLEAR]: [
        {
          action: 'guide',
          description: 'Provide more specific details about your design'
        }
      ],
      [ErrorCode.DESIGN_UNSAFE]: [
        {
          action: 'fallback',
          description: 'Apply safety recommendations'
        }
      ],
      
      // Model errors
      [ErrorCode.MODEL_GENERATION_FAILED]: [
        {
          action: 'retry',
          description: 'Try regenerating the model'
        },
        {
          action: 'fallback',
          description: 'Use a simpler design'
        }
      ],
      
      // Session errors
      [ErrorCode.SESSION_COST_LIMIT]: [
        {
          action: 'reset',
          description: 'Start a new session'
        }
      ]
    };
    
    return strategies[code] || [
      {
        action: 'notify',
        description: 'An unexpected error occurred'
      }
    ];
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      recoveryStrategies: this.recoveryStrategies,
      isRecoverable: this.isRecoverable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  private static errorHistory: BlueprintError[] = [];
  private static readonly MAX_ERROR_HISTORY = 50;
  
  /**
   * Handle an error with appropriate logging and recovery
   */
  static handle(error: unknown, context?: string): BlueprintError {
    let blueprintError: BlueprintError;
    
    if (error instanceof BlueprintError) {
      blueprintError = error;
    } else if (error instanceof Error) {
      blueprintError = this.convertToBlueprint(error, context);
    } else {
      blueprintError = new BlueprintError(
        ErrorCode.SYSTEM_UNKNOWN,
        'Unknown error occurred',
        'An unexpected error occurred. Please try again.',
        {
          technicalDetails: { error, context }
        }
      );
    }
    
    // Log the error
    logger.error(`[${blueprintError.code}] ${blueprintError.message}`, {
      userMessage: blueprintError.userMessage,
      context,
      technicalDetails: blueprintError.technicalDetails,
      stack: blueprintError.stack
    });
    
    // Add to history
    this.addToHistory(blueprintError);
    
    // Execute automatic recovery if available
    this.attemptAutomaticRecovery(blueprintError);
    
    return blueprintError;
  }
  
  /**
   * Convert standard errors to BlueprintError
   */
  private static convertToBlueprint(error: Error, context?: string): BlueprintError {
    // API key errors
    if (error.message.includes('API key') || error.message.includes('apiKey')) {
      return new BlueprintError(
        ErrorCode.API_KEY_MISSING,
        error.message,
        'Please configure your OpenAI API key to use Blueprint Buddy.',
        { cause: error }
      );
    }
    
    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return new BlueprintError(
        ErrorCode.API_RATE_LIMIT,
        error.message,
        'Too many requests. Please wait a moment and try again.',
        { cause: error }
      );
    }
    
    // Quota errors
    if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
      return new BlueprintError(
        ErrorCode.API_QUOTA_EXCEEDED,
        error.message,
        'API quota exceeded. Please check your OpenAI account.',
        { cause: error }
      );
    }
    
    // Connection errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new BlueprintError(
        ErrorCode.API_CONNECTION_ERROR,
        error.message,
        'Connection error. Please check your internet connection.',
        { cause: error }
      );
    }
    
    // Validation errors
    if (error.message.includes('dimension') || error.message.includes('size')) {
      return new BlueprintError(
        ErrorCode.VALIDATION_DIMENSIONS,
        error.message,
        'Invalid dimensions. Please check the size constraints.',
        { cause: error }
      );
    }
    
    // Default conversion
    return new BlueprintError(
      ErrorCode.SYSTEM_UNKNOWN,
      error.message,
      'An error occurred. Please try again.',
      { cause: error, context }
    );
  }
  
  /**
   * Attempt automatic recovery for certain error types
   */
  private static attemptAutomaticRecovery(error: BlueprintError): void {
    const retryableErrors = [
      ErrorCode.API_TIMEOUT,
      ErrorCode.API_CONNECTION_ERROR,
      ErrorCode.MODEL_GENERATION_FAILED
    ];
    
    if (retryableErrors.includes(error.code)) {
      const retryStrategy = error.recoveryStrategies.find(s => s.action === 'retry');
      if (retryStrategy?.implementation) {
        logger.info('Attempting automatic recovery', { errorCode: error.code });
        retryStrategy.implementation().catch(e => {
          logger.error('Automatic recovery failed', e);
        });
      }
    }
  }
  
  /**
   * Add error to history for pattern analysis
   */
  private static addToHistory(error: BlueprintError): void {
    this.errorHistory.push(error);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_ERROR_HISTORY);
    }
    
    // Check for error patterns
    this.analyzeErrorPatterns();
  }
  
  /**
   * Analyze error patterns for proactive fixes
   */
  private static analyzeErrorPatterns(): void {
    const recentErrors = this.errorHistory.slice(-10);
    const errorCounts = new Map<ErrorCode, number>();
    
    recentErrors.forEach(error => {
      errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
    });
    
    // Alert on repeated errors
    errorCounts.forEach((count, code) => {
      if (count >= 3) {
        logger.warn('Repeated error pattern detected', { 
          errorCode: code, 
          count,
          suggestion: this.getPatternSuggestion(code)
        });
      }
    });
  }
  
  /**
   * Get suggestions for repeated error patterns
   */
  private static getPatternSuggestion(code: ErrorCode): string {
    const suggestions: Record<ErrorCode, string> = {
      [ErrorCode.API_KEY_MISSING]: 'User needs help setting up API key',
      [ErrorCode.API_RATE_LIMIT]: 'Consider implementing request queuing',
      [ErrorCode.VALIDATION_DIMENSIONS]: 'UI should better communicate size limits',
      [ErrorCode.MODEL_GENERATION_FAILED]: 'Model generator needs reliability improvements',
      [ErrorCode.SESSION_COST_LIMIT]: 'User may need guidance on session management'
    };
    
    return suggestions[code] || 'Monitor this error type closely';
  }
  
  /**
   * Get error history for debugging
   */
  static getErrorHistory(): BlueprintError[] {
    return [...this.errorHistory];
  }
  
  /**
   * Clear error history
   */
  static clearHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * Create a user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof BlueprintError) {
      return error.userMessage;
    }
    
    if (error instanceof Error) {
      const blueprintError = this.convertToBlueprint(error);
      return blueprintError.userMessage;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
  
  /**
   * Check if an error is recoverable
   */
  static isRecoverable(error: unknown): boolean {
    if (error instanceof BlueprintError) {
      return error.isRecoverable;
    }
    
    // Most errors are considered recoverable by default
    return true;
  }
  
  /**
   * Create error with context
   */
  static createError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    options?: Parameters<typeof BlueprintError.prototype.constructor>[3]
  ): BlueprintError {
    return new BlueprintError(code, message, userMessage, options);
  }
}

/**
 * Utility function for wrapping async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const handledError = ErrorHandler.handle(error, context);
    
    if (fallback !== undefined && handledError.isRecoverable) {
      logger.info(`Using fallback for ${context}`);
      return fallback;
    }
    
    throw handledError;
  }
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    return ErrorHandler.handle(error, context);
  };
  
  const getUserMessage = (error: unknown) => {
    return ErrorHandler.getUserMessage(error);
  };
  
  const isRecoverable = (error: unknown) => {
    return ErrorHandler.isRecoverable(error);
  };
  
  return {
    handleError,
    getUserMessage,
    isRecoverable,
    ErrorCode,
    BlueprintError
  };
} 