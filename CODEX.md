# Blueprint Buddy - Codex Configuration

This document provides Codex-specific configuration details for Blueprint Buddy.

## 🚀 Quick Setup

1. **Set OpenAI API key as Codex secret:**
   ```
   VITE_OPENAI_API_KEY=sk-your-openai-api-key
   ```

2. **Run setup:**
   ```bash
   bash scripts/setup.sh
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

## 🌐 Automatic Proxy Configuration

The setup script automatically detects Codex environments and configures:
- HTTP/HTTPS proxy settings via `$CODEX_PROXY_CERT`
- npm proxy configuration
- Certificate trust for secure connections
- Node.js environment variables

No manual proxy configuration needed - it's all handled automatically!

## 📋 Environment Variables

### Required Secrets
Set as **Codex Secrets** (available during setup, removed during execution for security):
- `VITE_OPENAI_API_KEY` - Your OpenAI API key (required)

### Optional Variables
- `VITE_SUPABASE_URL` - Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (optional)

## 🔍 Verification

After setup, verify your environment:
```bash
npm run verify
```

This checks:
- Node.js version (18+ required)
- Dependencies installed
- TypeScript compilation
- Environment variables
- Proxy configuration (if in Codex)

## ⚡ Performance Tips

For faster Codex startup:
```bash
# Quick setup (skips validations)
npm run setup:quick

# Full setup (with validations)
npm run setup
```

## 🔧 Troubleshooting

### Proxy Issues
If you encounter proxy errors:
1. Verify `$CODEX_PROXY_CERT` is set
2. Check proxy connectivity: `curl -x $HTTP_PROXY https://www.google.com`
3. Run setup again: `bash scripts/setup.sh`

### API Key Issues
- Ensure key is set as Codex secret (not in code)
- Verify with: `echo $VITE_OPENAI_API_KEY | head -c 10`
- Check key starts with `sk-`

### Build Issues
```bash
# Clean and rebuild
npm run clean
npm run setup
npm run build
```

## 📊 Resource Usage

Blueprint Buddy is optimized for Codex environments:
- **Setup time**: ~30s (quick mode) or ~60s (full mode)
- **Memory usage**: ~200MB during development
- **Disk space**: ~250MB including dependencies

## 🚀 Next Steps

After setup:
1. Open the designer: http://localhost:3000/designer
2. Start designing furniture with AI assistance
3. Check the 3D preview and validation tabs
4. Export your build plans

For development details, see [AGENTS.md](./AGENTS.md) 