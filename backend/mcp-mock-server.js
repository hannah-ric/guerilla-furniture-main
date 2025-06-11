import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Mock MCP Server for Development
const wss = new WebSocketServer({ port: 8080 });

console.log('Mock MCP Server running on ws://localhost:8080');

// Mock data store
const mockMaterials = {
  lumber: [
    {
      id: 'hd-lumber-2x4x8-pine',
      type: 'lumber',
      name: '2x4x8 Pine Stud',
      uri: 'https://homedepot.com/p/2x4x8-pine/12345',
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0',
        provider: 'home-depot-mcp',
        tags: ['construction', 'framing', 'softwood']
      },
      attributes: {
        species: 'pine',
        grade: 'stud',
        dimensions: {
          thickness: 1.5,
          width: 3.5,
          length: 96,
          unit: 'inch'
        },
        treatment: 'kiln_dried',
        price: {
          amount: 5.98,
          currency: 'USD',
          unit: 'piece'
        },
        availability: {
          in_stock: true,
          quantity: 245,
          location: 'Aisle 21, Bay 4'
        }
      },
      capabilities: ['price_check', 'availability_check', 'custom_cut']
    },
    {
      id: 'lw-lumber-oak-1x6x8',
      type: 'lumber',
      name: '1x6x8 Red Oak Board',
      uri: 'https://lowes.com/p/oak-board/67890',
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0',
        provider: 'lowes-mcp',
        tags: ['hardwood', 'furniture', 'premium']
      },
      attributes: {
        species: 'oak',
        grade: 'select',
        dimensions: {
          thickness: 0.75,
          width: 5.5,
          length: 96,
          unit: 'inch'
        },
        treatment: 'kiln_dried',
        price: {
          amount: 42.50,
          currency: 'USD',
          unit: 'piece'
        },
        availability: {
          in_stock: true,
          quantity: 18,
          location: 'Aisle 15, Bay 2'
        }
      },
      capabilities: ['price_check', 'availability_check']
    }
  ],
  hardware: [
    {
      id: 'hd-screws-deck-2.5',
      type: 'hardware',
      name: '#8 x 2-1/2 in. Star Drive Deck Screws (100-Pack)',
      uri: 'https://homedepot.com/p/deck-screws/54321',
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0',
        provider: 'home-depot-mcp',
        tags: ['fasteners', 'deck', 'exterior']
      },
      attributes: {
        category: 'fasteners',
        material: 'stainless steel',
        finish: 'coated',
        size: '#8 x 2.5"',
        specifications: {
          head_type: 'flat',
          drive_type: 'star',
          point_type: 'self-drilling'
        },
        price: {
          amount: 32.97,
          currency: 'USD',
          unit: 'box',
          quantity_in_unit: 100
        },
        availability: {
          in_stock: true,
          quantity: 55,
          location: 'Aisle 8, Bay 12'
        }
      },
      capabilities: ['price_check', 'availability_check']
    }
  ],
  tools: [
    {
      id: 'tr-saw-circular-7.25',
      type: 'tools',
      name: '7-1/4 in. Circular Saw',
      uri: 'https://toolrental.com/circular-saw',
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0',
        provider: 'tool-rental-mcp',
        tags: ['power-tools', 'cutting', 'portable']
      },
      attributes: {
        category: 'saw',
        specifications: {
          blade_size: '7.25 inches',
          motor: '15 amp',
          max_depth_90: '2.5 inches',
          max_depth_45: '1.875 inches'
        },
        rental_pricing: {
          hourly: 15,
          daily: 45,
          weekly: 180,
          currency: 'USD'
        },
        availability: {
          in_stock: true,
          quantity: 3,
          next_available: new Date(Date.now() + 86400000).toISOString()
        }
      },
      capabilities: ['availability_check', 'reserve']
    }
  ]
};

