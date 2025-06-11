import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Message } from '@/lib/types';

interface Props {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  suggestions?: string[];
  designProgress?: number;
}

const ProgressIndicator = React.memo(({ progress }: { progress: number }) => {
  const steps = [
    { name: 'Type', completed: progress >= 20 },
    { name: 'Size', completed: progress >= 40 },
    { name: 'Material', completed: progress >= 60 },
    { name: 'Joinery', completed: progress >= 80 },
    { name: 'Validated', completed: progress >= 100 }
  ];

  return (
    <div className="px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Design Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="mt-2 flex gap-1">
        {steps.map((step, index) => (
          <div key={step.name} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${
              step.completed ? 'bg-primary' : 'bg-muted'
            }`} />
            <div className={`mt-1 text-[10px] text-center transition-colors ${
              step.completed ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ProgressIndicator.displayName = 'ProgressIndicator';

export function DesignChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  suggestions,
  designProgress = 0 
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {designProgress > 0 && (
        <ProgressIndicator progress={designProgress} />
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput 
        onSend={onSendMessage} 
        disabled={isLoading}
        suggestions={suggestions}
      />
    </div>
  );
}