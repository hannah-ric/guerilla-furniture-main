#!/bin/bash

# Blueprint Buddy - Environment Verification
# Quick verification of setup status

set -euo pipefail

# Colors
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

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check function
check() {
    local name="$1"
    local command="$2"
    local required="${3:-true}"
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
    else
        if [[ "$required" == "true" ]]; then
            echo -e "${RED}✗${NC} $name"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠${NC} $name"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

echo "Blueprint Buddy - Environment Verification"
echo "=========================================="
echo ""

# System checks
echo "System Requirements:"
check "Node.js 18+" "node --version | grep -E 'v(1[8-9]|[2-9][0-9])'"
check "npm installed" "command -v npm"
check "Git installed" "command -v git" false

echo ""

# Project checks
echo "Project Structure:"
check "package.json exists" "test -f package.json"
check "Dependencies installed" "test -d node_modules"
check "TypeScript config" "test -f tsconfig.json"
check "Vite config" "test -f vite.config.ts"
check "Source directory" "test -d src"

echo ""

# Environment checks
echo "Environment:"
check "Backend .env exists" "test -f backend/.env" false
check "Frontend .env.local exists" "test -f .env.local" false

if [[ -n "${CODEX_PROXY_CERT:-}" ]]; then
    check "Codex proxy configured" "test -n \"\$HTTP_PROXY\""
fi

echo ""

# Build checks
echo "Build Status:"
check "TypeScript compiles" "npx tsc --noEmit --skipLibCheck" false
check "ESLint passes" "npx eslint src --quiet --max-warnings 0" false

echo ""
echo "=========================================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, ${YELLOW}$WARNINGS warnings${NC}"

if [[ $FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ Environment ready for development!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Please fix the failed checks before proceeding.${NC}"
    exit 1
fi 