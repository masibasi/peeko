# Peeko — Product Requirements Document
*Build4SC 2025 · Design — Human-Centric AI · GRIDS x Viterbi · Version 6.0 (Final)*

---

## 1. Overview

Peeko is a real-time lecture recovery system. When students zone out mid-lecture, Peeko helps them rejoin in seconds — through a live timeline of AI-generated summary cards, an on-demand recovery navigator, and an ambient companion that floats above any app.

> **Core positioning**: Peeko is not a note-taking tool — it is a real-time recovery system.

Unlike Otter, Notion AI, or NotebookLM — which only surface summaries after class ends — Peeko works in the moment.

---

## 2. The Problem

When students get distracted during a lecture, coming back is the hard part. The professor has moved on, and the only options are scrolling through raw transcription or waiting until class ends. There is no tool designed for in-the-moment recovery.

**Key insight**: the problem isn't distraction itself — it's the recovery.

---

## 3. Target User

College students who attend live lectures and regularly struggle to sustain attention throughout an entire session.

---

## 4. Core Features (Must Ship)

### 4.1 Real-Time Transcription + Rolling Summarization

Audio is captured via the browser microphone and streamed to the backend, which proxies it to Deepgram STT. Every 5 minutes, Claude automatically generates a structured summary card from the latest transcript window — building a live chronological timeline as the lecture progresses.

**Card JSON schema (Claude returns):**
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

`qa` is an empty array `[]` if no Q&A detected. If Q&A exists, frontend renders it as a distinct section within the same card.

**Prompt structure:**
```
[System: You are a lecture assistant. Return only valid JSON matching the schema. No preamble.]
[All cards so far — ordered, as compressed session memory]
[Raw transcript from last checkpoint to now]
[Instruction: generate the next summary card. Include key concepts and bullets.
 If the professor asked a question and answered it in this window, include it in the qa array.
 If no Q&A detected, return qa as an empty array.]
```

**Payload evolution:**
```
Interval 1: [transcript 0–5 min] → Card 1
Interval 2: [Card 1] + [transcript 5–10 min] → Card 2
Interval 3: [Card 1, Card 2] + [transcript 10–15 min] → Card 3
```

**Edge cases:**
- Transcript < ~100 words (silence): skip generation, checkpoint does not advance, window merges into next
- Claude call fails: checkpoint does not advance, window preserved for next interval
- Session end: final card always generated regardless of word count

### 4.2 Timeline Card View

Summary cards stack chronologically in a scrollable sidebar. Each card covers one 5-minute window. If a student missed 10 minutes, reading 2 cards brings them back. Cards with Q&A show a distinct Q&A section at the bottom.

### 4.3 "Catch Me Up" — Recovery Navigation System

One tap generates an on-demand recovery response at the exact moment the student snaps back. This is not a simple summary — it is a structured re-entry guide.

**Response structure:**
- **Now**: what the professor is currently discussing
- **You likely missed**: key concepts covered while the student was gone
- **Read first**: card numbers most relevant to rejoin
- **Quick rejoin tip**: minimum context needed to follow along right now

**Example output:**
> *Now: The professor is explaining gradient descent.*
> *You likely missed: the setup of cost functions and why optimization matters.*
> *Read first: Card #6 and Card #7.*
> *Quick rejoin tip: focus on how the learning rate affects convergence.*

**JSON schema (Claude returns):**
```json
{
  "type": "catchmeup",
  "now": "string",
  "missed": "string",
  "read_first": [6, 7],
  "rejoin_tip": "string",
  "timestamp": "ISO string"
}
```

**Prompt structure:**
```
[System: You are a lecture recovery assistant. Return only valid JSON. No preamble.]
[All cards so far — ordered]
[Transcript since last checkpoint]
[Instruction: generate a recovery response. Tell the student what is happening now,
 what they likely missed, which card numbers to read first, and the minimum context to rejoin.]
```

Catch Me Up responses appear as a transient overlay by default. Student can tap "Save" — saved responses are appended to the bottom of the timeline as a card.

### 4.4 Peeko — Picture-in-Picture Companion

Peeko is a fennec fox character that lives in a floating Picture-in-Picture window (Document PiP API). The PiP window stays on top of any tab or app — so Peeko is visible even when the student opens YouTube, Instagram, or any other site.

**PiP window contents:**
- Peeko character (2 animation states: calm / alert)
- Keyword bubbles from the latest summary card — fade in one by one as floating chips around Peeko

**Keyword bubble behavior:**
- Source: `keywords` array from the most recently generated summary card
- Updates every time a new card is generated (every ~5 min)
- Bubbles animate in with CSS fade + float — one at a time
- Old bubbles fade out when new keywords arrive

**PiP window layout:**
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

**Peeko states:**

| State | Trigger |
|---|---|
| Calm | Default — session active |
| Alert | Catch Me Up triggered (both main UI and PiP update simultaneously) |

**Implementation scope (strict):**
- Document PiP API — Chrome 116+ only (acceptable for hackathon)
- 2 animation states only
- Click Peeko in PiP → triggers Catch Me Up
- No tab tracking, no inactivity detection, no distraction scoring
- Peeko is expression only — zero logic

### 4.5 Session Dashboard

