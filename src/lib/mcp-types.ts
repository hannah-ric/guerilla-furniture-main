/**
 * Model Context Protocol (MCP) Type Definitions
 * Standardized protocol for integrating external services with Blueprint Buddy
 */

// ============= Core MCP Types =============

/**
 * MCP Protocol Version
 */
export const MCP_VERSION = '1.0.0';

/**
 * MCP Message Types
 */
export enum MCPMessageType {
  // Discovery
  LIST_RESOURCES = 'list_resources',
  GET_RESOURCE = 'get_resource',
  SEARCH_RESOURCES = 'search_resources',
  
  // Capability
  LIST_CAPABILITIES = 'list_capabilities',
  INVOKE_CAPABILITY = 'invoke_capability',
  
  // Authentication
  AUTH_REQUEST = 'auth_request',
  AUTH_RESPONSE = 'auth_response',
  REFRESH_TOKEN = 'refresh_token',
  
  // Subscription
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  EVENT = 'event',
  
  // System
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}

/**
 * MCP Resource Types for Furniture Domain
 */
export enum MCPResourceType {
  // Products
  LUMBER = 'lumber',
  HARDWARE = 'hardware',
  TOOLS = 'tools',
  FINISHES = 'finishes',
  
  // Services
  TOOL_RENTAL = 'tool_rental',
  DELIVERY = 'delivery',
  CUTTING_SERVICE = 'cutting_service',
  
  // Community
  DESIGN_TEMPLATE = 'design_template',
  BUILD_GUIDE = 'build_guide',
  USER_PROJECT = 'user_project',
  
  // Information
  PRICE_QUOTE = 'price_quote',
  AVAILABILITY = 'availability',
  SPECIFICATION = 'specification'
}

/**
 * MCP Capability Types
 */
export enum MCPCapability {
  // Search & Discovery
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',
  
  // Transactions
  PRICE_CHECK = 'price_check',
  RESERVE = 'reserve',
  PURCHASE = 'purchase',
  
  // Information
  AVAILABILITY_CHECK = 'availability_check',
  SPECIFICATION_LOOKUP = 'specification_lookup',
  ALTERNATIVE_SUGGEST = 'alternative_suggest',
  
  // Services
  SCHEDULE_DELIVERY = 'schedule_delivery',
  SCHEDULE_PICKUP = 'schedule_pickup',
  CUSTOM_CUT = 'custom_cut'
}

// ============= MCP Message Structure =============

/**
 * Base MCP Message
 */
export interface MCPMessage {
  id: string;
  version: string;
  type: MCPMessageType;
  timestamp: string;
  source: string;
  destination?: string;
  correlationId?: string;
  payload: any;
}

/**
 * MCP Request Message
 */
export interface MCPRequest extends MCPMessage {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * MCP Response Message
 */
export interface MCPResponse extends MCPMessage {
  status: 'success' | 'error' | 'partial';
  error?: MCPError;
  metadata?: MCPResponseMetadata;
}

/**
 * MCP Error
 */
export interface MCPError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
  suggestedAction?: string;
}

/**
 * MCP Response Metadata
 */
export interface MCPResponseMetadata {
  processingTime: number;
  cacheHit?: boolean;
  remainingQuota?: number;
  nextPageToken?: string;
}

// ============= Resource Definitions =============

/**
 * MCP Resource
 */
export interface MCPResource {
  id: string;
  type: MCPResourceType;
  name: string;
  description?: string;
  uri: string;
  metadata: MCPResourceMetadata;
  attributes: Record<string, any>;
  relationships?: MCPRelationship[];
  capabilities: MCPCapability[];
}

/**
 * MCP Resource Metadata
 */
export interface MCPResourceMetadata {
  created: string;
  updated: string;
  version: string;
  provider: string;
  schema?: string;
  tags?: string[];
}

/**
 * MCP Relationship
 */
export interface MCPRelationship {
  type: 'replaces' | 'requires' | 'complements' | 'bundles_with';
  targetId: string;
  targetType: MCPResourceType;
  metadata?: Record<string, any>;
}

// ============= Lumber & Material Resources =============

/**
 * Lumber Resource
 */
export interface LumberResource extends MCPResource {
  type: MCPResourceType.LUMBER;
  attributes: {
    species: string;
    grade: string;
    dimensions: {
      thickness: number;
      width: number;
      length: number;
      unit: 'inch' | 'foot' | 'mm' | 'cm';
    };
    moisture_content?: number;
    treatment?: 'none' | 'pressure_treated' | 'kiln_dried';
    certification?: string[];
    price: {
      amount: number;
      currency: string;
      unit: 'board_foot' | 'linear_foot' | 'piece';
    };
    availability: {
      in_stock: boolean;
      quantity: number;
      location?: string;
      lead_time?: string;
    };
  };
}

