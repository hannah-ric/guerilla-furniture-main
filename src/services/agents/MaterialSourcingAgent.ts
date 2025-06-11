/**
 * Material Sourcing Agent
 * Uses MCP to find, price, and track materials from external suppliers
 */

import { Agent } from './base/Agent';
import { MCPServiceManager, MaterialSearchResult, ToolAvailabilityResult } from '../mcp/MCPServiceManager';
import { BuildPlan, Material, AgentResponse, SharedState } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { ErrorHandler, ErrorCode } from '@/lib/errors';

export class MaterialSourcingAgent extends Agent {
  private mcpManager: MCPServiceManager;
  
  constructor() {
    super({
      name: 'MaterialSourcingAgent',
      description: 'Sources materials from external suppliers using MCP',
      interestedEvents: ['design_complete', 'materials_selected', 'validation_complete'],
      capabilities: ['material_sourcing', 'price_checking', 'tool_rental', 'price_tracking']
    });
    this.mcpManager = new MCPServiceManager();
  }
  
  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await this.mcpManager.initialize();
    this.logger.info('Material Sourcing Agent initialized');
  }
  
  /**
   * Check if this agent can handle the input
   */
  async canHandle(input: string, state: SharedState): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    return (
      lowerInput.includes('source') ||
      lowerInput.includes('find') ||
      lowerInput.includes('buy') ||
      lowerInput.includes('price') ||
      lowerInput.includes('cost') ||
      lowerInput.includes('tool') ||
      lowerInput.includes('rent') ||
      lowerInput.includes('availability')
    );
  }
  
  /**
   * Process material sourcing requests
   */
  async process(input: string, state: SharedState): Promise<AgentResponse> {
    const buildPlan = state.design as BuildPlan;
    
    try {
      // Determine the type of request
      const requestType = this.determineRequestType(input);
      
      switch (requestType) {
        case 'source_materials':
          if (!buildPlan || !buildPlan.materials?.length) {
            return this.createResponse(
              false,
              { message: 'I need a build plan to source materials. Please generate a design first.' },
              { validation_issues: ['No design available for sourcing'] }
            );
          }
          return await this.sourceMaterials(buildPlan);
          
        case 'check_tools':
          if (!buildPlan || !buildPlan.materials?.length) {
            return this.createResponse(
              false,
              { message: 'I need a build plan to check tool requirements. Please generate a design first.' },
              { validation_issues: ['No design available for tool checking'] }
            );
          }
          return await this.checkToolAvailability(buildPlan);
          
        case 'price_update':
          return await this.setupPriceTracking(buildPlan);
          
        case 'find_alternatives':
          return await this.findAlternativeMaterials(input, buildPlan);
          
        default:
          return this.createResponse(
            true,
            {
              message: 'I can help you source materials, check tool availability, track prices, or find alternatives. What would you like me to do?',
              capabilities: ['source_materials', 'check_tools', 'price_tracking', 'find_alternatives']
            }
          );
      }
      
    } catch (error) {
      this.logger.error('Failed to process material sourcing request', { error });
      return this.createResponse(
        false,
        { message: 'I encountered an issue while sourcing materials. Some external services may be unavailable.' },
        { validation_issues: [String(error)] }
      );
    }
  }
  
  /**
   * Validate the current state
   */
  async validate(state: SharedState): Promise<AgentResponse> {
    // Material sourcing doesn't validate the design itself
    return this.createResponse(true, { valid: true });
  }
  
  /**
   * Source materials for a build plan
   */
  private async sourceMaterials(buildPlan: BuildPlan): Promise<AgentResponse> {
    this.logger.info('Sourcing materials for build plan', {
      projectName: buildPlan.projectName,
      materialCount: buildPlan.materials.length
    });
    
    // Set user context if available
    const userLocation = this.getUserLocation();
    if (userLocation) {
      this.mcpManager.setUserContext({
        location: userLocation
      });
    }
    
    // Search for materials with pricing and alternatives
    const searchResult = await this.mcpManager.findMaterialsForPlan(buildPlan, {
      includePricing: true,
      includeAlternatives: true,
      maxDistanceMiles: 25
    });
    
    // Format response based on results
    const response = this.formatMaterialSearchResults(searchResult, buildPlan);
    
    // Add warnings if any materials couldn't be found  
    const warnings = searchResult.warnings.length > 0 ? searchResult.warnings : undefined;
    
    // Update build plan with sourced materials
    const updatedPlan = this.updateBuildPlanWithSources(buildPlan, searchResult);
    
    return this.createResponse(
      true,
      {
        message: response.message,
        sourcedMaterials: searchResult.materials,
        totalCost: searchResult.totalCost,
        availability: searchResult.availability,
        alternatives: searchResult.alternatives,
        updatedBuildPlan: updatedPlan
      },
      {
        suggestions: response.suggestions,
        validation_issues: warnings
      }
    );
  }
  
  /**
   * Check tool availability for a build plan
   */
  private async checkToolAvailability(buildPlan: BuildPlan): Promise<AgentResponse> {
    this.logger.info('Checking tool availability for build plan', {
      projectName: buildPlan.projectName
    });
    
    const toolResult = await this.mcpManager.checkToolAvailability(buildPlan, {
      rentalDuration: 'day',
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });
    
    const message = this.formatToolAvailabilityResults(toolResult);
    const recommendations = this.getToolRecommendations(toolResult);
    
    return this.createResponse(
      true,
      {
        message,
        requiredTools: toolResult.tools,
        totalRentalCost: toolResult.totalRentalCost,
        allAvailable: toolResult.allAvailable
      },
      {
        suggestions: recommendations
      }
    );
  }
  
  /**
   * Setup price tracking for materials
   */
  private async setupPriceTracking(buildPlan?: BuildPlan): Promise<AgentResponse> {
    if (!buildPlan || buildPlan.materials.length === 0) {
      return this.createResponse(
        false,
        { message: 'I need a build plan with sourced materials to set up price tracking.' },
        { validation_issues: ['No materials available for price tracking'] }
      );
    }
    
    // Only track materials that have been sourced
    const sourcedMaterials = buildPlan.materials.filter(m => m.sourceResource);
    
    if (sourcedMaterials.length === 0) {
      return this.createResponse(
        false,
        { message: 'Please source materials first before setting up price tracking.' },
        { validation_issues: ['No sourced materials available for price tracking'] }
      );
    }
    
    try {
      const subscriptionId = await this.mcpManager.subscribeToPriceChanges(
        sourcedMaterials,
        (event) => {
          this.logger.info('Price change detected', event);
          // In a real app, would notify user through UI
        }
      );
      
      return this.createResponse(
        true,
        {
          message: `I've set up price tracking for ${sourcedMaterials.length} materials. You'll be notified of any price changes.`,
          subscriptionId,
          trackedMaterials: sourcedMaterials.map(m => m.name),
          success: true
        }
      );
      
    } catch (error) {
      return this.createResponse(
        false,
        { message: 'I couldn\'t set up price tracking at this time. The monitoring service may be unavailable.' },
        { validation_issues: [String(error)] }
      );
    }
  }
  
  /**
   * Find alternative materials
   */
  private async findAlternativeMaterials(
    input: string,
    buildPlan?: BuildPlan
  ): Promise<AgentResponse> {
    // Extract material name from input
    const materialMatch = input.match(/alternatives?\s+(?:for|to)\s+(.+)/i);
    if (!materialMatch) {
      return this.createResponse(
        false,
        { message: 'Please specify which material you\'d like alternatives for. For example: "Find alternatives for pine 2x4"' },
        { validation_issues: ['Invalid input format'] }
      );
    }
    
    const materialName = materialMatch[1].trim();
    
    // Search for alternatives
    const searchRequest = {
      query: materialName,
      includeRelated: true,
      pagination: { limit: 10 }
    };
    
    const searchResult = await this.mcpManager.searchResources(searchRequest);
    
    if (searchResult.resources.length === 0) {
      return this.createResponse(
        false,
        { message: `I couldn't find any alternatives for "${materialName}". Try being more specific or checking the material name.` },
        { validation_issues: ['No alternatives found'] }
      );
    }
    
    // Format alternatives
    const alternatives = searchResult.resources.slice(0, 5).map(resource => ({
      name: resource.name,
      description: resource.description,
      price: resource.attributes.price,
      availability: resource.attributes.availability,
      provider: resource.metadata.provider
    }));
    
    return this.createResponse(
      true,
      {
        message: `I found ${alternatives.length} alternatives for "${materialName}". Here are the top options:`,
        originalMaterial: materialName,
        alternatives,
        facets: searchResult.facets,
        success: true
      }
    );
  }
  
  /**
   * Determine request type from input
   */
  private determineRequestType(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('source') || lowerInput.includes('find') && lowerInput.includes('material')) {
      return 'source_materials';
    }
    if (lowerInput.includes('tool') || lowerInput.includes('rent')) {
      return 'check_tools';
    }
    if (lowerInput.includes('track') || lowerInput.includes('monitor') || lowerInput.includes('price')) {
      return 'price_update';
    }
    if (lowerInput.includes('alternative') || lowerInput.includes('substitute')) {
      return 'find_alternatives';
    }
    
    return 'unknown';
  }
  
  /**
   * Format material search results
   */
  private formatMaterialSearchResults(
    searchResult: MaterialSearchResult,
    buildPlan: BuildPlan
  ): { message: string; suggestions: string[] } {
    const suggestions: string[] = [];
    let message = '';
    
    if (searchResult.availability === 'available') {
      message = `Great news! I found all ${searchResult.materials.length} materials for your ${buildPlan.projectName}. `;
      
      if (searchResult.totalCost > 0) {
        message += `The total cost is $${searchResult.totalCost.toFixed(2)}. `;
      }
      
      // Add suggestions for savings
      const expensiveMaterials = searchResult.materials
        .filter(m => m.price && m.price.amount > 50)
        .sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0));
      
      if (expensiveMaterials.length > 0) {
        suggestions.push(
          `Consider alternatives for ${expensiveMaterials[0].name} to reduce costs`
        );
      }
      
    } else if (searchResult.availability === 'partial') {
      const unavailable = searchResult.materials.filter(m => 
        !m.availability || !m.availability.in_stock
      );
      
      message = `I found most materials, but ${unavailable.length} items are currently unavailable. `;
      
      unavailable.forEach(item => {
        if (item.name && searchResult.alternatives[item.name]?.length > 0) {
          suggestions.push(
            `Try ${searchResult.alternatives[item.name][0].name} as an alternative to ${item.name}`
          );
        }
      });
      
    } else {
      message = 'Unfortunately, most materials are currently unavailable. ';
      suggestions.push(
        'Consider checking with local suppliers',
        'Try adjusting your material specifications',
        'Check back later for updated availability'
      );
    }
    
    // Add location-based suggestions
    const farAwayMaterials = searchResult.materials.filter(m => 
      m.availability?.location && m.availability.location.includes('miles')
    );
    
    if (farAwayMaterials.length > 0) {
      suggestions.push('Some materials require longer travel - consider bulk pickup');
    }
    
    return { message, suggestions };
  }
  
  /**
   * Format tool availability results
   */
  private formatToolAvailabilityResults(toolResult: ToolAvailabilityResult): string {
    if (toolResult.allAvailable) {
      return `All required tools are available for rental. Daily rental cost: $${toolResult.totalRentalCost.toFixed(2)}. ` +
             `You'll need: ${toolResult.tools.map(t => t.name).join(', ')}.`;
    }
    
    const unavailable = toolResult.tools.filter(t => !t.available);
    const available = toolResult.tools.filter(t => t.available);
    
    let message = `I found ${available.length} of ${toolResult.tools.length} required tools. `;
    
    if (unavailable.length > 0) {
      message += `Unavailable: ${unavailable.map(t => t.name).join(', ')}. `;
      message += 'You may need to purchase these or find alternatives. ';
    }
    
    if (available.length > 0 && toolResult.totalRentalCost > 0) {
      message += `Available tools rental cost: $${toolResult.totalRentalCost.toFixed(2)}/day.`;
    }
    
    return message;
  }
  
  /**
   * Get tool recommendations based on availability
   */
  private getToolRecommendations(toolResult: ToolAvailabilityResult): string[] {
    const recommendations: string[] = [];
    
    // Check if rental cost is high
    if (toolResult.totalRentalCost > 100) {
      recommendations.push(
        'Consider purchasing frequently-used tools instead of renting',
        'Look for tool bundles or package deals'
      );
    }
    
    // Check for unavailable tools
    const unavailable = toolResult.tools.filter(t => !t.available);
    unavailable.forEach(tool => {
      if (tool.name.includes('saw')) {
        recommendations.push(`Many hardware stores offer free cutting services as an alternative to renting a ${tool.name}`);
      }
      if (tool.name.includes('specialized')) {
        recommendations.push(`Check with local makerspaces or woodworking clubs for ${tool.name} access`);
      }
    });
    
    // Add general recommendations
    if (toolResult.tools.length > 5) {
      recommendations.push('Consider spreading the project over multiple days to reduce daily rental costs');
    }
    
    return recommendations;
  }
  
  /**
   * Update build plan with sourced materials
   */
  private updateBuildPlanWithSources(
    buildPlan: BuildPlan,
    searchResult: MaterialSearchResult
  ): BuildPlan {
    const updatedMaterials = buildPlan.materials.map(material => {
      const sourced = searchResult.materials.find(m => m.name === material.name);
      if (sourced) {
        return {
          ...material,
          sourceResource: sourced.sourceResource,
          price: sourced.price,
          availability: sourced.availability
        };
      }
      return material;
    });
    
    return {
      ...buildPlan,
      materials: updatedMaterials,
      estimated_cost: searchResult.totalCost
    };
  }
  
  /**
   * Get user location from context
   */
  private getUserLocation(): { latitude: number; longitude: number; radius: number; unit: 'mi' } | undefined {
    // In a real app, would get from user preferences or browser geolocation
    // For now, return undefined to use provider defaults
    return undefined;
  }
} 