-- Migration 002: RAG-Powered Lecture Materials
-- Run in Supabase SQL editor after migration 001 (supabase-migration.sql)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- One row per uploaded file
CREATE TABLE lecture_materials (
  material_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  file_url       TEXT NOT NULL,          -- Supabase Storage path
  mime_type      TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('processing', 'ready', 'failed')),
  chunk_count    INTEGER DEFAULT 0,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- One row per text chunk from a material
CREATE TABLE material_chunks (
  chunk_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id  UUID NOT NULL REFERENCES lecture_materials(material_id) ON DELETE CASCADE,
  session_id   UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,  -- denormalized for fast retrieval
  chunk_index  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  embedding    vector(512) NOT NULL
);

-- Indexes
CREATE INDEX material_chunks_session_idx
  ON material_chunks(session_id);

CREATE INDEX material_chunks_embedding_idx
  ON material_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Fast check on the session row to skip retriever entirely when no materials
ALTER TABLE sessions ADD COLUMN has_materials BOOLEAN DEFAULT FALSE;

-- RLS: users can only access materials belonging to their own sessions
CREATE POLICY "Users can manage own lecture_materials"
  ON lecture_materials FOR ALL
  USING (session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own material_chunks"
  ON material_chunks FOR ALL
  USING (session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid()));

-- RPC: cosine similarity top-K retrieval for a session
CREATE OR REPLACE FUNCTION match_material_chunks(
  p_session_id     UUID,
  p_query_embedding vector(512),
  p_match_count    INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id   UUID,
  text       TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunk_id,
    text,
    1 - (embedding <=> p_query_embedding) AS similarity
  FROM material_chunks
  WHERE session_id = p_session_id
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;
