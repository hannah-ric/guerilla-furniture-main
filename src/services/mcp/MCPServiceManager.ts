/**
 * MCP Service Manager
 * Integrates MCP capabilities with Blueprint Buddy's agent architecture
 */

import { MCPClient } from './MCPClient';
import { DEFAULT_MCP_PROVIDERS } from './providers';
import {
  MCPProvider,
  MCPResourceType,
  MCPCapability,
  LumberResource,
  HardwareResource,
  MCPSearchRequest,
  MCPSearchResponse,
  MCPFilter,
  MCPContext,
  MCPServiceRequest,
  isLumberResource,
  isHardwareResource
} from '@/lib/mcp-types';
import { BuildPlan, Material, ValidationResult } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { ErrorHandler, ErrorCode } from '@/lib/errors';

export class MCPServiceManager {
  private logger = Logger.createScoped('MCPServiceManager');
  private mcpClient: MCPClient;
  private userContext: MCPContext = {};
  
  constructor(providers: MCPProvider[] = DEFAULT_MCP_PROVIDERS) {
    this.mcpClient = new MCPClient({
      providers,
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxConcurrentRequests: 10
    });
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initialize the MCP service
   */
  async initialize(): Promise<void> {
    try {
      await this.mcpClient.initialize();
      this.logger.info('MCP Service Manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Service Manager', { error });
      // Don't throw - allow app to work without MCP
    }
  }
  
  /**
   * Set user context for personalized results
   */
  setUserContext(context: Partial<MCPContext>): void {
    this.userContext = { ...this.userContext, ...context };
    this.logger.debug('User context updated', { context: this.userContext });
  }
  
  /**
   * Find materials for a build plan
   */
  async findMaterialsForPlan(
    buildPlan: BuildPlan,
    options?: {
      preferredProviders?: string[];
      maxDistanceMiles?: number;
      includePricing?: boolean;
      includeAlternatives?: boolean;
    }
  ): Promise<MaterialSearchResult> {
    const results: MaterialSearchResult = {
      materials: [],
      totalCost: 0,
      availability: 'available',
      warnings: [],
      alternatives: {}
    };
    
    try {
      // Search for each material in the build plan
      const materialPromises = buildPlan.materials.map(async (material) => {
        const searchResults = await this.searchMaterial(material, options);
        
        if (searchResults.length === 0) {
          results.warnings.push(`Could not find: ${material.name}`);
          results.availability = 'partial';
        } else {
          const bestMatch = searchResults[0];
          results.materials.push({
            ...material,
            sourceResource: bestMatch,
            price: this.extractPrice(bestMatch),
            availability: this.extractAvailability(bestMatch)
          });
          
          // Add alternatives if requested
          if (options?.includeAlternatives && searchResults.length > 1 && material.name) {
            results.alternatives[material.name] = searchResults.slice(1, 4);
          }
        }
      });
      
      await Promise.all(materialPromises);
      
      // Calculate total cost if pricing included
      if (options?.includePricing) {
        results.totalCost = results.materials.reduce((sum, mat) => 
          sum + (mat.price?.amount || 0) * (mat.quantity || 1), 0
        );
      }
      
      // Check overall availability
      const unavailable = results.materials.filter(m => 
        !m.availability || !m.availability.in_stock
      );
      if (unavailable.length > 0) {
        results.availability = unavailable.length === results.materials.length 
          ? 'unavailable' 
          : 'partial';
      }
      
    } catch (error) {
      this.logger.error('Failed to find materials for plan', { error });
      results.warnings.push('Some materials could not be searched due to service issues');
    }
    
    return results;
  }
  
  /**
   * Search for a specific material
   */
  private async searchMaterial(
    material: Material,
    options?: {
      preferredProviders?: string[];
      maxDistanceMiles?: number;
    }
  ): Promise<(LumberResource | HardwareResource)[]> {
    // Determine resource type based on material type
    const resourceType = material.type === 'lumber' 
      ? MCPResourceType.LUMBER 
      : MCPResourceType.HARDWARE;
    
    // Build search filters
    const filters: MCPFilter[] = [];
    
    if (material.type === 'lumber') {
      // Add lumber-specific filters
      if (material.species) {
        filters.push({
          field: 'attributes.species',
          operator: 'eq',
          value: material.species
        });
      }
      
      // Convert dimensions to search filters
      if (material.dimensions) {
        const dims = this.parseDimensions(material.dimensions);
        if (dims) {
          filters.push(
            { field: 'attributes.dimensions.thickness', operator: 'eq', value: dims.thickness },
            { field: 'attributes.dimensions.width', operator: 'eq', value: dims.width }
          );
          
          // For length, allow longer pieces that can be cut
          if (dims.length) {
            filters.push({
              field: 'attributes.dimensions.length',
              operator: 'gte',
              value: dims.length
            });
          }
        }
      }
    } else {
      // Hardware filters based on material properties
      if (material.name && material.name.toLowerCase().includes('screw')) {
        filters.push({
          field: 'attributes.category',
          operator: 'eq',
          value: 'fasteners'
        });
      }
    }
    
    // Create search request
    const searchRequest: MCPSearchRequest = {
      query: material.name,
      filters,
      resourceTypes: [resourceType],
      pagination: { limit: 10 },
      includeRelated: true
    };
    
    // Execute search
    const response = await this.mcpClient.searchResources(searchRequest);
    
    // Filter and sort results
    const validResources = response.resources.filter(resource => {
      if (isLumberResource(resource) && material.type === 'lumber') {
        return true;
      }
      if (isHardwareResource(resource) && material.type !== 'lumber') {
        return true;
      }
      return false;
    }) as (LumberResource | HardwareResource)[];
    
    // Sort by relevance and price
    validResources.sort((a, b) => {
      // Prefer in-stock items
      if (a.attributes.availability.in_stock !== b.attributes.availability.in_stock) {
        return a.attributes.availability.in_stock ? -1 : 1;
      }
      
      // Then by price
      const priceA = a.attributes.price.amount;
      const priceB = b.attributes.price.amount;
      return priceA - priceB;
    });
    
    return validResources;
  }
  
  /**
   * Check tool availability for a build plan
   */
  async checkToolAvailability(
    buildPlan: BuildPlan,
    options?: {
      rentalDuration: 'hour' | 'day' | 'week';
      pickupDate?: Date;
    }
  ): Promise<ToolAvailabilityResult> {
    const requiredTools = this.extractRequiredTools(buildPlan);
    const result: ToolAvailabilityResult = {
      tools: [],
      totalRentalCost: 0,
      allAvailable: true
    };
    
    try {
      // Search for each required tool
      const toolPromises = requiredTools.map(async (toolName) => {
        const searchResponse = await this.mcpClient.searchResources({
          query: toolName,
          resourceTypes: [MCPResourceType.TOOLS],
          pagination: { limit: 5 }
        });
        
        if (searchResponse.resources.length > 0) {
          const tool = searchResponse.resources[0];
          const availability = await this.checkResourceAvailability(
            tool.metadata.provider,
            tool.id,
            options?.pickupDate
          );
          
          result.tools.push({
            name: toolName,
            resource: tool,
            available: availability.available,
            rentalPrice: availability.price,
            locations: availability.locations
          });
          
          if (!availability.available) {
            result.allAvailable = false;
          }
          
          if (availability.price && options?.rentalDuration) {
            result.totalRentalCost += this.calculateRentalCost(
              availability.price,
              options.rentalDuration
            );
          }
        } else {
          result.tools.push({
            name: toolName,
            available: false,
            locations: []
          });
          result.allAvailable = false;
        }
      });
      
      await Promise.all(toolPromises);
      
    } catch (error) {
      this.logger.error('Failed to check tool availability', { error });
      result.allAvailable = false;
    }
    
    return result;
  }
  
  /**
   * Get pricing for custom cuts
   */
  async getCustomCutPricing(
    lumber: LumberResource,
    cuts: CutSpecification[]
  ): Promise<CustomCutQuote> {
    try {
      const response = await this.mcpClient.invokeCapability<CustomCutQuote>(
        lumber.metadata.provider,
        {
          capability: MCPCapability.CUSTOM_CUT,
          parameters: {
            resourceId: lumber.id,
            cuts: cuts.map(cut => ({
              length: cut.length,
              quantity: cut.quantity,
              angle: cut.angle || 90
            }))
          },
          context: this.userContext
        }
      );
      
      return response.result;
      
    } catch (error) {
      this.logger.error('Failed to get custom cut pricing', { error });
      throw ErrorHandler.createError(
        ErrorCode.API_REQUEST_FAILED,
        'Unable to get custom cut pricing',
        'The cutting service is currently unavailable. You may need to cut materials yourself.',
        { cause: error as Error }
      );
    }
  }
  
  /**
   * Subscribe to price changes for materials
   */
  async subscribeToPriceChanges(
    materials: Material[],
    callback: (event: PriceChangeEvent) => void
  ): Promise<string> {
    // Extract resource IDs from materials that have been sourced
    const resourceIds = materials
      .filter(m => m.sourceResource)
      .map(m => m.sourceResource!.id);
    
    if (resourceIds.length === 0) {
      throw new Error('No sourced materials to monitor');
    }
    
    const subscriptionId = await this.mcpClient.subscribe({
      resourceIds,
      eventTypes: ['price_changed'],
      active: true
    });
    
    // Set up event listener
    this.mcpClient.on(`subscription:${subscriptionId}`, (event) => {
      if (event.type === 'price_changed') {
        const material = materials.find(m => 
          m.sourceResource?.id === event.resourceId
        );
        
        if (material) {
          const priceChange = event.changes?.find((c: any) => 
            c.field.includes('price')
          );
          
          if (priceChange) {
            callback({
              materialName: material.name || 'Unknown material',
              oldPrice: priceChange.oldValue,
              newPrice: priceChange.newValue,
              percentChange: ((priceChange.newValue - priceChange.oldValue) / 
                             priceChange.oldValue) * 100
            });
          }
        }
      }
    });
    
    return subscriptionId;
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.mcpClient.on('provider-error', ({ providerId, error }) => {
      this.logger.error('Provider error', { providerId, error });
    });
    
    this.mcpClient.on('initialized', () => {
      this.logger.info('MCP client initialized successfully');
    });
  }
  
  /**
   * Extract price from resource
   */
  private extractPrice(resource: LumberResource | HardwareResource): {
    amount: number;
    currency: string;
    unit: string;
  } | undefined {
    return resource.attributes.price;
  }
  
  /**
   * Extract availability from resource
   */
  private extractAvailability(resource: LumberResource | HardwareResource): {
    in_stock: boolean;
    quantity: number;
    location?: string;
    lead_time?: string;
  } {
    return resource.attributes.availability;
  }
  
  /**
   * Parse dimension string
   */
  private parseDimensions(dimensionStr: string): {
    thickness: number;
    width: number;
    length?: number;
  } | null {
    // Parse strings like "2x4x8" or "1x12"
    const match = dimensionStr.match(/(\d+)x(\d+)(?:x(\d+))?/);
    if (!match) return null;
    
    return {
      thickness: parseInt(match[1]),
      width: parseInt(match[2]),
      length: match[3] ? parseInt(match[3]) * 12 : undefined // Convert feet to inches
    };
  }
  
  /**
   * Extract required tools from build plan
   */
  private extractRequiredTools(buildPlan: BuildPlan): string[] {
    const tools = new Set<string>();
    
    // Extract from instructions
    buildPlan.instructions.forEach(instruction => {
      const toolMatches = instruction.content.match(/(?:use|using|with)\s+(?:a\s+)?(\w+\s*\w*)/gi);
      if (toolMatches) {
        toolMatches.forEach(match => {
          const tool = match.replace(/(?:use|using|with)\s+(?:a\s+)?/i, '').trim();
          if (this.isValidTool(tool)) {
            tools.add(tool);
          }
        });
      }
    });
    
    // Add common tools based on joinery type
    buildPlan.joinery.forEach(joint => {
      switch (joint.type) {
        case 'POCKET_HOLE':
          tools.add('pocket hole jig');
          tools.add('drill');
          break;
        case 'DOWEL':
          tools.add('doweling jig');
          tools.add('drill');
          break;
        case 'MORTISE_TENON':
          tools.add('chisel');
          tools.add('router');
          break;
        case 'DADO':
          tools.add('table saw');
          break;
      }
    });
    
    return Array.from(tools);
  }
  
  /**
   * Check if string is a valid tool name
   */
  private isValidTool(toolName: string): boolean {
    const commonTools = [
      'drill', 'saw', 'sander', 'router', 'planer', 'jigsaw',
      'circular saw', 'table saw', 'miter saw', 'band saw',
      'belt sander', 'orbital sander', 'drill press', 'lathe'
    ];
    
    return commonTools.some(tool => 
      toolName.toLowerCase().includes(tool)
    );
  }
  
  /**
   * Check resource availability
   */
  private async checkResourceAvailability(
    providerId: string,
    resourceId: string,
    date?: Date
  ): Promise<{
    available: boolean;
    locations: string[];
    price?: number;
  }> {
    try {
      const response = await this.mcpClient.invokeCapability<{
        available: boolean;
        locations: Array<{ name: string; address: string }>;
        price?: { amount: number; period: string };
      }>(providerId, {
        capability: MCPCapability.AVAILABILITY_CHECK,
        parameters: {
          resourceId,
          date: date?.toISOString() || new Date().toISOString()
        },
        context: this.userContext
      });
      
      return {
        available: response.result.available,
        locations: response.result.locations.map(loc => loc.name),
        price: response.result.price?.amount
      };
      
    } catch (error) {
      this.logger.error('Failed to check availability', { error });
      return { available: false, locations: [] };
    }
  }
  
  /**
   * Calculate rental cost
   */
  private calculateRentalCost(
    hourlyRate: number,
    duration: 'hour' | 'day' | 'week'
  ): number {
    switch (duration) {
      case 'hour':
        return hourlyRate;
      case 'day':
        return hourlyRate * 8; // 8 hour day
      case 'week':
        return hourlyRate * 40; // 40 hour week
    }
  }
  
  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    await this.mcpClient.disconnect();
  }
  
