# Peeko — Progress Tracker
> Last updated: 2026-04-04 (after frontend v2)

---

## Quick Status

| Layer | Status | Notes |
|---|---|---|
| Backend | **Complete** | All endpoints, Deepgram, Claude, Supabase |
| Frontend UI | **Mostly done** | Routing, auth UI, Peeko PiP, session view all added in v2 |
| Frontend ↔ Backend wiring | **NOT DONE** | Path mismatch + missing auth headers |
| DB schema / migration | **Complete** | `backend/supabase-migration.sql` ready to run |
| Auth | **UI exists, wiring incomplete** | AuthContext + LoginPage built; token not sent on all requests |
| Peeko PiP | **Component built** | `PeekoPiP.tsx` exists; keyword bubbles need verification |
| Deploy | **Not started** | Vercel (frontend) + Railway/Render (backend) |

---

## What Changed in Frontend v2

### New components
| File | What it does |
|------|-------------|
| `LandingPage.tsx` | Landing page at `/` |
| `LoginPage.tsx` | Login UI at `/login` |
| `PeekoCharacter.tsx` | Peeko fox character (calm / alert states) |
| `PeekoPiP.tsx` | Document PiP floating window with Peeko + keywords |
| `SessionView.tsx` | Active session (replaces monolithic Dashboard) |
| `Timeline.tsx` | Scrollable card timeline sidebar |
| `PostSessionReport.tsx` | Post-session notebook / report |
| `AuthContext.tsx` | Google JWT storage + `useAuth()` hook |
| `lib/auth.ts` | JWT decode, expiry check, localStorage helpers |

### Routing now exists (`App.tsx`)
```
/            → LandingPage
/login       → LoginPage
/dashboard   → (dashboard — to be confirmed)
/session     → SessionView
```

### What v2 still uses from v1
- Web Speech API for transcription (not WebSocket audio)
- `/api/session/*` paths (not `/session/*`)
- `type: 'card' | 'qa' | 'catchmeup'` in the store (not `'summary'`)

---

## Backend — Complete (matches CLAUDE.md)

All endpoints implemented:
- `POST /session/start` — creates session in Supabase, returns `session_id`
- `POST /session/:id/end` — triggers final card, marks session ended
- `WS /session/:id/audio` — proxies raw audio → Deepgram, stores final chunks
- `POST /session/:id/generate-card` — checkpoint-based windowing, 100-word guard, Claude call
- `POST /session/:id/catch-me-up` — on-demand recovery summary via Claude
- `GET /session/:id/cards` — polling endpoint
- `GET /session/:id/notebook` — cards + all transcripts
- `POST /session/:id/transcript` — dev convenience (inject text without Deepgram)

Auth: `AUTH_REQUIRED=false` in `.env` → demo bypass (no token needed)

> **Note:** Team is currently debating Claude vs Groq for the AI provider. Backend has both versions — remote is Groq, local has Claude version staged. Resolve before deploy.

---

## Remaining Gaps (ordered by priority)

### P0 — Frontend ↔ Backend Not Wired

**Problem 1: Path mismatch**
- Frontend calls `/api/session/*`
- Backend listens at `/session/*`

Fix — add to `frontend/vite.config.ts`:
```ts
server: {
  proxy: {
    '/api/session': {
      target: 'http://localhost:3001',
      rewrite: (path) => path.replace('/api/session', '/session'),
      ws: true,
    },
  },
},
```

**Problem 2: Auth header missing on most requests**
- `SessionView.tsx` only sends `Authorization` header on `/session/start`
- All other calls (`generate-card`, `catch-me-up`, `end`, `transcript`) send no token
- Short-term fix: set `AUTH_REQUIRED=false` on backend
- Proper fix: pass token in all `api.ts` calls

**Problem 3: Remove or bypass `frontend/server.ts`**
- `npm run dev` currently runs the Gemini mock server
- Frontend needs to run against the real backend instead

---

### P1 — Card Type Mismatch

| | Frontend store | Backend |
|--|---------------|---------|
| Summary card | `type: 'card'` | `type: 'summary'` |
| Catch Me Up | `type: 'catchmeup'` ✅ | `type: 'catchmeup'` ✅ |
| Q&A | `type: 'qa'` | embedded in `summary.qa[]` |