// Active subscriptions
const subscriptions = new Map();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New MCP client connected');
  
  // Send initial handshake
  ws.send(JSON.stringify({
    id: uuidv4(),
    type: 'AUTH_RESPONSE',
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      success: true,
      capabilities: ['search', 'price_check', 'availability_check', 'subscribe']
    }
  }));

  ws.on('message', (message) => {
    try {
      const request = JSON.parse(message.toString());
      console.log('Received request:', request.type);
      
      switch (request.type) {
        case 'SEARCH_RESOURCES':
          handleSearchResources(ws, request);
          break;
          
        case 'GET_RESOURCE':
          handleGetResource(ws, request);
          break;
          
        case 'INVOKE_CAPABILITY':
          handleInvokeCapability(ws, request);
          break;
          
        case 'SUBSCRIBE':
          handleSubscribe(ws, request);
          break;
          
        case 'UNSUBSCRIBE':
          handleUnsubscribe(ws, request);
          break;
          
        case 'PING':
          ws.send(JSON.stringify({
            id: request.id,
            type: 'PONG',
            timestamp: new Date().toISOString(),
            source: 'mock-mcp-server',
            payload: { uptime: process.uptime() }
          }));
          break;
          
        default:
          ws.send(JSON.stringify({
            id: request.id,
            type: 'ERROR',
            status: 'error',
            timestamp: new Date().toISOString(),
            source: 'mock-mcp-server',
            error: {
              code: 'UNKNOWN_MESSAGE_TYPE',
              message: `Unknown message type: ${request.type}`
            }
          }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        status: 'error',
        timestamp: new Date().toISOString(),
        source: 'mock-mcp-server',
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse message'
        }
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up subscriptions for this client
    for (const [subId, sub] of subscriptions.entries()) {
      if (sub.ws === ws) {
        subscriptions.delete(subId);
      }
    }
  });
});

// Search resources handler
function handleSearchResources(ws, request) {
  const { query = '', filters = [], resourceTypes = [], pagination = {} } = request.payload;
  const { limit = 10, offset = 0 } = pagination;
  
  let results = [];
  
  // Search across all resource types
  if (!resourceTypes.length || resourceTypes.includes('lumber')) {
    results.push(...mockMaterials.lumber.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.attributes.species.toLowerCase().includes(query.toLowerCase())
    ));
  }
  
  if (!resourceTypes.length || resourceTypes.includes('hardware')) {
    results.push(...mockMaterials.hardware.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.attributes.category.toLowerCase().includes(query.toLowerCase())
    ));
  }
  
  if (!resourceTypes.length || resourceTypes.includes('tools')) {
    results.push(...mockMaterials.tools.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.attributes.category.toLowerCase().includes(query.toLowerCase())
    ));
  }
  
  // Apply filters
  filters.forEach(filter => {
    results = results.filter(item => {
      const value = getNestedValue(item, filter.field);
      switch (filter.operator) {
        case 'eq': return value === filter.value;
        case 'lt': return value < filter.value;
        case 'gt': return value > filter.value;
        case 'in': return filter.value.includes(value);
        case 'contains': return String(value).includes(filter.value);
        default: return true;
      }
    });
  });
  
  // Apply pagination
  const paginatedResults = results.slice(offset, offset + limit);
  
  ws.send(JSON.stringify({
    id: request.id,
    type: 'SEARCH_RESOURCES',
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      resources: paginatedResults,
      totalCount: results.length,
      nextPageToken: offset + limit < results.length ? String(offset + limit) : null
    }
  }));
}

// Get specific resource
function handleGetResource(ws, request) {
  const { providerId, resourceId } = request.payload;
  
  // Find resource across all types
  const allResources = [
    ...mockMaterials.lumber,
    ...mockMaterials.hardware,
    ...mockMaterials.tools
  ];
  
  const resource = allResources.find(r => r.id === resourceId);
  
  if (resource) {
    ws.send(JSON.stringify({
      id: request.id,
      type: 'GET_RESOURCE',
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      payload: { resource }
    }));
  } else {
    ws.send(JSON.stringify({
      id: request.id,
      type: 'GET_RESOURCE',
      status: 'error',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Resource ${resourceId} not found`
      }
    }));
  }
}

// Invoke capability
function handleInvokeCapability(ws, request) {
  const { capability, parameters } = request.payload;
  
  switch (capability) {
    case 'price_check':
      handlePriceCheck(ws, request, parameters);
      break;
      
    case 'availability_check':
      handleAvailabilityCheck(ws, request, parameters);
      break;
      
    case 'custom_cut':
      handleCustomCut(ws, request, parameters);
      break;
      
    default:
      ws.send(JSON.stringify({
        id: request.id,
        type: 'INVOKE_CAPABILITY',
        status: 'error',
        timestamp: new Date().toISOString(),
        source: 'mock-mcp-server',
        error: {
          code: 'UNKNOWN_CAPABILITY',
          message: `Unknown capability: ${capability}`
        }
      }));
  }
}

// Price check capability
function handlePriceCheck(ws, request, parameters) {
  console.log('Price check parameters received:', JSON.stringify(parameters, null, 2));
  const { resourceId, resourceIds } = parameters;
  const results = {};
  
  const allResources = [
    ...mockMaterials.lumber,
    ...mockMaterials.hardware,
    ...mockMaterials.tools
  ];
  
  // Handle both single resourceId and array of resourceIds
  const idsToCheck = resourceIds ? resourceIds : (resourceId ? [resourceId] : []);
  
  if (idsToCheck.length === 0) {
    return ws.send(JSON.stringify({
      id: request.id,
      type: 'INVOKE_CAPABILITY',
      status: 'error',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'Either resourceId or resourceIds must be provided'
      }
    }));
  }
  
  idsToCheck.forEach(id => {
    const resource = allResources.find(r => r.id === id);
    if (resource) {
      results[id] = {
        price: resource.attributes.price || resource.attributes.rental_pricing,
        lastUpdated: new Date().toISOString()
      };
    }
  });
  
  ws.send(JSON.stringify({
    id: request.id,
    type: 'INVOKE_CAPABILITY',
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      success: true,
      capability: 'price_check',
      result: results
    }
  }));
}

// Availability check capability
function handleAvailabilityCheck(ws, request, parameters) {
  const { resourceId, date } = parameters;
  
  const allResources = [
    ...mockMaterials.lumber,
    ...mockMaterials.hardware,
    ...mockMaterials.tools
  ];
  
  const resource = allResources.find(r => r.id === resourceId);
  
  if (resource) {
    ws.send(JSON.stringify({
      id: request.id,
      type: 'INVOKE_CAPABILITY',
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      payload: {
        success: true,
        capability: 'availability_check',
        result: {
          available: resource.attributes.availability.in_stock,
          locations: [resource.attributes.availability.location],
          price: resource.attributes.price?.amount || resource.attributes.rental_pricing?.daily
        }
      }
    }));
  } else {
    ws.send(JSON.stringify({
      id: request.id,
      type: 'INVOKE_CAPABILITY',
      status: 'error',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Resource ${resourceId} not found`
      }
    }));
  }
}

