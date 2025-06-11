# Blueprint Buddy - Agent Development Guide

## 🏗️ Application Overview

Blueprint Buddy is an AI-powered furniture design application that transforms natural language descriptions into complete, buildable furniture plans with 3D visualization. It uses a sophisticated multi-agent architecture to handle different aspects of furniture design.

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **AI**: OpenAI API with structured outputs
- **3D**: Three.js with React Three Fiber
- **State Management**: Custom shared state manager
- **Backend**: Supabase (optional for MVP)

## 📁 Project Structure

```
src/
├── components/          # React UI components
│   ├── chat/           # Chat interface components
│   ├── details/        # Build plan details
│   ├── shared/         # Shared/common components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   └── viewer/         # 3D viewer components
├── hooks/              # Custom React hooks
├── lib/                # Core utilities and types
├── pages/              # Main application pages
├── services/           # Core business logic
│   ├── 3d/            # 3D model generation
│   ├── agents/        # AI agent implementations
│   ├── api/           # External API services
│   ├── cohesion/      # Agent coordination
│   ├── knowledge/     # Knowledge graph and data
│   ├── orchestrator/  # Agent orchestration
│   └── state/         # Shared state management
└── supabase/          # Database migrations and functions
```

## 🤖 Multi-Agent Architecture

The application uses specialized AI agents that work together:

### Core Agents
1. **IntentClassifier**: Routes user input to appropriate agents
2. **DimensionAgent**: Handles measurements and ergonomic validation
3. **MaterialAgent**: Selects appropriate wood types and materials
4. **JoineryAgent**: Recommends structural connections
5. **ValidationAgent**: Ensures designs are buildable and safe

### Agent Communication
- All agents extend the base `Agent` class
- Agents communicate through a shared state manager
- The `CohesionCoordinator` resolves conflicts between agents
- Each agent has specific `interestedEvents` they subscribe to

## 🛠️ Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow React best practices with hooks
- Use Tailwind CSS for styling
- Implement proper error boundaries
- Add comprehensive logging with the Logger utility

### Testing Requirements
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

### API Integration
- All OpenAI calls go through the `openAIService`
- Use structured outputs with Zod schemas
- Implement proper error handling and fallbacks
- Track API costs and usage

## 🔧 Working with Agents

### Creating New Agents
1. Extend the base `Agent` class in `src/services/agents/base/Agent.ts`
2. Implement required methods: `canHandle()`, `process()`
3. Define `interestedEvents` for the agent
4. Add appropriate Zod schemas for structured outputs
5. Register the agent in the orchestrator

### Agent Response Format
```typescript
interface AgentResponse {
  success: boolean;
  data: any;
  suggestions?: string[];
  validation_issues?: string[];
  next_steps?: string[];
  confidence?: number;
}
```

### Prompt Engineering
- All prompts are centralized in `src/lib/prompts.ts`
- Use the `formatPrompt()` utility for variable substitution
- Include context, constraints, and expected output format
- Implement fallback strategies for API failures

## 🎯 Key Development Areas

### High Priority
- **Agent Responses**: Ensure all agents return proper structured data
- **Error Handling**: Implement comprehensive error boundaries
- **State Synchronization**: Keep shared state consistent across agents
- **Cost Optimization**: Minimize API calls and track usage

### Feature Development
- **3D Model Generation**: Currently placeholder - needs implementation
- **PDF Export**: Generate downloadable build plans
- **User Authentication**: Supabase integration for saved designs
- **Advanced Validation**: Structural engineering calculations

## 🧪 Testing Strategy

### Unit Tests
- Test individual agent logic
- Mock OpenAI API responses
- Validate state transformations

### Integration Tests
- Test agent communication
- Verify end-to-end workflows
- Test error handling scenarios

### Manual Testing
- Use the designer interface at `/designer`
- Test various furniture types and constraints
- Verify validation logic with edge cases

## 🚀 Deployment Considerations

### Environment Variables
```env
# Backend (.env)
OPENAI_API_KEY=sk-...

# Frontend (.env.local)
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

### Build Process
```bash
npm run clean           # Clear previous builds
npm run typecheck      # Verify types
npm run lint           # Check code quality
npm run build          # Production build
```

### Performance
- Lazy load components where possible
- Implement proper caching for API responses
- Use React.memo for expensive renders
- Monitor bundle size with build analyzer

## 🐛 Common Issues & Solutions

### OpenAI API Issues
- **Rate Limits**: Implement exponential backoff
- **Cost Control**: Set daily/monthly limits
- **Fallbacks**: Always have rule-based alternatives

### State Management
- **Race Conditions**: Use proper locking mechanisms
- **Memory Leaks**: Unsubscribe from events properly
- **Version Conflicts**: Implement conflict resolution

### TypeScript Errors
- **Missing Types**: Add to `src/lib/types.ts`
- **Import Issues**: Check path aliases in `vite.config.ts`
- **Schema Validation**: Ensure Zod schemas match TypeScript types

## 📋 Code Review Checklist

Before submitting changes:
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] ESLint shows no warnings
- [ ] API costs are reasonable
- [ ] Error handling is comprehensive
- [ ] State changes are properly logged
- [ ] Agent responses follow the standard format
- [ ] Documentation is updated if needed

## 🔄 Workflow

### Feature Development
1. Create feature branch from main
2. Implement changes following the architecture
3. Add appropriate tests
4. Update documentation
5. Run full test suite
6. Submit PR with detailed description

### Bug Fixes
1. Reproduce the issue
2. Add test case that fails
3. Implement fix
4. Verify test passes
5. Check for regression issues

## 📖 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS Reference](https://tailwindcss.com/docs)
- [Vite Configuration](https://vitejs.dev/config/)

## 🆘 Getting Help

When working on this codebase:
1. Check existing agent implementations for patterns
2. Review the knowledge graph for furniture engineering data
3. Test with the interactive designer interface
4. Use the Logger utility for debugging
5. Check API cost tracking in development

Remember: This is a furniture design tool, so always consider real-world buildability, safety, and user skill levels in your implementations. 