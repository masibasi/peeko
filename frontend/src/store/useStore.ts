import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Gamification types
export type PeekoState = 'calm' | 'fidgety' | 'puffed' | 'happy' | 'sleepy';

export interface Flashcard {
  id: string;
  timestamp: number;
  topic: string;
  front: string;
  back: string[];
  keywords: string[];
  importance: 'high' | 'medium' | 'low';
  type: 'flashcard' | 'qa' | 'catchup';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: 'focus_streak' | 'recovery' | 'flashcard_count' | 'qa_correct';
  target: number;
  progress: number;
  completed: boolean;
}

interface ClassMateState {
  // Session state
  sessionId: string | null;
  isRecording: boolean;
  transcripts: TranscriptChunk[];
  cards: Card[];
  interimTranscript: string;
  
  // Gamification state
  xp: number;
  level: number;
  recoveryStreak: number;
  sessionStreak: number;
  isSessionActive: boolean;
  sessionStartTime: number | null;
  totalDistractionSeconds: number;
  successfulRecoveries: number;
  focusScore: number;
  isDistracted: boolean;
  distractionStartTime: number | null;
  distractionCount: number;
  peekoState: PeekoState;
  nudgeMessage: string | null;
  flashcards: Flashcard[];
  quests: Quest[];
  
  // Session actions
  setSessionId: (id: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setInterimTranscript: (text: string) => void;
  addTranscript: (chunk: TranscriptChunk) => void;
  addCard: (card: Card) => void;
  setCards: (cards: Card[]) => void;
  
  // Gamification actions
  addXp: (amount: number) => void;
  startSession: () => void;
  endSession: () => void;
  setDistracted: (distracted: boolean) => void;
  recover: () => void;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'timestamp'>) => void;
  setQuests: (quests: Quest[]) => void;
  updateQuestProgress: (type: Quest['type'], amount: number) => void;
  setPeekoState: (state: PeekoState) => void;
  setNudgeMessage: (msg: string | null) => void;
  updateFocusScore: () => void;
}

const calculateLevel = (xp: number) => {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  return 5;
};

export const useStore = create<ClassMateState>()(
  persist(
    (set, get) => ({
      // Session state
      sessionId: null,
      isRecording: false,
      transcripts: [],
      cards: [],
      interimTranscript: '',
      
      // Gamification state
      xp: 0,
      level: 1,
      recoveryStreak: 0,
      sessionStreak: 0,
      isSessionActive: false,
      sessionStartTime: null,
      totalDistractionSeconds: 0,
      successfulRecoveries: 0,
      focusScore: 100,
      isDistracted: false,
      distractionStartTime: null,
      distractionCount: 0,
      peekoState: 'calm',
      nudgeMessage: null,
      flashcards: [],
      quests: [],
      
      // Session actions
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
      
      // Gamification actions
      addXp: (amount) => set((state) => {
        const newXp = state.xp + amount;
        return { xp: newXp, level: calculateLevel(newXp) };
      }),
      
      startSession: () => set({
        isSessionActive: true,
        sessionStartTime: Date.now(),
        totalDistractionSeconds: 0,
        successfulRecoveries: 0,
        focusScore: 100,
        isDistracted: false,
        distractionStartTime: null,
        distractionCount: 0,
        peekoState: 'calm',
        nudgeMessage: null,
        flashcards: [],
      }),
      
      endSession: () => set({ isSessionActive: false }),
      
      setDistracted: (distracted) => set((state) => {
        if (distracted && !state.isDistracted) {
          return {
            isDistracted: true,
            distractionStartTime: Date.now(),
            distractionCount: state.distractionCount + 1,
            peekoState: state.distractionCount === 0 ? 'fidgety' : 'puffed',
          };
        } else if (!distracted && state.isDistracted) {
          return { isDistracted: false, distractionStartTime: null };
        }
        return {};
      }),
      
      recover: () => set((state) => {
        if (!state.isDistracted) return {};
        
        const distractionDuration = state.distractionStartTime 
          ? (Date.now() - state.distractionStartTime) / 1000 
          : 0;
          
        return {
          isDistracted: false,
          distractionStartTime: null,
          totalDistractionSeconds: state.totalDistractionSeconds + distractionDuration,
          successfulRecoveries: state.successfulRecoveries + 1,
          recoveryStreak: state.recoveryStreak + 1,
          peekoState: 'happy',
          nudgeMessage: null,
        };
      }),
      
      addFlashcard: (card) => set((state) => ({
        flashcards: [{
          ...card,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now()
        }, ...state.flashcards]
      })),
      
      setQuests: (quests) => set({ quests }),
      
      updateQuestProgress: (type, amount) => set((state) => ({
        quests: state.quests.map(q => {
          if (q.type === type && !q.completed) {
            const newProgress = q.progress + amount;
            if (newProgress >= q.target) {
              return { ...q, progress: newProgress, completed: true };
            }
            return { ...q, progress: newProgress };
          }
          return q;
        })
      })),
      
      setPeekoState: (peekoState) => set({ peekoState }),
      setNudgeMessage: (nudgeMessage) => set({ nudgeMessage }),
      
      updateFocusScore: () => set((state) => {
        if (!state.sessionStartTime) return {};
        const totalTime = (Date.now() - state.sessionStartTime) / 1000;
        if (totalTime <= 0) return {};
        
        let currentDistractionTime = 0;
        if (state.isDistracted && state.distractionStartTime) {
          currentDistractionTime = (Date.now() - state.distractionStartTime) / 1000;
        }
        
        const distractedTime = state.totalDistractionSeconds + currentDistractionTime;
        const recoveryBonus = state.successfulRecoveries * 0.05;
        
        const score = Math.min(
          100,
          Math.max(0, Math.round(((1 - (distractedTime / totalTime)) + recoveryBonus) * 100))
        );
        
        return { focusScore: score };
      }),
    }),
    {
      name: 'peeko-storage',
      partialize: (state) => ({
        xp: state.xp,
        level: state.level,
        recoveryStreak: state.recoveryStreak,
        sessionStreak: state.sessionStreak,
      }),
    }
  )
);
