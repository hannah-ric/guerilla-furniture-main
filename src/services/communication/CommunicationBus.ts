import { Logger } from '@/lib/logger';
import { AgentMessage, MessageType } from '@/lib/types';
import { Agent } from '@/services/agents/base/Agent';

type MessageHandler = (message: AgentMessage) => Promise<void>;
type MessageFilter = (message: AgentMessage) => boolean;

interface Subscription {
  id: string;
  agentName: string;
  messageTypes: MessageType[];
  handler: MessageHandler;
  filter?: MessageFilter;
}

export class CommunicationBus {
  private static instance: CommunicationBus;
  private logger = Logger.createScoped('CommunicationBus');
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: AgentMessage[] = [];
  private isProcessing = false;
  private agents: Map<string, Agent> = new Map();

  private constructor() {
    this.logger.info('Communication bus initialized');
  }

  static getInstance(): CommunicationBus {
    if (!CommunicationBus.instance) {
      CommunicationBus.instance = new CommunicationBus();
    }
    return CommunicationBus.instance;
  }

  /**
   * Register an agent with the communication bus
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.config.name, agent);
    this.logger.info('Agent registered', { name: agent.config.name });
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    agentName: string,
    messageTypes: MessageType[],
    handler: MessageHandler,
    filter?: MessageFilter
  ): string {
    const subscriptionId = `${agentName}_${Date.now()}`;
    
    const subscription: Subscription = {
      id: subscriptionId,
      agentName,
      messageTypes,
      handler,
      filter
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    this.logger.debug('Subscription created', {
      id: subscriptionId,
      agent: agentName,
      types: messageTypes
    });
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    this.logger.debug('Subscription removed', { id: subscriptionId });
  }

  /**
   * Send a message
   */
  async send(message: AgentMessage): Promise<void> {
    this.logger.debug('Message sent', {
      from: message.from_agent,
      to: message.to_agent,
      type: message.type
    });
    
    // Add to queue
    this.messageQueue.push(message);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Broadcast a message to all interested agents
   */
  async broadcast(message: Omit<AgentMessage, 'to_agent'>): Promise<void> {
    const broadcastMessage: AgentMessage = {
      ...message,
      to_agent: '*',
      type: 'broadcast',
      id: `broadcast_${Date.now()}`,
      timestamp: new Date()
    };
    
    await this.send(broadcastMessage);
  }

  /**
   * Request-response pattern
   */
  async request<T = any>(
    from: string,
    to: string,
    payload: any,
    timeoutMs = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const messageId = `req_${Date.now()}`;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.unsubscribe(responseSubscriptionId);
        reject(new Error(`Request timeout: ${from} -> ${to}`));
      }, timeoutMs);
      
      // Subscribe to response
      const responseSubscriptionId = this.subscribe(
        from,
        ['response'],
        async (response) => {
          if (response.payload?.requestId === messageId) {
            clearTimeout(timeout);
            this.unsubscribe(responseSubscriptionId);
            resolve(response.payload.data);
          }
        }
      );
      
      // Send request
      const requestMessage: AgentMessage = {
        id: messageId,
        from_agent: from,
        to_agent: to,
        type: 'query',
        payload: {
          ...payload,
          requestId: messageId
        },
        timestamp: new Date(),
        requires_response: true,
        timeout_ms: timeoutMs
      };
      
      this.send(requestMessage);
    });
  }

  /**
   * Process message queue
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      
      try {
        await this.deliverMessage(message);
      } catch (error) {
        this.logger.error('Message delivery failed', {
          message: message.id,
          error
        });
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Deliver message to subscribers
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    const deliveries: Promise<void>[] = [];
    
    for (const subscription of this.subscriptions.values()) {
      // Check if subscription matches
      if (this.shouldDeliver(message, subscription)) {
        deliveries.push(
          this.handleDelivery(message, subscription)
        );
      }
    }
    
    // Wait for all deliveries
    await Promise.all(deliveries);
  }

  /**
   * Check if message should be delivered to subscription
   */
  private shouldDeliver(message: AgentMessage, subscription: Subscription): boolean {
    // Check message type
    if (!subscription.messageTypes.includes(message.type)) {
      return false;
    }
    
    // Check recipient
    if (message.to_agent !== '*' && 
        message.to_agent !== subscription.agentName) {
      return false;
    }
    
    // Apply custom filter
    if (subscription.filter && !subscription.filter(message)) {
      return false;
    }
    
    return true;
  }

  /**
   * Handle message delivery to subscription
   */
  private async handleDelivery(
    message: AgentMessage,
    subscription: Subscription
  ): Promise<void> {
    try {
      await subscription.handler(message);
      
      // Send response if required
      if (message.requires_response) {
        const agent = this.agents.get(subscription.agentName);
        if (agent) {
          const responsePayload = await this.generateResponse(agent, message);
          
          const response: AgentMessage = {
            id: `res_${Date.now()}`,
            from_agent: subscription.agentName,
            to_agent: message.from_agent,
            type: 'response',
            payload: {
              requestId: message.id,
              data: responsePayload
            },
            timestamp: new Date(),
            requires_response: false
          };
          
          // Send response without going through queue to avoid loops
          await this.deliverMessage(response);
        }
      }
    } catch (error) {
      this.logger.error('Handler execution failed', {
        subscription: subscription.id,
        message: message.id,
        error
      });
    }
  }

  /**
   * Generate response for a message
   */
  private async generateResponse(agent: Agent, message: AgentMessage): Promise<any> {
    // Simple response generation - can be extended
    return {
      success: true,
      agent: agent.config.name,
      processedAt: new Date()
    };
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear all subscriptions and reset
   */
  reset(): void {
    this.subscriptions.clear();
    this.messageQueue = [];
    this.agents.clear();
    this.isProcessing = false;
    this.logger.info('Communication bus reset');
  }
} 