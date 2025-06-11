#!/bin/bash

# Quick test script for Codex environment
echo "Quick Blueprint Buddy environment test..."

# Basic checks
echo "Checking Node.js..."
if command -v node >/dev/null 2>&1; then
    echo "Node.js version: $(node --version)"
else
    echo "ERROR: Node.js not found"
    exit 1
fi

echo "Checking npm..."
if command -v npm >/dev/null 2>&1; then
    echo "npm version: $(npm --version)"
else
    echo "ERROR: npm not found"
    exit 1
fi

echo "Checking package.json..."
if [ -f "package.json" ]; then
    echo "package.json found"
else
    echo "ERROR: package.json not found"
    exit 1
fi

echo "Checking node_modules..."
if [ -d "node_modules" ]; then
    echo "node_modules directory exists"
else
    echo "WARNING: node_modules not found - run 'npm install'"
fi

echo "Checking environment variables..."
if [ -n "$VITE_OPENAI_API_KEY" ]; then
    echo "OpenAI API key is set"
else
    echo "WARNING: VITE_OPENAI_API_KEY not set"
fi

if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "Codex proxy certificate detected"
    echo "HTTP_PROXY: $HTTP_PROXY"
    echo "HTTPS_PROXY: $HTTPS_PROXY"
else
    echo "No proxy configuration detected"
fi

echo "Testing npm commands..."
if npm run typecheck >/dev/null 2>&1; then
    echo "TypeScript compilation: PASS"
else
    echo "TypeScript compilation: FAIL"
fi

if npm run lint >/dev/null 2>&1; then
    echo "ESLint check: PASS"
else
    echo "ESLint check: FAIL"
fi

echo "Environment test complete" 