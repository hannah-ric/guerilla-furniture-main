#!/usr/bin/env node

/**
 * Quick check to ensure Blueprint Buddy is properly set up
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🔍 Checking Blueprint Buddy setup...\n');

let hasErrors = false;

// Check Node version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 18) {
    console.error('❌ Node.js 18+ required (found ' + nodeVersion + ')');
    hasErrors = true;
  } else {
    console.log('✅ Node.js version: ' + nodeVersion);
  }
} catch (e) {
  console.error('❌ Could not check Node.js version');
  hasErrors = true;
}

// Check if frontend dependencies are installed
if (!existsSync(join(rootDir, 'node_modules'))) {
  console.error('❌ Frontend dependencies not installed. Run: npm install');
  hasErrors = true;
} else {
  console.log('✅ Frontend dependencies installed');
}

// Check if backend dependencies are installed
if (!existsSync(join(rootDir, 'backend', 'node_modules'))) {
  console.error('❌ Backend dependencies not installed. Run: npm run backend:install');
  hasErrors = true;
} else {
  console.log('✅ Backend dependencies installed');
}

// Check if backend .env exists
if (!existsSync(join(rootDir, 'backend', '.env'))) {
  console.error('❌ Backend .env not configured');
  console.log('   To fix:');
  console.log('   cd backend');
  console.log('   cp env.example .env');
  console.log('   # Edit .env and add your OpenAI API key');
  hasErrors = true;
} else {
  // Check if API key is set
  try {
    const envContent = require('fs').readFileSync(join(rootDir, 'backend', '.env'), 'utf8');
    if (!envContent.includes('OPENAI_API_KEY=sk-')) {
      console.error('❌ OpenAI API key not set in backend/.env');
      hasErrors = true;
    } else {
      console.log('✅ Backend .env configured');
    }
  } catch (e) {
    console.error('❌ Could not read backend/.env');
    hasErrors = true;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Setup incomplete. Please fix the issues above.');
  console.log('\nQuick setup commands:');
  console.log('  npm run install:all    # Install all dependencies');
  console.log('  cd backend && cp env.example .env');
  console.log('  # Edit backend/.env and add your OpenAI API key');
  process.exit(1);
} else {
  console.log('\n✅ Setup complete! You can now run:');
  console.log('  npm run start:all    # Start both frontend and backend');
  console.log('  # OR run separately:');
  console.log('  npm run backend      # Terminal 1');
  console.log('  npm run dev          # Terminal 2');
} 