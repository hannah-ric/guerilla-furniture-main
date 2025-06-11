#!/bin/bash

# Codex Environment Configuration Script
# This script configures the environment specifically for Codex development

echo "🔧 Configuring Codex environment for Blueprint Buddy..."

# Set application environment variables
export NODE_ENV=development
export VITE_APP_VERSION=0.1.0
export VITE_APP_NAME="Blueprint Buddy"

# Configure proxy settings if in Codex environment
if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "📡 Configuring proxy settings for Codex..."
    
    export HTTP_PROXY=http://proxy:8080
    export HTTPS_PROXY=http://proxy:8080
    export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    
    # Configure npm
    npm config set proxy http://proxy:8080
    npm config set https-proxy http://proxy:8080
    npm config set cafile "$CODEX_PROXY_CERT"
    npm config set strict-ssl true
    
    echo "✅ Proxy configuration complete"
else
    echo "ℹ️  No proxy configuration needed (not in Codex environment)"
fi

# Verify OpenAI API key is set
if [ -z "$VITE_OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: VITE_OPENAI_API_KEY not set"
    echo "   Set your OpenAI API key as a Codex secret or environment variable"
    echo "   Example: export VITE_OPENAI_API_KEY=sk-your-key-here"
fi

# Display configuration summary
echo ""
echo "📋 Environment Configuration Summary:"
echo "   NODE_ENV: $NODE_ENV"
echo "   HTTP_PROXY: $HTTP_PROXY"
echo "   HTTPS_PROXY: $HTTPS_PROXY"
echo "   CODEX_PROXY_CERT: $CODEX_PROXY_CERT"
echo "   OpenAI API Key: ${VITE_OPENAI_API_KEY:+Set ✅}${VITE_OPENAI_API_KEY:-Not Set ❌}"
echo ""
echo "🚀 Environment ready for development!" 