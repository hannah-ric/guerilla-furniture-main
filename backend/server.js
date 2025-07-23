import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);

// OpenAI client - handle missing API key for development
let openai = null;
const isDevelopment = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-test-key-for-development' || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here';

if (!isDevelopment) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI client initialized with API key');
} else {
  console.log('🚧 Running in development mode without OpenAI API key');
  console.log('   Set OPENAI_API_KEY in backend/.env for full functionality');
}

// Request validation schemas
const ChatRequestSchema = z.object({
  message: z.string().max(2000),
  context: z.string().optional(),
  systemPrompt: z.string().optional()
});

// Enhanced session management
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.MAX_SESSION_COST = 1.0;
    this.SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
    this.CLEANUP_INTERVAL = 10 * 60 * 1000; // Run cleanup every 10 minutes
    
    // Start periodic cleanup
    this.startCleanupInterval();
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        cost: 0,
        requests: [],
        createdAt: Date.now(),
        lastActivity: Date.now()
      });
    }
    
    const session = this.sessions.get(sessionId);
    session.lastActivity = Date.now();
    return session;
  }

  addCost(sessionId, cost) {
    const session = this.getSession(sessionId);
    session.cost += cost;
    session.requests.push({
      cost,
      timestamp: Date.now()
    });
    return session.cost;
  }

  isSessionValid(sessionId) {
    const session = this.getSession(sessionId);
    return session.cost < this.MAX_SESSION_COST;
  }

  resetSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  startCleanupInterval() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  getStats() {
    const stats = {
      activeSessions: this.sessions.size,
      totalRequests: 0,
      totalCost: 0,
      averageCostPerSession: 0
    };

    for (const session of this.sessions.values()) {
      stats.totalRequests += session.requests.length;
      stats.totalCost += session.cost;
    }

    if (stats.activeSessions > 0) {
      stats.averageCostPerSession = stats.totalCost / stats.activeSessions;
    }

    return stats;
  }
}

