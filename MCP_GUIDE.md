# Model Context Protocol (MCP) Implementation Guide

## 🌐 Overview

Blueprint Buddy implements the Model Context Protocol (MCP) to enable seamless integration with external services like hardware stores, lumber suppliers, and tool rental services. This standardized protocol allows the AI to source real materials, check prices, and verify availability - bridging the gap between digital designs and physical construction.

## 🏗️ Architecture

### Core Components

#### 1. **MCP Types** (`src/lib/mcp-types.ts`)
Comprehensive TypeScript definitions for the MCP protocol:
- Message types and structures
- Resource definitions (lumber, hardware, tools)
- Provider configurations
- Search/filter/subscription interfaces

#### 2. **MCP Client** (`src/services/mcp/MCPClient.ts`)
WebSocket-based client that handles:
- Multi-provider connections
- Message routing and correlation
- Resource caching with TTL
- Event subscriptions
- Automatic reconnection
- Rate limiting

#### 3. **MCP Service Manager** (`src/services/mcp/MCPServiceManager.ts`)
High-level service layer that provides:
- Material sourcing for build plans
- Tool availability checking
- Price tracking subscriptions
- Alternative material suggestions
- User context management

#### 4. **Material Sourcing Agent** (`src/services/agents/MaterialSourcingAgent.ts`)
AI agent that integrates MCP with natural language:
- Processes sourcing requests
- Formats search results
- Provides recommendations
- Updates build plans with sourced materials

## 🔌 Provider Integration

### Default Providers

```typescript
// Home Depot MCP
{
  id: 'home-depot-mcp',
  baseUrl: 'wss://mcp.homedepot.com/v1',
  capabilities: ['search', 'price_check', 'availability', 'delivery', 'custom_cut'],
  authentication: { type: 'oauth2' }
}

// Lowe's MCP
{
  id: 'lowes-mcp',
  baseUrl: 'wss://mcp.lowes.com/v1',
  capabilities: ['search', 'price_check', 'availability', 'reserve'],
  authentication: { type: 'api_key' }
}

// Local Lumber Yards Network
{
  id: 'lumber-yard-mcp',
  baseUrl: 'wss://mcp.lumberyards.network/v1',
  capabilities: ['search', 'specification', 'custom_cut', 'pickup'],
  authentication: { type: 'none' }
}

// Tool Rental Network
{
  id: 'tool-rental-mcp',
  baseUrl: 'wss://mcp.toolrental.network/v1',
  capabilities: ['search', 'availability', 'reserve', 'pickup'],
  authentication: { type: 'basic' }
}
```

## 📋 Usage Examples

### 1. Source Materials for a Project

```typescript
// User: "Where can I buy materials for my bookshelf?"
const result = await mcpManager.findMaterialsForPlan(buildPlan, {
  includePricing: true,
  includeAlternatives: true,
  maxDistanceMiles: 25
});

// Response includes:
// - Sourced materials with prices
// - Total cost estimate
// - Availability status
// - Alternative suggestions
// - Store locations
```

### 2. Check Tool Availability

```typescript
// User: "What tools do I need and where can I rent them?"
const tools = await mcpManager.checkToolAvailability(buildPlan, {
  rentalDuration: 'day',
  pickupDate: new Date()
});

// Response includes:
// - Required tools list
// - Rental availability
// - Daily rental costs
// - Pickup locations
// - Alternative recommendations
```

### 3. Track Material Prices

```typescript
// User: "Track prices for my materials"
const subscriptionId = await mcpManager.subscribeToPriceChanges(
  materials,
  (event) => {
    // Handle price change notifications
    console.log(`${event.materialName}: ${event.percentChange}% change`);
  }
);
```

### 4. Find Alternative Materials

```typescript
// User: "Find alternatives for walnut"
const alternatives = await mcpManager.searchResources({
  query: 'walnut alternatives',
  includeRelated: true,
  filters: [
    { field: 'attributes.price.amount', operator: 'lt', value: 50 }
  ]
});
```

## 🔐 Security & Authentication

### OAuth 2.0 Flow (Home Depot)
```typescript
// Provider configuration
authentication: {
  type: 'oauth2',
  config: {
    authorizationUrl: 'https://auth.homedepot.com/oauth/authorize',
    tokenUrl: 'https://auth.homedepot.com/oauth/token',
    scopes: ['read:products', 'read:pricing', 'write:orders'],
    clientId: process.env.VITE_HD_CLIENT_ID
  }
}
```

### API Key Authentication (Lowe's)
```typescript
authentication: {
  type: 'api_key',
  config: {
    apiKeyHeader: 'X-API-Key'
  }
}
```

## 🚀 Performance Optimizations

### 1. **Resource Caching**
- 5-minute TTL for search results
- Automatic cache cleanup
- Cache invalidation on price changes

### 2. **Connection Pooling**
- Persistent WebSocket connections
- Automatic reconnection with backoff
- Connection health monitoring

### 3. **Request Batching**
- Parallel searches across providers
- Aggregated results with deduplication
- Progressive loading for large results

### 4. **Rate Limiting**
- Provider-specific limits respected
- Request queuing with priority
- Burst handling

## 🛠️ Development Setup

### 1. Environment Variables
```bash
# Add to backend/.env
MCP_HD_CLIENT_ID=your_home_depot_client_id
MCP_HD_CLIENT_SECRET=your_home_depot_secret
MCP_LOWES_API_KEY=your_lowes_api_key

# Frontend automatically connects through backend - no additional config needed
```