  /**
   * Search resources - delegates to MCP client
   */
  async searchResources(request: MCPSearchRequest): Promise<MCPSearchResponse> {
    return this.mcpClient.searchResources(request);
  }
}

// Type definitions for return values
export interface MaterialSearchResult {
  materials: MaterialWithSource[];
  totalCost: number;
  availability: 'available' | 'partial' | 'unavailable';
  warnings: string[];
  alternatives: Record<string, (LumberResource | HardwareResource)[]>;
}

export interface MaterialWithSource extends Material {
  sourceResource?: LumberResource | HardwareResource;
  price?: {
    amount: number;
    currency: string;
    unit: string;
  };
  availability?: {
    in_stock: boolean;
    quantity: number;
    location?: string;
    lead_time?: string;
  };
}

export interface ToolAvailabilityResult {
  tools: ToolAvailability[];
  totalRentalCost: number;
  allAvailable: boolean;
}

export interface ToolAvailability {
  name: string;
  resource?: any;
  available: boolean;
  rentalPrice?: number;
  locations: string[];
}

export interface CutSpecification {
  length: number;
  quantity: number;
  angle?: number;
}

export interface CustomCutQuote {
  cuts: Array<{
    length: number;
    quantity: number;
    pricePerCut: number;
  }>;
  totalCost: number;
  estimatedTime: string;
  notes?: string;
}

export interface PriceChangeEvent {
  materialName: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
} 