import { useState, useEffect, useCallback } from 'react';
import { Message, FurnitureDesign } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

export function useFurnitureDesign() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Blueprint Buddy. I can help you design custom furniture. What would you like to build today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [design, setDesign] = useState<FurnitureDesign | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();

  // Simple send message function for MVP
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      // Simple mock response for MVP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm processing your request. The full AI system will be available in the complete version.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Design error:', error);
      
      toast({
        title: "Processing Error",
        description: "There was an issue processing your request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const reset = useCallback(async () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Blueprint Buddy. I can help you design custom furniture. What would you like to build today?",
      timestamp: new Date()
    }]);
    setDesign(null);
    setValidationResults(new Map());
  }, []);

  return {
    messages,
    design,
    isLoading,
    sendMessage,
    validationResults,
    reset
  };
}