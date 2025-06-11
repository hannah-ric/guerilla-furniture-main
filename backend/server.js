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

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Request validation schemas
const ChatRequestSchema = z.object({
  message: z.string().max(2000),
  context: z.string().optional(),
  systemPrompt: z.string().optional()
});

// Cost tracking
let sessionCosts = new Map();
const MAX_SESSION_COST = 1.0;

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, systemPrompt } = ChatRequestSchema.parse(req.body);
    const sessionId = req.headers['x-session-id'] || 'default';
    
    // Check session cost
    const currentCost = sessionCosts.get(sessionId) || 0;
    if (currentCost >= MAX_SESSION_COST) {
      return res.status(429).json({ 
        error: 'Session cost limit exceeded. Please start a new session.' 
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

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const usage = response.usage;
    const cost = calculateCost(usage.prompt_tokens, usage.completion_tokens);
    
    // Update session cost
    sessionCosts.set(sessionId, currentCost + cost);

    res.json({
      response: response.choices[0].message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost,
        sessionCost: currentCost + cost
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
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
    
    const response = await openai.chat.completions.create({
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
    const data = JSON.parse(content);

    res.json({
      data,
      usage: response.usage
    });

  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Agent processing failed' });
  }
});

// Reset session cost
app.post('/api/session/reset', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  sessionCosts.delete(sessionId);
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

function calculateCost(promptTokens, completionTokens) {
  const costs = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };
  
  const modelCost = costs['gpt-3.5-turbo'];
  return (promptTokens / 1000) * modelCost.input + 
         (completionTokens / 1000) * modelCost.output;
}

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  // Clear sessions older than 1 hour
  // In production, you'd track timestamps properly
  if (sessionCosts.size > 100) {
    sessionCosts.clear();
  }
}, 3600000);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 