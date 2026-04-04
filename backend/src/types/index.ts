// ---- DB row types ----

export interface Session {
  session_id: string;
  user_id: string;
  started_at: string;       // ISO 8601
  ended_at: string | null;
  status: 'active' | 'paused' | 'ended' | 'disconnected';
}

export interface TranscriptChunk {
  chunk_id: string;
  session_id: string;
  text: string;
  timestamp: string;        // ISO 8601
  is_final: boolean;
}

export interface Card {
  card_id: string;
  session_id: string;
  type: 'summary' | 'catchmeup';
  content: SummaryContent | CatchMeUpContent;
  generated_at: string;     // ISO 8601
  transcript_from: string;
  transcript_to: string;
  interval_number: number;
}

// ---- Claude API output schemas (per CLAUDE.md) ----

export interface SummaryContent {
  type: 'summary';
  title: string;
  bullets: string[];
  keywords: string[];
  qa: Array<{ question: string; answer: string }>;
  timestamp: string;
}

export interface CatchMeUpContent {
  type: 'catchmeup';
  now: string;
  missed: string;
  read_first: number[];
  rejoin_tip: string;
  timestamp: string;
}

// ---- Express request extension ----

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
