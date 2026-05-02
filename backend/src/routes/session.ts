import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as sessionService from '../services/sessionService.js';
import * as transcriptService from '../services/transcriptService.js';
import * as cardService from '../services/cardService.js';
import { processMaterial } from '../services/materialService.js';
import { supabase } from '../config/supabase.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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

// GET /session  (list user's sessions)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await sessionService.getUserSessions(req.userId!);
    res.json({ sessions });
  } catch (err) { next(err); }
});

// POST /session/start
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const session = await sessionService.createSession(userId);
    res.json({ session_id: session.session_id });
  } catch (err) { next(err); }
});

// DELETE /session/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sessionService.deleteSession(req.params['id'] as string, req.userId!);
    res.json({ success: true });
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

// POST /session/:id/materials — fire-and-poll: returns immediately with processing status
router.post(
  '/:id/materials',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await requireSession(req.params['id'] as string, res);
      if (!session) return;

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'file field is required' });
        return;
      }

      // Insert stub row to get a material_id immediately
      const { data: matRow, error: insertError } = await supabase
        .from('lecture_materials')
        .insert({
          session_id: session.session_id,
          filename: file.originalname,
          file_url: '',
          mime_type: file.mimetype,
          status: 'processing',
        })
        .select('material_id')
        .single();

      if (insertError || !matRow) {
        throw new Error(`Failed to create material row: ${insertError?.message}`);
      }

      const materialId = (matRow as { material_id: string }).material_id;

      // Fire-and-poll: process asynchronously
      processMaterial(file.buffer, file.mimetype, file.originalname, session.session_id, materialId).catch(
        (err: Error) => console.error('[materials] Processing failed:', err.message),
      );

      res.json({ material_id: materialId, status: 'processing' });
    } catch (err) { next(err); }
  },
);

// GET /session/:id/materials — poll for status
router.get('/:id/materials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await requireSession(req.params['id'] as string, res);
    if (!session) return;

    const { data, error } = await supabase
      .from('lecture_materials')
      .select('material_id, filename, status, chunk_count')
      .eq('session_id', session.session_id)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    res.json({ materials: data ?? [] });
  } catch (err) { next(err); }
});

export default router;
