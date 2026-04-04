# Peeko Backend

Node.js + Express + WebSocket backend for Peeko — a real-time lecture recovery system.

## Team & Role Division

All backend code is written. The remaining work is testing, deployment, and integration support.

### Person A — Infrastructure & Testing
- Create Supabase project and run `supabase-migration.sql`
- Fill in `.env` and run the server locally (`npm run dev`)
- Run the end-to-end curl test script (see below) to verify each endpoint works with real API keys
- Fix any bugs that come up during testing

### Person B — Deployment & Frontend Integration
- Deploy to Railway or Render (see Deployment section below)
- Set production environment variables on the platform dashboard
- Add the Vite proxy config to the frontend so it routes to the backend
- Be the point of contact when the frontend team hits backend errors — fix and redeploy

### Shared
- If real Google OAuth is needed later: enable Google provider in Supabase dashboard and set `AUTH_REQUIRED=true`
- Until then, keep `AUTH_REQUIRED=false` for demo mode — no login required

---

## What's Implemented

| Feature | Status |
|---------|--------|
| Session create/end | ✅ |
| HTTP transcript ingestion (dev convenience) | ✅ |
| WebSocket audio → Deepgram STT proxy | ✅ |
| 5-min summary card generation (Claude API) | ✅ |
| Catch Me Up card generation (Claude API) | ✅ |
| Supabase DB persistence (sessions, transcript_chunks, cards) | ✅ |
| Supabase JWT auth (with dev bypass option) | ✅ |
| Word count guard (skip if < 100 words) | ✅ |
| Checkpoint preservation on card gen failure | ✅ |
| Final card on session end (no word count guard) | ✅ |

## Prerequisites

### 1. Supabase Project Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the entire `supabase-migration.sql` in the SQL Editor
3. Enable Google OAuth: Authentication → Providers → Google
   - Requires a Google Cloud Console OAuth app (set redirect URL to your Supabase project URL)
4. Copy these from Project Settings → API:
   - Project URL
   - `service_role` key (keep this secret — never expose to the frontend)

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:5173

# Set to false during development if the frontend doesn't send auth headers yet
AUTH_REQUIRED=false
```

### 3. Install and Run

```bash
npm install
npm run dev    # tsx watch (hot reload)
# or
npm start      # standard run
```

Server runs at `http://localhost:3001`.

---

## API Reference

### Authentication

When `AUTH_REQUIRED=true`, all requests must include:
```
Authorization: Bearer <supabase-jwt-token>
```

When `AUTH_REQUIRED=false`, the header is optional (development mode).

---

### Session

#### `POST /session/start`

```bash
curl -X POST http://localhost:3001/session/start
```
Response:
```json
{ "session_id": "uuid" }
```

#### `POST /session/:id/end`

Ends the session and automatically generates a final summary card.

```bash
curl -X POST http://localhost:3001/session/SESSION_ID/end
```
Response:
```json
{ "success": true }
```

---

### Transcript

#### `POST /session/:id/transcript` *(dev/testing only)*

In production, audio is sent over WebSocket and transcribed by Deepgram. Use this endpoint to manually inject transcript text during development.

```bash
curl -X POST http://localhost:3001/session/SESSION_ID/transcript \
  -H "Content-Type: application/json" \
  -d '{"text": "Gradient descent is an optimization algorithm..."}'
```
Response:
```json
{ "success": true, "chunk_id": "uuid" }
```

---

### Cards

#### `POST /session/:id/generate-card`

Called by the frontend every 5 minutes. Skips if fewer than 100 words have been transcribed since the last checkpoint.

```bash
curl -X POST http://localhost:3001/session/SESSION_ID/generate-card
```
Response (generated):
```json
{
  "success": true,
  "status": "generated",
  "card": {
    "card_id": "uuid",
    "type": "summary",
    "content": {
      "type": "summary",
      "title": "Gradient Descent Fundamentals",
      "bullets": ["...", "...", "..."],
      "keywords": ["gradient descent", "learning rate"],
      "qa": [],
      "timestamp": "2026-04-04T..."
    },
    "generated_at": "2026-04-04T...",
    "interval_number": 1
  }
}
```
Response (skipped):
```json
{ "success": false, "status": "skipped", "reason": "Only 42 words since last card" }
```

#### `POST /session/:id/catch-me-up`

```bash
curl -X POST http://localhost:3001/session/SESSION_ID/catch-me-up
```
Response:
```json
{
  "success": true,
  "card": {
    "type": "catchmeup",
    "content": {
      "type": "catchmeup",
      "now": "Professor is explaining backpropagation...",
      "missed": "Covered chain rule and partial derivatives",
      "read_first": [1, 2],
      "rejoin_tip": "Focus on how gradients flow backwards through the network",
      "timestamp": "2026-04-04T..."
    }
  }
}
```

