#!/usr/bin/env node

/**
 * Start both frontend and backend servers
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🚀 Starting Blueprint Buddy...\n');

// Check if backend/.env exists
const backendEnvPath = join(rootDir, 'backend', '.env');
if (!existsSync(backendEnvPath)) {
  console.error('❌ Backend .env file not found!');
  console.error('Please set up the backend first:');
  console.error('  cd backend');
  console.error('  cp env.example .env');
  console.error('  # Edit .env and add your OpenAI API key');
  process.exit(1);
}

// Start backend
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['start'], {
  cwd: join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit for backend to start
setTimeout(() => {
  console.log('\n🎨 Starting frontend server...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  const cleanup = () => {
    console.log('\n\n🛑 Shutting down servers...');
    backend.kill();
    frontend.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, 2000); 