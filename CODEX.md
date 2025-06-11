# Blueprint Buddy - Codex Configuration

## 🚀 Quick Setup for Codex

This document provides configuration details for running Blueprint Buddy in Codex environments.

## 📋 Environment Variables

### Required Secrets
Set these as **Codex Secrets** (they will be available during setup but removed during agent execution for security):

```bash
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

### Optional Environment Variables
```bash
NODE_ENV=development
VITE_APP_VERSION=0.1.0
VITE_APP_NAME="Blueprint Buddy"

# Supabase (optional for MVP)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🔧 Setup Script

The setup script `scripts/setup.sh` automatically:
- Detects Codex environment and configures proxy settings
- Installs all Node.js dependencies
- Configures npm for proxy usage
- Installs development tools
- Runs verification steps (type checking, linting, building)

Run with:
```bash
bash scripts/setup.sh
```

## 🌐 Network & Proxy Configuration

### Automatic Proxy Detection
The application automatically detects Codex environments and configures:
- npm proxy settings
- Certificate trust configuration
- Environment variable propagation

### Manual Configuration
If automatic configuration fails, manually configure:
```bash
# Source the environment script
source scripts/codex-env.sh

# Or manually set proxy
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
```

## 🏗️ Development Workflow

### Initial Setup
1. Ensure OpenAI API key is set as a Codex secret
2. Run the setup script: `bash scripts/setup.sh`
3. Quick environment test: `npm run test:env`
4. Full verification: `npm run verify:full`
5. Verify environment: `source scripts/codex-env.sh`

### Development Commands
```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Code linting
npm run lint

# Build verification
npm run build

# Run tests (when available)
npm run test

# Quick environment test
npm run test:env

# Full verification
npm run verify:full
```

### Working with Agents
The application uses a multi-agent AI architecture. When developing:

1. **Review Agent Documentation**: Check `AGENTS.md` for architecture details
2. **Test Agent Communication**: Use the designer interface at `/designer`
3. **Monitor API Costs**: OpenAI API usage is tracked and logged
4. **Validate Responses**: All agent responses should follow the standard format

## 🔍 Debugging & Troubleshooting

### Common Issues

#### OpenAI API Connection Issues
```bash
# Check proxy configuration
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $NODE_EXTRA_CA_CERTS

# Test connectivity
curl -x $HTTP_PROXY https://api.openai.com/v1/models
```

#### Build Failures
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

#### Type Errors
```bash
# Run type checker
npm run typecheck

# Check specific file
npx tsc --noEmit src/path/to/file.ts
```

### Verification Steps
After setup, verify the environment:
```bash
# Check Node.js and npm versions
node --version  # Should be >= 18
npm --version   # Should be >= 8

# Verify TypeScript
npx tsc --version

# Test build process
npm run build

# Check if development server starts
npm run dev  # Should start on http://localhost:3000
```

## 📊 Performance Considerations

### API Cost Management
- OpenAI API calls are tracked and logged
- Use `gpt-3.5-turbo` for cost-effective development
- Monitor usage in the browser console

### Bundle Size
- Current build size: ~2MB compressed
- 3D libraries (Three.js) are the largest components
- Use code splitting for optimization

### Memory Usage
- Shared state manager handles complex object graphs
- Knowledge graph data is cached in memory
- Monitor browser dev tools for memory leaks

## 🚨 Security Notes

### API Key Security
- OpenAI API key should be set as a Codex secret
- Never commit API keys to version control
- In production, move API calls to backend services

### Browser Security
- `dangerouslyAllowBrowser: true` is used for MVP
- This should be removed in production
- Use proper backend proxy for API calls

## 📚 Testing Strategy

### Manual Testing Checklist
- [ ] Designer interface loads correctly
- [ ] Chat interface accepts input
- [ ] AI responses are generated (with valid API key)
- [ ] 3D preview displays placeholder models
- [ ] Validation results show in the validation tab
- [ ] Build plans display correctly
- [ ] No console errors

### Automated Testing
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests (when implemented)
npm run test

# Build verification
npm run build
```

## 🔄 Continuous Integration

For Codex environments, the workflow is:
1. Environment setup via `scripts/setup.sh`
2. Dependency installation with proxy configuration
3. Type checking and linting verification
4. Build process validation
5. Runtime testing with sample inputs

## 📞 Support & Documentation

- **Agent Documentation**: See `AGENTS.md`
- **Architecture Overview**: Multi-agent system with shared state
- **API Documentation**: OpenAI integration with structured outputs
- **UI Components**: shadcn/ui with Tailwind CSS

## 🎯 Key Files for Development

```
├── AGENTS.md              # Agent development guide
├── scripts/setup.sh       # Codex setup script
├── scripts/codex-env.sh   # Environment configuration
├── src/services/agents/   # AI agent implementations
├── src/services/api/      # OpenAI API integration
├── src/lib/types.ts       # TypeScript type definitions
├── src/lib/prompts.ts     # AI prompt templates
└── package.json           # Dependencies and scripts
```

This configuration ensures Blueprint Buddy works seamlessly in Codex environments with proper proxy handling, dependency management, and development tooling. 