#### `GET /session/:id/cards`

Polled by the frontend every 3 seconds.

```bash
curl http://localhost:3001/session/SESSION_ID/cards
```
Response:
```json
{ "cards": [...] }
```

#### `GET /session/:id/notebook`

Full session data — all cards and all transcript chunks.

```bash
curl http://localhost:3001/session/SESSION_ID/notebook
```

---

### WebSocket Audio (Deepgram STT)

```
WS /session/:id/audio?token=<jwt>
```

When `AUTH_REQUIRED=false`, the `?token=` parameter is not required.

Send raw binary audio from `getUserMedia` over this WebSocket. The backend proxies it to Deepgram and returns transcription results.

Messages from backend to browser:
```json
{ "type": "interim", "text": "gradient des..." }   // not stored
{ "type": "final",   "text": "gradient descent" }  // stored in Supabase
{ "type": "error",   "message": "..." }
```

Test with wscat:
```bash
npm install -g wscat
wscat -c "ws://localhost:3001/session/SESSION_ID/audio"
```

---

## End-to-End Test Script

Run this to verify the full flow without a frontend:

```bash
# 1. Start a session
SESSION=$(curl -s -X POST http://localhost:3001/session/start | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "Session: $SESSION"

# 2. Push transcript chunks (simulates Deepgram final results)
texts=(
  "Today we are going to talk about gradient descent and how it works in neural networks"
  "The learning rate controls how large steps we take during optimization"
  "A small learning rate means slow convergence but more stable training"
  "If the learning rate is too large we might overshoot the minimum"
  "Batch gradient descent uses the entire dataset to compute gradients"
  "Stochastic gradient descent uses only one sample at a time which is noisy but fast"
  "The cost function measures how wrong our model is on the training data"
  "We compute the gradient of the cost function with respect to each parameter"
  "Then we update each parameter by subtracting the gradient times the learning rate"
  "This process repeats until the cost function converges to a minimum"
)
for text in "${texts[@]}"; do
  curl -s -X POST "http://localhost:3001/session/$SESSION/transcript" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$text\"}" > /dev/null
done

# 3. Trigger card generation
echo "\n--- Generate Card ---"
curl -s -X POST "http://localhost:3001/session/$SESSION/generate-card" | python3 -m json.tool

# 4. Trigger Catch Me Up
echo "\n--- Catch Me Up ---"
curl -s -X POST "http://localhost:3001/session/$SESSION/catch-me-up" | python3 -m json.tool

# 5. List cards
echo "\n--- Cards ---"
curl -s "http://localhost:3001/session/$SESSION/cards" | python3 -m json.tool

# 6. End session (triggers final card)
curl -s -X POST "http://localhost:3001/session/$SESSION/end"
```

---

## Frontend Integration

### Vite Dev Proxy

Add this to the frontend's `vite.config.ts` to proxy frontend API calls to the backend without changing any frontend fetch URLs:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/session': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace('/api/session', '/session'),
        ws: true,  // required for WebSocket audio
      },
    },
  },
});
```

### Auth Flow

```
Frontend                              Backend
──────────────────────────────────────────────────────
supabase.auth.signInWithOAuth({ provider: 'google' })
  → Supabase handles Google OAuth redirect
  → Returns session.access_token

fetch('/api/session/start', {
  headers: { Authorization: `Bearer ${access_token}` }
})
                                → auth middleware verifies JWT
                                → sets req.userId
                                → creates session in DB
```

The backend **only verifies tokens**. The OAuth flow is handled entirely by Supabase on the frontend side.

---

## Project Structure

```
src/
├── index.ts                  # Entry point: HTTP + WebSocket server
├── app.ts                    # Express app (CORS, auth, routes)
├── config/
│   ├── env.ts                # Environment variable validation
│   ├── supabase.ts           # Supabase service-role client
│   ├── deepgram.ts           # Deepgram client
│   └── claude.ts             # Anthropic client
├── middleware/
│   ├── auth.ts               # JWT verification + dev bypass
│   └── errorHandler.ts       # Global error handler
├── routes/
│   └── session.ts            # All /session/* HTTP routes
├── services/
│   ├── transcriptService.ts  # Supabase transcript CRUD
│   ├── claudeService.ts      # Claude API prompt building & calls
│   ├── cardService.ts        # Card generation orchestration
│   ├── sessionService.ts     # Session CRUD
│   └── audioService.ts       # WebSocket ↔ Deepgram proxy
└── types/
    └── index.ts              # Shared TypeScript types (per CLAUDE.md spec)
```

## Deployment (Railway / Render)

WebSocket support is required, so Vercel serverless **cannot** be used. Use Railway or Render.

- Build command: `npm install`
- Start command: `npm start`
- Set all environment variables in the dashboard
- Set `AUTH_REQUIRED=true` in production
