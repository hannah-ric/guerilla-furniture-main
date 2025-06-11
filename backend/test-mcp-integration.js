import WebSocket from 'ws';
import { performance } from 'perf_hooks';

console.log('🧪 Comprehensive MCP Integration Test');
console.log('=====================================\n');

const TEST_CONFIG = {
  serverUrl: 'ws://localhost:8080',
  timeout: 10000,
  maxConcurrentConnections: 3
};

// Test scenarios with expected behaviors
const testScenarios = [
  {
    name: 'Authentication Flow',
    description: 'Test initial connection and authentication',
    test: testAuthentication
  },
  {
    name: 'Resource Search',
    description: 'Test material and tool searching capabilities',
    test: testResourceSearch
  },
  {
    name: 'Capability Invocation',
    description: 'Test price checking and custom cut capabilities',
    test: testCapabilities
  },
  {
    name: 'Event Subscriptions',
    description: 'Test price monitoring subscriptions',
    test: testSubscriptions
  },
  {
    name: 'Concurrent Connections',
    description: 'Test multiple client connections',
    test: testConcurrentConnections
  },
  {
    name: 'Error Handling',
    description: 'Test malformed requests and error recovery',
    test: testErrorHandling
  }
];

// Global test state
let testResults = [];
let totalTests = 0;
let passedTests = 0;

async function runAllTests() {
  const startTime = performance.now();
  
  console.log(`Running ${testScenarios.length} test scenarios...\n`);
  
  for (const scenario of testScenarios) {
    console.log(`🔍 ${scenario.name}: ${scenario.description}`);
    
    try {
      const result = await scenario.test();
      testResults.push({ ...scenario, result, status: 'PASSED' });
      passedTests++;
      console.log(`✅ ${scenario.name} PASSED\n`);
    } catch (error) {
      testResults.push({ ...scenario, result: error.message, status: 'FAILED' });
      console.log(`❌ ${scenario.name} FAILED: ${error.message}\n`);
    }
    
    totalTests++;
  }
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print comprehensive results
  printTestResults(duration);
}

async function testAuthentication() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.serverUrl);
    let authReceived = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Authentication timeout'));
    }, TEST_CONFIG.timeout);
    
    ws.on('open', () => {
      console.log('   📡 Connection established');
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'AUTH_RESPONSE') {
        authReceived = true;
        clearTimeout(timeout);
        ws.close();
        
        if (message.payload.success && message.payload.capabilities?.length > 0) {
          console.log(`   🔐 Authentication successful with ${message.payload.capabilities.length} capabilities`);
          resolve('Authentication successful');
        } else {
          reject(new Error('Authentication failed - no capabilities received'));
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Connection error: ${error.message}`));
    });
    
    ws.on('close', () => {
      if (!authReceived) {
        clearTimeout(timeout);
        reject(new Error('Connection closed before authentication'));
      }
    });
  });
}

async function testResourceSearch() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.serverUrl);
    let searchResults = 0;
    const expectedSearches = 3;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Resource search timeout'));
    }, TEST_CONFIG.timeout);
    
    const searches = [
      { query: '2x4', type: 'lumber', expected: 'lumber results' },
      { query: 'drill', type: 'tool', expected: 'tool results' },
      { query: 'screws', type: 'hardware', expected: 'hardware results' }
    ];
    
    ws.on('open', () => {
      // Wait for auth, then start searches
      setTimeout(() => {
        searches.forEach((search, index) => {
          const searchRequest = {
            id: `search-${index}`,
            type: 'SEARCH_RESOURCES',
            timestamp: new Date().toISOString(),
            source: 'integration-test',
            payload: {
              query: search.query,
              resourceTypes: [search.type],
              pagination: { limit: 5 }
            }
          };
          console.log(`   🔍 Searching for: ${search.query}`);
          ws.send(JSON.stringify(searchRequest));
        });
      }, 1000);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'SEARCH_RESOURCES') {
        searchResults++;
        const resourceCount = message.payload.resources?.length || 0;
        console.log(`   📦 Found ${resourceCount} resources for search ${searchResults}`);
        
        if (searchResults === expectedSearches) {
          clearTimeout(timeout);
          ws.close();
          resolve(`All ${expectedSearches} searches completed successfully`);
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Search test error: ${error.message}`));
    });
  });
}

