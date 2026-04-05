# Peeko — Progress Tracker
> Last updated: 2026-04-04

---

## Quick Status

| Layer | Status | Notes |
|---|---|---|
| Backend (real) | **Complete** | All endpoints, Deepgram, Claude, Supabase |
| Frontend UI | **Partial** | Single Dashboard component, no routing/auth |
| Frontend ↔ Backend wiring | **NOT DONE** | Frontend runs against Gemini mock server |
| DB schema / migration | **Complete** | `backend/supabase-migration.sql` ready to run |
| Auth | **Backend only** | Frontend sends no token; bypass mode exists |
| Peeko PiP | **Basic** | Opens window, shows card + transcript; no fox, no bubbles |
| Deploy | **Not started** | Vercel (frontend) + Railway/Render (backend) |

---

## What Is Actually Built

### Backend (`/backend/`) — MATCHES SPEC

**Server & routing**
- `src/index.ts` — HTTP + WebSocket server, upgrades `/session/:id/audio` WS connections
- `src/app.ts` — Express app with CORS, auth middleware, `/session` router

**All endpoints implemented (matches CLAUDE.md exactly):**
- `POST /session/start` — creates session in Supabase, returns `session_id`
- `POST /session/:id/end` — triggers final card (no word count guard), marks session ended
- `WS /session/:id/audio` — proxies raw audio → Deepgram, stores final chunks to Supabase
- `POST /session/:id/generate-card` — checkpoint-based windowing, 100-word guard, Claude call
- `POST /session/:id/catch-me-up` — on-demand recovery summary via Claude
- `GET /session/:id/cards` — polling endpoint
- `GET /session/:id/notebook` — cards + all transcripts
- `POST /session/:id/transcript` — dev convenience (bypass Deepgram, inject text directly)

**Services:**
- `audioService.ts` — Deepgram nova-2 live streaming, interim→browser only, final→Supabase
- `claudeService.ts` — `generateSummaryCard` + `generateCatchMeUp`, both with JSON retry logic; model: `claude-sonnet-4-20250514`
- `cardService.ts` — checkpoint logic, word count guard, `generateFinalCard`, `getNotebook`
- `transcriptService.ts` — chunk storage, windowed fetch, word count, last timestamp
- `sessionService.ts` — create/get/end session, status updates

**Auth:**
- `AUTH_REQUIRED=false` → demo bypass (uses hardcoded UUID `00000000-0000-0000-0000-000000000001`)
- `AUTH_REQUIRED=true` → validates Supabase JWT Bearer token

**DB schema** (`supabase-migration.sql`):
- `sessions`, `transcript_chunks`, `cards` — matches CLAUDE.md spec exactly
- RLS policies in place (note: RLS uses `auth.uid()` so backend must use service role key to bypass)
- Indexes on `session_id + timestamp` and `session_id + generated_at`

---

### Frontend (`/frontend/`) — PARTIAL / MOCK-WIRED

**What works (against Gemini mock server):**
- Single `Dashboard` component — two-panel layout (transcript left, cards right)
- Web Speech API transcription (interim gray / final black display)
- 5-minute `setInterval` → `POST /api/session/:id/generate-card`
- Catch Me Up button → `POST /api/session/:id/catch-me-up`
- Q&A input → `POST /api/session/:id/ask` *(non-spec endpoint, see gaps)*
- Notebook view (post-session card list with timeline connector)
- Document PiP API: opens floating window showing latest card + live transcript text
- Zustand store for session state

**`frontend/server.ts`** — THE ACTIVE DEV SERVER:
- Runs as the API backend for `npm run dev`
- Uses **Google Gemini** (not Claude) with in-memory storage (no Supabase)
- Has `/ask` Q&A endpoint (not in real backend)
- Card type `'card'` (not `'summary'`), and `'qa'` type — mismatches real backend
- This file is a prototype stub; it's what the frontend currently talks to

---

## Gaps vs CLAUDE.md Spec

### P0 — Frontend ↔ Real Backend Not Connected
The frontend (`npm run dev`) runs against `frontend/server.ts` (Gemini mock), not the real backend. To connect them:
1. Frontend must point to `http://localhost:3001` (backend port)
2. Frontend must send `Authorization: Bearer <token>` (or backend must run with `AUTH_REQUIRED=false`)
3. Remove/retire `frontend/server.ts`

