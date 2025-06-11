# MCP Server Connection Guide - Step by Step

## 🎯 What You Need to Know

The Model Context Protocol (MCP) allows Blueprint Buddy to connect to real-world suppliers and services. This guide shows you exactly how to set up and connect to MCP servers.

## 🏃‍♂️ Quick Start (5 minutes)

### Step 1: Start the Development Environment

```bash
# Install dependencies
npm install

# Start the mock MCP server for testing
npm run mcp-server
```

**What happens:** A WebSocket server starts on `localhost:8080` that simulates real supplier APIs.

### Step 2: Test the Connection

```bash
# In a new terminal
npm run mcp-test
```

**Expected output:**
```
✅ Connected to MCP server
📤 Sending search request: 2x4
📥 Received message: AUTH_RESPONSE
   Authentication successful, capabilities: [ 'search', 'price_check', 'availability_check', 'subscribe' ]
📥 Received message: SEARCH_RESOURCES
   Search results: 1 items found
   - 2x4x8 Pine Stud ($5.98)
👋 Connection closed
```

### Step 3: Try Advanced Testing

```bash
npm run mcp-test-integration
```

**What this tests:**
- Authentication with suppliers
- Material searching
- Price checking
- Custom cut quotes
- Real-time price updates
- Error handling

## 🔧 How MCP Works in Blueprint Buddy

### The Flow:
1. **User Request:** "Where can I buy 2x4 lumber?"
2. **Agent Processing:** MaterialSourcingAgent understands the request
3. **Service Coordination:** MCPServiceManager finds relevant suppliers
4. **Real-time Query:** MCPClient sends WebSocket messages to suppliers
5. **Response Aggregation:** Results from multiple suppliers are combined
6. **User Response:** "I found 2x4 lumber at Home Depot for $5.98"

### Behind the Scenes:

```typescript
// User's message triggers this flow:
User Message → IntentClassifier → MaterialSourcingAgent → MCPServiceManager → MCPClient → Suppliers
```

## 🌐 Connecting to Real MCP Servers

### Step 1: Configure Provider Settings

Edit `src/services/mcp/providers.ts`:

```typescript
export const DEFAULT_MCP_PROVIDERS: MCPProvider[] = [
  {
    id: 'home-depot-mcp',
    name: 'Home Depot',
    type: 'hardware_store',
    baseUrl: 'wss://api.homedepot.com/mcp/v1', // Real URL
    capabilities: [
      MCPCapability.SEARCH,
      MCPCapability.PRICE_CHECK,
      MCPCapability.AVAILABILITY_CHECK
    ],
    authentication: {
      type: 'oauth2',
      config: {
        clientId: process.env.HOME_DEPOT_CLIENT_ID,
        clientSecret: process.env.HOME_DEPOT_CLIENT_SECRET,
        authorizationUrl: 'https://auth.homedepot.com/oauth/authorize',
        tokenUrl: 'https://auth.homedepot.com/oauth/token'
      }
    }
  }
];
```

### Step 2: Set Environment Variables

Create `.env` files:

**Backend `.env**:
```bash
HOME_DEPOT_CLIENT_ID=your_client_id
HOME_DEPOT_CLIENT_SECRET=your_secret
LOWES_API_KEY=your_api_key
```

**Frontend `.env**:
```bash
VITE_MCP_ENVIRONMENT=production
```

### Step 3: Test Real Connections

```bash
# Test with real providers
npm run mcp-test-integration
```

## 📡 MCP Protocol Messages

### Authentication Message:
```json
{
  "id": "auth-001",
  "type": "AUTH_REQUEST",
  "timestamp": "2024-12-19T10:00:00Z",
  "source": "blueprint-buddy",
  "payload": {
    "credentials": {
      "type": "oauth2",
      "token": "your_access_token"
    }
  }
}
```

### Search Request:
```json
{
  "id": "search-001",
  "type": "SEARCH_RESOURCES",
  "timestamp": "2024-12-19T10:00:00Z",
  "source": "blueprint-buddy",
  "payload": {
    "query": "2x4 pine lumber",
    "resourceTypes": ["lumber"],
    "filters": {
      "priceRange": { "min": 0, "max": 20 },
      "location": { "zip": "12345", "radius": 25 }
    },
    "pagination": { "limit": 10, "offset": 0 }
  }
}
```

