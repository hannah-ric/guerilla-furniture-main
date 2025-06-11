import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Message, FurnitureDesign, ValidationResult } from '@/lib/types';
import { orchestrator } from '@/services/orchestrator';
import { useDebounce } from '@/lib/performance';
import { Logger } from '@/lib/logger';
import { UI } from '@/lib/constants';

interface UseFurnitureDesignReturn {
  messages: Message[];
  design: FurnitureDesign | null;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  reset: () => Promise<void>;
  validationResults: Map<string, ValidationResult>;
  error: Error | null;
  suggestions: string[];
  designProgress: number;
}

const logger = Logger.createScoped('useFurnitureDesign');

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: "Hi! I'm Blueprint Buddy. I can help you design custom furniture with my team of AI specialists. Tell me what you'd like to build! 🛠️",
  timestamp: new Date()
};

export function useFurnitureDesign(): UseFurnitureDesignReturn {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "I want to build a bookshelf",
    "Help me design a coffee table",
    "I need a desk for my home office"
  ]);
  const [designProgress, setDesignProgress] = useState(0);
  
  // Use ref to prevent re-initialization
  const isInitialized = useRef(false);
  const messageQueue = useRef<string[]>([]);
  const processingRef = useRef(false);

  // Initialize orchestrator on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      orchestrator.initialize().catch(error => {
        logger.error('Failed to initialize orchestrator:', error);
        setError(error);
      });
    }
  }, []);

  // Process message queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || messageQueue.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const content = messageQueue.current.shift()!;

    try {
      const result = await orchestrator.processUserInput(content);
      
      // Create assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        metadata: {
          suggestions: result.suggestions
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(result.suggestions || []);
      setDesignProgress(result.designProgress || 0);
      
      // Update validation results if available
      if (result.validationResults) {
        setValidationResults(new Map(result.validationResults));
      }
      
      setError(null);
      
    } catch (error) {
      logger.error('Design error:', error);
      setError(error as Error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error && error.message.includes('API key') 
          ? "Please configure your OpenAI API key to use Blueprint Buddy. You can set it as an environment variable: VITE_OPENAI_API_KEY=sk-your-key"
          : "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
      
      // Process next message if any
      if (messageQueue.current.length > 0) {
        processQueue();
      }
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || content.length > UI.MAX_MESSAGE_LENGTH) {
      return;
    }
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    // Queue message for processing
    messageQueue.current.push(content);
    processQueue();
  }, [processQueue]);

  const reset = useCallback(async () => {
    try {
      setMessages([INITIAL_MESSAGE]);
      setValidationResults(new Map());
      setSuggestions([
        "I want to build a bookshelf",
        "Help me design a coffee table", 
        "I need a desk for my home office"
      ]);
      setError(null);
      setDesignProgress(0);
      messageQueue.current = [];
      processingRef.current = false;
      
      // Reset orchestrator state
      await orchestrator.reset();
    } catch (error) {
      logger.error('Reset failed:', error);
      setError(error as Error);
    }
  }, []);

  // Get current design from orchestrator state
  const state = useMemo(() => orchestrator.getState(), [messages]);
  const design = state.design as FurnitureDesign | null;

  // Debounce design updates to prevent excessive re-renders
  const debouncedDesign = useDebounce(design, UI.DEBOUNCE_DELAY);

  return {
    messages,
    design: debouncedDesign,
    isLoading,
    sendMessage,
    reset,
    validationResults,
    error,
    suggestions,
    designProgress
  };
}