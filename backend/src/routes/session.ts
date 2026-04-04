import { Router, Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/sessionService.js';
import * as transcriptService from '../services/transcriptService.js';
import * as cardService from '../services/cardService.js';

const router = Router();

// Helper to get session and verify it exists
async function requireSession(sessionId: string, res: Response) {
  const session = await sessionService.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }
  return session;
}

// POST /session/start
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const session = await sessionService.createSession(userId);
    res.json({ session_id: session.session_id });
  } catch (err) { next(err); }
});

// POST /session/:id/end
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await requireSession(req.params['id'] as string, res);
    if (!session) return;
    await sessionService.endSession(session.session_id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /session/:id/transcript  (dev convenience — primary path is WebSocket audio)
router.post('/:id/transcript', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body as { text: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const chunk = await transcriptService.storeChunk(req.params['id'] as string, text.trim());
    res.json({ success: true, chunk_id: chunk.chunk_id });
  } catch (err) { next(err); }
});

// POST /session/:id/generate-card  (called by frontend 5-min timer)
router.post('/:id/generate-card', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await requireSession(req.params['id'] as string, res);
    if (!session) return;
    const result = await cardService.generateCard(session.session_id, session.started_at);
    res.json({
      success: result.status === 'generated',
      status: result.status,
      card: result.card,
      reason: result.reason,
    });
  } catch (err) { next(err); }
});

// POST /session/:id/catch-me-up
router.post('/:id/catch-me-up', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await requireSession(req.params['id'] as string, res);
    if (!session) return;
    const card = await cardService.generateCatchMeUp(session.session_id, session.started_at);
    res.json({ success: true, card });
  } catch (err) { next(err); }
});

// GET /session/:id/cards  (polled every 3s by frontend)
router.get('/:id/cards', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cards = await cardService.getCards(req.params['id'] as string);
    res.json({ cards });
  } catch (err) { next(err); }
});

// GET /session/:id/notebook
router.get('/:id/notebook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notebook = await cardService.getNotebook(req.params['id'] as string);
    res.json(notebook);
  } catch (err) { next(err); }
});

export default router;