### P0 — No Routing
CLAUDE.md specifies:
```
/                   → Landing page
/login              → Google OAuth
/dashboard          → Past sessions grid
/session/new        → Start session
/session/:id        → Active session view
/session/:id/notebook → Notebook
```
**Current state:** No react-router. App renders `<Dashboard />` unconditionally. No URL-based navigation.

### P0 — No Auth on Frontend
- No login page, no Google OAuth flow
- Frontend sends no auth token to backend
- Backend must run in `AUTH_REQUIRED=false` for any frontend request to work

### P1 — Peeko Character Missing
- CLAUDE.md specifies a fennec fox (calm / alert states) in the PiP window
- PiP currently shows "ClassMate AI" text header, no fox graphic/animation
- No calm/alert state switching when Catch Me Up is triggered

### P1 — No Keyword Bubble Animations
- CLAUDE.md specifies bubbles fade in one by one on new card, old bubbles fade out
- PiP currently renders the full card content (title + bullets) instead of keyword bubble UI

### P1 — Catch Me Up Not Transient Overlay
- CLAUDE.md: default = transient overlay; dismissed unless student taps "Save"
- Current: added directly as a persistent card in the timeline

### P1 — No Card Polling
- CLAUDE.md: `GET /session/:id/cards` polled every 3s
- Current: cards added locally on generate-card response; no polling loop

### P1 — Frontend Uses Web Speech API, Not WebSocket Audio
- CLAUDE.md: `getUserMedia` → WebSocket → backend → Deepgram
- Current: browser's built-in `webkitSpeechRecognition` — no WebSocket audio stream
- Deepgram backend is fully built but unreachable from current frontend

### P2 — `/session/:id/ask` Not in Real Backend
- Frontend calls `POST /api/session/:id/ask` for Q&A
- Real backend has no `/ask` endpoint
- Per CLAUDE.md, Q&A detection is embedded in summary cards, not a separate endpoint

### P2 — Card Type Mismatch
- Frontend store defines `type: 'card' | 'qa' | 'catchmeup'`
- Real backend types are `'summary' | 'catchmeup'`
- Frontend notebook view filters `cards.filter(c => c.type === 'card')` — returns nothing against real backend

### P2 — `vite.config.ts` Exposes GEMINI_API_KEY
- Leftover from Gemini prototype; irrelevant once connected to real backend

---

## What Needs to Happen (Ordered)

1. **Wire frontend to real backend** — remove `server.ts` mock, set `VITE_API_BASE_URL=http://localhost:3001`, add auth token to requests
2. **Switch audio to WebSocket** — `getUserMedia` → binary WebSocket to `ws://localhost:3001/session/:id/audio?token=...`
3. **Add routing** — react-router with routes from spec
4. **Auth UI** — Supabase Google OAuth login page, pass token in requests
5. **Fix card types** — align frontend `'summary'` ↔ `'card'` mismatch
6. **Card polling** — add `GET /session/:id/cards` interval (3s) in session view
7. **Catch Me Up overlay** — transient display with Save/dismiss, not auto-appended
8. **Peeko fox** — add character asset, calm/alert state, keyword bubbles with fade animation
9. **Remove `/ask`** from frontend — replace with Q&A parsed from summary card `qa` array
10. **Deploy** — Vercel (frontend SPA), Railway or Render (backend, WebSocket required)

---

## File Map

```
backend/
  src/
    index.ts              WebSocket server + HTTP
    app.ts                Express setup
    config/
      claude.ts           Anthropic SDK init
      deepgram.ts         Deepgram SDK init
      env.ts              Env var validation
      supabase.ts         Supabase client
    middleware/
      auth.ts             JWT auth + demo bypass
      errorHandler.ts     Express error handler
    routes/
      session.ts          All REST routes
    services/
      audioService.ts     Deepgram live streaming
      cardService.ts      Card generation + checkpoint logic
      claudeService.ts    Claude API calls
      sessionService.ts   Session CRUD
      transcriptService.ts Chunk storage + windowed fetch
    types/index.ts        DB types + Claude output schemas
  supabase-migration.sql  Run in Supabase SQL editor

frontend/
  server.ts               GEMINI MOCK SERVER (active dev backend — replace)
  src/
    App.tsx               Renders <Dashboard /> only
    components/
      Dashboard.tsx       Full session UI (transcript + cards + PiP + Q&A)
    lib/api.ts            HTTP calls to backend
    store/useStore.ts     Zustand state
    index.css             Tailwind v4 import
  vite.config.ts          Vite config (has stale GEMINI_API_KEY define)
```
