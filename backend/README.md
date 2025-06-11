# Blueprint Buddy Backend API

This is the backend API server for Blueprint Buddy that securely handles OpenAI API calls.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the server:**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

The server will start on http://localhost:3001

## 🔒 Security Features

- **API Key Protection**: OpenAI API key stored server-side only
- **Rate Limiting**: 20 requests per minute per session
- **Cost Control**: $1.00 per session limit
- **Request Validation**: Zod schemas for all endpoints
- **CORS Configuration**: Restricted to frontend origin

## 📡 API Endpoints

### POST /api/chat
General chat endpoint for conversational responses.

**Request:**
```json
{
  "message": "I want to build a bookshelf",
  "context": "Optional context string",
  "systemPrompt": "Optional custom system prompt"
}
```

**Response:**
```json
{
  "response": "Great! Let's design a bookshelf...",
  "usage": {
    "promptTokens": 123,
    "completionTokens": 456,
    "totalTokens": 579,
    "cost": 0.0012,
    "sessionCost": 0.0024
  }
}
```

### POST /api/agent/:agentName
Agent-specific endpoint for structured responses.

**Request:**
```json
{
  "prompt": "Extract dimensions from: 4 feet wide by 6 feet tall",
  "schema": {} // Optional JSON schema
}
```

**Response:**
```json
{
  "data": {
    // Structured response based on agent
  },
  "usage": {
    // Token usage information
  }
}
```

### POST /api/session/reset
Reset session cost tracking.

### GET /health
Health check endpoint.

## 🛠️ Configuration

Environment variables:
- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "message": "Additional details"
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (validation error)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

## 📊 Cost Management

- Session costs are tracked per `X-Session-ID` header
- Maximum $1.00 per session
- Sessions are cleared after 1 hour of inactivity
- Cost calculation based on GPT-3.5-turbo pricing

## 🔧 Development

```bash
# Run with nodemon for auto-reload
npm run dev

# Check the logs
tail -f logs/api.log
```

## 🚀 Production Deployment

For production deployment:

1. Use environment variables for all configuration
2. Enable HTTPS
3. Set up proper logging and monitoring
4. Consider using PM2 or similar process manager
5. Implement database for persistent session tracking
6. Add authentication if needed

Example with PM2:
```bash
pm2 start server.js --name blueprint-buddy-api
pm2 save
pm2 startup
``` 