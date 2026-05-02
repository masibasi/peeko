import { anthropic } from '../config/claude.js';
import { Card, SummaryContent, CatchMeUpContent } from '../types/index.js';

const MODEL = 'claude-sonnet-4-6';

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

async function chat(system: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateSummaryCard(
  previousCards: Card[],
  transcriptWindow: string,
  retrievedContext = '',
): Promise<SummaryContent> {
  const previousCardsSummary =
    previousCards.length > 0
      ? previousCards.map((c, i) => `Card ${i + 1} (${c.type}): ${JSON.stringify(c.content)}`).join('\n')
      : 'None yet.';

  const userMessage = `Lecture materials (excerpts most relevant to this window):
${retrievedContext || '(none provided)'}

Previous cards (session memory):
${previousCardsSummary}

New transcript (last 5 minutes):
${transcriptWindow}

Generate the next summary card. Capture key concepts and 2-3 bullet points.
If the professor asked a question and answered it in this window, include it in the qa array.
If no Q&A detected, return qa as an empty array [].`;

  const system =
    'You are a lecture assistant. Return ONLY valid JSON matching this exact schema — no preamble, no markdown, no extra fields:\n' +
    '{"type":"summary","title":"string","bullets":["string"],"keywords":["string"],"qa":[{"question":"string","answer":"string"}],"timestamp":"ISO string"}\n' +
    'Use "bullets" (not bullet_points) and "keywords" (not key_concepts).\n' +
    'When lecture materials are provided, prioritize concepts grounded in them; treat tangents not supported by the materials as secondary.';

  const text = await chat(system, userMessage);

  try {
    return parseJSON(text) as SummaryContent;
  } catch {
    const retry = await chat(
      'You MUST return raw JSON only. No markdown, no code fences, no explanation.',
      userMessage,
    );
    return parseJSON(retry) as SummaryContent;
  }
}

export async function generateCatchMeUp(
  allCards: Card[],
  transcriptSinceCheckpoint: string,
  retrievedContext = '',
): Promise<CatchMeUpContent> {
  const cardsSummary =
    allCards.length > 0
      ? allCards
          .map((c, i) => `Card ${i + 1} (interval ${c.interval_number}, ${c.type}): ${JSON.stringify(c.content)}`)
          .join('\n')
      : 'None yet.';

  const userMessage = `Lecture materials (excerpts most relevant to this moment):
${retrievedContext || '(none provided)'}

Cards generated so far:
${cardsSummary}

Transcript since last card checkpoint:
${transcriptSinceCheckpoint || '(no new transcript since last card)'}

The student just snapped back to attention. Generate a recovery response: now / missed / read_first / rejoin_tip.`;

  const system =
    'You are a lecture recovery assistant. Return ONLY valid JSON. No preamble, no markdown.\n' +
    'When lecture materials are provided, prioritize concepts grounded in them; treat tangents not supported by the materials as secondary.';

  const text = await chat(system, userMessage);

  try {
    return parseJSON(text) as CatchMeUpContent;
  } catch {
    const retry = await chat(
      'You MUST return raw JSON only. No markdown, no code fences, no explanation.',
      userMessage,
    );
    return parseJSON(retry) as CatchMeUpContent;
  }
}