/**
 * Hardware Resource
 */
export interface HardwareResource extends MCPResource {
  type: MCPResourceType.HARDWARE;
  attributes: {
    category: 'fasteners' | 'hinges' | 'handles' | 'brackets' | 'slides' | 'other';
    material: string;
    finish?: string;
    size: string;
    specifications: Record<string, any>;
    price: {
      amount: number;
      currency: string;
      unit: 'piece' | 'box' | 'pound';
      quantity_in_unit?: number;
    };
    compatibility?: string[];
    availability: {
      in_stock: boolean;
      quantity: number;
    };
  };
}

// ============= Provider Configuration =============

/**
 * MCP Provider
 */
export interface MCPProvider {
  id: string;
  name: string;
  type: 'hardware_store' | 'lumber_yard' | 'tool_rental' | 'community' | 'other';
  baseUrl: string;
  capabilities: MCPCapability[];
  authentication?: MCPAuthentication;
  rateLimit?: MCPRateLimit;
  metadata: {
    description?: string;
    logo?: string;
    website?: string;
    support?: string;
  };
}

/**
 * MCP Authentication Configuration
 */
export interface MCPAuthentication {
  type: 'oauth2' | 'api_key' | 'basic' | 'none';
  config: {
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
    clientId?: string;
    apiKeyHeader?: string;
  };
}

/**
 * MCP Rate Limit
 */
export interface MCPRateLimit {
  requests: number;
  period: 'second' | 'minute' | 'hour' | 'day';
  burst?: number;
}

// ============= Search & Filter =============

/**
 * MCP Search Request
 */
export interface MCPSearchRequest {
  query?: string;
  filters?: MCPFilter[];
  sort?: MCPSort[];
  pagination?: MCPPagination;
  resourceTypes?: MCPResourceType[];
  includeRelated?: boolean;
}

/**
 * MCP Filter
 */
export interface MCPFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

/**
 * MCP Sort
 */
export interface MCPSort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * MCP Pagination
 */
export interface MCPPagination {
  limit: number;
  offset?: number;
  pageToken?: string;
}

/**
 * MCP Search Response
 */
export interface MCPSearchResponse {
  resources: MCPResource[];
  totalCount?: number;
  nextPageToken?: string;
  facets?: MCPFacet[];
}

/**
 * MCP Facet
 */
export interface MCPFacet {
  field: string;
  values: Array<{
    value: string;
    count: number;
  }>;
}

// ============= Events & Subscriptions =============

/**
 * MCP Event
 */
export interface MCPEvent {
  id: string;
  type: 'resource_updated' | 'price_changed' | 'availability_changed' | 'new_resource';
  resourceId: string;
  resourceType: MCPResourceType;
  timestamp: string;
  changes?: MCPChange[];
  metadata?: Record<string, any>;
}

/**
 * MCP Change
 */
export interface MCPChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * MCP Subscription
 */
export interface MCPSubscription {
  id: string;
  resourceTypes?: MCPResourceType[];
  resourceIds?: string[];
  eventTypes?: string[];
  filters?: MCPFilter[];
  webhook?: string;
  active: boolean;
  expiresAt?: string;
}

// ============= Service Integration =============

/**
 * MCP Service Request
 */
export interface MCPServiceRequest {
  capability: MCPCapability;
  parameters: Record<string, any>;
  context?: MCPContext;
}

/**
 * MCP Context
 */
export interface MCPContext {
  userId?: string;
  projectId?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
    unit?: 'mi' | 'km';
  };
  preferences?: Record<string, any>;
}

/**
 * MCP Service Response
 */
export interface MCPServiceResponse<T = any> {
  result: T;
  alternatives?: T[];
  recommendations?: string[];
  warnings?: string[];
}

// ============= Type Guards =============

export function isMCPRequest(message: MCPMessage): message is MCPRequest {
  return 'timeout' in message || 'priority' in message;
}

export function isMCPResponse(message: MCPMessage): message is MCPResponse {
  return 'status' in message;
}

export function isLumberResource(resource: MCPResource): resource is LumberResource {
  return resource.type === MCPResourceType.LUMBER;
}

export function isHardwareResource(resource: MCPResource): resource is HardwareResource {
  return resource.type === MCPResourceType.HARDWARE;
}

// ============= Constants =============

export const MCP_DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MCP_MAX_RETRIES = 3;
export const MCP_RETRY_DELAY = 1000; // 1 second 