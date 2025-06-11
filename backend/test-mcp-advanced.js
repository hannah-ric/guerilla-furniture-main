import WebSocket from 'ws';

console.log('🧪 Advanced MCP Connection Test');
console.log('================================\n');

// Configuration
const MCP_SERVER_URL = 'ws://localhost:8080';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test scenarios
const testScenarios = [
  {
    name: 'Search for lumber',
    message: {
      id: '001',
      type: 'SEARCH_RESOURCES',
      timestamp: new Date().toISOString(),
      source: 'test-client',
      payload: {
        query: '2x4',
        resourceTypes: ['lumber'],
        pagination: { limit: 5 }
      }
    }
  },
  {
    name: 'Check tool availability',
    message: {
      id: '002',
      type: 'SEARCH_RESOURCES',
      timestamp: new Date().toISOString(),
      source: 'test-client',
      payload: {
        query: 'saw',
        resourceTypes: ['tools'],
        pagination: { limit: 3 }
      }
    }
  },
  {
    name: 'Get specific resource',
    message: {
      id: '003',
      type: 'GET_RESOURCE',
      timestamp: new Date().toISOString(),
      source: 'test-client',
      payload: {
        providerId: 'home-depot-mcp',
        resourceId: 'hd-lumber-2x4x8-pine'
      }
    }
  },
  {
    name: 'Check custom cut pricing',
    message: {
      id: '004',
      type: 'INVOKE_CAPABILITY',
      timestamp: new Date().toISOString(),
      source: 'test-client',
      payload: {
        capability: 'custom_cut',
        parameters: {
          resourceId: 'hd-lumber-2x4x8-pine',
          cuts: [
            { length: 48, quantity: 2 },
            { length: 24, quantity: 4 }
          ]
        }
      }
    }
  }
];

let currentScenario = 0;
let ws;

// Create WebSocket connection
try {
  ws = new WebSocket(MCP_SERVER_URL);
  
  ws.on('open', () => {
    console.log('✅ Connected to MCP server at', MCP_SERVER_URL);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('\n📥 Received:', message.type);
      
      switch (message.type) {
        case 'AUTH_RESPONSE':
          console.log('✅ Authentication successful');
          console.log('   Capabilities:', message.payload.capabilities.join(', '));
          runNextScenario();
          break;
          
        case 'SEARCH_RESOURCES':
          console.log(`✅ Search completed: ${message.payload.resources.length} results`);
          message.payload.resources.forEach((resource, index) => {
            console.log(`   ${index + 1}. ${resource.name}`);
            if (resource.attributes.price) {
              console.log(`      Price: $${resource.attributes.price.amount} ${resource.attributes.price.currency}`);
            }
            if (resource.attributes.rental_pricing) {
              console.log(`      Rental: $${resource.attributes.rental_pricing.daily}/day`);
            }
          });
          runNextScenario();
          break;
          
        case 'GET_RESOURCE':
          const resource = message.payload.resource;
          console.log('✅ Resource details:');
          console.log(`   Name: ${resource.name}`);
          console.log(`   Type: ${resource.type}`);
          console.log(`   Provider: ${resource.metadata.provider}`);
          if (resource.attributes.availability) {
            console.log(`   In Stock: ${resource.attributes.availability.in_stock}`);
            console.log(`   Location: ${resource.attributes.availability.location}`);
          }
          runNextScenario();
          break;
          
        case 'INVOKE_CAPABILITY':
          console.log('✅ Capability invoked successfully');
          console.log('   Result:', JSON.stringify(message.payload.result, null, 2));
          runNextScenario();
          break;
          
        case 'ERROR':
          console.error('❌ Error:', message.error.message);
          runNextScenario();
          break;
          
        default:
          console.log('   Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error.message);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    console.error('   Make sure the MCP server is running: npm run mcp-server');
    process.exit(1);
  });
  
  ws.on('close', () => {
    console.log('\n👋 Connection closed');
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to create WebSocket connection:', error.message);
  console.error('   Make sure the MCP server is running on', MCP_SERVER_URL);
  process.exit(1);
}

// Run test scenarios
function runNextScenario() {
  if (currentScenario >= testScenarios.length) {
    console.log('\n🎉 All scenarios tested!');
    ws.close();
    return;
  }
  
  const scenario = testScenarios[currentScenario];
  console.log(`\n📤 Testing: ${scenario.name}`);
  
  ws.send(JSON.stringify(scenario.message));
  currentScenario++;
}

// Timeout handler
setTimeout(() => {
  console.error('\n❌ Test timeout - no response from server');
  ws.close();
  process.exit(1);
}, TEST_TIMEOUT); 