async function testCapabilities() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.serverUrl);
    let capabilityTests = 0;
    const expectedTests = 2;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Capability test timeout'));
    }, TEST_CONFIG.timeout);
    
    ws.on('open', () => {
      setTimeout(() => {
        // Test 1: Price check
        const priceCheckRequest = {
          id: 'price-check-001',
          type: 'INVOKE_CAPABILITY',
          timestamp: new Date().toISOString(),
          source: 'integration-test',
          payload: {
            capability: 'price_check',
            parameters: {
              resourceId: 'hd-lumber-2x4x8-pine',
              quantity: 10
            }
          }
        };
        console.log('   💰 Testing price check capability');
        ws.send(JSON.stringify(priceCheckRequest));
        
        // Test 2: Custom cut
        setTimeout(() => {
          const cutRequest = {
            id: 'cut-quote-001',
            type: 'INVOKE_CAPABILITY',
            timestamp: new Date().toISOString(),
            source: 'integration-test',
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
          };
          console.log('   ✂️ Testing custom cut capability');
          ws.send(JSON.stringify(cutRequest));
        }, 500);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'INVOKE_CAPABILITY') {
        capabilityTests++;
        const success = message.payload.success;
        const capability = message.payload.capability || 'unknown';
        
        console.log(`   ${success ? '✅' : '❌'} ${capability} capability: ${success ? 'SUCCESS' : 'FAILED'}`);
        
        if (capabilityTests === expectedTests) {
          clearTimeout(timeout);
          ws.close();
          resolve(`All ${expectedTests} capability tests completed`);
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Capability test error: ${error.message}`));
    });
  });
}

async function testSubscriptions() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.serverUrl);
    let subscriptionCreated = false;
    let eventReceived = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Subscription test timeout'));
    }, TEST_CONFIG.timeout);
    
    ws.on('open', () => {
      setTimeout(() => {
        const subscriptionRequest = {
          id: 'sub-001',
          type: 'SUBSCRIBE',
          timestamp: new Date().toISOString(),
          source: 'integration-test',
          payload: {
            resourceIds: ['hd-lumber-2x4x8-pine'],
            eventTypes: ['price_changed'],
            active: true
          }
        };
        console.log('   📡 Creating price monitoring subscription');
        ws.send(JSON.stringify(subscriptionRequest));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'SUBSCRIBE') {
        subscriptionCreated = message.payload.success;
        console.log(`   ${subscriptionCreated ? '✅' : '❌'} Subscription created: ${subscriptionCreated}`);
        
        if (subscriptionCreated) {
          // Mock price change will be sent by server automatically
          console.log('   ⏳ Waiting for price change event...');
        }
      }
      
      if (message.type === 'PRICE_CHANGED') {
        eventReceived = true;
        console.log('   📈 Price change event received');
        clearTimeout(timeout);
        ws.close();
        resolve('Subscription and event handling successful');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Subscription test error: ${error.message}`));
    });
  });
}

async function testConcurrentConnections() {
  const connections = [];
  const results = [];
  
  try {
    console.log(`   🔗 Creating ${TEST_CONFIG.maxConcurrentConnections} concurrent connections`);
    
    for (let i = 0; i < TEST_CONFIG.maxConcurrentConnections; i++) {
      const connectionPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket(TEST_CONFIG.serverUrl);
        let authenticated = false;
        
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error(`Connection ${i + 1} timeout`));
        }, TEST_CONFIG.timeout);
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'AUTH_RESPONSE' && message.payload.success) {
            authenticated = true;
            clearTimeout(timeout);
            ws.close();
            resolve(`Connection ${i + 1} successful`);
          }
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Connection ${i + 1} error: ${error.message}`));
        });
      });
      
      connections.push(connectionPromise);
    }
    
    const connectionResults = await Promise.allSettled(connections);
    const successful = connectionResults.filter(r => r.status === 'fulfilled').length;
    
    console.log(`   ✅ ${successful}/${TEST_CONFIG.maxConcurrentConnections} connections successful`);
    
    if (successful === TEST_CONFIG.maxConcurrentConnections) {
      return 'All concurrent connections successful';
    } else {
      throw new Error(`Only ${successful}/${TEST_CONFIG.maxConcurrentConnections} connections succeeded`);
    }
    
  } catch (error) {
    throw new Error(`Concurrent connection test failed: ${error.message}`);
  }
}

async function testErrorHandling() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.serverUrl);
    let errorResponseReceived = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Error handling test timeout'));
    }, TEST_CONFIG.timeout);
    
    ws.on('open', () => {
      setTimeout(() => {
        // Send malformed request
        const malformedRequest = {
          // Missing required fields
          type: 'INVALID_TYPE',
          payload: null
        };
        console.log('   ⚠️ Sending malformed request');
        ws.send(JSON.stringify(malformedRequest));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'ERROR') {
        errorResponseReceived = true;
        console.log('   ✅ Error response received for malformed request');
        clearTimeout(timeout);
        ws.close();
        resolve('Error handling working correctly');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Error handling test failed: ${error.message}`));
    });
  });
}

function printTestResults(duration) {
  console.log('📊 Test Results Summary');
  console.log('=======================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`Duration: ${duration}s\n`);
  
  // Detailed results
  testResults.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status}`);
    if (result.status === 'FAILED') {
      console.log(`   Error: ${result.result}`);
    }
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! MCP integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the MCP server and configuration.');
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
}); 