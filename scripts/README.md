# Blueprint Buddy - Setup Scripts

This directory contains scripts for setting up Blueprint Buddy in any environment.

## 📜 Scripts

### `setup.sh`
**Universal setup script for all environments**

Automatically detects and configures for Codex environments while supporting standard development setups.

**Features:**
- Environment detection (Codex/Standard)
- Automatic proxy configuration
- Dependency installation
- Optional validation checks
- Environment file creation

**Usage:**
```bash
# Full setup with validations (default)
bash scripts/setup.sh

# Quick setup (skip validations)
bash scripts/setup.sh quick

# Show help
bash scripts/setup.sh --help
```

### `verify-setup.sh`
**Environment verification script**

Quickly check if your environment is properly configured for Blueprint Buddy development.

**Checks:**
- System requirements (Node.js 18+, npm)
- Project structure
- Dependencies
- Environment variables
- Build status

**Usage:**
```bash
bash scripts/verify-setup.sh
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blueprint-buddy
   ```

2. **Run setup**
   ```bash
   # For Codex environments
   export VITE_OPENAI_API_KEY=sk-your-key
   bash scripts/setup.sh
   
   # For local development
   bash scripts/setup.sh
   # Then add your API key to .env.local
   ```

3. **Verify setup**
   ```bash
   bash scripts/verify-setup.sh
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

The setup script will create a `.env.local` file if none exists. Add your keys:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_SUPABASE_URL=https://your-project.supabase.co  # Optional
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key      # Optional
```

## 🌐 Codex Support

The setup script automatically detects Codex environments by checking for `$CODEX_PROXY_CERT` and configures:
- HTTP/HTTPS proxy settings
- npm proxy configuration  
- Certificate trust
- Environment variables

## ❓ Troubleshooting

### Setup Issues

**Node.js version error:**
```bash
# Install Node.js 18+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Dependency installation fails:**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
bash scripts/setup.sh
```

**TypeScript errors:**
```bash
# Check specific errors
npm run typecheck
```

### Codex-specific Issues

**Proxy connection failed:**
- Verify `$CODEX_PROXY_CERT` is set
- Check proxy connectivity: `curl -x $HTTP_PROXY https://www.google.com`

**API key not working:**
- Ensure key is set as Codex secret
- Verify with: `echo $VITE_OPENAI_API_KEY`

## 📋 Script Exit Codes

- `0` - Success
- `1` - Failure (check output for details)

The setup script logs to `/tmp/blueprint-buddy-setup.log` for debugging. 