#!/bin/bash

echo "🚀 Setting up Blueprint Buddy development environment..."

# Exit on any error
set -e

# Check if we're in a Codex environment
if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "📡 Detected Codex environment - configuring proxy settings..."
    
    # Configure npm to use proxy and certificate
    npm config set proxy http://proxy:8080
    npm config set https-proxy http://proxy:8080
    npm config set ca ""
    npm config set cafile "$CODEX_PROXY_CERT"
    npm config set strict-ssl true
    
    # Export proxy environment variables for other tools
    export HTTP_PROXY=http://proxy:8080
    export HTTPS_PROXY=http://proxy:8080
    export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    
    # Add to bashrc for persistence
    echo "export HTTP_PROXY=http://proxy:8080" >> ~/.bashrc
    echo "export HTTPS_PROXY=http://proxy:8080" >> ~/.bashrc
    echo "export NODE_EXTRA_CA_CERTS=\"$CODEX_PROXY_CERT\"" >> ~/.bashrc
    
    echo "✅ Proxy configuration complete"
fi

# Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install

# Install global tools for development
echo "🔧 Installing development tools..."
npm install -g typescript@latest

# Verify installations
echo "🔍 Verifying installations..."
node --version
npm --version
npx tsc --version

# Run type checking to ensure everything is set up correctly
echo "🔎 Running type check..."
npm run typecheck

# Run linting to check code quality
echo "🧹 Running linter..."
npm run lint

# Build the project to ensure everything works
echo "🏗️ Building project..."
npm run build

echo "✅ Setup complete! You can now:"
echo "  - Start development server: npm run dev"
echo "  - Run tests: npm run test"
echo "  - Check types: npm run typecheck"
echo "  - Run linter: npm run lint"
echo ""
echo "📚 Check AGENTS.md for development guidelines"
echo "🔧 Set your OpenAI API key in environment variables before running" 