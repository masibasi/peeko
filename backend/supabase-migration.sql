-- Run this in the Supabase SQL editor to set up the Peeko schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions
CREATE TABLE sessions (
  session_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'paused', 'ended', 'disconnected'))
);

-- Transcript chunks (only final Deepgram results stored)
CREATE TABLE transcript_chunks (
  chunk_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_final    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Summary and catch-me-up cards
CREATE TABLE cards (
  card_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('summary', 'catchmeup')),
  content          JSONB NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript_from  TIMESTAMPTZ,
  transcript_to    TIMESTAMPTZ,
  interval_number  INTEGER
);

-- Indexes
CREATE INDEX idx_transcript_chunks_session_ts ON transcript_chunks(session_id, timestamp);
CREATE INDEX idx_cards_session_generated       ON cards(session_id, generated_at);
CREATE INDEX idx_sessions_user                 ON sessions(user_id);

-- Row Level Security
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_transcript_chunks" ON transcript_chunks
  FOR ALL USING (
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_cards" ON cards
  FOR ALL USING (
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );
