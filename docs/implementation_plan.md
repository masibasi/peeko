# Implementation Plan

---

## Phase 1 — Core Backend (COMPLETE)
- [x] Express + WebSocket server
- [x] Deepgram STT proxy
- [x] Groq/Claude card generation
- [x] Supabase session, transcript, card persistence
- [x] All REST endpoints
- [x] Auth middleware (demo bypass mode)
- [x] `backend/supabase-migration.sql`

## Phase 2 — Frontend v2 (COMPLETE)
- [x] React routing (App.tsx)
- [x] LandingPage, LoginPage, Dashboard
- [x] SessionView with transcript display and card timer
- [x] Timeline sidebar
- [x] PeekoCharacter + PeekoPiP (Document PiP API)
- [x] PostSessionReport
- [x] AuthContext + JWT helpers

## Phase RAG — RAG-Powered Lecture Materials
Tasks in dependency order:

- [x] `backend/supabase-migration-002-rag.sql` — pgvector, lecture_materials, material_chunks, has_materials, match_material_chunks RPC
- [x] Vitest setup + failing tests (TDD — written before implementation)
- [x] `backend/src/config/env.ts` — add VOYAGE_API_KEY
- [x] `backend/src/services/embeddingService.ts` — Voyage AI fetch wrapper
- [x] `backend/src/services/materialService.ts` — parse, chunk, embed, store
- [x] `backend/src/services/retrieverService.ts` — cosine similarity top-K query
- [x] `backend/src/services/claudeService.ts` — add retrievedContext param
- [x] `backend/src/services/cardService.ts` — wire retriever at both LLM call sites
- [x] `backend/src/routes/session.ts` — POST/GET /session/:id/materials
- [x] `frontend/src/App.tsx` — promote /session/new route
- [x] `frontend/src/components/NewSessionPage.tsx` — drag-drop upload, polling, skip
- [x] `frontend/src/lib/api.ts` — uploadMaterial + getMaterials