Every lecture is saved as a complete session.
- Grid of past sessions organized by class
- Each session card: date, class name, card count, duration
- Click → open full session notebook

### 4.6 Session Notebook View

- Full card timeline in reading order
- Cards visually differentiated: summary cards with optional Q&A section, Catch Me Up cards

---

## 5. Secondary Features (Build If Time Allows)

- **Landing page** — simple page with login button. Build after core is working
- **UI polish** — smooth card entrance animations, card type badges, Peeko idle animation loop

---

## 6. Out of Scope (Do Not Build)

- Distraction nudges
- Advanced Peeko states and distraction scoring
- Tab visibility / blacklist detection
- PDF lecture slides as pre-session context
- Gamification
- Anki / flashcard export
- Auto class grouping

---

## 7. How We Use Claude

Claude is the core intelligence of Peeko — the product does not function without it.

| Use | Prompt Input | Output |
|---|---|---|
| Rolling summarization | Previous cards + new transcript window | Summary card JSON (with qa array) |
| Q&A detection | Same call as summarization | Populated qa array if detected, empty if not |
| Catch Me Up | All cards + transcript since checkpoint | Recovery navigation JSON |
| Context continuity | Cumulative cards as session memory | Later cards reference earlier concepts |

---

## 8. Frontend Architecture

### Stack
React + Vite · TailwindCSS · Desktop-first, mobile-accessible

### Routing
```
/                     → Landing page (login button)
/login                → Google OAuth via Supabase
/dashboard            → Past sessions grid
/session/new          → Start new session
/session/:id          → Active session view
/session/:id/notebook → Post-session notebook view
```

### Session View Layout
- **Left sidebar** (320px): scrollable card timeline
- **Center**: live transcript — interim results grayed out, final results in black
- **Bottom bar**: Catch Me Up button · Q&A input · Start / Pause / End session · Open PiP button
- **Floating**: Peeko PiP window (Document PiP API)

### Frontend Responsibilities
- Mic capture via `getUserMedia` → stream to backend over WebSocket
- Display live interim transcript (not stored)
- Run 5-minute timer → `POST /session/:id/generate-card` (session ID only)
- Poll `GET /session/:id/cards` every ~3 seconds → render new cards
- On new card: push latest `keywords` to PiP window → animate bubbles
- On Catch Me Up triggered: switch Peeko to alert state in both main UI and PiP
- Send Catch Me Up and Q&A requests on user action

### Frontend Does NOT Handle
- Transcript storage
- Card generation logic
- LLM calls
- Deepgram API key

---

## 9. Backend Architecture

### Stack
Node.js · PostgreSQL via Supabase · WebSocket · Deepgram Streaming STT · Claude API

**Deployment**: Railway or Render — WebSocket required, Vercel not suitable

### Data Flow

**Audio & Transcription**
```
Browser → WebSocket → Backend → Deepgram
                              ↓
                    Interim → Frontend (display only, not stored)
                    Final   → Supabase DB
```

**Card Generation**
```
Frontend timer (5 min)
→ POST /session/:id/generate-card
→ Query transcript since last checkpoint
→ Word count check — skip if < 100 words
→ Build prompt: [all previous cards] + [new transcript window]
→ Claude API → card JSON
→ Save to DB (transcript_from, transcript_to)
→ Frontend polls → renders card + updates PiP keywords
```

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /session/start | Create session, return session_id |
| POST | /session/:id/end | End session, trigger final card |
| WS | /session/:id/audio | Receive audio, proxy to Deepgram, store transcript |
| POST | /session/:id/generate-card | Timer-triggered card generation |
| POST | /session/:id/catch-me-up | On-demand recovery summary |
| GET | /session/:id/cards | Poll for latest cards |
| GET | /session/:id/notebook | Full session notebook |

### Key Edge Cases
- **Disconnect**: reconnect with existing `session_id`, resume from last chunk
- **Card generation failure**: checkpoint does not advance, window merges into next interval
- **Silence**: word count guard skips, window merges into next
- **Concurrency**: Catch Me Up runs independently from card generation queue

---

## 10. Database Schema

**Sessions**
```
session_id    UUID PK
user_id       FK → Supabase Auth
started_at    Timestamp
ended_at      Timestamp (null until ended)
status        Enum: active | paused | ended | disconnected
```

**Transcript Chunks**
```
chunk_id      UUID PK
session_id    FK
text          Text
timestamp     Timestamp
is_final      Boolean (always true)
```

**Cards**
```
card_id           UUID PK
session_id        FK
type              Enum: summary | catchmeup
content           JSONB
generated_at      Timestamp
transcript_from   Timestamp
transcript_to     Timestamp
interval_number   Integer
```

---

## 11. Auth & Infrastructure

| Item | Decision |
|---|---|
| Auth | Google OAuth via Supabase Auth — login required |
| Database | Supabase PostgreSQL |
| Multi-device | Supported automatically via DB |
| Data retention | Not enforced for MVP |
| Rate limiting | Not enforced for MVP |
| Backend hosting | Railway or Render (free tier) |
| Frontend hosting | Vercel |

---

## 12. Hackathon Track

**Design — Human-Centric AI**

---

*End of PRD — Version 6.0 (Final)*
