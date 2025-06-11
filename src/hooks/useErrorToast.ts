/**
 * Hook for integrating error handling with toast notifications
 * Provides a seamless way to handle errors and show user-friendly messages
 */

import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler, BlueprintError, ErrorCode } from '@/lib/errors';
import { Logger } from '@/lib/logger';

const logger = Logger.createScoped('useErrorToast');

interface ErrorToastOptions {
  showRecoveryActions?: boolean;
  fallbackMessage?: string;
  duration?: number;
}

export function useErrorToast() {
  const { toast } = useToast();
  const { handleError, getUserMessage, isRecoverable } = useErrorHandler();

  /**
   * Show error toast with appropriate styling and actions
   */
  const showErrorToast = useCallback((
    error: unknown,
    context?: string,
    options?: ErrorToastOptions
  ) => {
    const handledError = handleError(error, context);
    const isRecoverableError = isRecoverable(handledError);
    
    // Determine toast variant based on error severity
    const variant = isRecoverableError ? 'default' : 'destructive';
    
    // Build description with recovery actions if available
    let description = getUserMessage(handledError);
    
    if (options?.showRecoveryActions && handledError instanceof BlueprintError) {
      const recoveryActions = handledError.recoveryStrategies
        .filter(s => s.action === 'guide' || s.action === 'retry')
        .map(s => s.description);
        
      if (recoveryActions.length > 0) {
        description += '\n\n' + recoveryActions.join('\n');
      }
    }
    
    // Show toast
    const toastId = toast({
      title: getErrorTitle(handledError),
      description,
      variant,
      duration: options?.duration || (isRecoverableError ? 5000 : 10000),
    });
    
    // Log the error
    logger.error('Error shown to user', {
      error: handledError,
      context,
      toastId
    });
    
    // Handle automatic recovery if available
    if (handledError instanceof BlueprintError) {
      const retryStrategy = handledError.recoveryStrategies.find(s => s.action === 'retry');
      if (retryStrategy?.implementation) {
        // Add retry button to toast
        setTimeout(() => {
          toast({
            title: 'Retry available',
            description: 'Would you like to retry the operation?',
            variant: 'default',
            action: {
              label: 'Retry',
              onClick: async () => {
                try {
                  await retryStrategy.implementation!();
                  toast({
                    title: 'Success',
                    description: 'Operation completed successfully',
                    variant: 'success'
                  });
                } catch (retryError) {
                  showErrorToast(retryError, 'Retry attempt');
                }
              }
            }
          });
        }, 1000);
      }
    }
    
    return handledError;
  }, [handleError, getUserMessage, isRecoverable, toast]);

  /**
   * Show success toast after error recovery
   */
  const showSuccessToast = useCallback((
    message: string,
    description?: string
  ) => {
    toast({
      title: message,
      description,
      variant: 'success',
      duration: 3000
    });
  }, [toast]);

  /**
   * Wrap an async operation with error handling and toast notifications
   */
  const withErrorToast = useCallback(async <T,>(
    operation: () => Promise<T>,
    context: string,
    options?: ErrorToastOptions & { onSuccess?: (result: T) => void }
  ): Promise<T | undefined> => {
    try {
      const result = await operation();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      showErrorToast(error, context, options);
      return undefined;
    }
  }, [showErrorToast]);

  /**
   * Check if an error code matches
   */
  const isErrorCode = useCallback((
    error: unknown,
    code: ErrorCode
  ): boolean => {
    if (error instanceof BlueprintError) {
      return error.code === code;
    }
    return false;
  }, []);

  return {
    showErrorToast,
    showSuccessToast,
    withErrorToast,
    isErrorCode,
    ErrorCode
  };
}

/**
 * Get appropriate title for error toast
 */
function getErrorTitle(error: unknown): string {
  if (error instanceof BlueprintError) {
    // Map error codes to user-friendly titles
    const titles: Partial<Record<ErrorCode, string>> = {
      [ErrorCode.API_KEY_MISSING]: 'API Key Required',
      [ErrorCode.API_KEY_INVALID]: 'Invalid API Key',
      [ErrorCode.API_RATE_LIMIT]: 'Too Many Requests',
      [ErrorCode.API_QUOTA_EXCEEDED]: 'Quota Exceeded',
      [ErrorCode.API_CONNECTION_ERROR]: 'Connection Error',
      [ErrorCode.API_TIMEOUT]: 'Request Timeout',
      [ErrorCode.VALIDATION_DIMENSIONS]: 'Invalid Dimensions',
      [ErrorCode.VALIDATION_MATERIALS]: 'Invalid Materials',
      [ErrorCode.VALIDATION_STRUCTURE]: 'Structural Issue',
      [ErrorCode.VALIDATION_COST]: 'Cost Limit Exceeded',
      [ErrorCode.DESIGN_INTENT_UNCLEAR]: 'Clarification Needed',
      [ErrorCode.DESIGN_IMPOSSIBLE]: 'Design Not Possible',
      [ErrorCode.DESIGN_UNSAFE]: 'Safety Concern',
      [ErrorCode.MODEL_GENERATION_FAILED]: '3D Model Error',
      [ErrorCode.MODEL_INVALID_GEOMETRY]: 'Invalid Geometry',
      [ErrorCode.MODEL_CSG_OPERATION_FAILED]: 'Joinery Error',
      [ErrorCode.SESSION_EXPIRED]: 'Session Expired',
      [ErrorCode.SESSION_COST_LIMIT]: 'Cost Limit Reached',
      [ErrorCode.SYSTEM_UNKNOWN]: 'Unexpected Error'
    };
    
    return titles[error.code] || 'Error';
  }
  
  return 'Error';
}

/**
 * Example usage in a component:
 * 
 * const { showErrorToast, withErrorToast } = useErrorToast();
 * 
 * // Option 1: Manual error handling
 * try {
 *   await someOperation();
 * } catch (error) {
 *   showErrorToast(error, 'Operation failed', {
 *     showRecoveryActions: true
 *   });
 * }
 * 
 * // Option 2: Wrapped operation
 * const result = await withErrorToast(
 *   () => someOperation(),
 *   'Performing operation',
 *   {
 *     onSuccess: () => showSuccessToast('Operation completed!')
 *   }
 * );
 */ 