// Initialize session manager
const sessionManager = new SessionManager();

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, systemPrompt } = ChatRequestSchema.parse(req.body);
    const sessionId = req.headers['x-session-id'] || 'default';
    
    // Check session validity
    if (!sessionManager.isSessionValid(sessionId)) {
      return res.status(429).json({ 
        error: 'Session cost limit exceeded. Please start a new session.',
        sessionCost: sessionManager.getSession(sessionId).cost
      });
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt || 'You are Blueprint Buddy, a helpful AI assistant for furniture design.'
      }
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Current design context: ${context}`
      });
    }

    messages.push({
      role: 'user',
      content: message
    });

    let response, usage, cost;
    
    if (openai) {
      // Real OpenAI API call
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      usage = response.usage;
      cost = calculateCost(usage.prompt_tokens, usage.completion_tokens);
    } else {
      // Development mode mock response
      response = {
        choices: [{
          message: {
            content: `🚧 Development Mode Response for: "${message}"\n\nI'm Blueprint Buddy, your furniture design assistant! I understand you want to work on a furniture project. Here's what I can help you with:\n\n• Design specifications and dimensions\n• Material selection and cost estimation\n• Joinery methods and construction techniques\n• Step-by-step build instructions\n• 3D visualization and modeling\n\nTo get started, please tell me:\n1. What type of furniture are you planning to build?\n2. What are your space constraints?\n3. What's your skill level and available tools?\n\nI'll guide you through creating a complete, buildable furniture plan!`
          }
        }]
      };
      usage = { prompt_tokens: 50, completion_tokens: 150, total_tokens: 200 };
      cost = 0.001; // Mock cost
    }
    
    // Update session cost
    const totalCost = sessionManager.addCost(sessionId, cost);

    res.json({
      response: response.choices[0].message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost,
        sessionCost: totalCost
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Enhanced error handling
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ 
        error: 'OpenAI quota exceeded',
        message: 'The AI service is temporarily unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
});

// Agent-specific endpoint with structured output
app.post('/api/agent/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { prompt, schema } = req.body;
    const sessionId = req.headers['x-session-id'] || 'default';
    
    // Check session validity
    if (!sessionManager.isSessionValid(sessionId)) {
      return res.status(429).json({ 
        error: 'Session cost limit exceeded',
        sessionCost: sessionManager.getSession(sessionId).cost
      });
    }
    
    let response, data, usage, cost;
    
    if (openai) {
      // Real OpenAI API call
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are the ${agentName} agent in a furniture design system. Respond with valid JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0].message.content;
      data = JSON.parse(content);
      usage = response.usage;
      cost = calculateCost(usage.prompt_tokens, usage.completion_tokens);
    } else {
      // Development mode mock response based on agent type
      data = generateMockAgentResponse(agentName, prompt);
      usage = { prompt_tokens: 30, completion_tokens: 100, total_tokens: 130 };
      cost = 0.0005; // Mock cost
    }
    
    // Calculate and track cost
    sessionManager.addCost(sessionId, cost);

    res.json({
      data,
      usage: {
        ...usage,
        cost,
        sessionCost: sessionManager.getSession(sessionId).cost
      }
    });

  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Agent processing failed' });
  }
});

// Reset session cost
app.post('/api/session/reset', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  sessionManager.resetSession(sessionId);
  res.json({ success: true });
});

// Get session stats
app.get('/api/session/stats', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const session = sessionManager.getSession(sessionId);
  
  res.json({
    sessionId,
    cost: session.cost,
    requestCount: session.requests.length,
    createdAt: new Date(session.createdAt),
    lastActivity: new Date(session.lastActivity),
    timeRemaining: Math.max(0, sessionManager.SESSION_TIMEOUT - (Date.now() - session.lastActivity))
  });
});

// Get global stats (admin endpoint - should be protected in production)
app.get('/api/stats', (req, res) => {
  res.json(sessionManager.getStats());
});

// Health check with enhanced info
app.get('/health', (req, res) => {
  const stats = sessionManager.getStats();
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    sessions: stats.activeSessions,
    uptime: process.uptime()
  });
});

function generateMockAgentResponse(agentName, prompt) {
  const baseResponse = {
    success: true,
    confidence: 0.8,
    suggestions: [`This is a mock response for ${agentName} agent`],
    next_steps: ['Configure OPENAI_API_KEY for real AI responses']
  };

  switch (agentName.toLowerCase()) {
    case 'intentclassifier':
      return {
        ...baseResponse,
        primary_intent: 'DESIGN_INITIATION',
        secondary_intents: [],
        confidence: 'medium',
        entities: { furniture_type: 'table' },
        requires_clarification: false,
        suggested_next_intents: ['DIMENSION_SPECIFICATION']
      };
    case 'dimensionagent':
      return {
        ...baseResponse,
        dimensions: { width: 48, height: 30, depth: 24, unit: 'inches' },
        ergonomic_validation: { valid: true, issues: [] }
      };
    case 'materialagent':
      return {
        ...baseResponse,
        primary_material: 'Pine',
        alternative_materials: ['Oak', 'Plywood'],
        estimated_cost: 150
      };
    case 'joineryagent':
      return {
        ...baseResponse,
        primary_method: { name: 'Pocket Screws', difficulty: 'beginner' },
        alternative_methods: [{ name: 'Mortise and Tenon', difficulty: 'advanced' }]
      };
    case 'validationagent':
      return {
        ...baseResponse,
        structural: { valid: true, issues: [] },
        physics: { stable: true, load_capacity: '200 lbs' }
      };
    default:
      return {
        ...baseResponse,
        data: { message: `Mock response for ${agentName}: ${prompt.substring(0, 100)}...` }
      };
  }
}

function calculateCost(promptTokens, completionTokens) {
  const costs = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };
  
  const modelCost = costs['gpt-3.5-turbo'];
  return (promptTokens / 1000) * modelCost.input + 
         (completionTokens / 1000) * modelCost.output;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  sessionManager.stopCleanupInterval();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  sessionManager.stopCleanupInterval();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});                                