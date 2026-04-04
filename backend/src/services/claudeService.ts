import { anthropic } from '../config/claude.js';
import { Card, SummaryContent, CatchMeUpContent } from '../types/index.js';

function parseJSON(text: string): unknown {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

export async function generateSummaryCard(
  previousCards: Card[],
  transcriptWindow: string,
): Promise<SummaryContent> {
  const previousCardsSummary =
    previousCards.length > 0
      ? previousCards
          .map(
            (c, i) =>
              `Card ${i + 1} (${c.type}): ${JSON.stringify(c.content)}`,
          )
          .join('\n')
      : 'None yet.';

  const userMessage = `Previous cards (session memory):
${previousCardsSummary}

New transcript (last 5 minutes):
${transcriptWindow}

Generate the next summary card. Capture key concepts and 2-3 bullet points.
If the professor asked a question and answered it in this window, include it in the qa array.
If no Q&A detected, return qa as an empty array [].`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:
      'You are a lecture assistant. Return ONLY valid JSON. No preamble, no markdown.',
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    return parseJSON(text) as SummaryContent;
  } catch {
    // Retry with a stricter prompt
    const retry = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:
        'You are a lecture assistant. You MUST return raw JSON with absolutely no wrapping, no markdown, no code fences, no explanation. Only the JSON object itself.',
      messages: [{ role: 'user', content: userMessage }],
    });
    const retryText =
      retry.content[0].type === 'text' ? retry.content[0].text : '';
    return parseJSON(retryText) as SummaryContent;
  }
}

export async function generateCatchMeUp(
  allCards: Card[],
  transcriptSinceCheckpoint: string,
): Promise<CatchMeUpContent> {
  const cardsSummary =
    allCards.length > 0
      ? allCards
          .map(
            (c, i) =>
              `Card ${i + 1} (interval ${c.interval_number}, ${c.type}): ${JSON.stringify(c.content)}`,
          )
          .join('\n')
      : 'None yet.';

  const userMessage = `Cards generated so far:
${cardsSummary}

Transcript since last card checkpoint:
${transcriptSinceCheckpoint || '(no new transcript since last card)'}

The student just snapped back to attention. Generate a recovery response:
- now: what the professor is currently discussing
- missed: key concepts the student likely missed
- read_first: array of card interval_numbers most relevant to rejoin
- rejoin_tip: the minimum context needed to follow along right now`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:
      'You are a lecture recovery assistant. Return ONLY valid JSON. No preamble, no markdown.',
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    return parseJSON(text) as CatchMeUpContent;
  } catch {
    const retry = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:
        'You are a lecture recovery assistant. You MUST return raw JSON with absolutely no wrapping, no markdown, no code fences, no explanation. Only the JSON object itself.',
      messages: [{ role: 'user', content: userMessage }],
    });
    const retryText =
      retry.content[0].type === 'text' ? retry.content[0].text : '';
    return parseJSON(retryText) as CatchMeUpContent;
  }
}
