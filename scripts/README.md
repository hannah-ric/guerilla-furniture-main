# Blueprint Buddy - Setup Scripts

This directory contains scripts for setting up and configuring Blueprint Buddy in various environments, particularly Codex.

## 📜 Scripts Overview

### `setup.sh`
**Main setup script for Codex environments**

- Detects Codex environment automatically
- Configures proxy settings and certificates
- Installs all dependencies
- Runs verification tests
- Sets up development tools

**Usage:**
```bash
bash scripts/setup.sh
# or
npm run setup
```

### `codex-env.sh`
**Environment configuration for Codex**

- Sets environment variables
- Configures proxy settings
- Validates OpenAI API key availability
- Displays configuration summary

**Usage:**
```bash
source scripts/codex-env.sh
# or
npm run setup:codex
```

### `verify-setup.sh`
**Complete environment verification**

- Checks system requirements
- Validates network configuration
- Tests build process
- Verifies project structure
- Provides detailed pass/fail report

**Usage:**
```bash
bash scripts/verify-setup.sh
# or
npm run verify:full
```

## 🚀 Quick Start for Codex

1. **Set your OpenAI API key as a Codex secret:**
   ```
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

2. **Run the setup script:**
   ```bash
   bash scripts/setup.sh
   ```

3. **Verify everything is working:**
   ```bash
   bash scripts/verify-setup.sh
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

## 🔧 Manual Configuration

If automatic setup fails, you can manually configure:

```bash
# Set environment variables
source scripts/codex-env.sh

# Install dependencies
npm install

# Verify setup
npm run verify
```

## 🌐 Proxy Configuration

The scripts automatically handle Codex proxy configuration:

- **Automatic Detection**: Uses `$CODEX_PROXY_CERT` environment variable
- **npm Configuration**: Sets proxy and certificate settings
- **Environment Variables**: Exports HTTP_PROXY, HTTPS_PROXY, NODE_EXTRA_CA_CERTS
- **Persistence**: Adds settings to ~/.bashrc

## ✅ Verification Checklist

The verification script checks:

- [x] Node.js >= 18
- [x] npm installed
- [x] Proxy configuration (if in Codex)
- [x] OpenAI API key set
- [x] Dependencies installed
- [x] TypeScript compilation
- [x] ESLint passes
- [x] Build completes successfully
- [x] Project structure intact

## 🐛 Troubleshooting

### Common Issues

**Proxy Connection Failed:**
```bash
# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Test connectivity
curl -x $HTTP_PROXY https://api.openai.com/v1/models
```

**Build Failures:**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Missing Dependencies:**
```bash
# Reinstall everything
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. Run the verification script: `npm run verify:full`
2. Check the console output for specific errors
3. Review the AGENTS.md and CODEX.md documentation
4. Ensure your OpenAI API key is properly set

## 📋 Script Dependencies

These scripts require:
- bash shell
- Node.js >= 18
- npm >= 8
- curl (for connectivity tests)
- Standard Unix utilities (chmod, grep, etc.)

All requirements are typically available in Codex environments by default. 