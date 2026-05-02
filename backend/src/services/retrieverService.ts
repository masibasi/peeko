import { supabase } from '../config/supabase.js';
import { embedTexts } from './embeddingService.js';

interface ChunkRow {
  chunk_id: string;
  text: string;
  similarity: number;
}

export async function queryRelevantChunks(
  sessionId: string,
  queryText: string,
  k = 5,
): Promise<string> {
  // Fast path: check has_materials before calling embedding service
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('has_materials')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !session || !session.has_materials) return '';

  // Embed the query
  const [queryEmbedding] = await embedTexts([queryText], 'query');
  if (!queryEmbedding) return '';

  // Cosine similarity top-K via Supabase RPC
  const { data: chunks, error: rpcError } = await supabase.rpc('match_material_chunks', {
    p_session_id: sessionId,
    p_query_embedding: queryEmbedding,
    p_match_count: k,
  });

  if (rpcError || !chunks || (chunks as ChunkRow[]).length === 0) return '';

  return (chunks as ChunkRow[])
    .map((c, i) => `[Excerpt ${i + 1}]: ${c.text}`)
    .join('\n\n');
}
