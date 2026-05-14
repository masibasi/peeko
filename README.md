# Peeko — Real-Time Lecture Recovery System

Peeko listens to your live lecture and builds a timeline of AI-generated summary cards as it happens. When you zone out and snap back, one tap tells you exactly what the professor is discussing, what you missed, and the minimum you need to follow along right now.

---

## Try the Demo

**[peeko-pink.vercel.app](https://peeko-pink.vercel.app/)** 


---

## How to Use

1. **Log in** with your Google account.
2. **New Session** — optionally drag-drop a PDF, DOCX, or TXT lecture handout. Peeko will index it and use it to ground AI summaries. Click **Skip & Start** to begin without materials.
3. **During the lecture** — Peeko listens through your microphone. Every 5 minutes, a summary card is generated and added to the timeline on the left sidebar. Each card shows a title, key bullets, keywords, and any Q&A the professor raised.
4. **Zoned out?** — Click **Catch Me Up** (or click the Peeko fox in the floating window). You'll instantly see:
   - **Now** — what the professor is currently discussing
   - **You likely missed** — key concepts from while you were gone
   - **Read first** — which cards to skim to get back up to speed
   - **Quick rejoin tip** — the minimum context to follow along right now
5. **Peeko Companion (PiP)** — click **Open Companion** to launch Peeko the fennec fox in a floating Picture-in-Picture window. It stays visible on top of any tab — YouTube, Instagram, anywhere — showing live keyword bubbles from the latest card. Click the fox to trigger Catch Me Up without switching back to the Peeko tab.
6. **After class** — revisit any session from the Dashboard. Open the full Notebook view to read all cards in order.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite · TailwindCSS 4 · Zustand · Motion |
| Backend | Node.js · Express · WebSocket |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth — Google OAuth |
| Transcription | Deepgram Streaming STT |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Embeddings (RAG) | Voyage AI `voyage-3-lite` (512-dim vectors) |
| File parsing | `pdf-parse` · `mammoth` |
| PiP Companion | Document Picture-in-Picture API (Chrome 116+) |
| Frontend deploy | Vercel |
| Backend deploy | Render (WebSocket required) |

---

## References

- [Anthropic Claude API](https://docs.anthropic.com) — rolling summarization, Catch Me Up recovery, Q&A detection
- [Deepgram Streaming STT](https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio) — real-time audio transcription over WebSocket
- [Voyage AI Embeddings](https://docs.voyageai.com/docs/embeddings) — `voyage-3-lite` used for RAG lecture material retrieval
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns) — cosine similarity search over lecture material chunks
- [Document Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) — always-on-top companion window (Chrome 116+)
