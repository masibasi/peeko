# Peeko — CLAUDE.md
> Real-time lecture recovery system. Not a note-taking app — a recovery system.

---

## Project Structure

```
peeko/
├── CLAUDE.md
├── README.md
├── frontend/          # React + Vite + TailwindCSS
└── backend/           # Node.js + WebSocket + Supabase + Claude API
```

---

## What We're Building

Peeko listens to a live lecture, generates AI summary cards every 5 minutes, and gives students a one-tap "Catch Me Up" to rejoin when they've zoned out. A Picture-in-Picture fennec fox (Peeko) floats above any tab, showing live keyword bubbles from the current lecture.

**Three Claude-powered features:**
1. Rolling summarization — every 5 min transcript window → structured card (includes Q&A detection in same call)
2. Catch Me Up — on-demand recovery guide (now / missed / read first / rejoin tip)
3. Q&A detection — embedded in summarization call, not a separate pipeline

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth (login required) |
| Transcription | Deepgram Streaming STT |
| AI | Anthropic Claude API |
| PiP | Document Picture-in-Picture API (Chrome 116+ only) |
| Frontend deploy | Vercel |
| Backend deploy | Railway or Render (WebSocket required — NOT Vercel) |

---

## Frontend

### Routing
```
/                     → Landing page (login button)
/login                → Google OAuth via Supabase
/dashboard            → Past sessions grid
/session/new          → Start new session
/session/:id          → Active session view
/session/:id/notebook → Post-session notebook
```

### Session View Layout
- Left sidebar (320px): scrollable card timeline
- Center: live transcript (interim = grayed out, final = black)
- Bottom bar: Catch Me Up button · Q&A input · Start/Pause/End · Open PiP button
- Floating: Peeko PiP window (Document PiP API)

### Peeko PiP Window
- Always-on-top floating window via Document PiP API
- Contains: Peeko character (calm / alert) + keyword bubbles
- Keyword source: `keywords` array from latest summary card
- Bubbles fade in one by one with CSS animation when new card arrives
- Old bubbles fade out when new keywords replace them
- Click Peeko in PiP → triggers Catch Me Up
- Peeko switches to alert state when Catch Me Up is triggered (both main UI and PiP update simultaneously)

```
┌─────────────────────┐
│                     │
│   🦊 Peeko          │
│                     │
│  [gradient descent] │
│    [learning rate]  │
│  [cost function]    │
│                     │
└─────────────────────┘
```

### Frontend Responsibilities
- Mic capture via `getUserMedia` → WebSocket stream to backend
- Display live interim transcript (NOT stored)
- Run 5-min timer → `POST /session/:id/generate-card` (session ID only, no transcript)
- Poll `GET /session/:id/cards` every 3s → render new cards
- On new card: push latest `keywords` to PiP window → animate bubbles
- On Catch Me Up triggered: switch Peeko to alert state in both main UI and PiP
- Send Catch Me Up and Q&A requests on user action

### Frontend Does NOT Handle
- Transcript storage
- Card generation logic
- LLM calls
- Deepgram API key

---

## Backend

### Audio & Transcription Flow
```
Browser → WebSocket → Backend → Deepgram
                              ↓
                    Interim → Frontend only (not stored)
                    Final   → Supabase DB
```

### Card Generation Flow
```
Frontend timer (5 min)
→ POST /session/:id/generate-card
→ Query transcript since last checkpoint
→ Word count check (skip if < 100 words — silence/announcements)
→ Build prompt: [all previous cards] + [new transcript window]
→ Claude API → card JSON
→ Save to DB with transcript_from + transcript_to
→ Frontend polls → renders card + updates PiP keywords
```

### API Endpoints
```
POST   /session/start              Create session, return session_id
POST   /session/:id/end            End session, trigger final card (no word count guard)
WS     /session/:id/audio          Receive audio, proxy to Deepgram, store transcript
POST   /session/:id/generate-card  Timer-triggered card generation
POST   /session/:id/catch-me-up    On-demand recovery summary
GET    /session/:id/cards          Poll for latest cards
GET    /session/:id/notebook       Full session notebook
```

