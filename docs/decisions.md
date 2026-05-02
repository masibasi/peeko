# Architectural Decision Log

---

## RAG Phase Decisions

### Embeddings provider: Voyage AI voyage-3-lite
**Why:** Anthropic's official RAG partner; leads retrieval benchmarks on dense academic content; 512-dim vectors keep pgvector cosine queries fast.
**Trade-offs:** Requires a separate API key and HTTP call per chunk batch; no JS SDK (use native fetch). Ruled out OpenAI text-embedding-3-small (higher cost, vendor conflict with Groq backend).

### Vector store: Supabase pgvector
**Why:** Reuses existing Supabase project and service-role client — no new infra, no extra billing tier.
**Trade-offs:** ivfflat index requires approximate nearest-neighbor tuning (lists=100 chosen as safe default for expected chunk volumes < 50k). Ruled out Pinecone/Weaviate (new infra, new auth, added latency).

### File storage: Supabase Storage
**Why:** Native RLS, same project, free tier. File URL stored in lecture_materials.file_url.
**Trade-offs:** 50MB free limit per project — acceptable for slide decks ≤ 20MB per upload.

### Materials scope: per-session only
**Why:** Matches immediate MVP requirement. Cross-session reuse requires class entity design that is explicitly deferred.
**Trade-offs:** Students re-upload if they want the same materials for a different session — acceptable friction at MVP stage.

### Test framework: Vitest
**Why:** Native ESM support matches backend "type":"module"; zero-config with tsx; fast watch mode; compatible with Node.js built-ins.
**Trade-offs:** Ruled out Jest (requires additional ESM transform config with tsx/ts-jest).

### Chunking strategy: ~800 chars, 100-char overlap, paragraph → sentence boundary
**Why:** Balances retrieval precision vs. contextual coherence. Paragraph boundaries preferred; sentence boundaries as fallback when paragraph would exceed 850 chars.
**Trade-offs:** Fixed-character chunking is simpler than token-based but slightly less precise for embedding alignment. Acceptable for MVP.

### Upload middleware: multer memory storage, 20 MB cap
**Why:** Standard Express multipart pattern; keeps file in memory for immediate parsing without temp-file I/O.
**Trade-offs:** Memory spike for large uploads — mitigated by 20MB cap.
