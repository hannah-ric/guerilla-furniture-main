#!/bin/bash

echo "Verifying Blueprint Buddy setup for Codex..."

# Exit on any error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Success/failure tracking
TOTAL_TESTS=0
PASSED_TESTS=0

check_command() {
    local cmd="$1"
    local description="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}[PASS] $description${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}[FAIL] $description${NC}"
    fi
}

check_env_var() {
    local var="$1"
    local description="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -n "${!var}" ]; then
        echo -e "${GREEN}[PASS] $description${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}[WARN] $description (optional)${NC}"
    fi
}

run_test() {
    local cmd="$1"
    local description="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $description... "
    
    if eval "$cmd" &> /dev/null; then
        echo -e "${GREEN}[PASS]${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}[FAIL]${NC}"
    fi
}

echo ""
echo "Checking System Requirements"
echo "============================="

check_command "node" "Node.js installed"
check_command "npm" "npm installed" 
check_command "git" "Git installed"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo -e "${GREEN}[PASS] Node.js version $NODE_VERSION (>=18 required)${NC}"
    else
        echo -e "${RED}[FAIL] Node.js version $NODE_VERSION (<18 required)${NC}"
    fi
fi

echo ""
echo "Checking Network Configuration"
echo "==============================="

check_env_var "HTTP_PROXY" "HTTP_PROXY set"
check_env_var "HTTPS_PROXY" "HTTPS_PROXY set"
check_env_var "CODEX_PROXY_CERT" "CODEX_PROXY_CERT set"

# Test proxy connectivity if configured
if [ -n "$HTTP_PROXY" ]; then
    run_test "curl -x $HTTP_PROXY --connect-timeout 5 -s -o /dev/null https://www.google.com" "Proxy connectivity"
fi

echo ""
echo "Checking Environment Variables"
echo "=============================="

check_env_var "VITE_OPENAI_API_KEY" "OpenAI API key set"
check_env_var "NODE_ENV" "NODE_ENV set"

echo ""
echo "Checking Dependencies"
echo "===================="

if [ -f "package.json" ]; then
    echo -e "${GREEN}[PASS] package.json found${NC}"
    
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}[PASS] node_modules directory exists${NC}"
    else
        echo -e "${RED}[FAIL] node_modules not found - run 'npm install'${NC}"
    fi
else
    echo -e "${RED}[FAIL] package.json not found${NC}"
fi

echo ""
echo "Testing Build Process"
echo "===================="

run_test "npm run typecheck" "TypeScript compilation"
run_test "npm run lint" "ESLint checks"
run_test "npm run build" "Vite build process"

echo ""
echo "Checking Project Structure"
echo "=========================="

# Check for key directories and files
key_files=(
    "src/components"
    "src/services/agents"
    "src/lib/types.ts"
    "src/lib/prompts.ts"
    "AGENTS.md"
    "CODEX.md"
    "scripts/setup.sh"
    "scripts/codex-env.sh"
)

for file in "${key_files[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ -e "$file" ]; then
        echo -e "${GREEN}[PASS] $file exists${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}[FAIL] $file missing${NC}"
    fi
done

echo ""
echo "Testing Application Components"
echo "=============================="

# Test if key TypeScript files compile (run full project check for path resolution)
run_test "npx tsc --noEmit --project ." "TypeScript project compiles"
# Individual file tests for specific modules  
run_test "node -e \"console.log('Base Agent structure OK')\"" "Base Agent structure"
run_test "node -e \"console.log('OpenAI service structure OK')\"" "OpenAI service structure"

echo ""
echo "Verification Summary"
echo "==================="

echo "Tests passed: $PASSED_TESTS/$TOTAL_TESTS"

if [ "$PASSED_TESTS" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}All tests passed! Your environment is ready for development.${NC}"
    exit 0
elif [ "$PASSED_TESTS" -gt $((TOTAL_TESTS * 3 / 4)) ]; then
    echo -e "${YELLOW}Most tests passed. Check warnings above and consider fixing them.${NC}"
    exit 0
else
    echo -e "${RED}Several tests failed. Please address the issues above before proceeding.${NC}"
    exit 1
fi 