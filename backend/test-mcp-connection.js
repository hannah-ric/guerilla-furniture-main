import WebSocket from 'ws';

// Test WebSocket connection to MCP mock server
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to MCP server');
  
  // Send a test search request
  const searchRequest = {
    id: '123',
    type: 'SEARCH_RESOURCES',
    timestamp: new Date().toISOString(),
    source: 'test-client',
    payload: {
      query: '2x4',
      resourceTypes: ['lumber'],
      pagination: { limit: 5 }
    }
  };
  
  console.log('📤 Sending search request:', searchRequest.payload.query);
  ws.send(JSON.stringify(searchRequest));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Received message:', message.type);
  
  if (message.type === 'AUTH_RESPONSE') {
    console.log('   Authentication successful, capabilities:', message.payload.capabilities);
  } else if (message.type === 'SEARCH_RESOURCES') {
    console.log('   Search results:', message.payload.resources.length, 'items found');
    message.payload.resources.forEach(resource => {
      console.log(`   - ${resource.name} ($${resource.attributes.price.amount})`);
    });
    
    // Close connection after successful test
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
  process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('❌ Test timeout - no response from server');
  ws.close();
  process.exit(1);
}, 5000); 