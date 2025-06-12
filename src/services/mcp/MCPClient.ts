/**
 * MCP Client Implementation
 * Handles communication with MCP servers and provides integration with Blueprint Buddy
 */

import { SimpleEventEmitter } from '@/lib/SimpleEventEmitter';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPProvider,
  MCPResource,
  MCPSearchRequest,
  MCPSearchResponse,
  MCPSubscription,
  MCPEvent,
  MCPServiceRequest,
  MCPServiceResponse,
  MCPMessageType,
  MCPCapability,
  MCPResourceType,
  MCP_VERSION,
  MCP_DEFAULT_TIMEOUT,
  MCP_MAX_RETRIES,
  MCP_RETRY_DELAY,
  isMCPResponse
} from '@/lib/mcp-types';
import { Logger } from '@/lib/logger';
import { ErrorHandler, ErrorCode } from '@/lib/errors';
import { memoize } from '@/lib/performance';

interface MCPClientConfig {
  providers: MCPProvider[];
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxConcurrentRequests?: number;
  defaultTimeout?: number;
}

interface PendingRequest {
  resolve: (response: MCPResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  retries: number;
}

export class MCPClient extends SimpleEventEmitter {
  private logger = Logger.createScoped('MCPClient');
  private providers: Map<string, MCPProvider> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private subscriptions: Map<string, MCPSubscription> = new Map();
  private resourceCache: Map<string, { resource: MCPResource; expires: number }> = new Map();
  private config: Required<MCPClientConfig>;
  private isInitialized = false;
  
  // Memoized methods
  private searchResourcesMemoized = memoize(this._searchResources.bind(this));