### 2. Mock MCP Server (for development)
```javascript
// backend/mcp-mock-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const request = JSON.parse(message);
    
    // Mock responses based on message type
    switch (request.type) {
      case 'SEARCH_RESOURCES':
        ws.send(JSON.stringify({
          id: request.id,
          type: 'SEARCH_RESOURCES',
          status: 'success',
          payload: {
            resources: mockLumberResources,
            totalCount: 10
          }
        }));
        break;
    }
  });
});
```

### 3. Testing MCP Integration
```typescript
// src/services/mcp/__tests__/MCPClient.test.ts
describe('MCPClient', () => {
  it('should connect to providers', async () => {
    const client = new MCPClient({ providers: [mockProvider] });
    await client.initialize();
    expect(client.getConnectedProviders()).toHaveLength(1);
  });
  
  it('should search resources', async () => {
    const results = await client.searchResources({
      query: '2x4 lumber',
      resourceTypes: [MCPResourceType.LUMBER]
    });
    expect(results.resources).toHaveLength(greaterThan(0));
  });
});
```

## 📊 Resource Types

### Lumber Resource Structure
```typescript
{
  id: "hd-lumber-2x4x8-pine",
  type: "lumber",
  name: "2x4x8 Pine Stud",
  uri: "https://homedepot.com/p/2x4x8-pine/12345",
  attributes: {
    species: "pine",
    grade: "stud",
    dimensions: {
      thickness: 1.5,
      width: 3.5,
      length: 96,
      unit: "inch"
    },
    treatment: "kiln_dried",
    price: {
      amount: 5.98,
      currency: "USD",
      unit: "piece"
    },
    availability: {
      in_stock: true,
      quantity: 245,
      location: "Aisle 21, Bay 4"
    }
  }
}
```

### Hardware Resource Structure
```typescript
{
  id: "hd-screws-deck-2.5",
  type: "hardware",
  name: "#8 x 2-1/2 in. Star Drive Deck Screws",
  attributes: {
    category: "fasteners",
    material: "stainless steel",
    size: "#8 x 2.5\"",
    specifications: {
      head_type: "flat",
      drive_type: "star",
      point_type: "self-drilling"
    },
    price: {
      amount: 32.97,
      currency: "USD",
      unit: "box",
      quantity_in_unit: 100
    }
  }
}
```

## 🔄 Event Subscriptions

### Price Change Events
```typescript
{
  type: 'price_changed',
  resourceId: 'hd-lumber-2x4x8-pine',
  changes: [{
    field: 'attributes.price.amount',
    oldValue: 5.98,
    newValue: 6.48
  }]
}
```

### Availability Events
```typescript
{
  type: 'availability_changed',
  resourceId: 'hd-screws-deck-2.5',
  changes: [{
    field: 'attributes.availability.in_stock',
    oldValue: true,
    newValue: false
  }]
}
```

## 🧩 Integration with Blueprint Buddy

### 1. **Intent Recognition**
The IntentClassifier recognizes material sourcing intents:
- "Where can I buy these materials?"
- "Check tool availability"
- "Find cheaper alternatives"
- "Track material prices"

### 2. **Agent Orchestration**
The MaterialSourcingAgent integrates seamlessly:
```typescript
// In FurnitureDesignOrchestrator
case IntentType.MATERIAL_SOURCING:
  const sourcingAgent = this.agents.get('materialSourcing');
  const response = await sourcingAgent.process(input, state);
```

### 3. **UI Integration**
Results are displayed in the chat interface:
- Material cards with prices and availability
- Tool rental information
- Alternative suggestions
- Direct links to suppliers

## 🚦 Error Handling

### MCP-Specific Errors
```typescript
export enum MCPErrorCode {
  PROVIDER_UNAVAILABLE = 'MCP_001',
  AUTH_FAILED = 'MCP_002',
  RATE_LIMIT_EXCEEDED = 'MCP_003',
  INVALID_RESOURCE = 'MCP_004',
  SUBSCRIPTION_FAILED = 'MCP_005'
}
```

### Recovery Strategies
1. **Provider Unavailable**: Fallback to cached data or alternative providers
2. **Auth Failed**: Prompt for re-authentication
3. **Rate Limit**: Queue requests with exponential backoff
4. **Invalid Resource**: Suggest alternatives
5. **Subscription Failed**: Retry with error notification

## 🔮 Future Enhancements

1. **Additional Providers**
   - Rockler Woodworking
   - Woodcraft
   - Local sawmills
   - Reclaimed material sources

2. **Enhanced Capabilities**
   - Order placement
   - Delivery scheduling
   - Bulk pricing negotiations
   - Material reservation

3. **Advanced Features**
   - AR preview of materials
   - Wood grain matching
   - Sustainability scoring
   - Carbon footprint tracking

4. **Community Integration**
   - User reviews of suppliers
   - Material quality ratings
   - Project cost sharing
   - Local supplier recommendations

## 📚 Best Practices

1. **Always Check Availability**: Materials can go out of stock quickly
2. **Consider Alternatives**: MCP provides alternatives for flexibility
3. **Track Prices**: Set up subscriptions for large projects
4. **Verify Specifications**: Double-check dimensions and grades
5. **Plan for Lead Time**: Some materials require ordering

## 🎯 Summary

The MCP implementation in Blueprint Buddy transforms it from a design tool into a complete project planning solution. Users can seamlessly transition from digital design to physical construction with real-world material sourcing, pricing, and availability information. The standardized protocol ensures future compatibility with new providers while maintaining a consistent user experience. 