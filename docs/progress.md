# Peeko — Progress Tracker
> Last updated: 2026-05-02

---

## Quick Status

| Layer | Status | Notes |
|---|---|---|
| Backend core | **Complete** | All endpoints, Deepgram, Claude, Supabase |
| Backend RAG | **Complete** | Migration, embedding, material, retriever services all passing tests |
| Frontend UI | **Mostly done** | Routing, auth UI, Peeko PiP, session view, NewSessionPage all added |
| Frontend ↔ Backend wiring | **NOT DONE** | Path mismatch + missing auth headers (pre-existing gap) |
| DB schema / migration | **Complete** | `supabase-migration.sql` + `supabase-migration-002-rag.sql` ready to run |
| Auth | **UI exists, wiring incomplete** | AuthContext + LoginPage built; token not sent on all requests |
| Peeko PiP | **Component built** | `PeekoPiP.tsx` exists; keyword bubbles need verification |
| Deploy | **Not started** | Vercel (frontend) + Railway/Render (backend) |

---

## Phase RAG — RAG-Powered Lecture Materials

### Implementation complete

- [x] `backend/supabase-migration-002-rag.sql` — pgvector, lecture_materials, material_chunks, has_materials column, ivfflat index, RLS policies, match_material_chunks RPC
- [x] `backend/src/config/env.ts` — VOYAGE_API_KEY added
- [x] `backend/src/services/embeddingService.ts` — Voyage AI fetch wrapper (model: voyage-3-lite, input_type, single retry on 5xx, 401 throws immediately)
- [x] `backend/src/services/materialService.ts` — parse (pdf-parse/mammoth/TXT), chunkText (~800/100 overlap), embedChunks (batch 32), store to Supabase
  - **Bugfix 2026-05-02**: `pdf-parse` v2 dropped the callable default export; updated `extractText` to use `new PDFParse({ data: buffer }).getText()` API
- [x] `backend/src/services/retrieverService.ts` — has_materials fast path, cosine top-K via supabase.rpc
- [x] `backend/src/services/claudeService.ts` — retrievedContext param added to both generateSummaryCard + generateCatchMeUp; exact prompt from §7 of PRD-addition
- [x] `backend/src/services/cardService.ts` — retriever wired at both LLM call sites (line ~81 generateCard, line ~114 generateCatchMeUp)
- [x] `backend/src/routes/session.ts` — POST /session/:id/materials (multer, fire-and-poll), GET /session/:id/materials
- [x] `frontend/src/App.tsx` — /session/new promoted to real route before /session/:id catch-all
- [x] `frontend/src/components/NewSessionPage.tsx` — native HTML5 DnD, upload progress, polling, Skip & Start, Start session (enabled on ready)
- [x] `frontend/src/lib/api.ts` — uploadMaterial (XHR with onProgress), getMaterials, startSession

### Tests

| Test | Status |
|------|--------|
| chunkText — chunks ≤ 850 chars | [x] passing |
| chunkText — adjacent overlap ≥ 90 chars | [x] passing |
| chunkText — no empty chunks | [x] passing |
| chunkText — short input = single chunk | [x] passing |
| embeddingService — success | [x] passing |
| embeddingService — retries once on 5xx | [x] passing |
| embeddingService — throws on second 5xx | [x] passing |
| embeddingService — 401 throws immediately | [x] passing |
| retrieverService — no materials, no embedding call | [x] passing |
| retrieverService — top-K ordered by similarity | [x] passing |
| materialService — status=ready, chunk_count matches rows | [x] passing |
| materialService — status=failed with error_message | [x] passing |

Total: **12/12 tests passing**

---

## What Changed in Frontend v2 (pre-RAG)

### Components
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

---

## Backend — Complete (matches CLAUDE.md)

- `POST /session/start` — creates session in Supabase, returns `session_id`
- `POST /session/:id/end` — triggers final card, marks session ended
- `WS /session/:id/audio` — proxies raw audio → Deepgram, stores final chunks
- `POST /session/:id/generate-card` — checkpoint-based windowing, 100-word guard, Claude/Groq call (now RAG-augmented)
- `POST /session/:id/catch-me-up` — on-demand recovery summary (now RAG-augmented)
- `GET /session/:id/cards` — polling endpoint
- `GET /session/:id/notebook` — cards + all transcripts
- `POST /session/:id/transcript` — dev convenience
- `POST /session/:id/materials` — multipart upload, fire-and-poll [NEW]
- `GET /session/:id/materials` — material status poll [NEW]

Auth: `AUTH_REQUIRED=false` in `.env` → demo bypass

---

## Remaining Gaps (pre-existing, ordered by priority)

### P0 — Frontend ↔ Backend Not Wired (pre-existing)
- Path mismatch: frontend calls `/api/session/*`, backend at `/session/*` → fix Vite proxy
- Auth header missing on most requests → `AUTH_REQUIRED=false` workaround for demo
- Remove or bypass `frontend/server.ts` Gemini mock

### P1 — Card Type Mismatch (pre-existing)
- Frontend `Timeline.tsx` filters on `type === 'card'`, backend returns `type: 'summary'`

### P1 — No Card Polling (pre-existing)
- Add `setInterval(() => fetchCards(), 3000)` in `SessionView.tsx`

### P2 — Web Speech API → WebSocket Audio (post-demo)

### P3 — Deploy
- Frontend → Vercel, Backend → Railway/Render

---

## File Map (updated for RAG phase)

```
backend/
  src/
    config/
      claude.ts           Groq SDK init
      deepgram.ts         Deepgram SDK init
      env.ts              Env var validation (+ VOYAGE_API_KEY)
      supabase.ts         Supabase service-role client
    services/
      audioService.ts     Deepgram live streaming proxy
      cardService.ts      Card generation (now calls retrieverService)
      claudeService.ts    Groq API calls (retrievedContext param added)
      embeddingService.ts [NEW] Voyage AI embedding wrapper
      materialService.ts  [NEW] File parse → chunk → embed → store
      retrieverService.ts [NEW] Cosine top-K retrieval
      sessionService.ts   Session CRUD
      transcriptService.ts Chunk storage + windowed fetch
    routes/
      session.ts          All REST routes (+ materials endpoints)
    types/index.ts        DB types + Claude output schemas
  supabase-migration.sql          Migration 001 (original schema)
  supabase-migration-002-rag.sql  [NEW] Migration 002 (RAG schema)
  vitest.config.ts        [NEW] Test runner config
  vitest.setup.ts         [NEW] Global test env setup

frontend/
  src/
    App.tsx               Routing (now includes /session/new)
    components/
      NewSessionPage.tsx  [NEW] Pre-session upload UI
      ...
    lib/
      api.ts              [NEW] uploadMaterial + getMaterials + startSession
      auth.ts             JWT helpers
```
