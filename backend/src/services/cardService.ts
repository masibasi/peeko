import { supabase } from '../config/supabase.js';
import * as transcriptService from './transcriptService.js';
import * as claudeService from './claudeService.js';
import { Card, SummaryContent, CatchMeUpContent } from '../types/index.js';

// ---- Helpers ----

async function getCards(sessionId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select()
    .eq('session_id', sessionId)
    .order('generated_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch cards: ${error.message}`);
  return (data as Card[]) ?? [];
}

async function saveCard(
  sessionId: string,
  type: 'summary' | 'catchmeup',
  content: SummaryContent | CatchMeUpContent,
  transcriptFrom: string,
  transcriptTo: string,
  intervalNumber: number,
): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .insert({
      session_id: sessionId,
      type,
      content,
      transcript_from: transcriptFrom,
      transcript_to: transcriptTo,
      interval_number: intervalNumber,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save card: ${error.message}`);
  return data as Card;
}

function getCheckpoint(cards: Card[], sessionStartedAt: string): string {
  // Use transcript_to of the last summary card as the checkpoint
  const summarycards = cards.filter((c) => c.type === 'summary');
  return summarycards.length > 0
    ? summarycards[summarycards.length - 1].transcript_to
    : sessionStartedAt;
}

// ---- Public API ----

export async function generateCard(
  sessionId: string,
  sessionStartedAt: string,
  skipWordCountGuard = false,
): Promise<{ status: 'generated' | 'skipped' | 'failed'; card?: Card; reason?: string }> {
  const allCards = await getCards(sessionId);
  const checkpoint = getCheckpoint(allCards, sessionStartedAt);

  // Word count guard (skip for final card)
  if (!skipWordCountGuard) {
    const wordCount = await transcriptService.countWordsSince(sessionId, checkpoint);
    const minWords = parseInt(process.env['MIN_WORDS_FOR_CARD'] ?? '10', 10);
    if (wordCount < minWords) {
      return { status: 'skipped', reason: `Only ${wordCount} words since last card (min: ${minWords})` };
    }
  }

  const transcriptWindow = await transcriptService.getTranscriptTextSince(sessionId, checkpoint);
  if (!transcriptWindow.trim() && !skipWordCountGuard) {
    return { status: 'skipped', reason: 'No transcript content' };
  }

  const lastChunkTs = await transcriptService.getLastChunkTimestamp(sessionId);
  const transcriptTo = lastChunkTs ?? new Date().toISOString();
  const intervalNumber = allCards.filter((c) => c.type === 'summary').length + 1;

  try {
    const content = await claudeService.generateSummaryCard(allCards, transcriptWindow || '(silence)');
    const card = await saveCard(
      sessionId,
      'summary',
      content,
      checkpoint,
      transcriptTo,
      intervalNumber,
    );
    return { status: 'generated', card };
  } catch (err) {
    // On failure, checkpoint does NOT advance — window merges into next interval
    console.error('[cardService] Card generation failed:', err);
    return { status: 'failed', reason: (err as Error).message };
  }
}

export async function generateFinalCard(sessionId: string, sessionStartedAt: string): Promise<Card | null> {
  const result = await generateCard(sessionId, sessionStartedAt, true);
  return result.card ?? null;
}

export async function generateCatchMeUp(
  sessionId: string,
  sessionStartedAt: string,
): Promise<Card> {
  const allCards = await getCards(sessionId);
  const checkpoint = getCheckpoint(allCards, sessionStartedAt);
  const transcriptSinceCheckpoint = await transcriptService.getTranscriptTextSince(
    sessionId,
    checkpoint,
  );

  const content = await claudeService.generateCatchMeUp(allCards, transcriptSinceCheckpoint);

  // Catch Me Up is saved at the end of the timeline, does NOT advance summary checkpoint
  const lastChunkTs = await transcriptService.getLastChunkTimestamp(sessionId);
  const now = lastChunkTs ?? new Date().toISOString();

  const { data, error } = await supabase
    .from('cards')
    .insert({
      session_id: sessionId,
      type: 'catchmeup',
      content,
      transcript_from: checkpoint,
      transcript_to: now,
      interval_number: allCards.length + 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save catch-me-up card: ${error.message}`);
  return data as Card;
}

export { getCards };

export async function getNotebook(
  sessionId: string,
): Promise<{ cards: Card[]; transcripts: Awaited<ReturnType<typeof transcriptService.getAllChunks>> }> {
  const [cards, transcripts] = await Promise.all([
    getCards(sessionId),
    transcriptService.getAllChunks(sessionId),
  ]);
  return { cards, transcripts };
}
