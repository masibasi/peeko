import { groq } from '../config/claude.js';
import { Card, SummaryContent, CatchMeUpContent } from '../types/index.js';

const MODEL = 'llama-3.3-70b-versatile';

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

async function chat(system: string, userMessage: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
  });
  return response.choices[0].message.content ?? '';
}

export async function generateSummaryCard(
  previousCards: Card[],
  transcriptWindow: string,
): Promise<SummaryContent> {
  const previousCardsSummary =
    previousCards.length > 0
      ? previousCards.map((c, i) => `Card ${i + 1} (${c.type}): ${JSON.stringify(c.content)}`).join('\n')
      : 'None yet.';

  const userMessage = `Previous cards (session memory):
${previousCardsSummary}

New transcript (last 5 minutes):
${transcriptWindow}

Generate the next summary card. Capture key concepts and 2-3 bullet points.
If the professor asked a question and answered it in this window, include it in the qa array.
If no Q&A detected, return qa as an empty array [].`;

  const system =
    'You are a lecture assistant. Return ONLY valid JSON matching this exact schema — no preamble, no markdown, no extra fields:\n' +
    '{"type":"summary","title":"string","bullets":["string"],"keywords":["string"],"qa":[{"question":"string","answer":"string"}],"timestamp":"ISO string"}\n' +
    'Use "bullets" (not bullet_points) and "keywords" (not key_concepts).';

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
): Promise<CatchMeUpContent> {
  const cardsSummary =
    allCards.length > 0
      ? allCards
          .map((c, i) => `Card ${i + 1} (interval ${c.interval_number}, ${c.type}): ${JSON.stringify(c.content)}`)
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

  const system =
    'You are a lecture recovery assistant. Return ONLY valid JSON. No preamble, no markdown.';

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