// Custom cut capability
function handleCustomCut(ws, request, parameters) {
  const { resourceId, cuts } = parameters;
  
  // Simulate custom cut pricing
  const pricePerCut = 0.50;
  const totalCost = cuts.reduce((sum, cut) => sum + (cut.quantity * pricePerCut), 0);
  
  ws.send(JSON.stringify({
    id: request.id,
    type: 'INVOKE_CAPABILITY',
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      success: true,
      capability: 'custom_cut',
      result: {
        cuts: cuts.map(cut => ({
          ...cut,
          pricePerCut
        })),
        totalCost,
        estimatedTime: '15 minutes',
        notes: 'Free cuts for purchases over $50'
      }
    }
  }));
}

// Subscribe to events
function handleSubscribe(ws, request) {
  const subscription = {
    ...request.payload,
    id: uuidv4(),
    ws,
    active: true
  };
  
  subscriptions.set(subscription.id, subscription);
  
  ws.send(JSON.stringify({
    id: request.id,
    type: 'SUBSCRIBE',
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      success: true,
      subscriptionId: subscription.id
    }
  }));
  
  // Simulate price changes periodically
  if (request.payload.eventTypes?.includes('price_changed')) {
    setTimeout(() => simulatePriceChange(subscription.id), 2000);
  }
}

// Unsubscribe
function handleUnsubscribe(ws, request) {
  const { subscriptionId } = request.payload;
  
  if (subscriptions.has(subscriptionId)) {
    subscriptions.delete(subscriptionId);
    ws.send(JSON.stringify({
      id: request.id,
      type: 'UNSUBSCRIBE',
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      payload: { unsubscribed: true }
    }));
  } else {
    ws.send(JSON.stringify({
      id: request.id,
      type: 'UNSUBSCRIBE',
      status: 'error',
      timestamp: new Date().toISOString(),
      source: 'mock-mcp-server',
      error: {
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: `Subscription ${subscriptionId} not found`
      }
    }));
  }
}

// Simulate price change events
function simulatePriceChange(subscriptionId) {
  const subscription = subscriptions.get(subscriptionId);
  if (!subscription || !subscription.active) return;
  
  // Pick a random lumber item
  const lumber = mockMaterials.lumber[Math.floor(Math.random() * mockMaterials.lumber.length)];
  const oldPrice = lumber.attributes.price.amount;
  const change = (Math.random() - 0.5) * 2; // -1 to 1 dollar change
  const newPrice = Math.max(1, oldPrice + change);
  
  // Update the price
  lumber.attributes.price.amount = newPrice;
  
  // Send event
  const event = {
    id: uuidv4(),
    type: 'PRICE_CHANGED',
    timestamp: new Date().toISOString(),
    source: 'mock-mcp-server',
    payload: {
      id: uuidv4(),
      type: 'price_changed',
      resourceId: lumber.id,
      resourceType: 'lumber',
      timestamp: new Date().toISOString(),
      changes: [{
        field: 'attributes.price.amount',
        oldValue: oldPrice,
        newValue: newPrice
      }]
    }
  };
  
  subscription.ws.send(JSON.stringify(event));
  
  // Schedule next price change
  if (subscription.active) {
    setTimeout(() => simulatePriceChange(subscriptionId), 15000 + Math.random() * 15000);
  }
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
} 