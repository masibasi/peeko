import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, Type } from '@google/genai';

// In-memory database
const db = {
  sessions: new Map<string, any>(),
  transcripts: new Map<string, any[]>(),
  cards: new Map<string, any[]>(),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // API Routes
  app.post('/api/session/start', (req, res) => {
    const sessionId = uuidv4();
    db.sessions.set(sessionId, {
      session_id: sessionId,
      started_at: Date.now(),
      status: 'active',
    });
    db.transcripts.set(sessionId, []);
    db.cards.set(sessionId, []);
    res.json({ session_id: sessionId });
  });

  app.post('/api/session/:id/end', (req, res) => {
    const { id } = req.params;
    const session = db.sessions.get(id);
    if (session) {
      session.status = 'ended';
      session.ended_at = Date.now();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  app.post('/api/session/:id/transcript', (req, res) => {
    const { id } = req.params;
    const { text, is_final } = req.body;
    
    if (!db.transcripts.has(id)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const chunk = {
      chunk_id: uuidv4(),
      session_id: id,
      text,
      timestamp: Date.now(),
      is_final
    };

    db.transcripts.get(id)?.push(chunk);
    res.json({ success: true, chunk_id: chunk.chunk_id });
  });

  app.get('/api/session/:id/transcript', (req, res) => {
    const { id } = req.params;
    const transcripts = db.transcripts.get(id) || [];
    res.json({ transcripts });
  });

  app.post('/api/session/:id/generate-card', async (req, res) => {
    const { id } = req.params;
    const transcripts = db.transcripts.get(id) || [];
    const cards = db.cards.get(id) || [];
    
    // Get transcripts since last card
    const lastCard = cards[cards.length - 1];
    const lastTimestamp = lastCard ? lastCard.transcript_to : 0;
    
    const newTranscripts = transcripts.filter(t => t.timestamp > lastTimestamp && t.is_final);
    const transcriptText = newTranscripts.map(t => t.text).join(' ');

    if (transcriptText.trim().length < 50) {
      return res.json({ status: 'skipped', reason: 'Not enough content' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a summary card for this lecture transcript segment:\n\n${transcriptText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "bullets", "keywords"]
          }
        }
      });

      if (response.text) {
        const content = JSON.parse(response.text);
        const card = {
          card_id: uuidv4(),
          session_id: id,
          content,
          generated_at: Date.now(),
          transcript_from: newTranscripts[0].timestamp,
          transcript_to: newTranscripts[newTranscripts.length - 1].timestamp,
          interval_number: cards.length + 1,
          type: 'card'
        };
        
        cards.push(card);
        db.cards.set(id, cards);
        
        return res.json({ success: true, card });
      }
    } catch (error) {
      console.error('Error generating card:', error);
      return res.status(500).json({ error: 'Failed to generate card' });
    }
  });

  app.post('/api/session/:id/catch-me-up', async (req, res) => {
    const { id } = req.params;
    const transcripts = db.transcripts.get(id) || [];
    
    // Get last 5 minutes of transcripts
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    const recentTranscripts = transcripts.filter(t => t.timestamp > fiveMinsAgo);
    const transcriptText = recentTranscripts.map(t => t.text).join(' ');

    if (!transcriptText.trim()) {
      return res.json({ success: true, card: { content: { title: "Catch Me Up", bullets: ["No recent activity to summarize."], keywords: [] }, type: 'catchmeup' } });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `The student zoned out. Summarize the following recent lecture transcript concisely to catch them up:\n\n${transcriptText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "bullets", "keywords"]
          }
        }
      });

      if (response.text) {
        const content = JSON.parse(response.text);
        const card = {
          card_id: uuidv4(),
          session_id: id,
          content,
          generated_at: Date.now(),
          type: 'catchmeup'
        };
        
        const cards = db.cards.get(id) || [];
        cards.push(card);
        db.cards.set(id, cards);
        
        return res.json({ success: true, card });
      }
    } catch (error) {
      console.error('Error generating catch me up:', error);
      return res.status(500).json({ error: 'Failed to generate catch me up' });
    }
  });

  app.post('/api/session/:id/ask', async (req, res) => {
    const { id } = req.params;
    const { question } = req.body;
    const transcripts = db.transcripts.get(id) || [];
    
    const transcriptText = transcripts.map(t => t.text).join(' ');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Lecture Transcript Context:\n${transcriptText}\n\nStudent Question: ${question}\n\nAnswer the student's question based on the lecture context. If the answer is not in the context, use your general knowledge but mention that it wasn't explicitly covered.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING }
            },
            required: ["answer"]
          }
        }
      });

      if (response.text) {
        const content = JSON.parse(response.text);
        const card = {
          card_id: uuidv4(),
          session_id: id,
          content: {
            title: `Q: ${question}`,
            bullets: [content.answer],
            keywords: []
          },
          generated_at: Date.now(),
          type: 'qa'
        };
        
        const cards = db.cards.get(id) || [];
        cards.push(card);
        db.cards.set(id, cards);
        
        return res.json({ success: true, card });
      }
    } catch (error) {
      console.error('Error answering question:', error);
      return res.status(500).json({ error: 'Failed to answer question' });
    }
  });

  app.get('/api/session/:id/cards', (req, res) => {
    const { id } = req.params;
    const cards = db.cards.get(id) || [];
    res.json({ cards });
  });

  app.get('/api/session/:id/notebook', (req, res) => {
    const { id } = req.params;
    const cards = db.cards.get(id) || [];
    const transcripts = db.transcripts.get(id) || [];
    res.json({ cards, transcripts });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
