# Blueprint Buddy

AI-powered furniture design application that transforms natural language descriptions into complete, buildable furniture plans with 3D visualization.

## 🚀 Features

- **Natural Language Design**: Describe furniture in plain English
- **Multi-Agent AI System**: Specialized agents for dimensions, materials, joinery, and validation
- **Engineering Validation**: Real structural analysis and physics validation
- **Knowledge Graph**: Built-in furniture engineering expertise
- **Cost Estimation**: Material costs calculated automatically
- **3D Preview**: Visualize designs before building

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/hannah-ric/guerilla-furniture.git
cd guerilla-furniture

# Set up environment (includes dependency installation)
npm run setup

# Add your OpenAI API key
export VITE_OPENAI_API_KEY=sk-your-api-key
# Or add to .env.local file

# Start development server
npm run dev
```

Visit http://localhost:3000 to start designing!

### For Codex Environments

The setup automatically detects and configures for Codex:

```bash
# Set API key as Codex secret
VITE_OPENAI_API_KEY=sk-your-api-key

# Run setup
bash scripts/setup.sh

# Start development
npm run dev
```

## 🏗️ Architecture

Blueprint Buddy uses a sophisticated multi-agent architecture:

- **Intent Classifier**: Routes user input to appropriate specialized agents
- **Dimension Agent**: Handles measurements and ergonomic validation
- **Material Agent**: Selects appropriate wood types and materials
- **Joinery Agent**: Recommends structural connections
- **Validation Agent**: Ensures designs are buildable and safe

See [AGENTS.md](./AGENTS.md) for detailed architecture documentation.

## 🌟 Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **AI**: OpenAI API with structured outputs
- **3D**: Three.js with React Three Fiber
- **State Management**: Custom shared state manager
- **Knowledge Base**: Built-in engineering data (span tables, material properties)

## 📝 Usage Example

1. Navigate to the Designer page (`/designer`)
2. Type: "I want to build a bookshelf for my living room"
3. Specify dimensions: "6 feet tall and 3 feet wide"
4. Choose materials: "Use pine wood"
5. The system will validate the design and suggest improvements
6. View the 3D preview and build details

## 🛠️ Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Run verification
npm run verify
```

## 🔧 Configuration

Environment variables can be set in `.env.local`:

```env
VITE_OPENAI_API_KEY=your_api_key_here
VITE_SUPABASE_URL=your_supabase_url  # Optional
VITE_SUPABASE_ANON_KEY=your_key      # Optional
```

## 🚦 Current Status

**MVP Stage** - Core functionality implemented:
- ✅ Intent classification system
- ✅ Agent coordination
- ✅ Basic UI with 3D preview
- ✅ Knowledge graph with engineering data
- ⏳ 3D model generation (placeholder)
- ⏳ PDF export
- ⏳ User authentication

## 🤝 Contributing

Contributions are welcome! Please read the development guidelines in [AGENTS.md](./AGENTS.md) before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details
