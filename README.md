# Blueprint Buddy

AI-powered furniture design application that transforms natural language descriptions into complete, buildable furniture plans with 3D visualization.

## 🚀 Features

- **Natural Language Design**: Describe furniture in plain English
- **Multi-Agent AI System**: Specialized agents for dimensions, materials, joinery, and validation
- **Advanced 3D Visualization**: Parametric models with exploded views and assembly animations
- **Engineering Validation**: Real structural analysis and physics validation
- **Knowledge Graph**: Built-in furniture engineering expertise
- **Cost Estimation**: Material costs calculated automatically
- **Secure Backend**: API keys stored server-side for security

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- OpenAI API key

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/hannah-ric/guerilla-furniture.git
cd guerilla-furniture

# Install dependencies
npm install

# Set up the backend
cd backend
npm install
cp env.example .env
# Edit backend/.env and add your OpenAI API key: OPENAI_API_KEY=sk-your-key

# Return to root directory
cd ..
```

### Running the Application

You need to run both the backend and frontend:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Backend will run on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend will run on http://localhost:3000
```

Visit http://localhost:3000 to start designing!

### Alternative: Run Both with One Command

```bash
# From root directory
npm run start:all
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

## �� Current Status

**Production Ready** with advanced features:
- ✅ Multi-agent AI system with 5 specialized agents
- ✅ Advanced 3D visualization with parametric models
- ✅ Secure backend API for OpenAI calls
- ✅ Real engineering validation
- ✅ Cost tracking and session management
- ⏳ User authentication (coming soon)

## 🔧 Troubleshooting

### Check Setup
Run this command to verify your setup:
```bash
npm run check-setup
```

### Common Issues

**Backend not running:**
- Make sure you have two terminals open
- Backend must be started before frontend
- Check that backend/.env has your OpenAI API key

**Dependencies missing:**
```bash
npm run install:all
```

**Port conflicts:**
- Frontend runs on port 3000
- Backend runs on port 3001
- Make sure these ports are available

## 🤝 Contributing

Contributions are welcome! Please read the development guidelines in [AGENTS.md](./AGENTS.md) before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details
