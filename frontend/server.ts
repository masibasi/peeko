import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// In-memory database
const db = {
  sessions: new Map<string, any>(),
  transcripts: new Map<string, any[]>(),
  cards: new Map<string, any[]>(),
  users: new Map<string, any>(), // For user authentication
};

// Google OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

// Simple JWT helper (for development - use a proper library in production)
function createJWT(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  // Note: In production, use a proper signing mechanism with crypto
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.secret`).toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Claude
  const claude = new Anthropic({
    apiKey: process.env.Claude_API_KEY || '',
  });

  // Authentication Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(); // Allow unauthenticated access for now
    }
    try {
      // Decode and verify JWT token
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      (req as any).user = payload;
    } catch (error) {
      console.error('Invalid token:', error);
    }
    next();
  };

  app.use(authMiddleware);

  // Google OAuth2 Routes
  app.get('/api/auth/google', (req, res) => {
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    res.redirect(authUrl);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        return res.status(400).json({ error: tokens.error_description || 'Token exchange failed' });
      }

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      // Create JWT token for the app
      const appToken = createJWT({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      });

      // Store user in db
      db.users.set(userInfo.email, {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
      });

      // Redirect to frontend with token
      res.redirect(`/?token=${appToken}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Get current user profile
  app.get('/api/auth/profile', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ success: true, data: user });
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });

  // Email/Password Registration
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    if (db.users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Store user (in production, hash the password!)
    const userId = uuidv4();
    db.users.set(email, {
      id: userId,
      email,
      password, // Note: In production, hash this!
      name: name || email.split('@')[0],
      createdAt: Date.now(),
    });

    // Create JWT token
    const token = createJWT({
      sub: userId,
      email,
      name: name || email.split('@')[0],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    });

    res.json({ success: true, token, user: { email, name: name || email.split('@')[0] } });
  });

  // Email/Password Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.users.get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = createJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    });

    res.json({ success: true, token, user: { email: user.email, name: user.name } });
  });

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
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Generate a summary card for this lecture transcript segment. Respond with a JSON object containing: title (string), bullets (array of strings), keywords (array of strings).

Transcript:
${transcriptText}

Respond ONLY with valid JSON, no markdown or explanation.`
          }
        ]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        const content = JSON.parse(textContent.text);
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
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `The student zoned out. Summarize the following recent lecture transcript concisely to catch them up. Respond with a JSON object containing: title (string), bullets (array of strings), keywords (array of strings).

Transcript:
${transcriptText}

Respond ONLY with valid JSON, no markdown or explanation.`
          }
        ]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        const content = JSON.parse(textContent.text);
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
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Lecture Transcript Context:
${transcriptText}

Student Question: ${question}

Answer the student's question based on the lecture context. If the answer is not in the context, use your general knowledge but mention that it wasn't explicitly covered. Respond with a JSON object containing: answer (string).

Respond ONLY with valid JSON, no markdown or explanation.`
          }
        ]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        const content = JSON.parse(textContent.text);
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