  constructor(config: MCPClientConfig) {
    super();
    
    this.config = {
      providers: config.providers,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL ?? 300000, // 5 minutes
      maxConcurrentRequests: config.maxConcurrentRequests ?? 10,
      defaultTimeout: config.defaultTimeout ?? MCP_DEFAULT_TIMEOUT
    };
    
    // Register providers
    this.config.providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  /**
   * Initialize MCP client and connect to providers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.logger.info('Initializing MCP client', {
      providers: Array.from(this.providers.keys())
    });
    
    try {
      // Connect to each provider
      const connectionPromises = Array.from(this.providers.values()).map(provider =>
        this.connectToProvider(provider)
      );
      
      await Promise.allSettled(connectionPromises);
      
      this.isInitialized = true;
      this.emit('initialized');
      
      // Start cache cleanup interval
      if (this.config.cacheEnabled) {
        setInterval(() => this.cleanupCache(), 60000); // Every minute
      }
      
    } catch (error) {
      throw ErrorHandler.createError(
        ErrorCode.API_CONNECTION_ERROR,
        'Failed to initialize MCP client',
        'Unable to connect to external services. Some features may be unavailable.',
        { cause: error as Error }
      );
    }
  }

  /**
   * Connect to a specific provider
   */
  private async connectToProvider(provider: MCPProvider): Promise<void> {
    try {
      const ws = new WebSocket(provider.baseUrl);
      
      ws.onopen = () => {
        this.logger.info('Connected to provider', { providerId: provider.id });
        this.connections.set(provider.id, ws);
        
        // Send initial ping
        this.sendMessage(provider.id, {
          id: this.generateMessageId(),
          version: MCP_VERSION,
          type: MCPMessageType.PING,
          timestamp: new Date().toISOString(),
          source: 'blueprint-buddy',
          payload: {}
        });
      };
      
      ws.onmessage = (event) => {
        this.handleMessage(provider.id, JSON.parse(event.data));
      };
      
      ws.onerror = (error) => {
        this.logger.error('WebSocket error', { providerId: provider.id, error });
        this.emit('provider-error', { providerId: provider.id, error });
      };
      
      ws.onclose = () => {
        this.logger.info('Disconnected from provider', { providerId: provider.id });
        this.connections.delete(provider.id);
        
        // Attempt reconnection after delay
        setTimeout(() => {
          if (!this.connections.has(provider.id)) {
            this.connectToProvider(provider);
          }
        }, 5000);
      };
      
    } catch (error) {
      this.logger.error('Failed to connect to provider', {
        providerId: provider.id,
        error
      });
      throw error;
    }
  }

  /**
   * Send message to provider
   */
  private sendMessage(providerId: string, message: MCPMessage): void {
    const connection = this.connections.get(providerId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection to provider ${providerId}`);
    }
    
    connection.send(JSON.stringify(message));
    this.logger.debug('Message sent', {
      providerId,
      messageId: message.id,
      type: message.type
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(providerId: string, message: MCPMessage): void {
    this.logger.debug('Message received', {
      providerId,
      messageId: message.id,
      type: message.type
    });
    
    // Handle response to pending request
    if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
      const pending = this.pendingRequests.get(message.correlationId)!;
      clearTimeout(pending.timeout);
      
      if (isMCPResponse(message)) {
        if (message.status === 'error' && message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message);
        }
      }
      
      this.pendingRequests.delete(message.correlationId);
      return;
    }
    
    // Handle different message types
    switch (message.type) {
      case MCPMessageType.EVENT:
        this.handleEvent(providerId, message.payload as MCPEvent);
        break;
        
      case MCPMessageType.PONG:
        this.emit('pong', { providerId, timestamp: message.timestamp });
        break;
        
      default:
        this.logger.warn('Unhandled message type', { type: message.type });
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(providerId: string, event: MCPEvent): void {
    // Clear cache for updated resource
    const cacheKey = `${providerId}:${event.resourceId}`;
    this.resourceCache.delete(cacheKey);
    
    // Emit event for subscribers
    this.emit('resource-event', {
      providerId,
      event
    });
    
    // Check if we have active subscriptions for this event
    this.subscriptions.forEach((subscription, id) => {
      if (this.matchesSubscription(event, subscription)) {
        this.emit(`subscription:${id}`, event);
      }
    });
  }

  /**
   * Search for resources across providers
   */
  async searchResources(request: MCPSearchRequest): Promise<MCPSearchResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Use memoized version for better performance
    if (this.config.cacheEnabled && !request.includeRelated) {
      const cacheKey = JSON.stringify(request);
      return this.searchResourcesMemoized(cacheKey, request);
    }
    
    return this._searchResources('', request);
  }

  /**
   * Internal search implementation
   */
  private async _searchResources(
    cacheKey: string,
    request: MCPSearchRequest
  ): Promise<MCPSearchResponse> {
    // Get providers that support search capability
    const searchProviders = Array.from(this.providers.values())
      .filter(provider => provider.capabilities.includes(MCPCapability.SEARCH));
    
    if (searchProviders.length === 0) {
      return { resources: [] };
    }
    
    // Search across all providers in parallel
    const searchPromises = searchProviders.map(provider =>
      this.sendRequest(provider.id, {
        id: this.generateMessageId(),
        version: MCP_VERSION,
        type: MCPMessageType.SEARCH_RESOURCES,
        timestamp: new Date().toISOString(),
        source: 'blueprint-buddy',
        destination: provider.id,
        payload: request
      })
    );
    
    const responses = await Promise.allSettled(searchPromises);
    
    // Aggregate results
    const allResources: MCPResource[] = [];
    const facetMap = new Map<string, Map<string, number>>();
    
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status === 'success') {
        const searchResponse = result.value.payload as MCPSearchResponse;
        
        // Add provider info to resources
        searchResponse.resources.forEach(resource => {
          resource.metadata.provider = searchProviders[index].id;
          allResources.push(resource);
          
          // Cache resources if enabled
          if (this.config.cacheEnabled) {
            const cacheKey = `${searchProviders[index].id}:${resource.id}`;
            this.resourceCache.set(cacheKey, {
              resource,
              expires: Date.now() + this.config.cacheTTL
            });
          }
        });
        
        // Aggregate facets
        searchResponse.facets?.forEach(facet => {
          if (!facetMap.has(facet.field)) {
            facetMap.set(facet.field, new Map());
          }
          const fieldMap = facetMap.get(facet.field)!;
          
          facet.values.forEach(({ value, count }) => {
            fieldMap.set(value, (fieldMap.get(value) || 0) + count);
          });
        });
      }
    });
    
    // Sort resources by relevance (simplified)
    allResources.sort((a, b) => {
      // Prioritize exact matches
      if (request.query) {
        const aMatch = a.name.toLowerCase().includes(request.query.toLowerCase());
        const bMatch = b.name.toLowerCase().includes(request.query.toLowerCase());
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return 0;
    });
    
    // Apply pagination
    const start = request.pagination?.offset || 0;
    const limit = request.pagination?.limit || 20;
    const paginatedResources = allResources.slice(start, start + limit);
    
    // Convert facet map to array
    const facets = Array.from(facetMap.entries()).map(([field, values]) => ({
      field,
      values: Array.from(values.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    }));
    
    return {
      resources: paginatedResources,
      totalCount: allResources.length,
      facets,
      nextPageToken: start + limit < allResources.length 
        ? Buffer.from(`${start + limit}`).toString('base64')
        : undefined
    };
  }

  /**
   * Get a specific resource
   */
  async getResource(
    providerId: string,
    resourceId: string
  ): Promise<MCPResource | null> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cacheKey = `${providerId}:${resourceId}`;
      const cached = this.resourceCache.get(cacheKey);
      
      if (cached && cached.expires > Date.now()) {
        this.logger.debug('Cache hit', { providerId, resourceId });
        return cached.resource;
      }
    }
    
    try {
      const response = await this.sendRequest(providerId, {
        id: this.generateMessageId(),
        version: MCP_VERSION,
        type: MCPMessageType.GET_RESOURCE,
        timestamp: new Date().toISOString(),
        source: 'blueprint-buddy',
        destination: providerId,
        payload: { resourceId }
      });
      
      if (response.status === 'success' && response.payload) {
        const resource = response.payload as MCPResource;
        
        // Cache the resource
        if (this.config.cacheEnabled) {
          const cacheKey = `${providerId}:${resourceId}`;
          this.resourceCache.set(cacheKey, {
            resource,
            expires: Date.now() + this.config.cacheTTL
          });
        }
        
        return resource;
      }
      
      return null;
      
    } catch (error) {
      this.logger.error('Failed to get resource', { providerId, resourceId, error });
      return null;
    }
  }

  /**
   * Invoke a capability on a provider
   */
  async invokeCapability<T = any>(
    providerId: string,
    request: MCPServiceRequest
  ): Promise<MCPServiceResponse<T>> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    if (!provider.capabilities.includes(request.capability)) {
      throw new Error(`Provider ${providerId} does not support capability ${request.capability}`);
    }
    
    const response = await this.sendRequest(providerId, {
      id: this.generateMessageId(),
      version: MCP_VERSION,
      type: MCPMessageType.INVOKE_CAPABILITY,
      timestamp: new Date().toISOString(),
      source: 'blueprint-buddy',
      destination: providerId,
      payload: request
    });
    
    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Capability invocation failed');
    }
    
    return response.payload as MCPServiceResponse<T>;
  }

  /**
   * Subscribe to resource updates
   */
  async subscribe(subscription: Omit<MCPSubscription, 'id'>): Promise<string> {
    const subscriptionId = this.generateMessageId();
    const fullSubscription: MCPSubscription = {
      ...subscription,
      id: subscriptionId,
      active: true
    };
    
    this.subscriptions.set(subscriptionId, fullSubscription);
    
    // Send subscription request to relevant providers
    const relevantProviders = Array.from(this.providers.values())
      .filter(provider => {
        // Check if provider has resources we're interested in
        if (!subscription.resourceTypes) return true;
        // In real implementation, would check provider's resource catalog
        return true;
      });
    
    const subscribePromises = relevantProviders.map(provider =>
      this.sendRequest(provider.id, {
        id: this.generateMessageId(),
        version: MCP_VERSION,
        type: MCPMessageType.SUBSCRIBE,
        timestamp: new Date().toISOString(),
        source: 'blueprint-buddy',
        destination: provider.id,
        payload: fullSubscription
      })
    );
    
    await Promise.allSettled(subscribePromises);
    
    this.logger.info('Subscription created', { subscriptionId });
    return subscriptionId;
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;
    
    this.subscriptions.delete(subscriptionId);
    
    // Send unsubscribe request to all providers
    const unsubscribePromises = Array.from(this.providers.values()).map(provider =>
      this.sendRequest(provider.id, {
        id: this.generateMessageId(),
        version: MCP_VERSION,
        type: MCPMessageType.UNSUBSCRIBE,
        timestamp: new Date().toISOString(),
        source: 'blueprint-buddy',
        destination: provider.id,
        payload: { subscriptionId }
      })
    );
    
    await Promise.allSettled(unsubscribePromises);
    
    this.logger.info('Subscription removed', { subscriptionId });
  }

  /**
   * Send request and wait for response
   */
  private sendRequest(
    providerId: string,
    request: MCPRequest
  ): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      const messageId = request.id;
      const timeout = request.timeout || this.config.defaultTimeout;
      
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request timeout: ${request.type}`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        retries: 0
      });
      
      // Send request
      try {
        this.sendMessage(providerId, request);
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Check if event matches subscription
   */
  private matchesSubscription(event: MCPEvent, subscription: MCPSubscription): boolean {
    // Check resource type
    if (subscription.resourceTypes && 
        !subscription.resourceTypes.includes(event.resourceType)) {
      return false;
    }
    
    // Check resource ID
    if (subscription.resourceIds && 
        !subscription.resourceIds.includes(event.resourceId)) {
      return false;
    }
    
    // Check event type
    if (subscription.eventTypes && 
        !subscription.eventTypes.includes(event.type)) {
      return false;
    }
    
    // Check filters
    if (subscription.filters) {
      // Simplified filter matching - in real implementation would be more complex
      return true;
    }
    
    return true;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.resourceCache.forEach((entry, key) => {
      if (entry.expires <= now) {
        this.resourceCache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.logger.debug('Cache cleanup', { entriesCleaned: cleaned });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get list of connected providers
   */
  getConnectedProviders(): MCPProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => this.connections.has(provider.id));
  }

  /**
   * Disconnect from all providers
   */
  async disconnect(): Promise<void> {
    // Close all WebSocket connections
    this.connections.forEach((ws, providerId) => {
      ws.close();
      this.logger.info('Disconnected from provider', { providerId });
    });
    
    // Clear all state
    this.connections.clear();
    this.pendingRequests.clear();
    this.subscriptions.clear();
    this.resourceCache.clear();
    
    this.isInitialized = false;
    this.emit('disconnected');
  }
} 