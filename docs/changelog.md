# Changelog
> Format: [Keep a Changelog](https://keepachangelog.com) — Added, Changed, Removed, Fixed

---

## [Unreleased] — 2026-05-01 — Phase RAG

### Added
- `backend/supabase-migration-002-rag.sql` — pgvector extension, `lecture_materials` table, `material_chunks` table (vector(512)), ivfflat index, `has_materials` column on sessions, RLS policies, `match_material_chunks` RPC function
- `backend/src/services/embeddingService.ts` — Voyage AI voyage-3-lite fetch wrapper; single retry on 5xx; immediate throw on 401
- `backend/src/services/materialService.ts` — `processMaterial(buffer, mimeType, filename, sessionId, materialId)`: parse (pdf-parse / mammoth / TXT), `chunkText` (~800-char / 100-char overlap), embedChunks (batched 32), bulk insert chunks, status update; `chunkText` exported for unit tests
- `backend/src/services/retrieverService.ts` — `queryRelevantChunks(sessionId, queryText, k=5)`: has_materials fast path; Voyage query embed; Supabase RPC cosine top-K; returns labeled excerpt string
- `backend/vitest.config.ts` — Vitest configuration with setupFiles
- `backend/vitest.setup.ts` — Global test env var stubs
- `backend/src/services/chunkText.test.ts` — 4 chunker unit tests
- `backend/src/services/embeddingService.test.ts` — 4 embedding wrapper tests
- `backend/src/services/retrieverService.test.ts` — 2 retriever tests
- `backend/src/services/materialService.test.ts` — 2 material status tests
- `frontend/src/components/NewSessionPage.tsx` — Pre-session drag-drop upload page; native HTML5 DnD; XHR upload with progress bar; 2s polling; Skip & Start / Start session buttons; Peeko design language
- `frontend/src/lib/api.ts` — `uploadMaterial` (XHR + progress), `getMaterials`, `startSession`
- `docs/changelog.md` — this file
- `docs/decisions.md` — architectural decision log
- `docs/implementation_plan.md` — phased implementation plan

### Changed
- `backend/src/config/env.ts` — added `VOYAGE_API_KEY: require('VOYAGE_API_KEY')`
- `backend/src/services/claudeService.ts` — `generateSummaryCard` and `generateCatchMeUp` accept optional `retrievedContext = ''` param; updated user messages per PRD-addition §7; system prompts append materials grounding sentence
- `backend/src/services/cardService.ts` — both LLM call sites now call `retrieverService.queryRelevantChunks` and pass context; imports retrieverService
- `backend/src/routes/session.ts` — added `POST /session/:id/materials` (multer memory, 20MB), `GET /session/:id/materials`; imports multer, materialService, supabase
- `backend/package.json` — added: `pdf-parse`, `mammoth`, `multer` (deps); `vitest`, `@types/multer`, `@types/pdf-parse` (devDeps); `test` + `test:watch` scripts
- `backend/.gitignore` — added `.env.local`, `*.log`, `.DS_Store`, `Thumbs.db`
- `frontend/src/App.tsx` — promoted `/session/new` to explicit `new-session` page before `/session/:id` catch-all; added `NewSessionPage` import and route handler

---

*Prior to 2026-05-01: frontend v2 and backend v1 shipped (see docs/progress.md for pre-RAG state snapshot)*