**Frontend `Timeline.tsx` and `PostSessionReport.tsx` filter on `type === 'card'`** — returns nothing when connected to real backend.

Fix options:
- A) Backend maps `'summary'` → `'card'` in the response (quick hack)
- B) Frontend updates to use `'summary'` (correct, aligns with CLAUDE.md)

---

### P1 — No Card Polling

- CLAUDE.md: `GET /session/:id/cards` polled every 3s
- Current: cards added locally on generate-card response
- Fix: add `setInterval(() => fetchCards(), 3000)` in `SessionView.tsx`

---

### P1 — `/ask` Endpoint Not in Backend

- `SessionView.tsx` may still call `POST /api/session/:id/ask`
- Backend has no `/ask` route
- Per CLAUDE.md, Q&A is embedded in summary card `content.qa[]` — read from there instead

---

### P2 — Web Speech API → WebSocket Audio (post-demo)

- Current: browser `webkitSpeechRecognition` → HTTP POST transcript
- CLAUDE.md spec: `getUserMedia` → binary WebSocket → backend → Deepgram
- Deepgram backend is fully built and ready — frontend just needs to send audio over WS
- Low priority for demo (HTTP transcript works fine with `AUTH_REQUIRED=false`)

---

### P2 — Catch Me Up Should Be Transient Overlay

- CLAUDE.md: transient overlay, dismissed unless student taps "Save"
- Current: appended as persistent card in timeline
- Nice-to-have for demo polish

---

### P3 — Deploy

- Frontend → Vercel (static SPA)
- Backend → Railway or Render (WebSocket required, **not** Vercel serverless)
- Set `AUTH_REQUIRED=true` in production env

---

## Connection Checklist (what to do right now)

```
[ ] Run supabase-migration.sql in Supabase SQL editor
[ ] Create backend/.env from .env.example, fill in keys
[ ] Set AUTH_REQUIRED=false in backend/.env
[ ] npm install && npm run dev in /backend
[ ] Add Vite proxy to frontend/vite.config.ts
[ ] Change frontend dev script to NOT run server.ts (just vite)
[ ] Test: start session → send transcript → generate card → catch me up
[ ] Fix card type: 'summary' vs 'card' mismatch
[ ] Add token to all api.ts calls (or keep AUTH_REQUIRED=false for demo)
```

---

## File Map

```
backend/
  src/
    index.ts              WebSocket server + HTTP entry point
    app.ts                Express setup (CORS, auth, routes)
    config/
      claude.ts           Anthropic SDK (or Groq — see team note above)
      deepgram.ts         Deepgram SDK init
      env.ts              Env var validation
      supabase.ts         Supabase service-role client
    middleware/
      auth.ts             JWT auth + demo bypass
      errorHandler.ts     Express error handler
    routes/
      session.ts          All REST routes
    services/
      audioService.ts     Deepgram live streaming proxy
      cardService.ts      Card generation + checkpoint logic
      claudeService.ts    Claude/Groq API calls
      sessionService.ts   Session CRUD
      transcriptService.ts Chunk storage + windowed fetch
    types/index.ts        DB types + Claude output schemas
  supabase-migration.sql  Run in Supabase SQL editor

frontend/
  server.ts               MOCK SERVER (Gemini) — retire once backend wired
  vite.config.ts          Add proxy here to connect to backend
  src/
    App.tsx               Routing (/, /login, /dashboard, /session)
    contexts/
      AuthContext.tsx     Google JWT auth state
    components/
      LandingPage.tsx     / route
      LoginPage.tsx       /login route
      SessionView.tsx     Active session UI
      Timeline.tsx        Card sidebar
      PeekoCharacter.tsx  Fox character (calm/alert)
      PeekoPiP.tsx        Document PiP window
      PostSessionReport.tsx Post-session notebook
    lib/
      api.ts              HTTP calls — needs proxy + auth headers
      auth.ts             JWT helpers
    store/useStore.ts     Zustand state (card types need update)
```
