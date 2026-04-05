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

export async function getUserSessions(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('session_id, started_at, ended_at, status')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);

  const sessions = await Promise.all((data || []).map(async (session) => {
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.session_id);

    const startedAt = new Date(session.started_at);
    const endedAt = session.ended_at ? new Date(session.ended_at) : new Date();
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    return {
      id: session.session_id,
      title: `Session — ${startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      createdAt: session.started_at,
      duration: durationMinutes,
      cardCount: count || 0,
      status: session.status,
    };
  }));

  return sessions;
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  // Delete cards and transcript chunks first (cascade not guaranteed)
  await supabase.from('cards').delete().eq('session_id', sessionId);
  await supabase.from('transcript_chunks').delete().eq('session_id', sessionId);

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId); // ensures user owns the session

  if (error) throw new Error(`Failed to delete session: ${error.message}`);
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
