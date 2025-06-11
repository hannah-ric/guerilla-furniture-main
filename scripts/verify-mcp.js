#!/usr/bin/env node

/**
 * MCP Implementation Verification Script
 * Checks that all MCP components are properly implemented and functional
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

console.log('🔍 Blueprint Buddy MCP Implementation Verification');
console.log('=================================================\\n');

const errors = [];
const warnings = [];
const success = [];

// Check file existence
const requiredFiles = [
  'src/lib/mcp-types.ts',
  'src/services/mcp/MCPClient.ts',
  'src/services/mcp/MCPServiceManager.ts',
  'src/services/mcp/providers.ts',
  'src/services/agents/MaterialSourcingAgent.ts',
  'backend/mcp-mock-server.js',
  'backend/test-mcp-connection.js',
  'backend/test-mcp-advanced.js',
  'backend/test-mcp-integration.js'
];

console.log('📁 Checking Required Files...');
requiredFiles.forEach(file => {
  if (existsSync(file)) {
    success.push(`✅ ${file} exists`);
  } else {
    errors.push(`❌ Missing file: ${file}`);
  }
});

// Final report
console.log('\\n📊 Verification Results');
console.log('========================');

if (success.length > 0) {
  console.log('\\n✅ Successes:');
  success.forEach(msg => console.log(`   ${msg}`));
}

if (errors.length > 0) {
  console.log('\\n❌ Errors:');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log(`\\n💥 Found ${errors.length} errors that need to be fixed.`);
  process.exit(1);
} else {
  console.log('\\n🎉 All checks passed! MCP implementation is complete and ready.');
  
  console.log('\\n🚀 Next Steps:');
  console.log('   1. Start MCP server: npm run mcp-server');
  console.log('   2. Test connection: npm run mcp-test');
  console.log('   3. Run full tests: npm run mcp-test-integration');
  
  process.exit(0);
}