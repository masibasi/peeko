import { supabase } from '../config/supabase.js';
import { Session } from '../types/index.js';
import { generateFinalCard } from './cardService.js';

export async function createSession(userId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data as Session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch session: ${error.message}`);
  return data as Session | null;
}

export async function endSession(sessionId: string): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Generate final card (no word count guard)
  await generateFinalCard(sessionId, session.started_at).catch((err) => {
    console.error('[sessionService] Final card generation failed:', err);
    // Non-fatal — session still ends
  });

  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to end session: ${error.message}`);
  return data as Session;
}

export async function updateStatus(
  sessionId: string,
  status: Session['status'],
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('session_id', sessionId);

  if (error) throw new Error(`Failed to update session status: ${error.message}`);
}