### Price Check Request:
```json
{
  "id": "price-001",
  "type": "INVOKE_CAPABILITY",
  "timestamp": "2024-12-19T10:00:00Z",
  "source": "blueprint-buddy",
  "payload": {
    "capability": "price_check",
    "parameters": {
      "resourceId": "hd-lumber-2x4x8-pine",
      "quantity": 10,
      "location": "12345"
    }
  }
}
```

## 🛠️ Custom MCP Server Setup

### Creating Your Own MCP Server

1. **Server Structure:**
```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  // Handle authentication
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch(message.type) {
      case 'AUTH_REQUEST':
        handleAuth(ws, message);
        break;
      case 'SEARCH_RESOURCES':
        handleSearch(ws, message);
        break;
      case 'INVOKE_CAPABILITY':
        handleCapability(ws, message);
        break;
    }
  });
});
```

2. **Required Capabilities:**
- `SEARCH`: Find materials and tools
- `PRICE_CHECK`: Get current pricing
- `AVAILABILITY_CHECK`: Check stock levels
- `CUSTOM_CUT`: Request custom cuts

3. **Data Format:**
```javascript
const mockLumber = {
  id: 'my-lumber-001',
  type: 'lumber',
  name: '2x4x8 Pine Stud',
  uri: 'https://mystore.com/lumber/2x4x8-pine',
  attributes: {
    species: 'pine',
    grade: 'stud',
    dimensions: { thickness: 1.5, width: 3.5, length: 96 },
    price: { amount: 5.98, currency: 'USD' },
    availability: {
      in_stock: true,
      quantity: 150,
      location: 'Store #123'
    }
  }
};
```

## 🚀 Integration with Blueprint Buddy

### Step 1: MaterialSourcingAgent Usage

The agent automatically handles MCP integration:

```typescript
// In your agent
async process(request: AgentRequest): Promise<AgentResponse> {
  // Agent uses MCP automatically
  const materials = await this.mcpServiceManager.searchMaterials({
    query: request.message,
    resourceTypes: ['lumber', 'hardware']
  });
  
  return {
    message: `Found ${materials.length} materials`,
    data: materials
  };
}
```

### Step 2: UI Integration

Create components that use MCP data:

```tsx
function MaterialSelector() {
  const [materials, setMaterials] = useState([]);
  
  const searchMaterials = async (query: string) => {
    // This triggers MCP search through the agent system
    const response = await fetch('/api/search-materials', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    setMaterials(data.materials);
  };
  
  return (
    <div>
      <input onChange={(e) => searchMaterials(e.target.value)} />
      {materials.map(material => (
        <MaterialCard key={material.id} material={material} />
      ))}
    </div>
  );
}
```

## 🔍 Troubleshooting Common Issues

### Connection Issues:

**Problem:** WebSocket connection fails
```bash
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**Solution:**
```bash
# Make sure the server is running
npm run mcp-server

# Check if port is in use
lsof -i :8080
```

### Authentication Issues:

**Problem:** Authentication fails with real providers

**Solution:**
1. Check your API credentials in `.env`
2. Verify OAuth2 scopes are correct
3. Test with the provider's sandbox environment first

### Import Issues:

**Problem:** `Cannot resolve module 'ws'`

**Solution:**
```bash
# Reinstall dependencies
cd backend
npm install ws uuid

# Check imports use correct syntax
import WebSocket from 'ws';  // ✅ Correct
import { WebSocket } from 'ws';  // ❌ Wrong
```

### Rate Limiting:

**Problem:** Too many requests to provider

**Solution:**
- The MCPClient has built-in rate limiting
- Adjust limits in provider configuration
- Use caching to reduce API calls

## 📋 Next Steps Checklist

### For Development:
- [ ] MCP server running (`npm run mcp-server`)
- [ ] Tests passing (`npm run mcp-test-integration`)
- [ ] Frontend connects to MaterialSourcingAgent
- [ ] UI components display MCP data

### For Production:
- [ ] Real provider configurations set up
- [ ] Environment variables configured
- [ ] Authentication flows tested
- [ ] Rate limiting properly configured
- [ ] Error handling tested
- [ ] Security review completed

## 🎉 Success Indicators

✅ **Development Ready:**
- Mock server runs without errors
- All integration tests pass
- Agent responds to material queries
- UI displays search results

✅ **Production Ready:**
- Real provider connections work
- Authentication flows complete
- Rate limits respected
- Error handling graceful
- Performance meets requirements

---

**You now have everything needed to connect Blueprint Buddy to real MCP servers!** 🚀 