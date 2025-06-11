#!/bin/bash

# Codex Environment Configuration Script
echo "Configuring Blueprint Buddy for Codex environment..."

# Set basic environment variables
NODE_ENV=development
VITE_APP_VERSION=0.1.0
VITE_APP_NAME="Blueprint Buddy"

export NODE_ENV
export VITE_APP_VERSION
export VITE_APP_NAME

# Check if we're in a Codex environment
if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "Detected Codex environment - configuring proxy..."
    
    # Set proxy environment variables
    HTTP_PROXY=http://proxy:8080
    HTTPS_PROXY=http://proxy:8080
    NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    
    export HTTP_PROXY
    export HTTPS_PROXY
    export NODE_EXTRA_CA_CERTS
    
    # Configure npm for proxy
    npm config set proxy http://proxy:8080
    npm config set https-proxy http://proxy:8080
    npm config set cafile "$CODEX_PROXY_CERT"
    npm config set strict-ssl true
    
    echo "Proxy configuration complete"
else
    echo "No proxy configuration needed"
fi

# Check OpenAI API key
if [ -z "$VITE_OPENAI_API_KEY" ]; then
    echo "WARNING: VITE_OPENAI_API_KEY not set"
    echo "Please set your OpenAI API key as a Codex secret"
else
    echo "OpenAI API key is configured"
fi

echo "Environment configuration complete" 