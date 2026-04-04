import { create } from 'zustand';

export interface Card {
  card_id: string;
  session_id: string;
  content: {
    title: string;
    bullets: string[];
    keywords: string[];
  };
  generated_at: number;
  transcript_from?: number;
  transcript_to?: number;
  interval_number?: number;
  type: 'card' | 'qa' | 'catchmeup';
}

export interface TranscriptChunk {
  chunk_id: string;
  session_id: string;
  text: string;
  timestamp: number;
  is_final: boolean;
}

interface ClassMateState {
  sessionId: string | null;
  isRecording: boolean;
  transcripts: TranscriptChunk[];
  cards: Card[];
  interimTranscript: string;
  
  setSessionId: (id: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setInterimTranscript: (text: string) => void;
  addTranscript: (chunk: TranscriptChunk) => void;
  addCard: (card: Card) => void;
  setCards: (cards: Card[]) => void;
}

export const useStore = create<ClassMateState>((set) => ({
  sessionId: null,
  isRecording: false,
  transcripts: [],
  cards: [],
  interimTranscript: '',
  
  setSessionId: (id) => set({ sessionId: id }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  addTranscript: (chunk) => set((state) => ({ 
    transcripts: [...state.transcripts, chunk] 
  })),
  addCard: (card) => set((state) => ({ 
    cards: [...state.cards, card] 
  })),
  setCards: (cards) => set({ cards }),
}));
