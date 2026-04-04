import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!env.AUTH_REQUIRED) {
    req.userId = 'dev-user';
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = header.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = data.user.id;
  next();
}

// Verify a WebSocket token — returns userId or null
export async function verifyToken(token: string): Promise<string | null> {
  if (!env.AUTH_REQUIRED) return 'dev-user';

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
