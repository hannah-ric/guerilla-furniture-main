#!/bin/bash

# Blueprint Buddy - Universal Setup Script
# Enterprise-grade setup for all environments including Codex

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="Blueprint Buddy Setup"
readonly LOG_FILE="/tmp/blueprint-buddy-setup.log"
readonly QUICK_MODE="${1:-full}"

# Colors for output (when supported)
if [[ -t 1 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly NC='\033[0m'
else
    readonly RED=''
    readonly GREEN=''
    readonly YELLOW=''
    readonly NC=''
fi

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

# Environment detection
detect_environment() {
    if [[ -n "${CODEX_PROXY_CERT:-}" ]]; then
        log "Codex environment detected"
        setup_codex_proxy
    else
        log "Standard environment detected"
    fi
}

# Codex proxy configuration
setup_codex_proxy() {
    export HTTP_PROXY="http://proxy:8080"
    export HTTPS_PROXY="http://proxy:8080"
    export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    
    # Configure npm silently
    npm config set proxy "$HTTP_PROXY" --silent 2>/dev/null || true
    npm config set https-proxy "$HTTPS_PROXY" --silent 2>/dev/null || true
    npm config set cafile "$CODEX_PROXY_CERT" --silent 2>/dev/null || true
    npm config set strict-ssl true --silent 2>/dev/null || true
}

# Check prerequisites
check_prerequisites() {
    local has_errors=false
    
    # Node.js check
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d'v' -f2)
        log "Node.js v${node_version} detected"
        
        local required_major=18
        local actual_major=$(echo "$node_version" | cut -d'.' -f1)
        
        if [[ $actual_major -lt $required_major ]]; then
            error "Node.js ${required_major}+ required (found v${node_version})"
            has_errors=true
        fi
    else
        error "Node.js not found - please install Node.js 18+"
        has_errors=true
    fi
    
    # npm check
    if ! command -v npm >/dev/null 2>&1; then
        error "npm not found"
        has_errors=true
    fi
    
    # Backend setup check
    if [[ ! -f "backend/.env" ]]; then
        warn "Backend .env not found - AI features will not work. Run: cd backend && cp env.example .env"
    fi
    
    if [[ "$has_errors" == "true" ]]; then
        error "Prerequisites check failed"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Check if already installed
    if [[ -f "node_modules/.package-lock.json" ]] && [[ "$QUICK_MODE" == "quick" ]]; then
        log "Dependencies already installed (quick mode)"
        return 0
    fi
    
    # Clean install for consistency
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Install with appropriate verbosity
    if [[ "$QUICK_MODE" == "quick" ]]; then
        npm install --silent --no-progress --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE" >/dev/null
    else
        npm install --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE"
    fi
    
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
        error "Dependency installation failed"
        exit 1
    fi
    
    log "Dependencies installed successfully"
}

# Run validations
run_validations() {
    if [[ "$QUICK_MODE" == "quick" ]]; then
        log "Skipping validations (quick mode)"
        return 0
    fi
    
    log "Running validations..."
    
    # TypeScript check
    if npx tsc --noEmit --skipLibCheck >/dev/null 2>&1; then
        log "TypeScript validation passed"
    else
        warn "TypeScript validation found issues - run 'npm run typecheck' for details"
    fi
    
    # Quick lint check
    if npx eslint src --quiet --max-warnings 0 >/dev/null 2>&1; then
        log "ESLint validation passed"
    else
        warn "ESLint found issues - run 'npm run lint' for details"
    fi
}

# Create environment files if needed
setup_environment_files() {
    # Frontend environment (optional)
    if [[ ! -f ".env.local" ]]; then
        log "Creating frontend .env.local file..."
        cat > .env.local << EOF
# Blueprint Buddy Frontend Environment Variables
# Backend URL (default is usually fine)
VITE_BACKEND_URL=http://localhost:3001

# Optional Supabase configuration:
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
EOF
        log "Created .env.local"
    fi
    
    # Backend environment setup reminder
    if [[ ! -f "backend/.env" ]]; then
        warn "Backend .env not found - please set up:"
        warn "  cd backend"
        warn "  cp env.example .env"
        warn "  # Edit .env and add your OpenAI API key"
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    log "Starting $SCRIPT_NAME..."
    log "Mode: ${QUICK_MODE}"
    
    # Setup steps
    detect_environment
    check_prerequisites
    install_dependencies
    run_validations
    setup_environment_files
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Success message
    log "Setup completed in ${duration}s"
    echo ""
    echo -e "${GREEN}✅ Blueprint Buddy is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up backend: cd backend && cp env.example .env"
    echo "2. Add your OpenAI API key to backend/.env"
    echo "3. Start servers: npm run start:all"
    echo "4. Open http://localhost:3000"
    echo ""
    
    if [[ -n "${CODEX_PROXY_CERT:-}" ]]; then
        echo "Codex environment configured ✓"
    fi
}

# Error handling
trap 'error "Setup failed on line $LINENO"; exit 1' ERR

# Help message
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [quick|full]"
    echo "  quick - Fast setup, skip validations"
    echo "  full  - Complete setup with validations (default)"
    exit 0
fi

# Execute
main "$@" 