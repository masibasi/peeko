import { supabase } from '../config/supabase.js';
import { TranscriptChunk } from '../types/index.js';

export async function storeChunk(sessionId: string, text: string): Promise<TranscriptChunk> {
  const { data, error } = await supabase
    .from('transcript_chunks')
    .insert({ session_id: sessionId, text, is_final: true })
    .select()
    .single();

  if (error) throw new Error(`Failed to store transcript chunk: ${error.message}`);
  return data as TranscriptChunk;
}

export async function getChunksSince(sessionId: string, since: string): Promise<TranscriptChunk[]> {
  const { data, error } = await supabase
    .from('transcript_chunks')
    .select()
    .eq('session_id', sessionId)
    .gt('timestamp', since)
    .order('timestamp', { ascending: true });

  if (error) throw new Error(`Failed to fetch transcript chunks: ${error.message}`);
  return (data as TranscriptChunk[]) ?? [];
}

export async function getTranscriptTextSince(sessionId: string, since: string): Promise<string> {
  const chunks = await getChunksSince(sessionId, since);
  return chunks.map((c) => c.text).join(' ');
}

export async function countWordsSince(sessionId: string, since: string): Promise<number> {
  const text = await getTranscriptTextSince(sessionId, since);
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export async function getAllChunks(sessionId: string): Promise<TranscriptChunk[]> {
  const { data, error } = await supabase
    .from('transcript_chunks')
    .select()
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (error) throw new Error(`Failed to fetch transcript chunks: ${error.message}`);
  return (data as TranscriptChunk[]) ?? [];
}

export async function getLastChunkTimestamp(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('transcript_chunks')
    .select('timestamp')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch last chunk: ${error.message}`);
  return data?.timestamp ?? null;
}
