import { MCPProvider, MCPCapability } from '@/lib/mcp-types';

/**
 * Default MCP Provider Configurations
 * These represent real-world material suppliers integrated via MCP
 */

export const DEFAULT_MCP_PROVIDERS: MCPProvider[] = [
  {
    id: 'home-depot-mcp',
    name: 'Home Depot',
    type: 'hardware_store',
    baseUrl: import.meta.env.DEV ? 'ws://localhost:8080' : 'wss://mcp.homedepot.com/v1',
    capabilities: [
      MCPCapability.SEARCH,
      MCPCapability.FILTER,
      MCPCapability.PRICE_CHECK,
      MCPCapability.AVAILABILITY_CHECK,
      MCPCapability.CUSTOM_CUT,
      MCPCapability.SCHEDULE_DELIVERY,
      MCPCapability.RESERVE
    ],
    authentication: {
      type: 'oauth2',
      config: {
        authorizationUrl: 'https://auth.homedepot.com/oauth/authorize',
        tokenUrl: 'https://auth.homedepot.com/oauth/token',
        scopes: ['read:products', 'read:pricing', 'write:orders'],
        clientId: import.meta.env.VITE_HD_CLIENT_ID || 'development'
      }
    },
    rateLimit: {
      requests: 100,
      period: 'minute',
      burst: 20
    },
    metadata: {
      description: 'Home improvement retailer with lumber, hardware, and tools',
      logo: '/providers/home-depot-logo.svg',
      website: 'https://www.homedepot.com',
      support: 'support@homedepot.com'
    }
  },
  {
    id: 'lowes-mcp',
    name: "Lowe's",
    type: 'hardware_store',
    baseUrl: import.meta.env.DEV ? 'ws://localhost:8080' : 'wss://mcp.lowes.com/v1',
    capabilities: [
      MCPCapability.SEARCH,
      MCPCapability.FILTER,
      MCPCapability.PRICE_CHECK,
      MCPCapability.AVAILABILITY_CHECK,
      MCPCapability.RESERVE,
      MCPCapability.SCHEDULE_PICKUP
    ],
    authentication: {
      type: 'api_key',
      config: {
        apiKeyHeader: 'X-API-Key'
      }
    },
    rateLimit: {
      requests: 60,
      period: 'minute'
    },
    metadata: {
      description: 'Home improvement and appliances retailer',
      logo: '/providers/lowes-logo.svg',
      website: 'https://www.lowes.com',
      support: 'support@lowes.com'
    }
  },
  {
    id: 'lumber-yard-mcp',
    name: 'Local Lumber Yards Network',
    type: 'lumber_yard',
    baseUrl: import.meta.env.DEV ? 'ws://localhost:8080' : 'wss://mcp.lumberyards.network/v1',
    capabilities: [
      MCPCapability.SEARCH,
      MCPCapability.SPECIFICATION_LOOKUP,
      MCPCapability.CUSTOM_CUT,
      MCPCapability.PRICE_CHECK,
      MCPCapability.SCHEDULE_PICKUP
    ],
      authentication: {
    type: 'none',
    config: {}
  },
    rateLimit: {
      requests: 30,
      period: 'minute'
    },
    metadata: {
      description: 'Network of independent lumber yards specializing in quality wood',
      logo: '/providers/lumber-yard-logo.svg',
      website: 'https://www.lumberyards.network',
      support: 'info@lumberyards.network'
    }
  },
  {
    id: 'tool-rental-mcp',
    name: 'Tool Rental Network',
    type: 'tool_rental',
    baseUrl: import.meta.env.DEV ? 'ws://localhost:8080' : 'wss://mcp.toolrental.network/v1',
    capabilities: [
      MCPCapability.SEARCH,
      MCPCapability.AVAILABILITY_CHECK,
      MCPCapability.RESERVE,
      MCPCapability.SCHEDULE_PICKUP,
      MCPCapability.PRICE_CHECK
    ],
    authentication: {
      type: 'basic',
      config: {}
    },
    rateLimit: {
      requests: 50,
      period: 'minute'
    },
    metadata: {
      description: 'Network of tool rental locations for construction equipment',
      logo: '/providers/tool-rental-logo.svg',
      website: 'https://www.toolrental.network',
      support: 'help@toolrental.network'
    }
  }
];

/**
 * Get provider by ID
 */
export function getProvider(providerId: string): MCPProvider | undefined {
  return DEFAULT_MCP_PROVIDERS.find(p => p.id === providerId);
}

/**
 * Get providers by type
 */
export function getProvidersByType(type: 'hardware_store' | 'lumber_yard' | 'tool_rental'): MCPProvider[] {
  return DEFAULT_MCP_PROVIDERS.filter(p => p.type === type);
}

/**
 * Check if provider requires authentication
 */
export function requiresAuth(providerId: string): boolean {
  const provider = getProvider(providerId);
  return provider?.authentication?.type !== 'none';
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(providerId: string): MCPCapability[] {
  const provider = getProvider(providerId);
  return provider?.capabilities || [];
} 