### Edge Cases
- **Disconnect**: reconnect with existing `session_id`, resume from last chunk
- **Card gen failure**: checkpoint does not advance, window merges into next interval
- **Silence**: word count guard skips, window merges into next interval
- **Final card**: always generated on session end, no word count guard
- **Concurrency**: Catch Me Up runs independently from card generation queue

---

## Database Schema

### Sessions
```sql
session_id    UUID PRIMARY KEY
user_id       UUID FK → Supabase Auth
started_at    TIMESTAMPTZ
ended_at      TIMESTAMPTZ  -- null until ended
status        TEXT  -- 'active' | 'paused' | 'ended' | 'disconnected'
```

### Transcript Chunks
```sql
chunk_id      UUID PRIMARY KEY
session_id    UUID FK
text          TEXT
timestamp     TIMESTAMPTZ
is_final      BOOLEAN  -- always true, only final Deepgram results stored
```

### Cards
```sql
card_id           UUID PRIMARY KEY
session_id        UUID FK
type              TEXT  -- 'summary' | 'catchmeup'
content           JSONB  -- full card JSON
generated_at      TIMESTAMPTZ
transcript_from   TIMESTAMPTZ
transcript_to     TIMESTAMPTZ
interval_number   INTEGER
```

---

## Claude API — Prompt Specs

### 1. Summary Card (every 5 min)

**Input:**
```
System: You are a lecture assistant. Return ONLY valid JSON. No preamble, no markdown.

Previous cards (session memory):
{all_cards_so_far}

New transcript (last 5 minutes):
{transcript_window}

Generate the next summary card. Capture key concepts and 2-3 bullet points.
If the professor asked a question and answered it in this window, include it in the qa array.
If no Q&A detected, return qa as an empty array [].
```

**Output schema:**
```json
{
  "type": "summary",
  "title": "string",
  "bullets": ["string", "string", "string"],
  "keywords": ["string"],
  "qa": [
    { "question": "string", "answer": "string" }
  ],
  "timestamp": "ISO string"
}
```

---

### 2. Catch Me Up (on demand)

**Input:**
```
System: You are a lecture recovery assistant. Return ONLY valid JSON. No preamble, no markdown.

Cards generated so far:
{all_cards}

Transcript since last card checkpoint:
{transcript_since_checkpoint}

The student just snapped back to attention. Generate a recovery response:
- now: what the professor is currently discussing
- missed: key concepts the student likely missed
- read_first: array of card interval_numbers most relevant to rejoin
- rejoin_tip: the minimum context needed to follow along right now
```

**Output schema:**
```json
{
  "type": "catchmeup",
  "now": "string",
  "missed": "string",
  "read_first": [1, 2],
  "rejoin_tip": "string",
  "timestamp": "ISO string"
}
```

---

## Catch Me Up — Save Behavior
- Default: transient overlay, disappears on dismiss
- If student taps "Save": appended to bottom of timeline as a card
- Saved position: always appended at the end, not inserted at trigger timestamp

---

## Peeko States
| State | Trigger |
|---|---|
| Calm | Default — session active |
| Alert | Catch Me Up triggered |

- 2 states only — asset format (CSS animation or Lottie) decided at implementation time
- Zero logic — no distraction scoring, no tab tracking, no inactivity detection

---

## Auth
- Google OAuth via Supabase Auth
- Login required — no anonymous sessions
- Multi-device supported automatically via DB

---

## Out of Scope (Do Not Build)
- Distraction nudges
- Advanced Peeko states (fidgety, puffed up)
- Tab visibility / blacklist detection
- PDF upload for pre-session context
- Gamification (streaks, quests)
- Anki / flashcard export
- Auto class grouping
- Rate limiting
- Data retention policies

---

## Hackathon Track
**Design — Human-Centric AI** (Build4SC 2025)
