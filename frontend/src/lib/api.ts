import { Card, TranscriptChunk } from '../store/useStore';

export const api = {
  async startSession(): Promise<{ session_id: string }> {
    const res = await fetch('/api/session/start', { method: 'POST' });
    return res.json();
  },

  async endSession(sessionId: string): Promise<void> {
    await fetch(`/api/session/${sessionId}/end`, { method: 'POST' });
  },

  async sendTranscript(sessionId: string, text: string, is_final: boolean): Promise<{ chunk_id: string }> {
    const res = await fetch(`/api/session/${sessionId}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, is_final })
    });
    return res.json();
  },

  async generateCard(sessionId: string): Promise<{ success: boolean, card?: Card, status?: string }> {
    const res = await fetch(`/api/session/${sessionId}/generate-card`, { method: 'POST' });
    return res.json();
  },

  async catchMeUp(sessionId: string): Promise<{ success: boolean, card: Card }> {
    const res = await fetch(`/api/session/${sessionId}/catch-me-up`, { method: 'POST' });
    return res.json();
  },

  async askQuestion(sessionId: string, question: string): Promise<{ success: boolean, card: Card }> {
    const res = await fetch(`/api/session/${sessionId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    return res.json();
  },

  async getCards(sessionId: string): Promise<{ cards: Card[] }> {
    const res = await fetch(`/api/session/${sessionId}/cards`);
    return res.json();
  }
};
