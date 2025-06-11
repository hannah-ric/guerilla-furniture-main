#!/bin/bash

# Blueprint Buddy - Optimization Script
# Removes unused dependencies and optimizes the build

set -euo pipefail

# Colors
if [[ -t 1 ]]; then
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly RED='\033[0;31m'
    readonly NC='\033[0m'
else
    readonly GREEN=''
    readonly YELLOW=''
    readonly RED=''
    readonly NC=''
fi

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    error "node_modules not found. Please run 'npm install' first."
    exit 1
fi

log "Starting optimization process..."

# Remove unused dependencies
log "Removing unused dependencies..."
UNUSED_DEPS=(
    "@radix-ui/react-dialog"
    "@radix-ui/react-dropdown-menu"
    "@radix-ui/react-label"
    "@radix-ui/react-popover"
    "@radix-ui/react-select"
    "@radix-ui/react-separator"
    "@radix-ui/react-switch"
    "@radix-ui/react-tooltip"
    "zustand"
)

UNUSED_DEV_DEPS=(
    "rimraf"
)

# Remove unused dependencies
for dep in "${UNUSED_DEPS[@]}"; do
    if npm ls "$dep" >/dev/null 2>&1; then
        log "Removing $dep..."
        npm uninstall "$dep" --no-audit --no-fund
    fi
done

# Remove unused dev dependencies
for dep in "${UNUSED_DEV_DEPS[@]}"; do
    if npm ls "$dep" >/dev/null 2>&1; then
        log "Removing dev dependency $dep..."
        npm uninstall "$dep" --save-dev --no-audit --no-fund
    fi
done

# Update package-lock.json
log "Updating package-lock.json..."
npm install --package-lock-only --no-audit --no-fund

# Clean dist folder
log "Cleaning dist folder..."
rm -rf dist

# Run final build
log "Running optimized build..."
npm run build

# Display results
echo ""
log "Optimization complete!"
echo ""
echo "Bundle Analysis:"
if [[ -f "dist/index.html" ]]; then
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}✓${NC} Total build size: $BUNDLE_SIZE"
    
    # Count JS chunks
    JS_COUNT=$(find dist -name "*.js" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓${NC} JavaScript chunks: $JS_COUNT"
    
    # Largest files
    echo -e "\nLargest files:"
    find dist -type f -exec du -h {} + | sort -rh | head -5
fi

echo ""
warn "Next steps for further optimization:"
echo "1. Consider code splitting for large components"
echo "2. Implement service worker for caching"
echo "3. Use dynamic imports for routes"
echo "4. Enable tree shaking in production"
echo "5. Consider moving Three.js operations to a web worker" 